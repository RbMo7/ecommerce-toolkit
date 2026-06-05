export type OrderStatus =
  | "pending"
  | "confirmed"
  | "picking"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface StatusChange {
  from: OrderStatus;
  to: OrderStatus;
  timestamp: Date;
}

export interface FulfillmentOrder {
  orderId: string;
  status: OrderStatus;
  sku: string;
  quantity: number;
  createdAt: Date;
  statusChanges: StatusChange[];
  slaDeadline?: Date;
  priority: "standard" | "express" | "same-day";
}

export interface PipelineStage {
  name: string;
  orderCount: number;
  avgMinutes: number;
  slaBreachCount: number;
  bottleneckScore: number;
}

export interface SlaBreach {
  orderId: string;
  stage: string;
  currentDurationMinutes: number;
  slaMinutes: number;
  severity: "warning" | "breached";
}

export interface FulfillmentReport {
  pipeline: PipelineStage[];
  slaBreaches: SlaBreach[];
  bottlenecks: { stage: string; score: number; reason: string }[];
  summary: {
    totalOrders: number;
    completedOrders: number;
    inProgress: number;
    avgFulfillmentMinutes: number;
    slaCompliancePercent: number;
  };
}

const SLA_LIMITS: Record<string, number> = {
  standard: 2880,
  express: 1440,
  "same-day": 480,
};

const STAGE_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "picking",
  "packed",
  "shipped",
  "delivered",
];

function minutesBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60);
}

function getStageDuration(
  order: FulfillmentOrder,
  stage: OrderStatus,
): number {
  const entry = order.statusChanges.find((c) => c.to === stage);
  const exit = order.statusChanges.find((c) => c.from === stage);
  if (!entry) return 0;
  const start = new Date(entry.timestamp).getTime();
  const end = exit
    ? new Date(exit.timestamp).getTime()
    : Date.now();
  return (end - start) / (1000 * 60);
}

export function calculateStageDurations(
  orders: FulfillmentOrder[],
): Map<string, { avgMinutes: number; count: number }> {
  const durations = new Map<string, number[]>();

  for (const order of orders) {
    for (const stage of STAGE_ORDER) {
      const dur = getStageDuration(order, stage);
      if (dur > 0) {
        const arr = durations.get(stage) ?? [];
        arr.push(dur);
        durations.set(stage, arr);
      }
    }
  }

  const result = new Map<string, { avgMinutes: number; count: number }>();
  for (const [stage, durs] of durations) {
    const avg = durs.reduce((s, v) => s + v, 0) / durs.length;
    result.set(stage, { avgMinutes: Math.round(avg), count: durs.length });
  }
  return result;
}

export function detectSlaBreaches(
  orders: FulfillmentOrder[],
): SlaBreach[] {
  const breaches: SlaBreach[] = [];
  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "delivered") continue;
    const slaMin = SLA_LIMITS[order.priority] ?? SLA_LIMITS["standard"];
    const elapsed = minutesBetween(
      new Date(order.createdAt),
      new Date(),
    );
    if (elapsed > slaMin) {
      breaches.push({
        orderId: order.orderId,
        stage: order.status,
        currentDurationMinutes: Math.round(elapsed),
        slaMinutes: slaMin,
        severity: "breached",
      });
    } else if (elapsed > slaMin * 0.8) {
      breaches.push({
        orderId: order.orderId,
        stage: order.status,
        currentDurationMinutes: Math.round(elapsed),
        slaMinutes: slaMin,
        severity: "warning",
      });
    }
  }
  return breaches;
}

export function identifyBottlenecks(
  orders: FulfillmentOrder[],
): { stage: string; score: number; reason: string }[] {
  const stageDurations = calculateStageDurations(orders);
  const bottlenecks: { stage: string; score: number; reason: string }[] = [];

  const breaches = detectSlaBreaches(orders);
  const breachCountByStage = new Map<string, number>();
  for (const b of breaches) {
    breachCountByStage.set(
      b.stage,
      (breachCountByStage.get(b.stage) ?? 0) + 1,
    );
  }

  for (const [stage, data] of stageDurations) {
    const breachCount = breachCountByStage.get(stage) ?? 0;
    // Score combines avg duration and breach frequency
    const score =
      (data.avgMinutes / 60) * 0.4 + breachCount * 10 * 0.6;
    if (score > 0) {
      bottlenecks.push({
        stage,
        score: Math.round(score * 10) / 10,
        reason: `Avg ${Math.round(data.avgMinutes / 60)}h in stage, ${breachCount} SLA breaches`,
      });
    }
  }

  return bottlenecks.sort((a, b) => b.score - a.score);
}

export function generateFulfillmentReport(
  orders: FulfillmentOrder[],
): FulfillmentReport {
  const stageDurations = calculateStageDurations(orders);
  const slaBreaches = detectSlaBreaches(orders);
  const bottlenecks = identifyBottlenecks(orders);

  const pipeline: PipelineStage[] = STAGE_ORDER.map((stage) => {
    const data = stageDurations.get(stage);
    const breachCount = slaBreaches.filter((b) => b.stage === stage).length;
    const bn = bottlenecks.find((b) => b.stage === stage);
    return {
      name: stage,
      orderCount: data?.count ?? 0,
      avgMinutes: data?.avgMinutes ?? 0,
      slaBreachCount: breachCount,
      bottleneckScore: bn?.score ?? 0,
    };
  });

  const completedOrders = orders.filter(
    (o) => o.status === "delivered",
  ).length;
  const inProgress = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  ).length;
  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  const totalMinutes = nonCancelled.reduce((sum, o) => {
    if (o.status === "delivered") {
      const lastChange = o.statusChanges[o.statusChanges.length - 1];
      if (lastChange) {
        return sum + minutesBetween(new Date(o.createdAt), new Date(lastChange.timestamp));
      }
    }
    return sum + minutesBetween(new Date(o.createdAt), new Date());
  }, 0);
  const avgFulfillmentMinutes =
    nonCancelled.length > 0
      ? Math.round(totalMinutes / nonCancelled.length)
      : 0;

  const slaCompliancePercent =
    orders.length > 0
      ? Math.round(
          ((orders.length - slaBreaches.filter((b) => b.severity === "breached").length) /
            orders.length) *
            100,
        )
      : 100;

  return {
    pipeline,
    slaBreaches,
    bottlenecks,
    summary: {
      totalOrders: orders.length,
      completedOrders,
      inProgress,
      avgFulfillmentMinutes,
      slaCompliancePercent,
    },
  };
}

export function getOrdersAtRisk(
  orders: FulfillmentOrder[],
  thresholdMinutes: number,
): FulfillmentOrder[] {
  return orders.filter((o) => {
    if (["delivered", "cancelled"].includes(o.status)) return false;
    const elapsed = minutesBetween(new Date(o.createdAt), new Date());
    const slaMin = SLA_LIMITS[o.priority] ?? SLA_LIMITS["standard"];
    return slaMin - elapsed <= thresholdMinutes;
  });
}

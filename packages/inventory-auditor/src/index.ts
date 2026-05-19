export interface InventoryRecord {
  sku: string;
  expectedQty: number;
  actualQty: number;
  location: string;
  lastCounted: Date;
}

export interface Discrepancy {
  sku: string;
  location: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  variancePercent: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AuditReport {
  discrepancies: Discrepancy[];
  summary: {
    totalItems: number;
    totalDiscrepancies: number;
    totalVariance: number;
    criticalCount: number;
    highCount: number;
  };
  priorityItems: { sku: string; score: number; reason: string }[];
}

function computeSeverity(variancePercent: number): Discrepancy["severity"] {
  const abs = Math.abs(variancePercent);
  if (abs > 10) return "critical";
  if (abs > 5) return "high";
  if (abs > 2) return "medium";
  return "low";
}

export function calculateDiscrepancies(
  records: InventoryRecord[],
): Discrepancy[] {
  return records
    .filter((r) => r.expectedQty !== r.actualQty)
    .map((r) => {
      const variance = r.actualQty - r.expectedQty;
      const variancePercent =
        r.expectedQty === 0
          ? r.actualQty > 0
            ? 100
            : 0
          : (variance / r.expectedQty) * 100;
      return {
        sku: r.sku,
        location: r.location,
        expectedQty: r.expectedQty,
        actualQty: r.actualQty,
        variance,
        variancePercent: Math.round(variancePercent * 100) / 100,
        severity: computeSeverity(variancePercent),
      };
    });
}

export function generateAuditReport(records: InventoryRecord[]): AuditReport {
  const discrepancies = calculateDiscrepancies(records);
  const criticalCount = discrepancies.filter(
    (d) => d.severity === "critical",
  ).length;
  const highCount = discrepancies.filter((d) => d.severity === "high").length;
  const totalVariance = discrepancies.reduce(
    (sum, d) => sum + Math.abs(d.variance),
    0,
  );

  const priorityItems = discrepancies
    .map((d) => {
      const severityScore =
        d.severity === "critical"
          ? 10
          : d.severity === "high"
            ? 5
            : d.severity === "medium"
              ? 2
              : 0;
      const magnitudeScore = Math.min(Math.abs(d.variance) / 10, 5);
      const score = severityScore + magnitudeScore;
      return {
        sku: d.sku,
        score,
        reason: `Variance of ${Math.abs(d.variance)} units (${Math.abs(d.variancePercent)}%) — ${d.severity}`,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    discrepancies,
    summary: {
      totalItems: records.length,
      totalDiscrepancies: discrepancies.length,
      totalVariance,
      criticalCount,
      highCount,
    },
    priorityItems,
  };
}

export function suggestAuditSchedule(
  records: InventoryRecord[],
  daysSinceLastCount: number,
): InventoryRecord[] {
  const now = new Date();
  return records
    .filter((r) => {
      const daysSinceCount =
        (now.getTime() - new Date(r.lastCounted).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysSinceCount >= daysSinceLastCount;
    })
    .sort((a, b) => {
      const aDays =
        (now.getTime() - new Date(a.lastCounted).getTime()) /
        (1000 * 60 * 60 * 24);
      const bDays =
        (now.getTime() - new Date(b.lastCounted).getTime()) /
        (1000 * 60 * 60 * 24);
      return bDays - aDays;
    });
}

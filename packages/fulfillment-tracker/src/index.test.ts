import { describe, it, expect } from "vitest";
import {
  generateFulfillmentReport,
  detectSlaBreaches,
  identifyBottlenecks,
  getOrdersAtRisk,
  type FulfillmentOrder,
} from "./index.js";

const makeOrder = (
  overrides: Partial<FulfillmentOrder> = {},
): FulfillmentOrder => ({
  orderId: "ORD-001",
  status: "pending",
  sku: "SKU-001",
  quantity: 1,
  createdAt: new Date(Date.now() - 3600000), // 1 hour ago
  statusChanges: [
    { from: "pending", to: "confirmed", timestamp: new Date(Date.now() - 3000000) },
  ],
  priority: "standard",
  ...overrides,
});

describe("detectSlaBreaches", () => {
  it("flags breached orders past SLA deadline", () => {
    const oldOrder = makeOrder({
      orderId: "OLD",
      createdAt: new Date(Date.now() - 3 * 24 * 3600000), // 3 days ago
      statusChanges: [
        { from: "pending", to: "confirmed", timestamp: new Date(Date.now() - 3 * 24 * 3600000) },
      ],
    });
    const breaches = detectSlaBreaches([oldOrder]);
    expect(breaches.some((b) => b.severity === "breached")).toBe(true);
  });

  it("does not flag delivered orders", () => {
    const delivered = makeOrder({
      status: "delivered",
      createdAt: new Date(Date.now() - 7 * 24 * 3600000),
      statusChanges: [
        { from: "pending", to: "delivered", timestamp: new Date(Date.now() - 6 * 24 * 3600000) },
      ],
    });
    const breaches = detectSlaBreaches([delivered]);
    expect(breaches.length).toBe(0);
  });
});

describe("identifyBottlenecks", () => {
  it("returns bottlenecks with scores", () => {
    const orders = [
      makeOrder({ orderId: "A", createdAt: new Date(Date.now() - 5 * 3600000) }),
      makeOrder({ orderId: "B", createdAt: new Date(Date.now() - 4 * 3600000) }),
    ];
    const bottlenecks = identifyBottlenecks(orders);
    expect(Array.isArray(bottlenecks)).toBe(true);
  });
});

describe("getOrdersAtRisk", () => {
  it("returns orders near SLA limit", () => {
    const nearLimit = makeOrder({
      orderId: "RISK",
      createdAt: new Date(Date.now() - 2800 * 60000), // 2800 min ago (standard SLA: 2880)
    });
    const atRisk = getOrdersAtRisk([nearLimit], 120);
    expect(atRisk.some((o) => o.orderId === "RISK")).toBe(true);
  });
});

describe("generateFulfillmentReport", () => {
  it("produces summary with expected shape", () => {
    const orders = [
      makeOrder({ orderId: "A" }),
      makeOrder({ orderId: "B", status: "delivered" }),
    ];
    const report = generateFulfillmentReport(orders);
    expect(report.summary.totalOrders).toBe(2);
    expect(typeof report.summary.slaCompliancePercent).toBe("number");
    expect(Array.isArray(report.pipeline)).toBe(true);
  });
});

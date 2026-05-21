import { describe, it, expect } from "vitest";
import {
  calculateDiscrepancies,
  generateAuditReport,
  suggestAuditSchedule,
  type InventoryRecord,
} from "./index.js";

const makeRecord = (
  overrides: Partial<InventoryRecord> = {},
): InventoryRecord => ({
  sku: "TEST-001",
  expectedQty: 100,
  actualQty: 100,
  location: "WH-A",
  lastCounted: new Date("2026-07-01"),
  ...overrides,
});

describe("calculateDiscrepancies", () => {
  it("returns empty array when all quantities match", () => {
    const records = [
      makeRecord(),
      makeRecord({ sku: "TEST-002", expectedQty: 50, actualQty: 50 }),
    ];
    expect(calculateDiscrepancies(records)).toEqual([]);
  });

  it("flags critical severity for >10% variance", () => {
    const records = [makeRecord({ expectedQty: 100, actualQty: 80 })];
    const result = calculateDiscrepancies(records);
    expect(result[0]?.severity).toBe("critical");
    expect(result[0]?.variance).toBe(-20);
    expect(result[0]?.variancePercent).toBe(-20);
  });

  it("flags high severity for 5-10% variance", () => {
    const records = [makeRecord({ expectedQty: 100, actualQty: 93 })];
    const result = calculateDiscrepancies(records);
    expect(result[0]?.severity).toBe("high");
  });

  it("flags medium severity for 2-5% variance", () => {
    const records = [makeRecord({ expectedQty: 100, actualQty: 96 })];
    const result = calculateDiscrepancies(records);
    expect(result[0]?.severity).toBe("medium");
  });

  it("flags low severity for <2% variance", () => {
    const records = [makeRecord({ expectedQty: 100, actualQty: 99 })];
    const result = calculateDiscrepancies(records);
    expect(result[0]?.severity).toBe("low");
  });

  it("handles zero expected quantity (phantom stock)", () => {
    const records = [makeRecord({ expectedQty: 0, actualQty: 10 })];
    const result = calculateDiscrepancies(records);
    expect(result[0]?.severity).toBe("critical");
    expect(result[0]?.variancePercent).toBe(100);
  });

  it("handles empty array", () => {
    expect(calculateDiscrepancies([])).toEqual([]);
  });
});

describe("generateAuditReport", () => {
  it("produces correct summary", () => {
    const records = [
      makeRecord({ sku: "A", expectedQty: 100, actualQty: 80 }),
      makeRecord({ sku: "B", expectedQty: 50, actualQty: 48 }),
      makeRecord({ sku: "C", expectedQty: 200, actualQty: 200 }),
    ];
    const report = generateAuditReport(records);
    expect(report.summary.totalItems).toBe(3);
    expect(report.summary.totalDiscrepancies).toBe(2);
    expect(report.summary.criticalCount).toBe(1);
    expect(report.summary.highCount).toBe(0);
  });

  it("sorts priority items by score descending", () => {
    const records = [
      makeRecord({ sku: "A", expectedQty: 100, actualQty: 80 }),
      makeRecord({ sku: "B", expectedQty: 50, actualQty: 49 }),
    ];
    const report = generateAuditReport(records);
    expect(report.priorityItems[0]?.sku).toBe("A");
    expect(report.priorityItems[1]?.sku).toBe("B");
  });
});

describe("suggestAuditSchedule", () => {
  it("returns items not counted within N days", () => {
    const oldDate = new Date("2026-01-01");
    const recentDate = new Date();
    const records = [
      makeRecord({ sku: "OLD", lastCounted: oldDate }),
      makeRecord({ sku: "NEW", lastCounted: recentDate }),
    ];
    const result = suggestAuditSchedule(records, 30);
    expect(result.map((r) => r.sku)).toContain("OLD");
    expect(result.map((r) => r.sku)).not.toContain("NEW");
  });

  it("returns empty when all items recently counted", () => {
    const records = [makeRecord({ lastCounted: new Date() })];
    expect(suggestAuditSchedule(records, 365)).toEqual([]);
  });
});

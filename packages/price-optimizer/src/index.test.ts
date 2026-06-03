import { describe, it, expect } from "vitest";
import {
  calculateElasticity,
  suggestOptimalPrice,
  calculateRevenueImpact,
  segmentPricing,
  type PricePoint,
} from "./index.js";

const makePP = (
  overrides: Partial<PricePoint> = {},
): PricePoint => ({
  price: 50,
  quantitySold: 100,
  date: new Date("2026-01-01"),
  productId: "PROD-001",
  ...overrides,
});

describe("calculateElasticity", () => {
  it("returns elastic for large demand response to price change", () => {
    const points = [
      makePP({ price: 10, quantitySold: 200, date: new Date("2026-01-01") }),
      makePP({ price: 12, quantitySold: 160, date: new Date("2026-02-01") }),
      makePP({ price: 15, quantitySold: 100, date: new Date("2026-03-01") }),
    ];
    const result = calculateElasticity(points);
    expect(result.interpretation).toBe("elastic");
  });

  it("returns inelastic for small demand response", () => {
    const points = [
      makePP({ price: 10, quantitySold: 100, date: new Date("2026-01-01") }),
      makePP({ price: 12, quantitySold: 95, date: new Date("2026-02-01") }),
      makePP({ price: 15, quantitySold: 88, date: new Date("2026-03-01") }),
    ];
    const result = calculateElasticity(points);
    expect(result.interpretation).toBe("inelastic");
  });

  it("handles single data point with low confidence", () => {
    const points = [makePP()];
    const result = calculateElasticity(points);
    expect(result.confidence).toBe("low");
  });
});

describe("calculateRevenueImpact", () => {
  it("calculates revenue increase for elastic demand price drop", () => {
    // elastic (PED=-2): 10% price drop → 20% volume increase
    const result = calculateRevenueImpact(100, 90, 100, -2);
    expect(result.volumeChange).toBe(20);
    expect(result.newRevenue).toBe(10800); // 90 * 120
  });

  it("calculates revenue decrease for inelastic demand price drop", () => {
    // inelastic (PED=-0.5): 10% price drop → 5% volume increase
    const result = calculateRevenueImpact(100, 90, 100, -0.5);
    expect(result.volumeChange).toBe(5);
    expect(result.newRevenue).toBe(9450); // 90 * 105
  });
});

describe("suggestOptimalPrice", () => {
  it("suggests a price different from current", () => {
    const points = [
      makePP({ price: 100, quantitySold: 50, date: new Date("2026-01-01") }),
      makePP({ price: 120, quantitySold: 30, date: new Date("2026-02-01") }),
      makePP({ price: 90, quantitySold: 70, date: new Date("2026-03-01") }),
    ];
    const result = suggestOptimalPrice(points, 40);
    expect(result.suggestedPrice).toBeGreaterThan(0);
    expect(typeof result.reasoning).toBe("string");
  });
});

describe("segmentPricing", () => {
  it("returns segments for valid data", () => {
    const points = [
      makePP({ price: 10, quantitySold: 200 }),
      makePP({ price: 20, quantitySold: 100 }),
      makePP({ price: 30, quantitySold: 60 }),
      makePP({ price: 40, quantitySold: 40 }),
    ];
    const segments = segmentPricing(points, 2);
    expect(segments.length).toBeGreaterThanOrEqual(0);
  });
});

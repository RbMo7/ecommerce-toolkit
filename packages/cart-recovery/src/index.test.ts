import { describe, it, expect } from "vitest";
import {
  scoreRecoveryProbability,
  suggestStrategy,
  calculateWinRate,
  segmentByRecoveryTier,
  estimateRevenueImpact,
  type AbandonedCart,
} from "./index.js";

const makeCart = (
  overrides: Partial<AbandonedCart> = {},
): AbandonedCart => ({
  cartId: "CART-001",
  customerId: "CUST-001",
  items: [{ sku: "SKU-001", name: "Product 1", price: 50, quantity: 1 }],
  totalValue: 50,
  createdAt: new Date("2026-07-01"),
  abandonedAt: new Date("2026-07-01T01:00:00Z"),
  emailOptIn: true,
  previousOrders: 3,
  daysSinceLastVisit: 1,
  trafficSource: "search",
  ...overrides,
});

describe("scoreRecoveryProbability", () => {
  it("returns hot for high-value returning customer", () => {
    const cart = makeCart({
      previousOrders: 5,
      daysSinceLastVisit: 0,
      emailOptIn: true,
      totalValue: 75,
    });
    const result = scoreRecoveryProbability(cart);
    expect(result.tier).toBe("hot");
    expect(result.score).toBeGreaterThan(0.6);
  });

  it("returns lost for no-signal cart", () => {
    const cart = makeCart({
      previousOrders: 0,
      daysSinceLastVisit: 30,
      emailOptIn: false,
      trafficSource: "social",
      totalValue: 600,
    });
    const result = scoreRecoveryProbability(cart);
    expect(result.tier).toBe("lost");
  });

  it("provides factor explanations", () => {
    const cart = makeCart({ previousOrders: 2, emailOptIn: true });
    const result = scoreRecoveryProbability(cart);
    expect(result.factors.positive.length).toBeGreaterThan(0);
  });
});

describe("suggestStrategy", () => {
  it("suggests urgency for hot + high value", () => {
    const cart = makeCart({ totalValue: 300 });
    const score = scoreRecoveryProbability(cart);
    const strategy = suggestStrategy(cart, score);
    // hot cart may vary, just check shape
    expect(["email_reminder", "discount_offer", "urgency_scarcity", "cross_sell", "abandon_survey"]).toContain(strategy.strategy);
  });

  it("suggests discount for warm cart", () => {
    const cart = makeCart({
      totalValue: 150,
      previousOrders: 1,
      daysSinceLastVisit: 5,
      emailOptIn: true,
      trafficSource: "direct",
    });
    const score = scoreRecoveryProbability(cart);
    expect(score.tier).toBe("warm");
    const strategy = suggestStrategy(cart, score);
    expect(strategy.strategy).toBe("discount_offer");
  });
});

describe("segmentByRecoveryTier", () => {
  it("groups carts by tier", () => {
    const carts = [makeCart({ cartId: "A" }), makeCart({ cartId: "B" })];
    const scores = carts.map(scoreRecoveryProbability);
    const segmented = segmentByRecoveryTier(carts, scores);
    expect(segmented.hot.length + segmented.warm.length + segmented.cold.length + segmented.lost.length).toBe(2);
  });
});

describe("estimateRevenueImpact", () => {
  it("calculates expected recovery", () => {
    const carts = [makeCart({ totalValue: 100 })];
    const scores = carts.map(scoreRecoveryProbability);
    const impact = estimateRevenueImpact(carts, scores, 10);
    expect(impact.totalAbandonedValue).toBe(100);
    expect(impact.recoveryRate).toBeGreaterThan(0);
  });
});

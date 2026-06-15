import {
  scoreRecoveryProbability,
  suggestStrategy,
  batchScoreCarts,
  estimateRevenueImpact,
  type AbandonedCart,
} from "./index.js";

const carts: AbandonedCart[] = [
  {
    cartId: "CART-001", customerId: "C1",
    items: [{ sku: "SKU-A", name: "Wireless Headphones", price: 150, quantity: 1 }],
    totalValue: 150, createdAt: new Date(), abandonedAt: new Date(),
    emailOptIn: true, previousOrders: 4, daysSinceLastVisit: 0,
    trafficSource: "search",
  },
  {
    cartId: "CART-002", customerId: "C2",
    items: [{ sku: "SKU-B", name: "Running Shoes", price: 120, quantity: 1 }],
    totalValue: 120, createdAt: new Date(), abandonedAt: new Date(),
    emailOptIn: true, previousOrders: 1, daysSinceLastVisit: 2,
    trafficSource: "email",
  },
  {
    cartId: "CART-003", customerId: "C3",
    items: [{ sku: "SKU-C", name: "Yoga Mat", price: 45, quantity: 2 }],
    totalValue: 90, createdAt: new Date(), abandonedAt: new Date(),
    emailOptIn: false, previousOrders: 0, daysSinceLastVisit: 10,
    trafficSource: "social",
  },
  {
    cartId: "CART-004", customerId: "C4",
    items: [{ sku: "SKU-D", name: "Designer Bag", price: 450, quantity: 1 }],
    totalValue: 450, createdAt: new Date(), abandonedAt: new Date(),
    emailOptIn: true, previousOrders: 0, daysSinceLastVisit: 20,
    trafficSource: "direct",
  },
];

console.log("Cart Recovery Analysis:\n");
const scores = batchScoreCarts(carts);
for (const cart of carts) {
  const score = scores.find((s) => s.cartId === cart.cartId)!;
  const strategy = suggestStrategy(cart, score);
  console.log(`Cart ${cart.cartId} ($${cart.totalValue}):`);
  console.log(`  Score: ${score.score} (${score.tier})`);
  console.log(`  Strategy: ${strategy.strategy} — "${strategy.messageTemplate}"`);
  console.log(`  Timing: ${strategy.timing}, Expected win: ${(strategy.expectedWinRate * 100).toFixed(0)}%`);
  console.log();
}

const impact = estimateRevenueImpact(carts, scores, 10);
console.log("Revenue Impact:");
console.log(`  Abandoned: $${impact.totalAbandonedValue}`);
console.log(`  Expected recovered: $${impact.expectedRecoveredValue}`);
console.log(`  After 10% discount: $${impact.expectedRevenueAfterDiscount}`);
console.log(`  Recovery rate: ${impact.recoveryRate}%`);

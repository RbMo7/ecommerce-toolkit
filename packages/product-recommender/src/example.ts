import {
  findSimilarProducts,
  recommendFrequentlyBoughtTogether,
  popularProducts,
  type Product,
  type UserBehavior,
} from "./index.js";

const products: Product[] = [
  { id: "P1", name: "Wireless Headphones", category: "electronics", tags: ["audio", "wireless", "bluetooth"], price: 149.99, attributes: { color: "black" } },
  { id: "P2", name: "Bluetooth Speaker", category: "electronics", tags: ["audio", "wireless", "speaker"], price: 79.99, attributes: { color: "black" } },
  { id: "P3", name: "Running Shoes", category: "sports", tags: ["shoes", "running", "outdoor"], price: 119.99, attributes: { size: "10" } },
  { id: "P4", name: "Yoga Mat", category: "sports", tags: ["yoga", "fitness", "outdoor"], price: 44.99, attributes: { color: "green" } },
  { id: "P5", name: "USB-C Cable", category: "electronics", tags: ["cable", "charger", "accessory"], price: 14.99, attributes: { length: "1m" } },
  { id: "P6", name: "Phone Case", category: "electronics", tags: ["accessory", "protection"], price: 24.99, attributes: { color: "black" } },
  { id: "P7", name: "Water Bottle", category: "sports", tags: ["hydration", "outdoor", "fitness"], price: 34.99, attributes: { color: "blue" } },
  { id: "P8", name: "Desk Lamp", category: "home", tags: ["lighting", "office", "led"], price: 59.99, attributes: { color: "white" } },
];

const behaviors: UserBehavior[] = [
  { userId: "U1", productId: "P1", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U1", productId: "P2", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U1", productId: "P5", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U2", productId: "P1", action: "view", timestamp: new Date(), weight: 1 },
  { userId: "U2", productId: "P3", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U2", productId: "P4", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U3", productId: "P1", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U3", productId: "P2", action: "cart", timestamp: new Date(), weight: 3 },
  { userId: "U3", productId: "P6", action: "view", timestamp: new Date(), weight: 1 },
  { userId: "U4", productId: "P7", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U4", productId: "P4", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U4", productId: "P3", action: "view", timestamp: new Date(), weight: 1 },
];

console.log("=== Similar Products (Wireless Headphones) ===");
for (const rec of findSimilarProducts(products[0]!, products, 3)) {
  const p = products.find((x) => x.id === rec.productId);
  console.log(`  ${p?.name}: score=${rec.score.toFixed(2)} (${rec.reason})`);
}

console.log("\n=== Frequently Bought Together (Wireless Headphones) ===");
for (const rec of recommendFrequentlyBoughtTogether("P1", behaviors, products, 3)) {
  const p = products.find((x) => x.id === rec.productId);
  console.log(`  ${p?.name}: score=${rec.score.toFixed(2)}`);
}

console.log("\n=== Popular Products (last 365 days) ===");
for (const p of popularProducts(behaviors, products, 5, 365)) {
  console.log(`  ${p.name} (${p.category})`);
}

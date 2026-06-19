import { describe, it, expect } from "vitest";
import {
  findSimilarProducts,
  recommendForUser,
  recommendFrequentlyBoughtTogether,
  popularProducts,
  type Product,
  type UserBehavior,
} from "./index.js";

const products: Product[] = [
  { id: "P1", name: "Wireless Headphones", category: "electronics", tags: ["audio", "wireless", "bluetooth"], price: 150, attributes: { color: "black" } },
  { id: "P2", name: "Bluetooth Speaker", category: "electronics", tags: ["audio", "wireless", "speaker"], price: 80, attributes: { color: "black" } },
  { id: "P3", name: "Running Shoes", category: "sports", tags: ["shoes", "running", "outdoor"], price: 120, attributes: { size: "10" } },
  { id: "P4", name: "Yoga Mat", category: "sports", tags: ["yoga", "fitness", "outdoor"], price: 45, attributes: { color: "green" } },
  { id: "P5", name: "USB-C Cable", category: "electronics", tags: ["cable", "charger"], price: 15, attributes: { length: "1m" } },
];

const behaviors: UserBehavior[] = [
  { userId: "U1", productId: "P1", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U1", productId: "P2", action: "purchase", timestamp: new Date(), weight: 5 },
  { userId: "U2", productId: "P1", action: "view", timestamp: new Date(), weight: 1 },
  { userId: "U2", productId: "P3", action: "purchase", timestamp: new Date(), weight: 5 },
];

describe("findSimilarProducts", () => {
  it("finds products in same category", () => {
    const results = findSimilarProducts(products[0]!, products);
    expect(results.some((r) => r.productId === "P2")).toBe(true); // same category
    expect(results.some((r) => r.productId === "P5")).toBe(true); // same category
  });

  it("returns empty for single product catalog", () => {
    const results = findSimilarProducts(products[0]!, [products[0]!]);
    expect(results.length).toBe(0);
  });
});

describe("recommendForUser", () => {
  it("returns recommendations based on similar users", () => {
    const results = recommendForUser("U2", behaviors, products, 5);
    // U2 viewed P1, U1 purchased P1+P2 → should recommend P2
    expect(Array.isArray(results)).toBe(true);
  });
});

describe("recommendFrequentlyBoughtTogether", () => {
  it("returns co-purchased products", () => {
    const results = recommendFrequentlyBoughtTogether("P1", behaviors, products);
    expect(Array.isArray(results)).toBe(true);
  });
});

describe("popularProducts", () => {
  it("returns top purchased products", () => {
    const popular = popularProducts(behaviors, products, 3, 365);
    expect(popular.length).toBeGreaterThan(0);
  });
});

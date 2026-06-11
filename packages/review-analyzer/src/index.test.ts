import { describe, it, expect } from "vitest";
import {
  analyzeSentiment,
  extractKeywords,
  summarizeReviews,
  generateInsights,
  type Review,
} from "./index.js";

const makeReview = (overrides: Partial<Review> = {}): Review => ({
  id: "R1",
  productId: "P1",
  rating: 5,
  title: "Great product",
  body: "This is an amazing product, I love it!",
  date: new Date("2026-06-01"),
  verifiedPurchase: true,
  ...overrides,
});

describe("analyzeSentiment", () => {
  it("returns positive for positive text", () => {
    const result = analyzeSentiment("This product is amazing and great and perfect");
    expect(result.compound).toBeGreaterThan(0);
    expect(result.positive).toBeGreaterThan(result.negative);
  });

  it("returns negative for negative text", () => {
    const result = analyzeSentiment("This product is terrible, awful, and broken");
    expect(result.compound).toBeLessThan(0);
    expect(result.negative).toBeGreaterThan(result.positive);
  });

  it("returns neutral for empty text", () => {
    const result = analyzeSentiment("");
    expect(result.neutral).toBe(1);
  });
});

describe("extractKeywords", () => {
  it("extracts meaningful keywords from reviews", () => {
    const reviews = [
      makeReview({ body: "amazing quality product" }),
      makeReview({ body: "great quality and amazing finish" }),
    ];
    const keywords = extractKeywords(reviews);
    expect(keywords.some((k) => k.word === "quality")).toBe(true);
    expect(keywords.some((k) => k.word === "amazing")).toBe(true);
  });

  it("respects minCount threshold", () => {
    const reviews = [
      makeReview({ body: "unique word here" }),
      makeReview({ body: "something else" }),
    ];
    const keywords = extractKeywords(reviews, 5);
    expect(keywords.length).toBe(0);
  });
});

describe("summarizeReviews", () => {
  it("produces correct summary", () => {
    const reviews = [
      makeReview({ rating: 5 }),
      makeReview({ id: "R2", rating: 3, body: "ok product" }),
    ];
    const summary = summarizeReviews(reviews, "P1");
    expect(summary.totalReviews).toBe(2);
    expect(summary.averageRating).toBe(4);
    expect(summary.ratingDistribution[5]).toBe(1);
    expect(summary.ratingDistribution[3]).toBe(1);
  });
});

describe("generateInsights", () => {
  it("generates complaints from negative reviews", () => {
    const reviews = [
      makeReview({
        id: "R1",
        rating: 1,
        body: "terrible broken defective product waste of money",
      }),
      makeReview({
        id: "R2",
        rating: 1,
        body: "broken product terrible quality",
      }),
      makeReview({
        id: "R3",
        rating: 1,
        body: "defective broken piece of junk",
      }),
    ];
    const insights = generateInsights(reviews);
    expect(insights.some((i) => i.type === "complaint")).toBe(true);
  });
});

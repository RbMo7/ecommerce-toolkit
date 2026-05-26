import { describe, it, expect } from "vitest";
import {
  createSkuSpec,
  generateSku,
  parseSku,
  validateSku,
  suggestSku,
  batchGenerateSkus,
} from "./index.js";

const spec = createSkuSpec({});

describe("generateSku", () => {
  it("generates a SKU with the correct format", () => {
    const sku = generateSku(spec, "electronics", { color: "black" });
    expect(sku).toMatch(/^PRD-\d{3}-\d{3}-[A-Z]$/);
  });

  it("produces deterministic output for same inputs", () => {
    const a = generateSku(spec, "clothing", { size: "large" });
    const b = generateSku(spec, "clothing", { size: "large" });
    expect(a).toBe(b);
  });
});

describe("parseSku", () => {
  it("roundtrips generate → parse", () => {
    const sku = generateSku(spec, "electronics", { color: "black", size: "m" });
    const parsed = parseSku(sku, spec);
    expect(parsed.isValid).toBe(true);
    expect(parsed.prefix).toBe("PRD");
    expect(parsed.category).toBe("electronics");
  });

  it("detects invalid checksum", () => {
    const sku = generateSku(spec, "books", {});
    const tampered = sku.replace(/.$/, "Z");
    const parsed = parseSku(tampered, spec);
    expect(parsed.isValid).toBe(false);
  });
});

describe("validateSku", () => {
  it("returns true for valid SKU", () => {
    const sku = generateSku(spec, "toys", {});
    expect(validateSku(sku, spec)).toBe(true);
  });

  it("returns false for invalid SKU", () => {
    expect(validateSku("INVALID", spec)).toBe(false);
  });
});

describe("suggestSku", () => {
  it("corrects a bad checksum", () => {
    const sku = generateSku(spec, "sports", {});
    const tampered = sku.replace(/.$/, "Z");
    const suggested = suggestSku(tampered, spec);
    expect(validateSku(suggested, spec)).toBe(true);
  });
});

describe("batchGenerateSkus", () => {
  it("generates correct number of SKUs", () => {
    const items = [
      { category: "home", attributes: { material: "wood" } },
      { category: "beauty", attributes: { variant: "rose" } },
    ];
    const skus = batchGenerateSkus(spec, items);
    expect(skus).toHaveLength(2);
    skus.forEach((sku) => expect(validateSku(sku, spec)).toBe(true));
  });
});

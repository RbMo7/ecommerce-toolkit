import { describe, it, expect } from "vitest";
import {
  generateCouponCode,
  validateCoupon,
  applyCoupon,
  applyCoupons,
  batchGenerateCoupons,
  type Coupon,
  type Cart,
} from "./index.js";

const makeCart = (overrides: Partial<Cart> = {}): Cart => ({
  items: [
    { sku: "SKU-001", category: "electronics", price: 100, quantity: 1 },
    { sku: "SKU-002", category: "clothing", price: 50, quantity: 2 },
  ],
  subtotal: 200,
  shippingCost: 10,
  customerId: "CUST-001",
  ...overrides,
});

const makeCoupon = (overrides: Partial<Coupon> = {}): Coupon => ({
  code: "SAVE20",
  type: "percentage",
  value: 20,
  minOrderValue: 0,
  validFrom: new Date("2025-01-01"),
  validUntil: new Date("2030-12-31"),
  usageLimit: 100,
  usedCount: 0,
  isStackable: true,
  ...overrides,
});

describe("generateCouponCode", () => {
  it("generates a code with expected length", () => {
    const code = generateCouponCode("SUMMER", 8);
    expect(code).toMatch(/^SUMMER-/);
    expect(code.length).toBeGreaterThan(9);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateCouponCode()));
    expect(codes.size).toBe(10);
  });
});

describe("batchGenerateCoupons", () => {
  it("generates requested number of unique codes", () => {
    const codes = batchGenerateCoupons(5, "FLASH");
    expect(codes).toHaveLength(5);
    expect(new Set(codes).size).toBe(5);
    codes.forEach((c) => expect(c).toMatch(/^FLASH-/));
  });
});

describe("validateCoupon", () => {
  it("validates a valid coupon", () => {
    const result = validateCoupon(makeCoupon(), makeCart());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects expired coupon", () => {
    const expired = makeCoupon({ validUntil: new Date("2020-01-01") });
    const result = validateCoupon(expired, makeCart());
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Coupon has expired");
  });

  it("rejects below min order value", () => {
    const coupon = makeCoupon({ minOrderValue: 300 });
    const result = validateCoupon(coupon, makeCart({ subtotal: 200 }));
    expect(result.isValid).toBe(false);
  });

  it("rejects when usage limit reached", () => {
    const coupon = makeCoupon({ usageLimit: 5, usedCount: 5 });
    const result = validateCoupon(coupon, makeCart());
    expect(result.isValid).toBe(false);
  });

  it("rejects for wrong customer", () => {
    const coupon = makeCoupon({ customerId: "CUST-002" });
    const result = validateCoupon(coupon, makeCart());
    expect(result.isValid).toBe(false);
  });
});

describe("applyCoupon", () => {
  it("applies percentage discount correctly", () => {
    const result = applyCoupon(makeCoupon({ value: 20 }), makeCart());
    expect(result.discountAmount).toBe(40); // 20% of $200
  });

  it("applies fixed amount discount", () => {
    const result = applyCoupon(
      makeCoupon({ type: "fixed_amount", value: 15 }),
      makeCart(),
    );
    expect(result.discountAmount).toBe(15);
  });

  it("caps percentage discount at max cap", () => {
    const result = applyCoupon(
      makeCoupon({ value: 50, maxDiscountCap: 30 }),
      makeCart(),
    );
    expect(result.discountAmount).toBe(30);
  });

  it("applies free shipping", () => {
    const result = applyCoupon(
      makeCoupon({ type: "free_shipping" }),
      makeCart(),
    );
    expect(result.discountAmount).toBe(10);
  });
});

describe("applyCoupons (stacking)", () => {
  it("applies multiple stackable coupons", () => {
    const cart = makeCart();
    const coupons = [
      makeCoupon({ code: "SAVE10", value: 10 }),
      makeCoupon({ code: "FLAT5", type: "fixed_amount", value: 5 }),
    ];
    const result = applyCoupons(coupons, cart);
    expect(result.appliedCoupons).toHaveLength(2);
    // First: 10% of 200 = 20, Second: $5
    expect(result.totalDiscount).toBeCloseTo(25, 1);
  });

  it("stops at non-stackable coupon", () => {
    const cart = makeCart();
    const coupons = [
      makeCoupon({ code: "SAVE10", value: 10 }),
      makeCoupon({ code: "NOSTACK", value: 5, isStackable: false }),
    ];
    const result = applyCoupons(coupons, cart);
    expect(result.appliedCoupons[1]?.reason).toBe(
      "Non-stackable coupon cannot be combined with others",
    );
  });
});

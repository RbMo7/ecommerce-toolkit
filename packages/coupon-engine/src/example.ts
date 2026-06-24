import {
  generateCouponCode,
  batchGenerateCoupons,
  validateCoupon,
  applyCoupon,
  applyCoupons,
  type Coupon,
  type Cart,
} from "./index.js";

// Generate promo codes
console.log("=== Generated Coupon Codes ===");
console.log("Single:", generateCouponCode("WELCOME", 6));
console.log("Batch:", batchGenerateCoupons(3, "FLASH25", 6).join(", "));

// Sample cart
const cart: Cart = {
  items: [
    { sku: "HD-001", category: "electronics", price: 299.99, quantity: 1 },
    { sku: "CB-002", category: "electronics", price: 19.99, quantity: 2 },
    { sku: "SH-003", category: "clothing", price: 89.99, quantity: 1 },
  ],
  subtotal: 429.96,
  shippingCost: 12.99,
  customerId: "CUST-001",
};

// Single coupon application
const pctCoupon: Coupon = {
  code: "SUMMER20",
  type: "percentage",
  value: 20,
  minOrderValue: 50,
  validFrom: new Date("2025-01-01"),
  validUntil: new Date("2030-12-31"),
  usageLimit: 1000,
  usedCount: 0,
  isStackable: true,
};

console.log("\n=== Single Coupon ===");
const validation = validateCoupon(pctCoupon, cart);
console.log("Valid:", validation.isValid);
const applied = applyCoupon(pctCoupon, cart);
console.log(`Discount: $${applied.discountAmount.toFixed(2)}`);
console.log(`Reason: ${applied.reason ?? "OK"}`);

// Stacking
const freeShipCoupon: Coupon = {
  code: "FREESHIP",
  type: "free_shipping",
  value: 0,
  minOrderValue: 0,
  validFrom: new Date("2025-01-01"),
  validUntil: new Date("2030-12-31"),
  usageLimit: 1000,
  usedCount: 0,
  isStackable: true,
};

console.log("\n=== Stacking Coupons ===");
const stacked = applyCoupons([pctCoupon, freeShipCoupon], cart);
console.log(`Total discount: $${stacked.totalDiscount.toFixed(2)}`);
console.log(`Final total: $${stacked.finalTotal.toFixed(2)}`);
for (const ac of stacked.appliedCoupons) {
  console.log(`  ${ac.coupon.code}: $${ac.discountAmount.toFixed(2)}${ac.reason ? ` (${ac.reason})` : ""}`);
}

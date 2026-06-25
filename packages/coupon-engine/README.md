# Coupon Engine

Generate, validate, and stack promotional coupon codes with support for percentage discounts, fixed amounts, free shipping, and BOGO offers.

## Install

```bash
npm install @ecommerce-toolkit/coupon-engine
```

## Usage

```typescript
import { generateCouponCode, validateCoupon, applyCoupon, applyCoupons } from "@ecommerce-toolkit/coupon-engine";

// Generate a code
const code = generateCouponCode("SUMMER", 8);
// → "SUMMER-A3B7C2D5E"

// Validate and apply
const validation = validateCoupon(coupon, cart);
const discount = applyCoupon(coupon, cart);
// → { discountAmount: 40, appliedTo: [...] }

// Stack multiple coupons
const result = applyCoupons([pctCoupon, freeShipCoupon], cart);
// → { totalDiscount: 52.99, finalTotal: 376.97, ... }
```

### Coupon Types

| Type | Description | Example |
|------|-------------|---------|
| `percentage` | % off entire order | 20% off |
| `fixed_amount` | Fixed $ off | $10 off |
| `free_shipping` | Waive shipping cost | — |
| `buy_x_get_y` | Free cheapest items | BOGO |

### Validation Rules

- Expiry date
- Usage limits
- Minimum order value
- SKU/category restrictions
- Customer-specific coupons
- Stacking rules (non-stackable blocks further discounts)

## Business Value

Flexible coupon engines increase conversion by 15-25% during promotional periods. Stacking support enables complex promotions (e.g., "20% off + free shipping") while preventing abuse.

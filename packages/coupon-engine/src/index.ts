export type DiscountType =
  | "percentage"
  | "fixed_amount"
  | "buy_x_get_y"
  | "free_shipping";

export interface Coupon {
  code: string;
  type: DiscountType;
  value: number;
  minOrderValue: number;
  maxDiscountCap?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  applicableSkus?: string[];
  applicableCategories?: string[];
  isStackable: boolean;
  customerId?: string;
}

export interface CartItem {
  sku: string;
  category: string;
  price: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  customerId: string;
}

export interface DiscountResult {
  coupon: Coupon;
  discountAmount: number;
  appliedTo: CartItem[];
  reason?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StackingResult {
  appliedCoupons: DiscountResult[];
  totalDiscount: number;
  finalTotal: number;
  remainingPotential: number;
}

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O/0/I/1/L

function luhnChecksum(code: string): string {
  const cleaned = code.replace(/[^A-Z0-9]/g, "");
  let sum = 0;
  let alternate = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n: number;
    const char = cleaned[i]!;
    if (/[A-Z]/.test(char)) {
      n = char.charCodeAt(0) - 55; // A=10, B=11, ...
    } else {
      n = Number.parseInt(char, 10);
    }
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = Math.floor(n / 10) + (n % 10);
      }
    }
    sum += n;
    alternate = !alternate;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return String(checkDigit);
}

export function generateCouponCode(
  prefix?: string,
  length = 8,
  _charset = CHARSET,
): string {
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CHARSET.length);
    chars.push(CHARSET[idx]!);
  }
  const base = chars.join("");
  const checksum = luhnChecksum(base);
  const code = prefix ? `${prefix.toUpperCase()}-${base}${checksum}` : `${base}${checksum}`;
  return code;
}

export function batchGenerateCoupons(
  count: number,
  prefix?: string,
  length = 8,
): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateCouponCode(prefix, length));
  }
  return Array.from(codes);
}

export function validateCoupon(
  coupon: Coupon,
  cart: Cart,
): CouponValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = new Date();

  if (now < new Date(coupon.validFrom)) {
    errors.push("Coupon is not yet valid");
  }

  if (now > new Date(coupon.validUntil)) {
    errors.push("Coupon has expired");
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    errors.push("Coupon usage limit reached");
  }

  if (cart.subtotal < coupon.minOrderValue) {
    errors.push(
      `Minimum order value of $${coupon.minOrderValue.toFixed(2)} not met (current: $${cart.subtotal.toFixed(2)})`,
    );
  }

  if (coupon.customerId && coupon.customerId !== cart.customerId) {
    errors.push("Coupon is restricted to a different customer");
  }

  if (coupon.applicableSkus && coupon.applicableSkus.length > 0) {
    const hasApplicable = cart.items.some((item) =>
      coupon.applicableSkus!.includes(item.sku),
    );
    if (!hasApplicable) {
      errors.push("No applicable items in cart for this coupon");
    }
  }

  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    const hasCategory = cart.items.some((item) =>
      coupon.applicableCategories!.includes(item.category),
    );
    if (!hasCategory) {
      errors.push("No items from applicable categories in cart");
    }
  }

  if (coupon.type === "buy_x_get_y" && coupon.value < 1) {
    warnings.push("Buy X Get Y: value should be at least 1 (free item count)");
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function applyCoupon(coupon: Coupon, cart: Cart): DiscountResult {
  const validation = validateCoupon(coupon, cart);
  if (!validation.isValid) {
    return {
      coupon,
      discountAmount: 0,
      appliedTo: [],
      reason: validation.errors.join("; "),
    };
  }

  let discountAmount = 0;
  let appliedTo: CartItem[] = [];

  switch (coupon.type) {
    case "percentage": {
      const applicableItems = getApplicableItems(coupon, cart);
      const applicableSubtotal = applicableItems.reduce(
        (s, item) => s + item.price * item.quantity,
        0,
      );
      discountAmount = (applicableSubtotal * coupon.value) / 100;
      if (coupon.maxDiscountCap !== undefined) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountCap);
      }
      appliedTo = applicableItems;
      break;
    }

    case "fixed_amount": {
      discountAmount = Math.min(coupon.value, cart.subtotal);
      appliedTo = [...cart.items];
      break;
    }

    case "free_shipping": {
      discountAmount = cart.shippingCost;
      appliedTo = [];
      break;
    }

    case "buy_x_get_y": {
      // Find cheapest qualifying item
      const applicable = getApplicableItems(coupon, cart);
      if (applicable.length > 0) {
        const sorted = [...applicable].sort((a, b) => a.price - b.price);
        const freeItems = Math.min(coupon.value, sorted.length);
        for (let i = 0; i < freeItems; i++) {
          discountAmount += sorted[i]?.price ?? 0;
        }
      }
      appliedTo = applicable.slice(0, coupon.value);
      break;
    }
  }

  return {
    coupon,
    discountAmount: Math.round(discountAmount * 100) / 100,
    appliedTo,
  };
}

function getApplicableItems(coupon: Coupon, cart: Cart): CartItem[] {
  let items = [...cart.items];

  if (coupon.applicableSkus && coupon.applicableSkus.length > 0) {
    items = items.filter((item) => coupon.applicableSkus!.includes(item.sku));
  }

  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    items = items.filter((item) =>
      coupon.applicableCategories!.includes(item.category),
    );
  }

  return items;
}

export function applyCoupons(
  coupons: Coupon[],
  cart: Cart,
): StackingResult {
  const appliedCoupons: DiscountResult[] = [];
  let remainingSubtotal = cart.subtotal;
  const remainingCart: Cart = { ...cart, items: [...cart.items], subtotal: cart.subtotal };

  for (const coupon of coupons) {
    if (!coupon.isStackable && appliedCoupons.length > 0) {
      appliedCoupons.push({
        coupon,
        discountAmount: 0,
        appliedTo: [],
        reason: "Non-stackable coupon cannot be combined with others",
      });
      continue;
    }

    const result = applyCoupon(coupon, remainingCart);
    if (result.discountAmount > 0) {
      appliedCoupons.push(result);
      remainingSubtotal -= result.discountAmount;
    } else {
      appliedCoupons.push(result);
    }
  }

  const totalDiscount = appliedCoupons.reduce(
    (s, r) => s + r.discountAmount,
    0,
  );

  return {
    appliedCoupons,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    finalTotal: Math.max(0, Math.round((cart.subtotal - totalDiscount) * 100) / 100),
    remainingPotential: Math.max(0, Math.round(remainingSubtotal * 100) / 100),
  };
}

export function estimateRedemption(
  coupon: Coupon,
  cart: Cart,
): { customerSavings: number; merchantCost: number; expectedRedemptionRate: number } {
  const result = applyCoupon(coupon, cart);
  const savings = result.discountAmount;

  // Redemption likelihood based on discount depth
  const discountDepth = cart.subtotal > 0 ? savings / cart.subtotal : 0;
  const expectedRedemptionRate = Math.min(discountDepth * 1.5, 0.3);

  return {
    customerSavings: savings,
    merchantCost: savings,
    expectedRedemptionRate: Math.round(expectedRedemptionRate * 10000) / 100,
  };
}

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
}

export interface AbandonedCart {
  cartId: string;
  customerId: string;
  items: CartItem[];
  totalValue: number;
  createdAt: Date;
  abandonedAt: Date;
  emailOptIn: boolean;
  previousOrders: number;
  daysSinceLastVisit: number;
  trafficSource: "direct" | "search" | "social" | "email" | "referral";
  hasDiscountCode?: boolean;
}

export interface RecoveryScore {
  cartId: string;
  score: number;
  tier: "hot" | "warm" | "cold" | "lost";
  factors: { positive: string[]; negative: string[] };
}

export interface RecoveryStrategy {
  cartId: string;
  strategy:
    | "email_reminder"
    | "discount_offer"
    | "urgency_scarcity"
    | "cross_sell"
    | "abandon_survey";
  discountAmount?: number;
  messageTemplate: string;
  timing: "immediate" | "1h" | "6h" | "24h" | "72h";
  expectedWinRate: number;
}

export function scoreRecoveryProbability(
  cart: AbandonedCart,
): RecoveryScore {
  const positive: string[] = [];
  const negative: string[] = [];

  let score = 0.3; // baseline

  // Previous orders → higher probability (up to +0.5)
  const orderBonus = Math.min(cart.previousOrders * 0.15, 0.5);
  score += orderBonus;
  if (orderBonus > 0) positive.push(`${cart.previousOrders} previous orders`);

  // Recency of last visit
  if (cart.daysSinceLastVisit < 1) {
    score += 0.2;
    positive.push("visited within 24h");
  } else if (cart.daysSinceLastVisit < 3) {
    score += 0.1;
    positive.push("visited within 3 days");
  } else if (cart.daysSinceLastVisit > 14) {
    score -= 0.1;
    negative.push("haven't visited in 2+ weeks");
  }

  // Email opt-in
  if (cart.emailOptIn) {
    score += 0.15;
    positive.push("email opt-in");
  }

  // Traffic source signals
  if (cart.trafficSource === "search") {
    score += 0.1;
    positive.push("high-intent search traffic");
  } else if (cart.trafficSource === "email") {
    score += 0.05;
  } else if (cart.trafficSource === "social") {
    score -= 0.05;
    negative.push("low-intent social traffic");
  }

  // Cart value penalty (larger carts have lower recovery)
  if (cart.totalValue > 500) {
    score -= 0.15;
    negative.push(`high value cart ($${cart.totalValue})`);
  } else if (cart.totalValue > 100) {
    score -= 0.05;
  }

  // Past discount usage pattern
  if (cart.hasDiscountCode) {
    score -= 0.05;
    negative.push("previously used discount");
  }

  // Clamp to 0-1
  score = Math.max(0, Math.min(1, score));

  let tier: RecoveryScore["tier"];
  if (score > 0.6) tier = "hot";
  else if (score > 0.4) tier = "warm";
  else if (score > 0.2) tier = "cold";
  else tier = "lost";

  return {
    cartId: cart.cartId,
    score: Math.round(score * 100) / 100,
    tier,
    factors: { positive, negative },
  };
}

export function suggestStrategy(
  cart: AbandonedCart,
  score: RecoveryScore,
): RecoveryStrategy {
  const base: Pick<RecoveryStrategy, "cartId"> = { cartId: cart.cartId };

  if (score.tier === "hot" && cart.totalValue > 200) {
    return {
      ...base,
      strategy: "urgency_scarcity",
      messageTemplate:
        "Your items are in high demand! Complete your purchase now before they sell out.",
      timing: "1h",
      expectedWinRate: 0.35,
    };
  }

  if (score.tier === "warm") {
    const discountPct =
      cart.totalValue > 300 ? 15 : cart.totalValue > 100 ? 10 : 5;
    return {
      ...base,
      strategy: "discount_offer",
      discountAmount: discountPct,
      messageTemplate: `Here's ${discountPct}% off your cart — complete your order today!`,
      timing: "6h",
      expectedWinRate: 0.25,
    };
  }

  if (score.tier === "cold") {
    return {
      ...base,
      strategy: "email_reminder",
      messageTemplate:
        "You left something behind! Your cart is still waiting for you.",
      timing: "24h",
      expectedWinRate: 0.12,
    };
  }

  // lost
  return {
    ...base,
    strategy: "abandon_survey",
    messageTemplate:
      "We noticed you didn't complete your purchase. Help us improve!",
    timing: "72h",
    expectedWinRate: 0.05,
  };
}

export function calculateWinRate(
  carts: AbandonedCart[],
  _strategies: RecoveryStrategy[],
  recovered: string[],
): number {
  if (carts.length === 0) return 0;
  return Math.round((recovered.length / carts.length) * 10000) / 100;
}

export function batchScoreCarts(
  carts: AbandonedCart[],
): RecoveryScore[] {
  return carts.map(scoreRecoveryProbability);
}

export function segmentByRecoveryTier(
  carts: AbandonedCart[],
  scores: RecoveryScore[],
): { hot: AbandonedCart[]; warm: AbandonedCart[]; cold: AbandonedCart[]; lost: AbandonedCart[] } {
  const segmented = { hot: [] as AbandonedCart[], warm: [] as AbandonedCart[], cold: [] as AbandonedCart[], lost: [] as AbandonedCart[] };

  const scoreMap = new Map(scores.map((s) => [s.cartId, s]));
  for (const cart of carts) {
    const s = scoreMap.get(cart.cartId);
    const tier = s?.tier ?? "lost";
    segmented[tier].push(cart);
  }

  return segmented;
}

export function estimateRevenueImpact(
  carts: AbandonedCart[],
  scores: RecoveryScore[],
  averageDiscount: number,
): {
  totalAbandonedValue: number;
  expectedRecoveredValue: number;
  expectedRevenueAfterDiscount: number;
  recoveryRate: number;
} {
  const totalAbandonedValue = carts.reduce((s, c) => s + c.totalValue, 0);

  const scoreMap = new Map(scores.map((s) => [s.cartId, s.score]));
  let expectedRecoveredValue = 0;

  for (const cart of carts) {
    const score = scoreMap.get(cart.cartId) ?? 0;
    expectedRecoveredValue += cart.totalValue * score;
  }

  const discountMultiplier = 1 - averageDiscount / 100;

  return {
    totalAbandonedValue: Math.round(totalAbandonedValue * 100) / 100,
    expectedRecoveredValue: Math.round(expectedRecoveredValue * 100) / 100,
    expectedRevenueAfterDiscount:
      Math.round(expectedRecoveredValue * discountMultiplier * 100) / 100,
    recoveryRate:
      carts.length > 0
        ? Math.round((expectedRecoveredValue / totalAbandonedValue) * 10000) /
          100
        : 0,
  };
}

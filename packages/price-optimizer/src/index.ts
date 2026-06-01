export interface PricePoint {
  price: number;
  quantitySold: number;
  date: Date;
  productId: string;
  revenue?: number;
}

export interface PriceElasticity {
  productId: string;
  elasticityCoefficient: number;
  interpretation: "elastic" | "inelastic" | "unit-elastic";
  confidence: "low" | "medium" | "high";
}

export interface OptimalPrice {
  currentPrice: number;
  suggestedPrice: number;
  expectedRevenueChange: number;
  expectedVolumeChange: number;
  reasoning: string;
}

export interface PriceSegment {
  min: number;
  max: number;
  elasticity: number;
  optimalPrice: number;
  revenue: number;
}

function linearRegression(
  values: { x: number; y: number }[],
): { slope: number; intercept: number; rSquared: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 1 };

  const sumX = values.reduce((s, v) => s + v.x, 0);
  const sumY = values.reduce((s, v) => s + v.y, 0);
  const sumXY = values.reduce((s, v) => s + v.x * v.y, 0);
  const sumX2 = values.reduce((s, v) => s + v.x * v.x, 0);
  const sumY2 = values.reduce((s, v) => s + v.y * v.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = values.reduce(
    (s, v) => s + (v.y - (slope * v.x + intercept)) ** 2,
    0,
  );
  const ssTot = values.reduce((s, v) => s + (v.y - sumY / n) ** 2, 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared: Math.max(0, rSquared) };
}

export function calculateElasticity(
  pricePoints: PricePoint[],
): PriceElasticity {
  if (pricePoints.length === 0) {
    return {
      productId: "unknown",
      elasticityCoefficient: 0,
      interpretation: "unit-elastic",
      confidence: "low",
    };
  }

  // Sort by date
  const sorted = [...pricePoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Compute log-log regression: ln(quantity) vs ln(price)
  const logValues: { x: number; y: number }[] = [];
  for (const pp of sorted) {
    if (pp.price > 0 && pp.quantitySold > 0) {
      logValues.push({
        x: Math.log(pp.price),
        y: Math.log(pp.quantitySold),
      });
    }
  }

  if (logValues.length < 2) {
    return {
      productId: sorted[0]?.productId ?? "unknown",
      elasticityCoefficient: 0,
      interpretation: "unit-elastic",
      confidence: "low",
    };
  }

  const reg = linearRegression(logValues);
  // In log-log regression, slope = elasticity
  const elasticity = reg.slope;

  let interpretation: PriceElasticity["interpretation"];
  if (Math.abs(elasticity) > 1.05) interpretation = "elastic";
  else if (Math.abs(elasticity) < 0.95) interpretation = "inelastic";
  else interpretation = "unit-elastic";

  let confidence: PriceElasticity["confidence"];
  if (reg.rSquared > 0.8) confidence = "high";
  else if (reg.rSquared > 0.5) confidence = "medium";
  else confidence = "low";

  return {
    productId: sorted[0]?.productId ?? "unknown",
    elasticityCoefficient: Math.round(elasticity * 100) / 100,
    interpretation,
    confidence,
  };
}

export function calculateRevenueImpact(
  currentPrice: number,
  newPrice: number,
  currentQuantity: number,
  elasticity: number,
): { revenueChange: number; volumeChange: number; newRevenue: number } {
  const priceChangePercent = (newPrice - currentPrice) / currentPrice;
  const volumeChangePercent = elasticity * priceChangePercent;
  const newQuantity = currentQuantity * (1 + volumeChangePercent);
  const currentRevenue = currentPrice * currentQuantity;
  const newRevenue = newPrice * newQuantity;

  return {
    revenueChange: newRevenue - currentRevenue,
    volumeChange: Math.round(volumeChangePercent * 10000) / 100,
    newRevenue: Math.round(newRevenue * 100) / 100,
  };
}

export function suggestOptimalPrice(
  pricePoints: PricePoint[],
  costPerUnit: number,
): OptimalPrice {
  const elasticity = calculateElasticity(pricePoints);
  const sorted = [...pricePoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const latest = sorted[sorted.length - 1];
  if (!latest) {
    return {
      currentPrice: 0,
      suggestedPrice: 0,
      expectedRevenueChange: 0,
      expectedVolumeChange: 0,
      reasoning: "No price points provided",
    };
  }

  const currentPrice = latest.price;
  const currentQty = latest.quantitySold;
  const e = elasticity.elasticityCoefficient;

  // Search for price that maximizes profit
  let bestPrice = currentPrice;
  let bestProfit = (currentPrice - costPerUnit) * currentQty;

  // Consider prices from 50% to 200% of current in 5% steps
  for (let pct = 50; pct <= 200; pct += 5) {
    const candidatePrice = currentPrice * (pct / 100);
    if (candidatePrice <= costPerUnit) continue;

    const impact = calculateRevenueImpact(currentPrice, candidatePrice, currentQty, e);
    const candidateQty = currentQty * (1 + impact.volumeChange / 100);
    const profit = (candidatePrice - costPerUnit) * candidateQty;

    if (profit > bestProfit) {
      bestProfit = profit;
      bestPrice = candidatePrice;
    }
  }

  const impact = calculateRevenueImpact(currentPrice, bestPrice, currentQty, e);

  let reasoning: string;
  if (Math.abs(bestPrice - currentPrice) / currentPrice < 0.05) {
    reasoning = "Current price is near-optimal based on demand elasticity";
  } else if (bestPrice > currentPrice) {
    reasoning = `Demand is ${elasticity.interpretation} (PED=${e}). Raising price to $${bestPrice.toFixed(2)} maximizes profit.`;
  } else {
    reasoning = `Demand is ${elasticity.interpretation} (PED=${e}). Lowering price to $${bestPrice.toFixed(2)} drives volume and profit.`;
  }

  return {
    currentPrice: Math.round(currentPrice * 100) / 100,
    suggestedPrice: Math.round(bestPrice * 100) / 100,
    expectedRevenueChange: Math.round(impact.revenueChange * 100) / 100,
    expectedVolumeChange: impact.volumeChange,
    reasoning,
  };
}

export function segmentPricing(
  pricePoints: PricePoint[],
  segments: number,
): PriceSegment[] {
  if (pricePoints.length === 0 || segments < 1) return [];

  const sorted = [...pricePoints].sort((a, b) => a.price - b.price);
  const minPrice = sorted[0]?.price ?? 0;
  const maxPrice = sorted[sorted.length - 1]?.price ?? 0;
  const range = maxPrice - minPrice;
  const step = range / segments;

  const result: PriceSegment[] = [];
  for (let i = 0; i < segments; i++) {
    const segMin = minPrice + i * step;
    const segMax = segMin + step;
    const inSegment = sorted.filter(
      (p) => p.price >= segMin && p.price < segMax,
    );

    if (inSegment.length >= 2) {
      const elasticity = calculateElasticity(inSegment);
      const optimal = suggestOptimalPrice(inSegment, 0);
      result.push({
        min: Math.round(segMin * 100) / 100,
        max: Math.round(segMax * 100) / 100,
        elasticity: elasticity.elasticityCoefficient,
        optimalPrice: optimal.suggestedPrice,
        revenue: inSegment.reduce((s, p) => s + (p.revenue ?? p.price * p.quantitySold), 0),
      });
    }
  }

  return result;
}

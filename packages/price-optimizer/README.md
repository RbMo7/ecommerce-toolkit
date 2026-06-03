# Price Optimizer

Analyze price elasticity of demand (PED) and suggest optimal pricing strategies using log-log regression on historical price-quantity data.

## Install

```bash
npm install @ecommerce-toolkit/price-optimizer
```

## CLI Usage

```bash
# Analyze price elasticity from historical data
price-optimize analyze ./price-history.json --cost 25

# Simulate a price change
price-optimize simulate --current 50 --new 45 --quantity 1000 --elasticity -1.5

# Segment pricing tiers
price-optimize segment ./price-history.json --segments 4
```

## Library API

```typescript
import { calculateElasticity, suggestOptimalPrice, calculateRevenueImpact } from "@ecommerce-toolkit/price-optimizer";

const elasticity = calculateElasticity(pricePoints);
// → { elasticityCoefficient: -1.8, interpretation: "elastic", confidence: "high" }

const optimal = suggestOptimalPrice(pricePoints, costPerUnit);
// → { currentPrice: 50, suggestedPrice: 45, expectedRevenueChange: 1200, ... }

const impact = calculateRevenueImpact(100, 90, 100, -2);
// → { revenueChange: 800, volumeChange: 20, newRevenue: 10800 }
```

## Methodology

Price elasticity is computed via log-log regression: `ln(Q) = α + β·ln(P)` where β is the elasticity coefficient.

- `|β| > 1`: Elastic demand — price changes cause proportionally larger volume changes
- `|β| < 1`: Inelastic demand — volume is relatively insensitive to price
- `R² > 0.8`: High confidence in the estimate

## Business Value

Data-driven pricing decisions increase revenue by 2-8% compared to cost-plus or competitor-based pricing. This tool helps merchandisers identify whether to raise prices (inelastic products) or lower them (elastic products) to maximize revenue.

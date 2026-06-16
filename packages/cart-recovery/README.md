# Cart Recovery Engine

Analyze abandoned carts, score win-back probability, and suggest optimal recovery strategies. Helps ecommerce teams recover lost revenue with targeted interventions.

## Install

```bash
npm install @ecommerce-toolkit/cart-recovery
```

## Usage

```typescript
import { scoreRecoveryProbability, suggestStrategy } from "@ecommerce-toolkit/cart-recovery";

const score = scoreRecoveryProbability(cart);
// { score: 0.75, tier: "hot", factors: { positive: ["3 previous orders"], negative: [] } }

const strategy = suggestStrategy(cart, score);
// { strategy: "discount_offer", discountAmount: 10, timing: "6h", expectedWinRate: 0.25 }
```

### Recovery Tiers

| Tier  | Score Range | Recommended Action        |
|-------|-------------|---------------------------|
| hot   | > 0.6       | Urgency/scarcity messaging |
| warm  | 0.4 - 0.6   | Discount offer (5-15%)     |
| cold  | 0.2 - 0.4   | Email reminder             |
| lost  | ≤ 0.2       | Abandon survey             |

### Scoring Signals

- **Positive**: Previous orders (+0.15 each), recent visit (+0.2), email opt-in (+0.15), search traffic (+0.1)
- **Negative**: High cart value (-0.1 per $100 over $50), social traffic (-0.05), past discount use (-0.05)

## Business Value

Targeted cart recovery campaigns recover 10-15% of abandoned revenue. The tiered approach ensures high-value customers get urgent attention while minimizing discount waste.

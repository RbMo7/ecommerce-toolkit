# Product Recommender

Product recommendation engine with content-based similarity and collaborative filtering. Implement "customers also bought" and personalized recommendations without external ML dependencies.

## Install

```bash
npm install @ecommerce-toolkit/product-recommender
```

## Usage

```typescript
import { findSimilarProducts, recommendFrequentlyBoughtTogether } from "@ecommerce-toolkit/product-recommender";

// Content-based: find products similar to a target
const similar = findSimilarProducts(headphones, catalog, 5);

// Collaborative: what do other customers buy together?
const fbt = recommendFrequentlyBoughtTogether("P1", allBehaviors, catalog, 3);

// Trending products
const trending = popularProducts(behaviors, products, 5, 30);
```

### Recommendation Types

| Function | Algorithm | Use Case |
|----------|-----------|----------|
| `findSimilarProducts` | Category + tag + price + attribute similarity | Product detail page |
| `recommendForUser` | Collaborative filtering via similar users | Homepage personalization |
| `recommendFrequentlyBoughtTogether` | Co-purchase frequency analysis | Cart page cross-sell |
| `popularProducts` | Recent purchase velocity | Trending section |

## Business Value

Product recommendations drive 10-30% of ecommerce revenue. This engine enables the three core recommendation surfaces (detail page, cart, homepage) without SaaS fees.

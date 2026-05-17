# Ecommerce Toolkit

A monorepo of 8 practical ecommerce system tools covering inventory management, pricing optimization, fulfillment operations, customer analytics, and promotional engines.

Built with TypeScript, strict types, and zero external ML dependencies. Each package is independently usable with a clear API surface and CLI.

## Packages

| Package | Domain | Type | Description |
|---------|--------|------|-------------|
| [inventory-auditor](./packages/inventory-auditor) | Operations | CLI + Library | Cycle counting, discrepancy analysis, audit prioritization |
| [sku-manager](./packages/sku-manager) | Operations | Library | SKU generation, validation, parsing with checksum verification |
| [price-optimizer](./packages/price-optimizer) | Analytics | CLI + Library | Price elasticity modeling (log-log regression), optimal pricing |
| [fulfillment-tracker](./packages/fulfillment-tracker) | Operations | CLI + Library | Order pipeline monitoring, SLA breach detection, bottleneck ID |
| [review-analyzer](./packages/review-analyzer) | Analytics | CLI + Library | Sentiment scoring, keyword extraction, actionable insights |
| [cart-recovery](./packages/cart-recovery) | Customer | Library | Abandoned cart scoring, win-back strategy, revenue impact estimation |
| [product-recommender](./packages/product-recommender) | Analytics | Library | Content-based + collaborative filtering recommendations |
| [coupon-engine](./packages/coupon-engine) | Customer | Library | Code generation, validation, stacking, BOGO/free shipping |

## Quick Start

```bash
git clone https://github.com/RbMo7/ecommerce-toolkit
cd ecommerce-toolkit
npm install
npm run build
npm test
```

### Try a tool

```bash
# Inventory audit
npx -w packages/inventory-auditor start ./packages/inventory-auditor/src/example-data.json

# Price optimization
npx -w packages/price-optimizer start ./packages/price-optimizer/src/example-data.json --cost 25
```

## Project Structure

```
ecommerce-toolkit/
├── packages/
│   ├── inventory-auditor/
│   ├── sku-manager/
│   ├── price-optimizer/
│   ├── fulfillment-tracker/
│   ├── review-analyzer/
│   ├── cart-recovery/
│   ├── product-recommender/
│   └── coupon-engine/
├── package.json          # Workspace root
├── tsconfig.base.json    # Shared TS config
├── vitest.config.ts
└── biome.json            # Shared lint & format
```

## Development

```bash
npm run build        # Build all packages
npm test             # Run all tests
npm run lint         # Biome lint
npm run format       # Biome format
```

All packages use strict TypeScript with no unchecked index access, no `any` types, and ES2022 module output.

## Why These Tools?

Ecommerce platforms need practical, battle-tested solutions for:

- **Inventory accuracy**: Cycle counting programs reduce write-offs by 20-40%
- **Pricing strategy**: Data-driven pricing lifts revenue by 2-8%
- **Fulfillment efficiency**: Bottleneck detection cuts fulfillment times 15-30%
- **Customer retention**: Cart recovery campaigns recover 10-15% of abandoned revenue
- **Product discovery**: Recommendations drive 10-30% of ecommerce revenue
- **Promotional ops**: Flexible coupon engines increase conversion 15-25%

# Inventory Auditor

A CLI tool and library for ecommerce inventory cycle counting, discrepancy analysis, and audit priority scoring. Helps warehouse and retail ops teams identify which SKUs need immediate recounting before monthly close.

## Install

```bash
npm install @ecommerce-toolkit/inventory-auditor
```

## CLI Usage

```bash
# Generate an audit report from inventory records
inventory-audit check ./inventory.json

# Output as JSON
inventory-audit check ./inventory.json --format json

# Filter by severity threshold
inventory-audit check ./inventory.json --severity-threshold high

# Show items overdue for audit (not counted in 30+ days)
inventory-audit check ./inventory.json --schedule 30
```

## Library API

```typescript
import {
  generateAuditReport,
  calculateDiscrepancies,
  suggestAuditSchedule,
} from "@ecommerce-toolkit/inventory-auditor";

const report = generateAuditReport(records);
// {
//   summary: { totalItems, totalDiscrepancies, criticalCount, ... },
//   discrepancies: [{ sku, variance, variancePercent, severity }],
//   priorityItems: [{ sku, score, reason }]
// }
```

### Severity Thresholds

| Variance | Severity |
|----------|----------|
| < 2%     | low      |
| 2-5%     | medium   |
| 5-10%    | high     |
| > 10%    | critical |

## Business Value

Retailers using systematic cycle counting programs reduce inventory write-offs by 20-40%. This tool automates the prioritization step so teams focus on the most impactful discrepancies first.

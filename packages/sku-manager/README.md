# SKU Manager

Generate, validate, and parse SKU codes with embedded attribute encoding and Luhn checksum verification. Enables standardized product identification across warehouses and marketplaces.

## Install

```bash
npm install @ecommerce-toolkit/sku-manager
```

## Usage

```typescript
import { createSkuSpec, generateSku, parseSku, validateSku } from "@ecommerce-toolkit/sku-manager";

const spec = createSkuSpec({ prefix: "PRD", useChecksum: true });

// Generate
const sku = generateSku(spec, "electronics", { color: "black" });
// → "PRD-001-003-A"

// Parse
const parsed = parseSku(sku, spec);
// → { prefix: "PRD", category: "electronics", attributes: { attr1: "003" }, isValid: true }

// Validate (catches typos in manual entry)
const isValid = validateSku(sku, spec);
```

### SKU Format

```
{prefix}-{category_code}-{attributes}{separator}{checksum}
PRD    - 001          - 003005   - A
```

- **prefix**: Product line identifier
- **category_code**: Digit-encoded product category
- **attributes**: Digit-encoded attribute values (color, size, material...)
- **checksum**: Luhn mod-10 encoded as A-Z for error detection

## Business Value

Standardized SKUs eliminate cross-warehouse identification errors, prevent receiving mistakes, and enable automated reordering systems. The checksum catches manual entry errors at point of scan.

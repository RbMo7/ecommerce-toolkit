import { createSkuSpec, generateSku, parseSku, validateSku, suggestSku } from "./index.js";

const spec = createSkuSpec({});

const products = [
  { category: "electronics", attributes: { color: "black", size: "pro" } },
  { category: "clothing", attributes: { size: "xl", color: "navy" } },
  { category: "home", attributes: { material: "wood", finish: "oak" } },
  { category: "food", attributes: { variant: "organic", size: "family" } },
  { category: "books", attributes: { genre: "fiction", format: "hardcover" } },
];

console.log("Generated SKUs:");
for (const p of products) {
  const sku = generateSku(spec, p.category, p.attributes);
  const parsed = parseSku(sku, spec);
  console.log(`  ${sku} → category=${parsed.category}, valid=${parsed.isValid}`);

  // Demonstrate checksum detection
  const badSku = sku.replace(/.$/, "X");
  const suggested = suggestSku(badSku, spec);
  console.log(`    (tampered: ${badSku} → suggested: ${suggested}, valid=${validateSku(suggested, spec)})`);
}

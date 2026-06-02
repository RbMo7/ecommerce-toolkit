#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import {
  calculateElasticity,
  suggestOptimalPrice,
  calculateRevenueImpact,
  segmentPricing,
} from "./index.js";
import type { PricePoint } from "./index.js";

function usage(): never {
  console.error([
    "Usage:",
    "  price-optimize analyze <file.json> [--cost <unit_cost>]",
    "  price-optimize simulate --current <price> --new <price> --quantity <n> --elasticity <e>",
    "  price-optimize segment <file.json> --segments <n>",
    "  price-optimize --help",
    "",
    "Examples:",
    "  price-optimize analyze ./prices.json --cost 25",
    "  price-optimize simulate --current 50 --new 45 --quantity 1000 --elasticity -1.5",
    "  price-optimize segment ./prices.json --segments 4",
  ].join("\n"));
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) usage();

const cmd = args[0];

if (cmd === "simulate") {
  const currentIdx = args.indexOf("--current");
  const newIdx = args.indexOf("--new");
  const qtyIdx = args.indexOf("--quantity");
  const elIdx = args.indexOf("--elasticity");

  if (currentIdx === -1 || newIdx === -1 || qtyIdx === -1 || elIdx === -1) {
    console.error("Error: --current, --new, --quantity, and --elasticity are required");
    usage();
  }

  const current = Number(args[currentIdx + 1]);
  const newP = Number(args[newIdx + 1]);
  const qty = Number(args[qtyIdx + 1]);
  const el = Number(args[elIdx + 1]);

  if ([current, newP, qty, el].some(Number.isNaN)) {
    console.error("Error: all numeric values required");
    process.exit(1);
  }

  const result = calculateRevenueImpact(current, newP, qty, el);
  console.log("\nPrice Change Simulation:");
  console.log(`  Current price:    $${current.toFixed(2)}`);
  console.log(`  New price:        $${newP.toFixed(2)}`);
  console.log(`  Volume change:    ${result.volumeChange > 0 ? "+" : ""}${result.volumeChange}%`);
  console.log(`  Revenue change:   ${result.revenueChange > 0 ? "+" : ""}$${result.revenueChange.toFixed(2)}`);
  console.log(`  New revenue:      $${result.newRevenue.toFixed(2)}`);
  console.log();
  process.exit(0);
}

if (cmd !== "analyze" && cmd !== "segment") {
  console.error(`Unknown command: ${cmd}`);
  usage();
}

const filePath = args[1];
if (!filePath) {
  console.error("Error: missing file path");
  usage();
}

if (!existsSync(filePath)) {
  console.error(`Error: file not found: ${filePath}`);
  process.exit(1);
}

let rawData: string;
try {
  rawData = readFileSync(filePath, "utf-8");
} catch {
  console.error(`Error: failed to read file`);
  process.exit(1);
}

let pricePoints: PricePoint[];
try {
  const parsed = JSON.parse(rawData);
  pricePoints = Array.isArray(parsed) ? parsed : parsed.pricePoints ?? [];
  pricePoints = pricePoints.map((p: Partial<PricePoint>) => ({
    ...p,
    date: new Date(p.date ?? new Date()),
  }));
} catch (err) {
  console.error(`Error: invalid JSON: ${(err as Error).message}`);
  process.exit(1);
}

if (cmd === "analyze") {
  const costIdx = args.indexOf("--cost");
  const cost = costIdx !== -1 ? Number(args[costIdx + 1]) : 0;

  const elasticity = calculateElasticity(pricePoints);
  console.log("\nPrice Elasticity Analysis:");
  console.log(`  Product:          ${elasticity.productId}`);
  console.log(`  PED coefficient:  ${elasticity.elasticityCoefficient}`);
  console.log(`  Demand:           ${elasticity.interpretation}`);
  console.log(`  Confidence:       ${elasticity.confidence} (R² based)`);

  const optimal = suggestOptimalPrice(pricePoints, cost);
  console.log("\nOptimal Price Suggestion:");
  console.log(`  Current price:    $${optimal.currentPrice.toFixed(2)}`);
  console.log(`  Suggested price:  $${optimal.suggestedPrice.toFixed(2)}`);
  console.log(`  Revenue change:   ${optimal.expectedRevenueChange > 0 ? "+" : ""}$${optimal.expectedRevenueChange.toFixed(2)}`);
  console.log(`  Volume change:    ${optimal.expectedVolumeChange > 0 ? "+" : ""}${optimal.expectedVolumeChange}%`);
  console.log(`  Reasoning:        ${optimal.reasoning}`);
  console.log();

  const output = { elasticity, optimal, pricePoints: pricePoints.length };
  writeFileSync("price-optimization-report.json", JSON.stringify(output, null, 2));
}

if (cmd === "segment") {
  const segIdx = args.indexOf("--segments");
  const segments = segIdx !== -1 ? Number(args[segIdx + 1]) : 4;
  if (segments < 1) {
    console.error("Error: --segments must be >= 1");
    process.exit(1);
  }

  const segs = segmentPricing(pricePoints, segments);
  console.log("\nPrice Segmentation:");
  console.log(" Segment Range     | Elasticity | Opt. Price | Revenue ");
  console.log("───────────────────┼────────────┼───────────┼─────────");
  for (const s of segs) {
    console.log(
      ` $${s.min.toFixed(2)}-$${s.max.toFixed(2)}   | ${s.elasticity.toFixed(2)}       | $${s.optimalPrice.toFixed(2)}      | $${s.revenue.toFixed(2)}`,
    );
  }
  console.log();
}

#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { generateAuditReport, suggestAuditSchedule } from "./index.js";
import type { InventoryRecord } from "./index.js";

function usage(): never {
  console.error(
    [
      "Usage:",
      "  inventory-audit check <file.json> [options]",
      "",
      "Options:",
      "  --format <json|table>     Output format (default: table)",
      "  --schedule <days>         Show items overdue for audit since N days",
      "  --severity-threshold <s>  Minimum severity to show (low|medium|high|critical)",
      "  --help                    Show this help",
      "",
      "Examples:",
      "  inventory-audit check ./inventory.json",
      '  inventory-audit check ./inventory.json --format json --schedule 30',
    ].join("\n"),
  );
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) usage();

const cmd = args[0];
if (cmd !== "check") {
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
  console.error(`Error: failed to read file: ${filePath}`);
  process.exit(1);
}

let records: InventoryRecord[];
try {
  const parsed = JSON.parse(rawData);
  records = Array.isArray(parsed) ? parsed : parsed.records ?? [];
  if (!Array.isArray(records)) throw new Error("data is not an array");
} catch (err) {
  console.error(`Error: invalid JSON: ${(err as Error).message}`);
  process.exit(1);
}

const formatFlag = args.indexOf("--format");
const format = formatFlag !== -1 ? args[formatFlag + 1] ?? "table" : "table";

const scheduleFlag = args.indexOf("--schedule");
const scheduleDays =
  scheduleFlag !== -1 ? Number(args[scheduleFlag + 1]) : undefined;

const thresholdFlag = args.indexOf("--severity-threshold");
const threshold =
  thresholdFlag !== -1
    ? (args[thresholdFlag + 1] ?? "low")
    : "low";

const report = generateAuditReport(records);

const severityRank: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const thresholdRank = severityRank[threshold] ?? 0;
const filtered = report.discrepancies.filter(
  (d) => (severityRank[d.severity] ?? 0) >= thresholdRank,
);

if (format === "json") {
  const output = scheduleDays
    ? {
        ...report,
        discrepancies: filtered,
        overdueForAudit: suggestAuditSchedule(records, scheduleDays).map(
          (r) => ({ sku: r.sku, location: r.location, lastCounted: r.lastCounted }),
        ),
      }
    : { ...report, discrepancies: filtered };
  writeFileSync("inventory-audit-report.json", JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              INVENTORY AUDIT REPORT                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(
    `\nSummary: ${report.summary.totalItems} items, ${filtered.length} discrepancies`,
  );
  console.log(
    `Critical: ${report.summary.criticalCount}  High: ${report.summary.highCount}  Total variance: ${report.summary.totalVariance} units`,
  );

  if (filtered.length > 0) {
    console.log(`\nDiscrepancies (severity >= ${threshold}):`);
    console.log(
      " SKU          | Location      | Exp | Act | Var  | Var%  | Severity ",
    );
    console.log(
      "──────────────┼───────────────┼─────┼─────┼──────┼───────┼──────────",
    );
    for (const d of filtered) {
      console.log(
        ` ${d.sku.padEnd(12)} | ${d.location.padEnd(13)} | ${String(d.expectedQty).padEnd(3)} | ${String(d.actualQty).padEnd(3)} | ${String(d.variance).padEnd(4)} | ${String(d.variancePercent).padEnd(5)} | ${d.severity}`,
      );
    }
  }

  if (report.priorityItems.length > 0) {
    console.log("\nPriority Items (highest to lowest):");
    for (const p of report.priorityItems) {
      console.log(`  [${p.score.toFixed(1)}] ${p.sku} — ${p.reason}`);
    }
  }

  if (scheduleDays !== undefined) {
    const overdue = suggestAuditSchedule(records, scheduleDays);
    console.log(
      `\nItems overdue for audit (not counted in ${scheduleDays}+ days): ${overdue.length}`,
    );
    for (const r of overdue) {
      console.log(
        `  ${r.sku} @ ${r.location} — last counted: ${new Date(r.lastCounted).toLocaleDateString()}`,
      );
    }
  }

  console.log();
}

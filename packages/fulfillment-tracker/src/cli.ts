#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { generateFulfillmentReport, getOrdersAtRisk } from "./index.js";
import type { FulfillmentOrder } from "./index.js";

function usage(): never {
  console.error([
    "Usage:",
    "  fulfillment-track report <file.json>",
    "  fulfillment-track at-risk <file.json> --threshold <minutes>",
    "  fulfillment-track --help",
    "",
    "Examples:",
    "  fulfillment-track report ./orders.json",
    "  fulfillment-track at-risk ./orders.json --threshold 120",
  ].join("\n"));
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) usage();

const cmd = args[0];
if (cmd !== "report" && cmd !== "at-risk") {
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

let orders: FulfillmentOrder[];
try {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  orders = Array.isArray(parsed) ? parsed : parsed.orders ?? [];
  orders = orders.map((o: Partial<FulfillmentOrder>) => ({
    ...o,
    createdAt: new Date(o.createdAt ?? new Date()),
    statusChanges: (o.statusChanges ?? []).map((sc: Partial<StatusChange>) => ({
      ...sc,
      timestamp: new Date(sc.timestamp ?? new Date()),
    })),
    slaDeadline: o.slaDeadline ? new Date(o.slaDeadline) : undefined,
  }));
} catch (err) {
  console.error(`Error reading file: ${(err as Error).message}`);
  process.exit(1);
}

if (cmd === "report") {
  const report = generateFulfillmentReport(orders);
  console.log("\nFulfillment Pipeline Report");
  console.log("═══════════════════════════");
  console.log(
    `Total: ${report.summary.totalOrders} | Completed: ${report.summary.completedOrders} | In Progress: ${report.summary.inProgress}`,
  );
  console.log(
    `Avg Fulfillment: ${Math.round(report.summary.avgFulfillmentMinutes / 60)}h | SLA Compliance: ${report.summary.slaCompliancePercent}%`,
  );

  console.log("\nPipeline Stages:");
  console.log(" Stage      | Orders | Avg Time | SLA Br. | Bottleneck");
  console.log("────────────┼────────┼──────────┼─────────┼───────────");
  for (const s of report.pipeline) {
    const avgH = Math.round(s.avgMinutes / 60);
    console.log(
      ` ${s.name.padEnd(10)} | ${String(s.orderCount).padEnd(6)} | ${String(avgH).padEnd(8)}h | ${String(s.slaBreachCount).padEnd(7)} | ${s.bottleneckScore > 0 ? `${s.bottleneckScore.toFixed(1)}` : "-"}`,
    );
  }

  if (report.bottlenecks.length > 0) {
    console.log("\nBottlenecks (highest score first):");
    for (const b of report.bottlenecks) {
      console.log(`  [${b.score.toFixed(1)}] ${b.stage}: ${b.reason}`);
    }
  }

  if (report.slaBreaches.length > 0) {
    console.log(`\nSLA Breaches/Warnings: ${report.slaBreaches.length}`);
    for (const b of report.slaBreaches.slice(0, 10)) {
      console.log(
        `  ${b.severity === "breached" ? "🔴" : "⚠️"} ${b.orderId}: ${b.currentDurationMinutes}m / ${b.slaMinutes}m (${b.stage})`,
      );
    }
  }
  console.log();

  writeFileSync(
    "fulfillment-report.json",
    JSON.stringify(report, null, 2),
  );
}

if (cmd === "at-risk") {
  const thresholdIdx = args.indexOf("--threshold");
  const threshold =
    thresholdIdx !== -1 ? Number(args[thresholdIdx + 1]) : 120;
  if (Number.isNaN(threshold)) {
    console.error("Error: --threshold must be a number");
    process.exit(1);
  }

  const atRisk = getOrdersAtRisk(orders, threshold);
  if (atRisk.length === 0) {
    console.log("\nNo orders at risk within threshold.");
  } else {
    console.log(`\nOrders at risk (within ${threshold} min of SLA):`);
    for (const o of atRisk) {
      console.log(
        `  ${o.orderId} | ${o.priority} | ${o.status} | SKU: ${o.sku}`,
      );
    }
  }
  console.log();
}

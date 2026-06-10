#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import {
  summarizeReviews,
  generateInsights,
  trackTrends,
  analyzeSentiment,
} from "./index.js";
import type { Review } from "./index.js";

function usage(): never {
  console.error([
    "Usage:",
    "  review-analyze analyze <file.json>",
    "  review-analyze insights <file.json>",
    "  review-analyze trends <file.json> --interval <days>",
    "  review-analyze --help",
  ].join("\n"));
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) usage();

const cmd = args[0];
if (!["analyze", "insights", "trends"].includes(cmd)) {
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

let reviews: Review[];
try {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  reviews = (Array.isArray(parsed) ? parsed : parsed.reviews ?? []).map(
    (r: Partial<Review>) => ({ ...r, date: new Date(r.date ?? new Date()) }),
  );
} catch (err) {
  console.error(`Error: ${(err as Error).message}`);
  process.exit(1);
}

if (cmd === "analyze") {
  const productId = reviews[0]?.productId ?? "unknown";
  const summary = summarizeReviews(reviews, productId);

  console.log(`\nReview Summary: ${summary.productId}`);
  console.log("═══════════════════════════════");
  console.log(
    `Reviews: ${summary.totalReviews} | Avg Rating: ${summary.averageRating} ⭐`,
  );
  console.log(
    `Distribution: 5★:${summary.ratingDistribution[5]} 4★:${summary.ratingDistribution[4]} 3★:${summary.ratingDistribution[3]} 2★:${summary.ratingDistribution[2]} 1★:${summary.ratingDistribution[1]}`,
  );
  console.log(
    `Sentiment: ${summary.overallSentiment.positive.toFixed(1)} pos / ${summary.overallSentiment.negative.toFixed(1)} neg / ${summary.overallSentiment.neutral.toFixed(1)} neu (compound: ${summary.overallSentiment.compound.toFixed(2)})`,
  );

  if (summary.topKeywords.length > 0) {
    console.log("\nTop Keywords:");
    for (const k of summary.topKeywords.slice(0, 10)) {
      console.log(
        `  ${k.word.padEnd(16)} x${String(k.count).padEnd(4)} [${k.sentiment}] rel: ${k.relevance.toFixed(2)}`,
      );
    }
  }

  if (summary.trends.length > 0) {
    console.log("\nTrends:");
    for (const t of summary.trends) {
      console.log(`  ${t.period}: ${t.reviewCount} reviews, avg ${t.avgRating}`);
    }
  }
  console.log();

  writeFileSync(
    "review-analysis-report.json",
    JSON.stringify(summary, null, 2),
  );
}

if (cmd === "insights") {
  const insights = generateInsights(reviews);
  if (insights.length === 0) {
    console.log("\nNo actionable insights found.");
  } else {
    console.log("\nActionable Insights:");
    for (const ins of insights) {
      console.log(
        `  [${ins.type}] "${ins.keyword}" (${ins.frequency}x) — ${ins.suggestedAction}`,
      );
    }
  }
  console.log();
}

if (cmd === "trends") {
  const intervalIdx = args.indexOf("--interval");
  const interval =
    intervalIdx !== -1 ? Number(args[intervalIdx + 1]) : 30;
  const trends = trackTrends(reviews, interval);
  writeFileSync("review-trends.json", JSON.stringify(trends, null, 2));
  console.log(JSON.stringify(trends, null, 2));
}

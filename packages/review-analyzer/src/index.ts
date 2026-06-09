export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  date: Date;
  verifiedPurchase: boolean;
}

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
  compound: number;
}

export interface Keyword {
  word: string;
  count: number;
  sentiment: "positive" | "negative" | "neutral";
  relevance: number;
}

export interface ReviewSummary {
  productId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  overallSentiment: SentimentScore;
  topKeywords: Keyword[];
  trends: { period: string; avgRating: number; reviewCount: number }[];
}

export interface ActionableInsight {
  type: "praise" | "complaint" | "suggestion" | "bug";
  keyword: string;
  frequency: number;
  impact: "low" | "medium" | "high";
  suggestedAction: string;
}

const POSITIVE_WORDS = new Set([
  "good", "great", "excellent", "amazing", "love", "perfect", "beautiful",
  "comfortable", "durable", "fantastic", "wonderful", "best", "awesome",
  "outstanding", "superb", "brilliant", "impressive", "satisfied", "happy",
  "delighted", "pleased", "convenient", "reliable", "fast", "quick",
  "smooth", "easy", "intuitive", "high", "quality", "worth", "recommend",
  "nice", "clean", "bright", "soft", "sturdy", "solid", "elegant",
  "stylish", "effective", "helpful", "handy", "lightweight", "compact",
  "quiet", "powerful", "efficient", "affordable", "reasonable",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "broken", "broke", "cheap", "slow",
  "ugly", "uncomfortable", "defective", "horrible", "worst", "poor",
  "disappointed", "disappointing", "frustrating", "useless", "waste",
  "return", "refund", "damaged", "faulty", "flimsy", "cheaply",
  "unreliable", "difficult", "complicated", "confusing", "annoying",
  "mediocre", "overpriced", "expensive", "unhappy", "regret", "problem",
  "issue", "failure", "failed", "stuck", "lag", "glitch", "crash",
  "noisy", "heavy", "bulky", "unstable", "inconsistent",
]);

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "it", "its", "this",
  "that", "i", "my", "me", "we", "our", "you", "your", "not", "no",
  "very", "too", "so", "just", "really", "also", "be", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should",
  "can", "may", "might", "been", "being", "am", "are", "were", "if",
  "then", "than", "up", "out", "about", "into", "over", "after",
  "all", "each", "every", "both", "few", "more", "most", "some",
  "such", "only", "own", "same", "so", "than", "too", "very", "other",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export function analyzeSentiment(text: string): SentimentScore {
  const words = tokenize(text);
  if (words.length === 0) {
    return { positive: 0, negative: 0, neutral: 1, compound: 0 };
  }

  let posCount = 0;
  let negCount = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) posCount++;
    if (NEGATIVE_WORDS.has(w)) negCount++;
  }

  const total = words.length;
  const pos = posCount / total;
  const neg = negCount / total;
  const neutral = 1 - pos - neg;

  // Compound score: tanh of net sentiment proportion
  const net = (posCount - negCount) / total;
  const compound = Math.tanh(net * 5);

  return {
    positive: Math.round(pos * 1000) / 1000,
    negative: Math.round(neg * 1000) / 1000,
    neutral: Math.max(0, Math.round(neutral * 1000) / 1000),
    compound: Math.round(compound * 1000) / 1000,
  };
}

export function extractKeywords(
  reviews: Review[],
  minCount = 2,
): Keyword[] {
  const wordCounts = new Map<string, { count: number; sentimentScores: number[] }>();

  for (const review of reviews) {
    const words = tokenize(`${review.title} ${review.body}`);
    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      const entry = wordCounts.get(word) ?? {
        count: 0,
        sentimentScores: [],
      };
      entry.count++;
      // Rating determines sentiment association
      if (review.rating > 3) entry.sentimentScores.push(1);
      else if (review.rating < 3) entry.sentimentScores.push(-1);
      else entry.sentimentScores.push(0);
      wordCounts.set(word, entry);
    }
  }

  const totalDocs = reviews.length;
  const result: Keyword[] = [];

  for (const [word, data] of wordCounts) {
    if (data.count < minCount) continue;

    const avgSentiment =
      data.sentimentScores.reduce((s, v) => s + v, 0) /
      data.sentimentScores.length;

    const sentiment: Keyword["sentiment"] =
      avgSentiment > 0.3
        ? "positive"
        : avgSentiment < -0.3
          ? "negative"
          : "neutral";

    // TF-IDF-like relevance: term frequency * inverse doc frequency
    const tf = data.count / totalDocs;
    const idf = Math.log(1 + totalDocs / (1 + data.count));
    const relevance = Math.min(tf * idf * 10, 1);

    result.push({
      word,
      count: data.count,
      sentiment,
      relevance: Math.round(relevance * 1000) / 1000,
    });
  }

  return result.sort((a, b) => b.relevance - a.relevance);
}

export function summarizeReviews(
  reviews: Review[],
  productId: string,
): ReviewSummary {
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews
      : 0;

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] ?? 0) + 1;
  }

  const allText = reviews.map((r) => `${r.title} ${r.body}`).join(" ");
  const overallSentiment = analyzeSentiment(allText);
  const topKeywords = extractKeywords(reviews).slice(0, 20);
  const trends = trackTrends(reviews, 30);

  return {
    productId,
    totalReviews,
    averageRating: Math.round(averageRating * 100) / 100,
    ratingDistribution,
    overallSentiment,
    topKeywords,
    trends,
  };
}

export function generateInsights(reviews: Review[]): ActionableInsight[] {
  const keywords = extractKeywords(reviews, 3);
  const insights: ActionableInsight[] = [];

  const negativeKeywords = keywords.filter(
    (k) => k.sentiment === "negative",
  );
  const positiveKeywords = keywords.filter(
    (k) => k.sentiment === "positive",
  );

  for (const k of negativeKeywords.slice(0, 5)) {
    const impact: ActionableInsight["impact"] =
      k.count > 10 ? "high" : k.count > 5 ? "medium" : "low";
    insights.push({
      type: "complaint",
      keyword: k.word,
      frequency: k.count,
      impact,
      suggestedAction: `Investigate product issues related to "${k.word}" mentioned in ${k.count} reviews`,
    });
  }

  for (const k of positiveKeywords.slice(0, 3)) {
    insights.push({
      type: "praise",
      keyword: k.word,
      frequency: k.count,
      impact: "medium",
      suggestedAction: `Highlight "${k.word}" in product marketing — customers love it`,
    });
  }

  return insights;
}

export function trackTrends(
  reviews: Review[],
  intervalDays: number,
): ReviewSummary["trends"] {
  if (reviews.length === 0) return [];

  const sorted = [...reviews].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const earliest = new Date(sorted[0]?.date ?? new Date());
  const latest = new Date(sorted[sorted.length - 1]?.date ?? new Date());

  const trends: ReviewSummary["trends"] = [];
  const cursor = new Date(earliest);

  while (cursor <= latest) {
    const periodEnd = new Date(cursor);
    periodEnd.setDate(periodEnd.getDate() + intervalDays);

    const inPeriod = sorted.filter((r) => {
      const d = new Date(r.date);
      return d >= cursor && d < periodEnd;
    });

    const avgRating =
      inPeriod.length > 0
        ? inPeriod.reduce((s, r) => s + r.rating, 0) / inPeriod.length
        : 0;

    trends.push({
      period: cursor.toISOString().slice(0, 10),
      avgRating: Math.round(avgRating * 100) / 100,
      reviewCount: inPeriod.length,
    });

    cursor.setDate(cursor.getDate() + intervalDays);
  }

  return trends;
}

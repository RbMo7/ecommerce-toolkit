export interface Product {
  id: string;
  name: string;
  category: string;
  tags: string[];
  price: number;
  attributes: Record<string, string>;
}

export interface UserBehavior {
  userId: string;
  productId: string;
  action: "view" | "purchase" | "cart" | "wishlist";
  timestamp: Date;
  weight: number;
}

export interface Recommendation {
  productId: string;
  score: number;
  reason: string;
  basedOn: string[];
}

const ACTION_WEIGHTS: Record<string, number> = {
  view: 1,
  cart: 3,
  wishlist: 4,
  purchase: 5,
};

export function findSimilarProducts(
  targetProduct: Product,
  allProducts: Product[],
  topN = 5,
): Recommendation[] {
  const scores: Recommendation[] = [];

  for (const product of allProducts) {
    if (product.id === targetProduct.id) continue;

    let score = 0;
    const reasons: string[] = [];
    const basedOn: string[] = [];

    // Same category → strong signal
    if (product.category === targetProduct.category) {
      score += 3;
      reasons.push("same category");
    }

    // Shared tags
    const sharedTags = product.tags.filter((t) =>
      targetProduct.tags.includes(t),
    );
    score += sharedTags.length * 2;
    if (sharedTags.length > 0) {
      basedOn.push(...sharedTags);
      reasons.push(`shared tags: ${sharedTags.join(", ")}`);
    }

    // Price proximity
    const priceRatio =
      Math.max(product.price, targetProduct.price) /
      Math.min(product.price, targetProduct.price);
    if (priceRatio < 1.2) {
      score += 1;
      reasons.push("similar price range");
    } else if (priceRatio < 1.5) {
      score += 0.5;
    }

    // Shared attributes
    const sharedAttrs = Object.keys(product.attributes).filter(
      (k) =>
        product.attributes[k] === targetProduct.attributes[k],
    );
    score += sharedAttrs.length;
    if (sharedAttrs.length > 0) {
      basedOn.push(...sharedAttrs.map((k) => `${k}=${product.attributes[k]}`));
    }

    if (score > 0) {
      scores.push({
        productId: product.id,
        score: 0,
        reason: reasons.join("; "),
        basedOn,
      });
    }
  }

  // Normalize scores to 0-1
  const maxScore = scores.length > 0 ? Math.max(...scores.map((s) => s.score)) : 1;
  for (const s of scores) {
    s.score = s.score / maxScore;
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, topN);
}

export function recommendForUser(
  userId: string,
  userBehaviors: UserBehavior[],
  allProducts: Product[],
  topN = 5,
): Recommendation[] {
  // Get products this user has interacted with
  const userProductIds = new Set(
    userBehaviors
      .filter((b) => b.userId === userId)
      .map((b) => b.productId),
  );

  // Find similar users (those who bought/viewed same products)
  const similarUserScores = new Map<string, number>();
  const candidateProducts = new Map<
    string,
    { score: number; basedOn: Set<string> }
  >();

  for (const behavior of userBehaviors) {
    if (behavior.userId === userId) continue;
    if (!userProductIds.has(behavior.productId)) continue;

    // This user has overlapping interest → similar
    similarUserScores.set(
      behavior.userId,
      (similarUserScores.get(behavior.userId) ?? 0) +
        behavior.weight,
    );
  }

  // Get products that similar users liked but target user hasn't seen
  for (const [similarUserId, similarity] of similarUserScores) {
    for (const behavior of userBehaviors) {
      if (behavior.userId !== similarUserId) continue;
      if (userProductIds.has(behavior.productId)) continue;

      const existing = candidateProducts.get(behavior.productId) ?? {
        score: 0,
        basedOn: new Set<string>(),
      };
      existing.score += behavior.weight * (similarity / 10);
      if (behavior.action === "purchase") {
        existing.score += 2;
      }
      const prod = allProducts.find((p) => p.id === behavior.productId);
      if (prod) existing.basedOn.add(prod.name);
      candidateProducts.set(behavior.productId, existing);
    }
  }

  const maxScore =
    candidateProducts.size > 0
      ? Math.max(...Array.from(candidateProducts.values()).map((c) => c.score))
      : 1;

  const results: Recommendation[] = [];
  for (const [productId, data] of candidateProducts) {
    const product = allProducts.find((p) => p.id === productId);
    if (product) {
      results.push({
        productId,
        score: maxScore > 0 ? data.score / maxScore : 0,
        reason: `Users who bought similar products also bought ${Array.from(data.basedOn).slice(0, 3).join(", ")}`,
        basedOn: Array.from(data.basedOn),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topN);
}

export function recommendFrequentlyBoughtTogether(
  productId: string,
  userBehaviors: UserBehavior[],
  allProducts: Product[],
  topN = 5,
): Recommendation[] {
  // Find all orders containing this product
  const coOccurrence = new Map<string, number>();

  // Group behaviors by user to find baskets
  const userBaskets = new Map<string, Set<string>>();
  for (const b of userBehaviors) {
    if (b.action !== "purchase") continue;
    const basket = userBaskets.get(b.userId) ?? new Set();
    basket.add(b.productId);
    userBaskets.set(b.userId, basket);
  }

  for (const [, basket] of userBaskets) {
    if (!basket.has(productId)) continue;
    for (const pid of basket) {
      if (pid === productId) continue;
      coOccurrence.set(pid, (coOccurrence.get(pid) ?? 0) + 1);
    }
  }

  const maxCount =
    coOccurrence.size > 0
      ? Math.max(...coOccurrence.values())
      : 1;

  return Array.from(coOccurrence.entries())
    .map(([pid, count]) => {
      const product = allProducts.find((p) => p.id === pid);
      return {
        productId: pid,
        score: count / maxCount,
        reason: product
          ? `Frequently bought together with ${product.name}`
          : "Frequently bought together",
        basedOn: [productId],
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export function getPersonalizedScore(
  userId: string,
  productId: string,
  userBehaviors: UserBehavior[],
  _allProducts: Product[],
): number {
  const userActions = userBehaviors.filter(
    (b) => b.userId === userId && b.productId === productId,
  );

  if (userActions.length === 0) return 0;

  const totalWeight = userActions.reduce((s, a) => s + a.weight, 0);
  // Normalize by max possible weight (5 purchases)
  return Math.min(totalWeight / 25, 1);
}

export function popularProducts(
  behaviors: UserBehavior[],
  products: Product[],
  topN = 5,
  sinceDays = 30,
): Product[] {
  const since = new Date(Date.now() - sinceDays * 24 * 3600000);
  const recentPurchases = behaviors.filter(
    (b) => b.action === "purchase" && new Date(b.timestamp) >= since,
  );

  const purchaseCounts = new Map<string, number>();
  for (const b of recentPurchases) {
    purchaseCounts.set(
      b.productId,
      (purchaseCounts.get(b.productId) ?? 0) + 1,
    );
  }

  const sorted = Array.from(purchaseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  return sorted
    .map(([pid]) => products.find((p) => p.id === pid))
    .filter((p): p is Product => p !== undefined);
}

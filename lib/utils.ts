import { Review, DashboardStats, RatingDistribution, TrendPoint } from "./types";
import { format } from "date-fns";

export function classifyStore(url: string): "appstore" | "googleplay" | null {
  if (url.includes("apps.apple.com") || url.includes("itunes.apple.com")) return "appstore";
  if (url.includes("play.google.com")) return "googleplay";
  return null;
}

export function extractAppStoreId(url: string): string | null {
  const match = url.match(/\/id(\d+)/);
  return match ? match[1] : null;
}

export function extractGooglePlayId(url: string): string | null {
  const match = url.match(/[?&]id=([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
}

export function getSentiment(rating: number): "positive" | "negative" {
  if (rating >= 4) return "positive";
  return "negative";
}

export function computeStats(reviews: Review[]): DashboardStats {
  const total = reviews.length;
  if (total === 0) {
    return {
      total: 0,
      positiveCount: 0,
      negativeCount: 0,
      positivePercent: 0,
      negativePercent: 0,
      avgRating: 0,
      ratingDist: [5, 4, 3, 2, 1].map((s) => ({ star: s, count: 0, percent: 0 })),
      trend: [],
    };
  }

  const positiveCount = reviews.filter((r) => r.sentiment === "positive").length;
  const negativeCount = reviews.filter((r) => r.sentiment === "negative").length;
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / total;

  const ratingDist: RatingDistribution[] = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return { star, count, percent: Math.round((count / total) * 100) };
  });

  // group by month
  const monthMap = new Map<string, Review[]>();
  for (const r of reviews) {
    const key = format(new Date(r.date), "yyyy-MM");
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(r);
  }

  const trend: TrendPoint[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rs]) => ({
      month,
      positive: rs.filter((r) => r.sentiment === "positive").length,
      negative: rs.filter((r) => r.sentiment === "negative").length,
      total: rs.length,
      avgRating: rs.reduce((s, r) => s + r.rating, 0) / rs.length,
    }));

  return {
    total,
    positiveCount,
    negativeCount,
    positivePercent: Math.round((positiveCount / total) * 100),
    negativePercent: Math.round((negativeCount / total) * 100),
    avgRating: Math.round(avgRating * 10) / 10,
    ratingDist,
    trend,
  };
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

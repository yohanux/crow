export type StoreType = "appstore" | "googleplay";

export interface Review {
  id: string;
  userName: string;
  rating: number;
  title: string;
  text: string;
  date: string; // ISO string
  version?: string;
  thumbsUp?: number;
  sentiment: "positive" | "negative" | "neutral";
}

export interface AppInfo {
  title: string;
  icon: string;
  developer: string;
  score: number;
  ratings: number;
  storeType: StoreType;
  storeUrl: string;
}

export interface ScrapeResult {
  appInfo: AppInfo;
  reviews: Review[];
  totalFetched: number;
}

export interface RatingDistribution {
  star: number;
  count: number;
  percent: number;
}

export interface TrendPoint {
  month: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  avgRating: number;
}

export interface DashboardStats {
  total: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
  avgRating: number;
  ratingDist: RatingDistribution[];
  trend: TrendPoint[];
}

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
  sentiment: "positive" | "negative";
}

export interface AppInfo {
  title: string;
  icon: string;
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
  total: number;
  avgRating: number;
}

export interface DashboardStats {
  total: number;
  positiveCount: number;
  negativeCount: number;
  positivePercent: number;
  negativePercent: number;
  avgRating: number;
  ratingDist: RatingDistribution[];
  trend: TrendPoint[];
}

export interface SearchResult {
  title: string;
  /** 스토어 최초 등록 연도 (수집 기간 슬라이더의 시작 연도로 쓴다) */
  releasedYear?: number;
  icon: string;
  developer: string;
  score: number;
  storeType: StoreType;
  url: string;
}

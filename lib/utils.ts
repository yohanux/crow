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

/**
 * 스토어 제목에서 부제를 떼어내 앱 이름만 남긴다. (스토어는 이름 필드를 따로 주지 않아 규칙으로 처리)
 *  - "당근 - 당신 근처의 지역 생활 커뮤니티" → "당근"
 *  - "쿠팡(Coupang)-모바일 쇼핑"            → "쿠팡"
 *  - "카카오톡 KakaoTalk"                   → "카카오톡"  (한글 이름 뒤에 붙은 영문 병기)
 * 규칙에 걸리지 않거나 결과가 비면 원래 제목을 그대로 쓴다.
 */
export function shortAppName(title: string): string {
  let name = title.trim();
  // 1) 구분자 뒤 부제: " - ", " – ", " — ", " | ", " : ", "이름: 부제", 또는 닫는 괄호 바로 뒤의 "-"
  name = name.split(/\s+[-–—|:]\s+|:\s+|(?<=\))\s*[-–—]\s*/)[0];
  // 2) 끝의 괄호 병기: "쿠팡(Coupang)"
  name = name.replace(/\s*[(（][^)）]*[)）]\s*$/, "");
  // 3) 한글 이름 뒤에 붙은 영문 병기. 영문이 4글자 이상일 때만 제거해 "카카오 T", "삼성 Pay"는 보호
  const m = name.match(/^(.*[가-힣])\s+([A-Za-z][A-Za-z0-9. ]*)$/);
  if (m && m[2].replace(/\s/g, "").length >= 4) name = m[1];
  name = name.trim();
  return name || title.trim();
}

/** 연도 범위 표기: 같은 해면 "2026년", 다르면 "2025년 - 2026년" */
export function formatYearRange(start: number, end: number): string {
  return start === end ? `${start}년` : `${start}년 - ${end}년`;
}

/** 스토어의 최초 등록일 문자열("2010. 8. 23." / "Nov 12, 2013" 등)에서 연도만 뽑는다. 못 찾으면 null */
export function parseReleasedYear(released: unknown): number | null {
  const m = String(released ?? "").match(/(?:19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/**
 * 구글플레이 아이콘은 크기를 지정하지 않으면 512px 원본(수십 KB)이 내려온다.
 * 화면에는 작게 보이므로 "=s{size}"를 붙여 필요한 크기만 받는다. (다른 호스트 주소는 그대로 둔다)
 */
export function sizedIcon(url: string, size: number): string {
  if (!url.includes("googleusercontent.com")) return url;
  return `${url.replace(/=[^/=]*$/, "")}=s${size}`;
}

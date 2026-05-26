import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Review, AppInfo } from "@/lib/types";
import { computeStats } from "@/lib/utils";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const { reviews, appInfo }: { reviews: Review[]; appInfo: AppInfo } = await req.json();

  const wb = XLSX.utils.book_new();

  // Sheet 1: All reviews
  const reviewRows = reviews.map((r) => ({
    날짜: format(new Date(r.date), "yyyy-MM-dd"),
    평점: r.rating,
    감성: r.sentiment === "positive" ? "긍정" : r.sentiment === "negative" ? "부정" : "중립",
    작성자: r.userName,
    제목: r.title,
    내용: r.text,
    버전: r.version || "",
    도움됨: r.thumbsUp ?? 0,
  }));
  const reviewWs = XLSX.utils.json_to_sheet(reviewRows);
  reviewWs["!cols"] = [
    { wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 15 }, { wch: 30 }, { wch: 60 }, { wch: 10 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, reviewWs, "전체 리뷰");

  // Sheet 2: Stats
  const stats = computeStats(reviews);
  const statsRows = [
    { 항목: "총 리뷰 수", 값: stats.total },
    { 항목: "평균 평점", 값: stats.avgRating },
    { 항목: "긍정 리뷰 수", 값: stats.positiveCount },
    { 항목: "긍정 비율 (%)", 값: stats.positivePercent },
    { 항목: "부정 리뷰 수", 값: stats.negativeCount },
    { 항목: "부정 비율 (%)", 값: stats.negativePercent },
    { 항목: "중립 리뷰 수", 값: stats.neutralCount },
    { 항목: "중립 비율 (%)", 값: stats.neutralPercent },
    {},
    { 항목: "★5", 값: stats.ratingDist.find((r) => r.star === 5)?.count ?? 0 },
    { 항목: "★4", 값: stats.ratingDist.find((r) => r.star === 4)?.count ?? 0 },
    { 항목: "★3", 값: stats.ratingDist.find((r) => r.star === 3)?.count ?? 0 },
    { 항목: "★2", 값: stats.ratingDist.find((r) => r.star === 2)?.count ?? 0 },
    { 항목: "★1", 값: stats.ratingDist.find((r) => r.star === 1)?.count ?? 0 },
  ];
  const statsWs = XLSX.utils.json_to_sheet(statsRows);
  statsWs["!cols"] = [{ wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, statsWs, "통계 요약");

  // Sheet 3: Monthly trend
  const trendRows = stats.trend.map((t) => ({
    월: t.month,
    전체: t.total,
    긍정: t.positive,
    부정: t.negative,
    중립: t.neutral,
    평균평점: Math.round(t.avgRating * 10) / 10,
  }));
  const trendWs = XLSX.utils.json_to_sheet(trendRows);
  trendWs["!cols"] = [{ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, trendWs, "월별 추세");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `crow_${appInfo.title.replace(/[^\w가-힣]/g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

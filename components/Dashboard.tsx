"use client";

import { useMemo, useState } from "react";
import { Review, AppInfo } from "@/lib/types";
import { computeStats } from "@/lib/utils";
import RatingBar from "./RatingBar";
import TrendChart from "./TrendChart";
import ReviewTable from "./ReviewTable";
import VersionBreakdown from "./VersionBreakdown";

interface DashboardProps {
  reviews: Review[];
  appInfo: AppInfo;
}

export default function Dashboard({ reviews, appInfo }: DashboardProps) {
  const stats = useMemo(() => computeStats(reviews), [reviews]);
  const reviewYearRange = useMemo(() => {
    if (reviews.length === 0) return null;
    const years = reviews.map((r) => new Date(r.date).getFullYear());
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}-${max}`;
  }, [reviews]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trend" | "version">("trend");

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* 상단: 좌측 서비스 정보 + 히어로(카드 없이 묶음, 좌측 정렬) / 우측 평점 카드 (모바일은 세로로 쌓임) */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:content-center md:justify-start md:gap-x-5 md:gap-y-0">
          {appInfo.icon && (
            // 아이콘을 누르면 해당 스토어 페이지가 새 탭으로 열린다
            <a
              href={appInfo.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="스토어에서 열기"
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appInfo.icon}
                alt={`${appInfo.title} 스토어 페이지 열기`}
                className="size-12 rounded-xl object-cover md:size-14 md:rounded-[14px]"
              />
            </a>
          )}
          <div className="min-w-0 md:flex-1">
            <div className="mb-1 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
              <h2 className="text-xl font-bold text-fg">{appInfo.title}</h2>
            </div>
          </div>
          {/* Hero title — Silver는 글자 아래쪽 빈 공간(약 0.4em)이 커서 음수 마진으로 하단 여백을 줄인다 */}
          {reviewYearRange && (
            <h2 className="mt-0 -mb-[0.3em] w-full text-center font-logo text-[clamp(32px,11vw,48px)] leading-none font-normal text-fg md:mt-2 md:basis-full md:text-left md:text-5xl">
              <span className="text-accent">{reviewYearRange}년</span> 리뷰 분석
            </h2>
          )}
        </div>
        <RatingBar data={stats.ratingDist} total={stats.total} avgRating={stats.avgRating} />
      </div>

      {/* Trend / Version tabbed card */}
      <div className="overflow-hidden rounded-2xl bg-surface">
        {/* Tab header */}
        <div className="flex items-center border-b border-line px-2 md:px-6">
          {(["trend", "version"] as const).map((tab) => {
            const label = tab === "trend" ? "월별 리뷰 추세" : "버전별 리뷰";
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px cursor-pointer border-b-2 px-4 pt-3.5 pb-3 text-sm transition-colors ${
                  active
                    ? "border-accent font-bold text-accent-text"
                    : "border-transparent font-normal text-fg-muted"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Content — both mounted to preserve state */}
        <div className={activeTab === "trend" ? "block" : "hidden"}>
          <TrendChart bare data={stats.trend} selectedMonth={selectedMonth} onMonthClick={setSelectedMonth} />
        </div>
        <div className={activeTab === "version" ? "block" : "hidden"}>
          <VersionBreakdown
            bare
            reviews={reviews}
            selectedVersion={selectedVersion}
            onSelect={setSelectedVersion}
          />
        </div>
      </div>

      {/* Review table */}
      <ReviewTable reviews={reviews} versionFilter={selectedVersion} monthFilter={selectedMonth} />
    </div>
  );
}

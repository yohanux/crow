"use client";

import { useMemo, useState } from "react";
import { Review, AppInfo } from "@/lib/types";
import { computeStats } from "@/lib/utils";
import StatCard from "./StatCard";
import RatingBar from "./RatingBar";
import SentimentChart from "./SentimentChart";
import TrendChart from "./TrendChart";
import ReviewTable from "./ReviewTable";
import VersionBreakdown from "./VersionBreakdown";

interface DashboardProps {
  reviews: Review[];
  appInfo: AppInfo;
  onExport: () => void;
  exporting: boolean;
}

export default function Dashboard({ reviews, appInfo, onExport, exporting }: DashboardProps) {
  const stats = useMemo(() => computeStats(reviews), [reviews]);
  const reviewYearRange = useMemo(() => {
    if (reviews.length === 0) return null;
    const years = reviews.map((r) => new Date(r.date).getFullYear());
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min} – ${max}`;
  }, [reviews]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trend" | "version">("trend");

  const isAppStore = appInfo.storeType === "appstore";
  const storeLabel = isAppStore ? "App Store" : "Google Play";
  const storeBadgeClass = isAppStore
    ? "border-appstore/[0.27] bg-appstore/[0.13] text-appstore"
    : "border-googleplay/[0.27] bg-googleplay/[0.13] text-googleplay";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* App header */}
      <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 md:gap-5 md:px-6 md:py-5">
        {appInfo.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={appInfo.icon} alt="app icon" className="size-16 rounded-2xl object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-fg">{appInfo.title}</h2>
            <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${storeBadgeClass}`}>
              {storeLabel}
            </span>
          </div>
          <span className="text-[13px] text-fg-muted">
            {appInfo.developer} &nbsp;·&nbsp; 스토어 평점 ★{appInfo.score.toFixed(1)}
          </span>
          {reviewYearRange && (
            <div className="mt-2 text-[28px] leading-none font-extrabold tracking-tight text-accent">
              {reviewYearRange}
            </div>
          )}
        </div>
        <div className="flex w-full items-center gap-3 md:w-auto md:shrink-0">
          <a
            href={appInfo.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-[10px] border border-line bg-surface-2 px-4 py-2 text-center text-[13px] font-medium text-fg-muted no-underline md:flex-none"
          >
            스토어 열기 ↗
          </a>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex-1 cursor-pointer rounded-[10px] bg-accent px-5 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 md:flex-none"
          >
            {exporting ? "내보내는 중..." : "엑셀 내보내기"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
        <StatCard label="총 리뷰 수" value={stats.total.toLocaleString()} sub="수집된 전체 리뷰" color="var(--accent)" />
        <StatCard label="평균 평점" value={`★ ${stats.avgRating}`} sub="전체 리뷰 기준" color="#f59e0b" />
        <StatCard
          label="긍정 비율"
          value={`${stats.positivePercent}%`}
          sub={`${stats.positiveCount.toLocaleString()}건 (★4~5)`}
          color="var(--positive)"
        />
        <StatCard
          label="부정 비율"
          value={`${stats.negativePercent}%`}
          sub={`${stats.negativeCount.toLocaleString()}건 (★1~2)`}
          color="var(--negative)"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <RatingBar data={stats.ratingDist} />
        <SentimentChart positive={stats.positiveCount} negative={stats.negativeCount} />
      </div>

      {/* Trend / Version tabbed card */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
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
                    ? "border-accent font-bold text-accent"
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

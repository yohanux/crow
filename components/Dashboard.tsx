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
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const storeLabel = appInfo.storeType === "appstore" ? "App Store" : "Google Play";
  const storeBadgeColor = appInfo.storeType === "appstore" ? "#007aff" : "#01875f";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* App header */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {appInfo.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={appInfo.icon}
            alt="app icon"
            style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover" }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              {appInfo.title}
            </h2>
            <span
              style={{
                background: storeBadgeColor + "22",
                color: storeBadgeColor,
                border: `1px solid ${storeBadgeColor}44`,
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {storeLabel}
            </span>
          </div>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {appInfo.developer} &nbsp;·&nbsp; 스토어 평점 ★{appInfo.score.toFixed(1)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <a
            href={appInfo.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            스토어 열기 ↗
          </a>
          <button
            onClick={onExport}
            disabled={exporting}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 10,
              padding: "8px 20px",
              fontSize: 13,
              color: "#fff",
              fontWeight: 600,
              cursor: exporting ? "not-allowed" : "pointer",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? "내보내는 중..." : "엑셀 내보내기"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="총 리뷰 수"
          value={stats.total.toLocaleString()}
          sub="수집된 전체 리뷰"
          color="var(--accent)"
        />
        <StatCard
          label="평균 평점"
          value={`★ ${stats.avgRating}`}
          sub="전체 리뷰 기준"
          color="#f59e0b"
        />
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <RatingBar data={stats.ratingDist} />
        <SentimentChart
          positive={stats.positiveCount}
          negative={stats.negativeCount}
        />
      </div>

      {/* Trend chart */}
      <TrendChart
        data={stats.trend}
        selectedMonth={selectedMonth}
        onMonthClick={setSelectedMonth}
      />

      {/* Version breakdown */}
      <VersionBreakdown
        reviews={reviews}
        selectedVersion={selectedVersion}
        onSelect={setSelectedVersion}
      />

      {/* Review table */}
      <ReviewTable reviews={reviews} versionFilter={selectedVersion} monthFilter={selectedMonth} />
    </div>
  );
}

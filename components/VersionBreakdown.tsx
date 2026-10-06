"use client";

import { useMemo, useState } from "react";
import { Review } from "@/lib/types";

interface VersionStat {
  version: string;
  count: number;
  avgRating: number;
  positiveCount: number;
  negativeCount: number;
  positivePercent: number;
  negativePercent: number;
}

type SortKey = "count" | "rating" | "version";

interface Props {
  reviews: Review[];
  selectedVersion: string | null;
  onSelect: (version: string | null) => void;
  bare?: boolean;
}

export default function VersionBreakdown({ reviews, selectedVersion, onSelect, bare }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("count");

  const versions = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const r of reviews) {
      const v = r.version || "알 수 없음";
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(r);
    }

    const stats: VersionStat[] = Array.from(map.entries()).map(([version, rs]) => {
      const positiveCount = rs.filter((r) => r.sentiment === "positive").length;
      const negativeCount = rs.filter((r) => r.sentiment === "negative").length;
      return {
        version,
        count: rs.length,
        avgRating: Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10,
        positiveCount,
        negativeCount,
        positivePercent: Math.round((positiveCount / rs.length) * 100),
        negativePercent: Math.round((negativeCount / rs.length) * 100),
      };
    });

    return stats.sort((a, b) => {
      if (sortBy === "count") return b.count - a.count;
      if (sortBy === "rating") return b.avgRating - a.avgRating;
      return b.version.localeCompare(a.version, undefined, { numeric: true });
    });
  }, [reviews, sortBy]);

  const maxCount = Math.max(...versions.map((v) => v.count), 1);

  const inner = (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 md:px-6 md:py-4">
        {selectedVersion && (
          <span className="rounded-full border border-accent bg-accent-glow px-2.5 py-0.5 text-xs font-semibold text-accent-text">
            v{selectedVersion}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          {(["count", "rating", "version"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-all ${
                sortBy === key
                  ? "border-accent bg-accent font-semibold text-white"
                  : "border-line bg-surface-2 font-normal text-fg-muted"
              }`}
            >
              {key === "count" ? "리뷰순" : key === "rating" ? "평점순" : "버전순"}
            </button>
          ))}
        </div>
        {selectedVersion && (
          <button onClick={() => onSelect(null)} className="cursor-pointer text-xs text-fg-muted underline">
            필터 해제
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto">
        {versions.map((v) => {
          const isSelected = selectedVersion === v.version;
          return (
            <div
              key={v.version}
              onClick={() => onSelect(isSelected ? null : v.version)}
              className={`cursor-pointer border-b border-line px-4 py-3 transition-colors md:px-6 ${
                isSelected ? "bg-accent/[0.07]" : "bg-transparent hover:bg-surface-2"
              }`}
            >
              {/* 모바일: 이름·수치는 윗줄, 막대는 아랫줄 / md 이상: 한 줄 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap">
                <span
                  className={`min-w-0 flex-1 text-[13px] tabular-nums md:w-24 md:flex-none ${
                    isSelected ? "font-bold text-accent-text" : "font-medium text-fg"
                  }`}
                >
                  v{v.version}
                </span>

                <div className="order-last h-1.5 basis-full overflow-hidden rounded-[3px] bg-surface-2 md:order-none md:flex-1 md:basis-auto">
                  <div
                    className={`h-full rounded-[3px] transition-[width,background-color] duration-[400ms] ease-out ${
                      isSelected ? "bg-accent" : "bg-line"
                    }`}
                    style={{ width: `${(v.count / maxCount) * 100}%` }}
                  />
                </div>

                <span className="min-w-11 text-right text-xs text-fg-muted tabular-nums">
                  {v.count.toLocaleString()}건
                </span>
                <span className="min-w-9 text-right text-xs text-star">★{v.avgRating}</span>
                <span className="min-w-[38px] text-right text-xs text-positive">+{v.positivePercent}%</span>
                <span className="min-w-[38px] text-right text-xs text-negative">-{v.negativePercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (bare) return inner;

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="border-b border-line px-4 py-3 md:px-6">
        <h3 className="text-[15px] font-semibold text-fg">버전별 리뷰</h3>
      </div>
      {inner}
    </div>
  );
}

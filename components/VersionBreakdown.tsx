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
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {selectedVersion && (
          <span
            style={{
              fontSize: 12,
              background: "var(--accent-glow)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: 20,
              padding: "2px 10px",
              fontWeight: 600,
            }}
          >
            v{selectedVersion}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["count", "rating", "version"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                background: sortBy === key ? "var(--accent)" : "var(--surface2)",
                border: `1px solid ${sortBy === key ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                color: sortBy === key ? "#fff" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: sortBy === key ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {key === "count" ? "리뷰순" : key === "rating" ? "평점순" : "버전순"}
            </button>
          ))}
        </div>
        {selectedVersion && (
          <button
            onClick={() => onSelect(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            필터 해제
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {versions.map((v) => {
          const isSelected = selectedVersion === v.version;
          return (
            <div
              key={v.version}
              onClick={() => onSelect(isSelected ? null : v.version)}
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                background: isSelected ? "rgba(124,106,255,0.07)" : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = isSelected
                  ? "rgba(124,106,255,0.07)"
                  : "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? "var(--accent)" : "var(--text-primary)",
                    minWidth: 96,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  v{v.version}
                </span>

                {/* Count bar */}
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "var(--surface2)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(v.count / maxCount) * 100}%`,
                      height: "100%",
                      background: isSelected ? "var(--accent)" : "var(--border)",
                      borderRadius: 3,
                      transition: "width 0.4s ease, background 0.15s",
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    minWidth: 44,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {v.count.toLocaleString()}건
                </span>
                <span style={{ fontSize: 12, color: "#f59e0b", minWidth: 36, textAlign: "right" }}>
                  ★{v.avgRating}
                </span>
                <span style={{ fontSize: 12, color: "var(--positive)", minWidth: 38, textAlign: "right" }}>
                  +{v.positivePercent}%
                </span>
                <span style={{ fontSize: 12, color: "var(--negative)", minWidth: 38, textAlign: "right" }}>
                  -{v.negativePercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (bare) return inner;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>버전별 리뷰</h3>
      </div>
      {inner}
    </div>
  );
}

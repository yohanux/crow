"use client";

import { RatingDistribution } from "@/lib/types";

export default function RatingBar({ data }: { data: RatingDistribution[] }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 24px",
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
        평점 분포
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((d) => (
          <div key={d.star} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", width: 24, textAlign: "right" }}>
              ★{d.star}
            </span>
            <div
              style={{
                flex: 1,
                height: 8,
                background: "var(--surface2)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${d.percent}%`,
                  height: "100%",
                  background:
                    d.star >= 4
                      ? "var(--positive)"
                      : d.star === 3
                      ? "var(--neutral)"
                      : "var(--negative)",
                  borderRadius: 4,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 48, textAlign: "right" }}>
              {d.count.toLocaleString()} ({d.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

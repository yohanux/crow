"use client";

import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from "recharts";
import { TrendPoint } from "@/lib/types";

interface TrendChartProps {
  data: TrendPoint[];
  selectedMonth: string | null;
  onMonthClick: (month: string | null) => void;
}

const SERIES = [
  { key: "positive", label: "긍정", color: "#22c55e" },
  { key: "negative", label: "부정", color: "#ef4444" },
  { key: "avgRating", label: "평균평점", color: "#7c6aff" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

export default function TrendChart({ data, selectedMonth, onMonthClick }: TrendChartProps) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    positive: true,
    negative: true,
    avgRating: true,
  });

  if (data.length === 0) return null;

  function handleChartClick(payload: { activeLabel?: string | number } | null) {
    const label = payload?.activeLabel;
    if (!label) return;
    const month = String(label);
    onMonthClick(selectedMonth === month ? null : month);
  }

  function toggleSeries(key: SeriesKey) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const showRatingAxis = visible.avgRating;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
          월별 리뷰 추세
        </h3>
        {selectedMonth && (
          <>
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
              {selectedMonth}
            </span>
            <button
              onClick={() => onMonthClick(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 13,
                padding: "2px 6px",
              }}
            >
              ✕ 해제
            </button>
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
          {SERIES.map(({ key, label, color }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                userSelect: "none",
                fontSize: 12,
                color: visible[key] ? color : "var(--text-secondary)",
                fontWeight: visible[key] ? 600 : 400,
                transition: "color 0.15s",
              }}
            >
              <input
                type="checkbox"
                checked={visible[key]}
                onChange={() => toggleSeries(key)}
                style={{ accentColor: color, width: 13, height: 13, cursor: "pointer" }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: showRatingAxis ? 16 : 16, left: 0, bottom: 0 }}
          onClick={handleChartClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="count"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          {showRatingAxis && (
            <YAxis
              yAxisId="rating"
              orientation="right"
              domain={[1, 5]}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
            formatter={(value, name) => {
              if (name === "평균평점" && typeof value === "number") return [value.toFixed(1), name];
              return [value, name];
            }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
            )}
          />
          {selectedMonth && (
            <ReferenceArea
              yAxisId="count"
              x1={selectedMonth}
              x2={selectedMonth}
              fill="#7c6aff"
              fillOpacity={0.08}
              stroke="#7c6aff"
              strokeOpacity={0.25}
              strokeWidth={1}
            />
          )}
          {visible.positive && (
            <Bar yAxisId="count" dataKey="positive" name="긍정" stackId="a" radius={[0, 0, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={selectedMonth && selectedMonth !== entry.month ? "#22c55e44" : "#22c55e"}
                />
              ))}
            </Bar>
          )}
          {visible.negative && (
            <Bar yAxisId="count" dataKey="negative" name="부정" stackId="a" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={selectedMonth && selectedMonth !== entry.month ? "#ef444444" : "#ef4444"}
                />
              ))}
            </Bar>
          )}
          {visible.avgRating && (
            <Line
              yAxisId="rating"
              type="monotone"
              dataKey="avgRating"
              name="평균평점"
              stroke="#7c6aff"
              strokeWidth={2}
              dot={{ fill: "#7c6aff", r: 3 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

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
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from "recharts";
import { TrendPoint } from "@/lib/types";

interface TrendChartProps {
  data: TrendPoint[];
  selectedMonth: string | null;
  onMonthClick: (month: string | null) => void;
  bare?: boolean;
}

const SERIES = [
  { key: "positive", label: "긍정", color: "#22c55e" },
  { key: "negative", label: "부정", color: "#ef4444" },
  { key: "avgRating", label: "평균평점", color: "#7c6aff" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

export default function TrendChart({ data, selectedMonth, onMonthClick, bare }: TrendChartProps) {
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

  const content = (
    <div className="px-2 pt-4 pb-3 md:px-6 md:py-5">
      {selectedMonth && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent bg-accent-glow px-2.5 py-0.5 text-xs font-semibold text-accent">
            {selectedMonth}
          </span>
          <button
            onClick={() => onMonthClick(null)}
            className="cursor-pointer px-1.5 py-0.5 text-[13px] text-fg-muted"
          >
            ✕ 해제
          </button>
        </div>
      )}
      <div className="h-[220px] md:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          onClick={handleChartClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            minTickGap={16}
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
      <div className="mt-3 flex flex-wrap justify-center gap-5">
        {SERIES.map(({ key, label, color }) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-[5px] text-xs transition-colors select-none ${
              visible[key] ? "font-semibold" : "font-normal text-fg-muted"
            }`}
            style={visible[key] ? { color } : undefined}
          >
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={() => toggleSeries(key)}
              className="size-[13px] cursor-pointer"
              style={{ accentColor: color }}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );

  if (bare) return content;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-4 py-3 md:px-6 md:py-4">
        <h3 className="text-[15px] font-semibold text-fg">월별 리뷰 추세</h3>
      </div>
      {content}
    </div>
  );
}

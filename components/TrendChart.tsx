"use client";

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
} from "recharts";
import { TrendPoint } from "@/lib/types";

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 24px",
      }}
    >
      <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
        월별 리뷰 추세
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
          <YAxis
            yAxisId="rating"
            orientation="right"
            domain={[1, 5]}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
            )}
          />
          <Bar yAxisId="count" dataKey="positive" name="긍정" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="count" dataKey="negative" name="부정" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="rating"
            type="monotone"
            dataKey="avgRating"
            name="평균평점"
            stroke="#7c6aff"
            strokeWidth={2}
            dot={{ fill: "#7c6aff", r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

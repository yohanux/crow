"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  positive: number;
  negative: number;
  neutral: number;
}

const COLORS = {
  긍정: "#22c55e",
  부정: "#ef4444",
  중립: "#f59e0b",
};

export default function SentimentChart({ positive, negative, neutral }: Props) {
  const data = [
    { name: "긍정", value: positive },
    { name: "부정", value: negative },
    { name: "중립", value: neutral },
  ].filter((d) => d.value > 0);

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
        감성 분포
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
            formatter={(value) => [`${Number(value).toLocaleString()}건`, ""]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

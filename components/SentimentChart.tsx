"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  positive: number;
  negative: number;
}

const COLORS = {
  긍정: "#22c55e",
  부정: "#ef4444",
};

export default function SentimentChart({ positive, negative }: Props) {
  const data = [
    { name: "긍정", value: positive },
    { name: "부정", value: negative },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 md:px-6 md:py-5">
      <h3 className="mb-4 text-[15px] font-semibold text-fg">감성 분포</h3>
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

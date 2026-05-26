"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, sub, color = "var(--accent)", icon }: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: color,
          borderRadius: "16px 16px 0 0",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{sub}</span>}
    </div>
  );
}

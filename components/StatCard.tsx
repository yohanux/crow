"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  /** 상단 강조선 색상 (데이터가 아닌 호출부에서 정하는 토큰/색) */
  color?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, sub, color = "var(--accent)", icon }: StatCardProps) {
  return (
    <div className="relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-line bg-surface p-3.5 md:px-6 md:py-5">
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: color }} />
      <div className="flex items-center gap-2">
        {icon && <span style={{ color }}>{icon}</span>}
        <span className="text-[13px] font-medium text-fg-muted">{label}</span>
      </div>
      <span className="text-2xl leading-tight font-bold text-fg md:text-[32px]">{value}</span>
      {sub && <span className="text-[13px] text-fg-muted">{sub}</span>}
    </div>
  );
}

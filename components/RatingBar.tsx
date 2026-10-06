"use client";

import { RatingDistribution } from "@/lib/types";

export default function RatingBar({ data }: { data: RatingDistribution[] }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 md:px-6 md:py-5">
      <h3 className="mb-4 text-[15px] font-semibold text-fg">평점 분포</h3>
      <div className="flex flex-col gap-2.5">
        {data.map((d) => (
          <div key={d.star} className="flex items-center gap-2.5">
            <span className="w-6 text-right text-[13px] text-fg-muted">★{d.star}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-surface-2">
              <div
                className={`h-full rounded transition-[width] duration-[600ms] ease-out ${
                  d.star >= 4 ? "bg-positive" : "bg-negative"
                }`}
                style={{ width: `${d.percent}%` }}
              />
            </div>
            <span className="min-w-[76px] text-right text-xs whitespace-nowrap text-fg-muted">
              {d.count.toLocaleString()} ({d.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

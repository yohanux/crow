"use client";

import { useRef, useState } from "react";
import { RatingDistribution } from "@/lib/types";

interface RatingBarProps {
  data: RatingDistribution[];
  total: number;
  avgRating: number;
}

export default function RatingBar({ data, total, avgRating }: RatingBarProps) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 마우스: 막대 위에서 포인터를 따라다님 / 터치: 탭한 위치에 표시하고 잠시 뒤 사라짐
  function showTip(e: React.PointerEvent, count: number) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const x = Math.min(Math.max(e.clientX, 40), window.innerWidth - 40); // 화면 밖으로 나가지 않게
    setTip({ x, y: e.clientY, text: `${count.toLocaleString()}개` });
    if (e.pointerType === "touch") {
      hideTimer.current = setTimeout(() => setTip(null), 1800);
    }
  }

  function hideTip(e: React.PointerEvent) {
    if (e.pointerType === "touch") return; // 터치는 타이머로 숨김
    setTip(null);
  }

  return (
    <div className="rounded-2xl bg-surface p-4 md:px-6 md:py-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <span className="text-[32px] leading-none font-bold text-fg">★ {avgRating}</span>
        <span className="text-[13px] text-fg-muted">총 {total.toLocaleString()}개</span>
      </div>
      <div className="flex flex-col gap-1">
        {data.map((d) => (
          <div key={d.star} className="flex items-center gap-2.5">
            <span className="w-3 shrink-0 text-center text-[15px] text-fg-muted">{d.star}</span>
                        <div
              className="relative flex-1"
              onPointerEnter={(e) => showTip(e, d.count)}
              onPointerMove={(e) => showTip(e, d.count)}
              onPointerDown={(e) => showTip(e, d.count)}
              onPointerLeave={hideTip}
            >
              <div className="relative h-6 overflow-hidden rounded bg-surface-2">
                <div
                  className="flex h-full items-center justify-end rounded bg-accent pr-2 transition-[width] duration-[600ms] ease-out"
                  style={{ width: `${d.percent}%` }}
                >
                  {/* 막대가 충분히 길 때만 안쪽에 개수 표시 */}
                  {d.percent >= 12 && (
                    <span className="text-[13px] font-semibold text-white">{d.count.toLocaleString()}</span>
                  )}
                </div>
                {/* 짧은 막대는 글자가 넘치므로 막대 바로 오른쪽 바깥에 표시 */}
                {d.percent < 12 && (
                  <span
                    className="absolute inset-y-0 flex items-center text-[13px] font-semibold text-fg-muted"
                    style={{ left: `calc(${d.percent}% + 8px)` }}
                  >
                    {d.count.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {tip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface-2 px-2 py-1 text-xs font-medium whitespace-nowrap text-fg shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
          style={{ left: tip.x, top: tip.y - 14 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

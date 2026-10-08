"use client";

import { useRef, useCallback } from "react";
import { formatYearRange } from "@/lib/utils";

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  disabled?: boolean;
}

export default function YearRangeSlider({ min, max, value, onChange, disabled }: Props) {
  const [startYear] = value;
  const trackRef = useRef<HTMLDivElement>(null);

  // 올해 등록된 앱은 min === max라 0으로 나누지 않도록 폭을 최소 1로 본다
  const span = Math.max(1, max - min);
  const toPercent = (v: number) => ((v - min) / span) * 100;
  const toYear = (percent: number) => Math.round(min + Math.max(0, Math.min(1, percent)) * span);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const year = toYear(pct);
      onChange([Math.min(year, max), max]);
    },
    [disabled, max, onChange, toYear]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const track = trackRef.current;
      if (!track) return;

      const move = (clientX: number) => {
        const rect = track.getBoundingClientRect();
        const pct = (clientX - rect.left) / rect.width;
        const year = toYear(pct);
        onChange([Math.min(year, max), max]);
      };

      const onMouseMove = (ev: MouseEvent) => move(ev.clientX);
      const onTouchMove = (ev: TouchEvent) => move(ev.touches[0].clientX);
      const cleanup = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", cleanup);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", cleanup);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", cleanup);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", cleanup);

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      move(clientX);
    },
    [disabled, max, onChange, toYear]
  );

  const leftPct = toPercent(startYear);
  const isAll = startYear === min;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-center">
        {/* "전체 기간"도 연도 범위와 같은 배지 스타일 */}
        <span className="rounded-lg bg-accent-glow px-4 py-1.5 text-lg font-bold text-accent-text">
          {isAll ? "전체 기간" : formatYearRange(startYear, max)}
        </span>
      </div>

      {/* Track + year ticks — unified click zone */}
      <div onClick={handleTrackClick} className={`pt-2 pb-1 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <div ref={trackRef} className="relative h-1.5 rounded-[3px] bg-surface-2">
          {/* Active fill */}
          <div
            className={`pointer-events-none absolute h-full rounded-[3px] transition-colors duration-200 ${
              disabled ? "bg-line" : "bg-accent"
            }`}
            style={{ left: `${leftPct}%`, width: `${100 - leftPct}%` }}
          />

          {/* Start thumb only */}
          <div className="absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2" style={{ left: `${leftPct}%` }}>
            <div
              onMouseDown={startDrag}
              onTouchStart={startDrag}
              onClick={(e) => e.stopPropagation()}
              className={`size-5 touch-none rounded-full border-[3px] border-background transition-[box-shadow,background-color] duration-150 select-none ${
                disabled
                  ? "cursor-not-allowed bg-line"
                  : "cursor-grab bg-accent shadow-[0_0_0_2px_var(--accent)]"
              }`}
            />
          </div>
        </div>

        {/* Year ticks — 손잡이와 같은 기준(막대 양 끝 0%~100%)으로 배치해 숫자 중앙과 손잡이가 정확히 맞는다.
            모바일에서는 자리만 두고 한 칸씩 건너뛰어 표시 */}
        <div className="relative mt-2.5 h-5">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((y, i) => {
            // 시작·끝 연도만 선명하게, 중간 연도는 투명도 30%. 시작·끝은 모바일에서도 항상 보이게 하고,
            // 글자가 커서 겹치므로 모바일에서는 시작 연도 바로 옆 연도는 숨긴다
            const isEndpoint = y === startYear || y === max;
            // 시작이 끝 바로 전 해면 두 숫자가 겹치므로, 모바일에서는 시작 연도를 왼쪽으로 조금 민다
            const nudgeLeft = y === startYear && startYear === max - 1;
            const hideNear = startYear === max - 1 ? 3 : 1; // 시작 연도 주변에서 숨길 연도 범위(모바일)
            // 구간이 홀수 해이면 건너뛰기 간격(2칸)이 끝 연도에서 어긋나 마지막 두 숫자가 붙으므로, 끝 연도 바로 옆 연도도 모바일에서 숨긴다
            return (
              <span
                key={y}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) onChange([Math.min(y, max), max]);
                }}
                style={{ left: `${toPercent(y)}%` }}
                className={`absolute top-0 ${nudgeLeft ? "-translate-x-[calc(50%+24px)] md:-translate-x-1/2" : "-translate-x-1/2"} text-sm leading-5 whitespace-nowrap transition-[opacity,color] duration-150 select-none ${
                  !isEndpoint && (i % 2 === 1 || Math.abs(y - startYear) <= hideNear || max - y <= 1) ? "invisible md:visible" : ""
                } ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${
                  isEndpoint ? "font-semibold text-accent-text" : "font-normal text-fg-muted opacity-30"
                }`}
              >
                {y}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

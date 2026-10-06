"use client";

import { useRef, useCallback } from "react";

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

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100;
  const toYear = (percent: number) => Math.round(min + Math.max(0, Math.min(1, percent)) * (max - min));

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
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">수집 기간</span>
        <span
          className={`rounded-md text-[13px] font-bold transition-all duration-200 ${
            isAll ? "p-0 text-fg-muted" : "bg-accent-glow px-2.5 py-0.5 text-accent"
          }`}
        >
          {isAll ? "전체 기간" : `${startYear} ~ ${max}`}
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

        {/* Year ticks — 모바일에서는 자리만 두고 한 칸씩 건너뛰어 표시 */}
        <div className="flex justify-between pt-2.5">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((y, i) => (
            <span
              key={y}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onChange([Math.min(y, max), max]);
              }}
              className={`min-w-0 flex-1 text-center text-[11px] whitespace-nowrap transition-colors duration-150 select-none ${
                i % 2 === 1 ? "invisible md:visible" : ""
              } ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${
                y >= startYear ? "font-semibold text-accent" : "font-normal text-line"
              }`}
            >
              {y}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

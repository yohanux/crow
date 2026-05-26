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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>수집 기간</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isAll ? "var(--text-secondary)" : "var(--accent)",
            background: isAll ? "transparent" : "var(--accent-glow)",
            padding: isAll ? 0 : "2px 10px",
            borderRadius: 6,
            transition: "all 0.2s",
          }}
        >
          {isAll ? "전체 기간" : `${startYear} ~ ${max}`}
        </span>
      </div>

      {/* Track + year ticks — unified click zone */}
      <div
        onClick={handleTrackClick}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          padding: "8px 0 4px",
        }}
      >
        <div
          ref={trackRef}
          style={{
            position: "relative",
            height: 6,
            background: "var(--surface2)",
            borderRadius: 3,
          }}
        >
          {/* Active fill */}
          <div
            style={{
              position: "absolute",
              left: `${leftPct}%`,
              width: `${100 - leftPct}%`,
              height: "100%",
              background: disabled ? "var(--border)" : "var(--accent)",
              borderRadius: 3,
              transition: "background 0.2s",
              pointerEvents: "none",
            }}
          />

          {/* Start thumb only */}
          <div
            style={{
              position: "absolute",
              left: `${leftPct}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 2,
            }}
          >
            <div
              onMouseDown={startDrag}
              onTouchStart={startDrag}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: disabled ? "var(--border)" : "var(--accent)",
                border: "3px solid var(--background)",
                boxShadow: disabled ? "none" : "0 0 0 2px var(--accent)",
                cursor: disabled ? "not-allowed" : "grab",
                transition: "box-shadow 0.15s, background 0.15s",
                userSelect: "none",
              }}
            />
          </div>
        </div>

        {/* Year ticks */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((y) => (
            <span
              key={y}
              onClick={(e) => { e.stopPropagation(); if (!disabled) onChange([Math.min(y, max), max]); }}
              style={{
                fontSize: 11,
                color: y >= startYear ? "var(--accent)" : "var(--border)",
                fontWeight: y >= startYear ? 600 : 400,
                transition: "color 0.15s",
                flex: 1,
                textAlign: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                userSelect: "none",
              }}
            >
              {y}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

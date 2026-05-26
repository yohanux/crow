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
  const [startYear, endYear] = value;
  const trackRef = useRef<HTMLDivElement>(null);

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100;
  const toYear = (percent: number) => Math.round(min + Math.max(0, Math.min(1, percent)) * (max - min));

  // 트랙 클릭 → 시작년도 설정
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const year = toYear(pct);
      onChange([Math.min(year, endYear), endYear]);
    },
    [disabled, endYear, onChange, toYear]
  );

  // 드래그 핸들러 (시작/종료 thumb 공용)
  const startDrag = useCallback(
    (thumb: "start" | "end") => (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation(); // 트랙 click 이벤트 차단
      const track = trackRef.current;
      if (!track) return;

      const move = (clientX: number) => {
        const rect = track.getBoundingClientRect();
        const pct = (clientX - rect.left) / rect.width;
        const year = toYear(pct);
        if (thumb === "start") {
          onChange([Math.min(year, endYear), endYear]);
        } else {
          onChange([startYear, Math.max(year, startYear)]);
        }
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
    [disabled, startYear, endYear, onChange, toYear]
  );

  const leftPct = toPercent(startYear);
  const rightPct = toPercent(endYear);
  const isAll = startYear === min && endYear === max;

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
          {isAll ? "전체 기간" : `${startYear} ~ ${endYear}`}
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
              width: `${rightPct - leftPct}%`,
              height: "100%",
              background: disabled ? "var(--border)" : "var(--accent)",
              borderRadius: 3,
              transition: "background 0.2s",
              pointerEvents: "none",
            }}
          />

          {/* Start thumb */}
          <Thumb
            percent={leftPct}
            onMouseDown={startDrag("start")}
            disabled={disabled}
            label={String(startYear)}
            side="left"
          />

          {/* End thumb */}
          <Thumb
            percent={rightPct}
            onMouseDown={startDrag("end")}
            disabled={disabled}
            label={String(endYear)}
            side="right"
          />
        </div>

        {/* Year ticks */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((y) => (
            <span
              key={y}
              onClick={(e) => { e.stopPropagation(); if (!disabled) onChange([Math.min(y, endYear), endYear]); }}
            style={{
              fontSize: 11,
              color: y >= startYear && y <= endYear ? "var(--accent)" : "var(--border)",
              fontWeight: y >= startYear && y <= endYear ? 600 : 400,
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

function Thumb({
  percent,
  onMouseDown,
  disabled,
  label,
  side,
}: {
  percent: number;
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  disabled?: boolean;
  label: string;
  side: "left" | "right";
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${percent}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 2,
      }}
    >
      {/* Tooltip */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: disabled ? "var(--border)" : "var(--accent)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 7px",
          borderRadius: 5,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          opacity: side === "left" ? 1 : 1,
        }}
      >
        {label}
      </div>

      {/* Handle */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onClick={(e) => e.stopPropagation()} // 트랙 click 전파 차단
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
  );
}

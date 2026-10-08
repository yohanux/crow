"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
  Rectangle,
  type RectangleProps,
} from "recharts";
import { TrendPoint } from "@/lib/types";

interface TrendChartProps {
  data: TrendPoint[];
  /** 선택한 월들 (여러 개 선택 가능, 오름차순) */
  selectedMonths: string[];
  onMonthsChange: (months: string[]) => void;
  bare?: boolean;
}

// hint: 범례에 마우스를 올리면 보여주는 안내 (긍정/부정을 나누는 기준 별점)
const SERIES = [
  { key: "positive", label: "긍정", color: "#22c55e", textColor: "#22c55e", hint: "4-5점" },
  { key: "negative", label: "부정", color: "#ef4444", textColor: "#ef4444", hint: "1-3점" },
  { key: "avgRating", label: "평균 별점", color: "#7D3CFE", textColor: "#AE8BFF", hint: null },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

const BAR_RADIUS = 4;

/** 막대를 쌓는 순서: 앞쪽이 맨 아래. 부정이 맨 아래, 긍정이 그 위 (순서를 바꾸려면 이 배열만 뒤집으면 된다) */
const STACK_ORDER = ["negative", "positive"] as const;

/** 막대 애니메이션 시간(ms) */
const BAR_ANIMATION_MS = 300;

/**
 * 막대 위/아래를 둥글게 처리한다. 쌓는 순서는 STACK_ORDER(맨 아래 → 위)를 따르고,
 * 한쪽이 숨겨졌거나 그 달에 0건이면 남은 막대가 위·아래 모두 둥글어지도록 반지름을 계산한다.
 */
function stackedBarShape(role: "positive" | "negative", otherVisible: boolean) {
  const other = role === "positive" ? "negative" : "positive";
  const isBottom = STACK_ORDER[0] === role;
  const Shape = (props: RectangleProps & { payload?: TrendPoint }) => {
    const alone = !otherVisible || !props.payload || props.payload[other] === 0;
    const r = BAR_RADIUS;
    // radius: [좌상, 우상, 우하, 좌하]
    const radius: [number, number, number, number] = isBottom
      ? [alone ? r : 0, alone ? r : 0, r, r] // 맨 아래 막대: 아래는 항상 둥글게, 위는 혼자일 때만
      : [r, r, alone ? r : 0, alone ? r : 0]; // 그 위 막대: 위는 항상 둥글게, 아래는 혼자일 때만
    return <Rectangle {...props} radius={radius} />;
  };
  return Shape;
}

export default function TrendChart({ data, selectedMonths, onMonthsChange, bare }: TrendChartProps) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    positive: true,
    negative: true,
    avgRating: true,
  });

  // 끈 계열은 막대를 지우지 않고 값만 0으로 만든다. 그러면 Recharts가 값의 변화(0 ↔ 실제 값)를 애니메이션해서
  // 부정은 긍정의 맨 위에서 자라 올라오고, 긍정을 켜면 아래에서 자라며 부정을 위로 밀어 올린다.
  // (막대를 마운트/언마운트하면 새 막대가 차트 바닥에서 시작해 긍정 막대와 겹쳐 튀어나온다)
  const displayData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        positive: visible.positive ? d.positive : 0,
        negative: visible.negative ? d.negative : 0,
      })),
    [data, visible.positive, visible.negative]
  );

  // Y축 범위는 켜고 끌 때마다 바뀌지 않도록 전체(긍정+부정) 기준으로 고정한다
  const countMax = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.positive + d.negative));
    const unit = 10 ** Math.floor(Math.log10(max)) / 2;
    return Math.ceil(max / unit) * unit;
  }, [data]);

  if (data.length === 0) return null;

  function handleChartClick(payload: { activeLabel?: string | number } | null) {
    const label = payload?.activeLabel;
    if (!label) return;
    const month = String(label);
    // 이미 선택된 월을 다시 누르면 해제, 아니면 추가 (월 순서대로 정렬)
    onMonthsChange(
      selectedMonths.includes(month)
        ? selectedMonths.filter((m) => m !== month)
        : [...selectedMonths, month].sort()
    );
  }

  function toggleSeries(key: SeriesKey) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const showRatingAxis = visible.avgRating;

  const content = (
    <div className="px-2 pt-4 pb-3 md:px-6 md:py-5">
      {/* 선택한 월 칩 + 초기화: 영역 높이(32px)를 미리 확보해 두어 칩이 나타나도 카드 높이가 늘어나지 않는다.
          초기화(전체 해제)는 칩 목록의 맨 마지막 순서에 놓이고, 칩이 많아져도 줄바꿈하지 않고 한 줄에서 가로로 스크롤한다 */}
      <div className="scrollbar-hidden mb-3 flex h-8 items-center gap-2 overflow-x-auto">
        {selectedMonths.map((month) => (
          <span
            key={month}
            className="animate-fade-in inline-flex shrink-0 items-center gap-1 rounded-full border border-accent bg-accent-glow py-1 pr-1.5 pl-3 text-[13px] font-semibold text-accent-text"
          >
            {month}
            {/* 이 칩의 월만 해제 */}
            <button
              type="button"
              onClick={() => onMonthsChange(selectedMonths.filter((m) => m !== month))}
              aria-label={`${month} 선택 해제`}
              className="flex size-[18px] cursor-pointer items-center justify-center rounded-full text-accent-text transition-colors hover:bg-accent/30"
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
              </svg>
            </button>
          </span>
        ))}
        {selectedMonths.length > 0 && (
          <button
            type="button"
            onClick={() => onMonthsChange([])}
            className="animate-fade-in shrink-0 cursor-pointer rounded-md px-2 py-1 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            초기화
          </button>
        )}
      </div>
      <div className="h-[220px] select-none md:h-[280px] [&_*]:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          accessibilityLayer={false}
          data={displayData}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          onClick={handleChartClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            minTickGap={16}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="count"
            domain={[0, countMax]}
            allowDecimals={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          {showRatingAxis && (
            <YAxis
              yAxisId="rating"
              orientation="right"
              domain={[1, 5]}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
            formatter={(value, name) => {
              // 꺼 둔 계열은 값이 0으로 바뀌어 있으므로 툴팁 목록에서 뺀다
              if ((name === "긍정" && !visible.positive) || (name === "부정" && !visible.negative)) return null;
              if (name === "평균 별점" && typeof value === "number") return [value.toFixed(1), name];
              return [value, name];
            }}
          />
          {selectedMonths.map((month) => (
            <ReferenceArea
              key={month}
              yAxisId="count"
              x1={month}
              x2={month}
              fill="#7D3CFE"
              fillOpacity={0.08}
              stroke="#7D3CFE"
              strokeOpacity={0.25}
              strokeWidth={1}
            />
          ))}
          {/* 막대는 항상 같은 순서(STACK_ORDER)로 렌더링하고, 끌 때는 제거하지 않고 값만 0으로 만든다(displayData).
              Recharts는 마운트된 순서대로 쌓기 때문에, 조건부로 넣고 빼면 껐다 켠 쪽이 위로 올라가 순서가 뒤바뀐다 */}
          {STACK_ORDER.map((key) => {
            const isPositive = key === "positive";
            const color = isPositive ? "#22c55e" : "#ef4444";
            const otherKey = isPositive ? "negative" : "positive";
            return (
              <Bar
                key={key}
                yAxisId="count"
                dataKey={key}
                name={isPositive ? "긍정" : "부정"}
                fill={color}
                stackId="a"
                animationDuration={BAR_ANIMATION_MS}
                animationEasing="ease-out"
                shape={stackedBarShape(key, visible[otherKey])}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={selectedMonths.length > 0 && !selectedMonths.includes(entry.month) ? `${color}44` : color}
                  />
                ))}
              </Bar>
            );
          })}
          {visible.avgRating && (
            <Line
              yAxisId="rating"
              type="monotone"
              dataKey="avgRating"
              name="평균 별점"
              stroke="#7D3CFE"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2 md:gap-3">
        {SERIES.map(({ key, label, color, textColor, hint }) => (
          <label
            key={key}
            className={`group relative flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm transition-colors select-none ${
              visible[key] ? "font-semibold" : "font-normal text-fg-muted"
            }`}
            style={visible[key] ? { color: textColor } : undefined}
          >
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={() => toggleSeries(key)}
              className="check-white size-[18px] cursor-pointer"
              style={{ "--check-color": color } as React.CSSProperties}
            />
            {label}
            {hint && (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs font-medium whitespace-nowrap text-fg opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.35)] transition-opacity group-hover:opacity-100">
                {hint}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );

  if (bare) return content;

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="border-b border-line px-4 py-3 md:px-6 md:py-4">
        <h3 className="text-[15px] font-semibold text-fg">월별 리뷰 추세</h3>
      </div>
      {content}
    </div>
  );
}

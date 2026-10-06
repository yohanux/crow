"use client";

import { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { Review } from "@/lib/types";
import { format } from "date-fns";

type SortKey = "date" | "rating";
type SentimentFilter = "all" | "positive" | "negative";

type SummaryPoint = {
  type: "positive" | "negative" | "suggestion";
  title: string;
  summary: string;
  keywords: string[];
};

type SummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; points: SummaryPoint[]; total: number; sampled: number }
  | { status: "error"; message: string };

// Tailwind는 클래스 문자열을 정적으로 스캔하므로 타입별 클래스를 통째로 적어 둔다
const POINT_STYLES = {
  positive: {
    text: "text-positive",
    card: "border-positive/20 border-l-positive bg-positive/[0.07]",
    selected: "border-positive bg-positive/[0.09] outline-2 outline-offset-1 outline-positive",
    badge: "border-positive/20 bg-positive/10 text-positive",
  },
  negative: {
    text: "text-negative",
    card: "border-negative/20 border-l-negative bg-negative/[0.07]",
    selected: "border-negative bg-negative/[0.09] outline-2 outline-offset-1 outline-negative",
    badge: "border-negative/20 bg-negative/10 text-negative",
  },
  suggestion: {
    text: "text-accent",
    card: "border-accent/20 border-l-accent bg-accent/[0.07]",
    selected: "border-accent bg-accent/[0.09] outline-2 outline-offset-1 outline-accent",
    badge: "border-accent/20 bg-accent/10 text-accent",
  },
};

const PAGE_SIZE = 50;

function Highlight({ text, queries }: { text: string; queries: string[] }) {
  const active = queries.filter((q) => q.trim());
  if (active.length === 0) return <>{text}</>;
  const pattern = active.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  const lowerActive = active.map((q) => q.toLowerCase());
  return (
    <>
      {parts.map((part, i) =>
        lowerActive.includes(part.toLowerCase()) ? (
          <mark key={i} className="rounded-[3px] bg-accent px-0.5 text-white">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function ReviewRow({ r, keywords }: { r: Review; keywords: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const [needsExpand, setNeedsExpand] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setNeedsExpand(el.scrollHeight > el.clientHeight + 1);
  }, [r.id, r.text]);

  return (
    <tr
      onClick={() => needsExpand && setExpanded((p) => !p)}
      // 모바일: 카드형(flex) / md 이상: 표의 행
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-3 md:table-row md:p-0 ${
        r.sentiment === "positive" ? "bg-positive/[0.07]" : "bg-negative/[0.07]"
      } ${needsExpand ? "cursor-pointer" : "cursor-default"}`}
    >
      <td className="order-1 block text-xs whitespace-nowrap text-fg-muted md:table-cell md:px-4 md:py-3 md:align-top md:text-[13px]">
        {format(new Date(r.date), "yyyy-MM-dd")}
      </td>
      <td className="order-2 block text-left text-xs font-bold text-star md:table-cell md:px-4 md:py-3 md:align-top md:text-[13px]">
        {"★".repeat(r.rating)}
      </td>
      <td className="order-4 mt-1 block basis-full text-fg md:mt-0 md:table-cell md:max-w-[420px] md:px-4 md:py-3 md:align-top">
        {r.title && (
          <div className="mb-0.5 font-semibold">
            <Highlight text={r.title} queries={keywords} />
          </div>
        )}
        <div ref={textRef} className={`overflow-hidden text-[#c4c4d6] ${expanded ? "" : "line-clamp-2"}`}>
          <Highlight text={r.text} queries={keywords} />
        </div>
        {needsExpand && (
          <span className="mt-0.5 block text-xs font-semibold text-accent">{expanded ? "접기" : "더보기"}</span>
        )}
      </td>
      <td className="order-3 ml-auto block text-xs whitespace-nowrap text-fg-muted md:table-cell md:px-4 md:py-3 md:align-top md:text-[13px]">
        {r.version}
      </td>
    </tr>
  );
}

function PointCard({
  point,
  selected,
  matchCount,
  onClick,
}: {
  point: SummaryPoint;
  selected: boolean;
  matchCount: number;
  onClick: () => void;
}) {
  const st = POINT_STYLES[point.type] ?? POINT_STYLES.suggestion;
  return (
    <div
      onClick={onClick}
      className={`basis-full cursor-pointer rounded-[10px] border border-l-[3px] px-4 py-3 transition-colors md:max-w-[360px] md:min-w-[200px] md:flex-1 md:basis-[200px] ${
        selected ? st.selected : st.card
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-fg">{point.title}</span>
        {matchCount > 0 && (
          <span
            className={`shrink-0 rounded-full border px-2 py-px text-[11px] font-semibold whitespace-nowrap ${st.badge}`}
          >
            {matchCount.toLocaleString()}건
          </span>
        )}
      </div>
      <p className="m-0 text-xs leading-relaxed text-fg-muted">{point.summary}</p>
      {selected && (
        <div className={`mt-2 text-[11px] font-semibold ${st.text}`}>↓ 관련 리뷰만 표시 중 · 다시 클릭하면 해제</div>
      )}
    </div>
  );
}

export default function ReviewTable({
  reviews,
  versionFilter,
  monthFilter,
}: {
  reviews: Review[];
  versionFilter?: string | null;
  monthFilter?: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [filterShort, setFilterShort] = useState(false);
  const [summary, setSummary] = useState<SummaryState>({ status: "idle" });
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [versionFilter, monthFilter]);

  // Reset summary and selection when filters change
  useEffect(() => {
    setSummary({ status: "idle" });
    setSelectedPoint(null);
  }, [versionFilter, monthFilter, sentiment, ratingFilter, keywords, filterShort]);

  // Reset selection when summary changes
  useEffect(() => {
    setSelectedPoint(null);
  }, [summary.status]);

  const MIN_LENGTH = 20;

  const filtered = useMemo(() => {
    let res = reviews;
    if (versionFilter) res = res.filter((r) => (r.version || "알 수 없음") === versionFilter);
    if (monthFilter) res = res.filter((r) => format(new Date(r.date), "yyyy-MM") === monthFilter);
    if (filterShort) res = res.filter((r) => r.text.trim().length >= MIN_LENGTH);
    if (sentiment !== "all") res = res.filter((r) => r.sentiment === sentiment);
    if (ratingFilter !== "all") res = res.filter((r) => r.rating === ratingFilter);
    if (keywords.length > 0) {
      res = res.filter((r) =>
        keywords.some((k) => {
          const q = k.toLowerCase();
          return (
            r.text.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q) ||
            r.userName.toLowerCase().includes(q)
          );
        })
      );
    }
    return res;
  }, [reviews, versionFilter, monthFilter, sentiment, ratingFilter, keywords, filterShort]);

  const sorted = useMemo(() => {
    if (!sortKey) return [...filtered];
    return [...filtered].sort((a, b) => {
      if (sortKey === "date") {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortAsc ? diff : -diff;
      } else {
        return sortAsc ? a.rating - b.rating : b.rating - a.rating;
      }
    });
  }, [filtered, sortKey, sortAsc]);

  const pointMatchCounts = useMemo(() => {
    if (summary.status !== "done") return [];
    return summary.points.map((point) => {
      const kws = point.keywords.map((k) => k.toLowerCase());
      return sorted.filter((r) =>
        kws.some((kw) => r.text.toLowerCase().includes(kw) || r.title.toLowerCase().includes(kw))
      ).length;
    });
  }, [sorted, summary]);

  const pointFiltered = useMemo(() => {
    if (selectedPoint === null || summary.status !== "done") return sorted;
    const kws = summary.points[selectedPoint].keywords.map((k) => k.toLowerCase());
    return sorted.filter((r) =>
      kws.some((kw) => r.text.toLowerCase().includes(kw) || r.title.toLowerCase().includes(kw))
    );
  }, [sorted, selectedPoint, summary]);

  const totalPages = Math.max(1, Math.ceil(pointFiltered.length / PAGE_SIZE));
  const pageReviews = pointFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortAsc(false); }
    else if (!sortAsc) { setSortAsc(true); }
    else { setSortKey(null); setSortAsc(false); }
    setSelectedPoint(null);
    setPage(1);
  }

  async function handleAnalyze() {
    if (filtered.length === 0) return;
    setSummary({ status: "loading" });
    try {
      const payload = filtered.map((r) => ({
        rating: r.rating,
        text: r.text.slice(0, 200),
        sentiment: r.sentiment,
      }));
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSummary({ status: "error", message: data.error ?? "알 수 없는 오류" });
        return;
      }
      setSummary({ status: "done", points: data.points, total: data.total, sampled: data.sampled });
    } catch (e) {
      setSummary({ status: "error", message: String(e) });
    }
  }

  const chip = "rounded-full border px-2.5 py-0.5 text-xs font-semibold";
  const select =
    "min-h-10 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-base text-fg outline-none md:min-h-0 md:flex-none md:text-[13px]";
  const pageBtn = "rounded-lg border px-3 py-1.5 text-[13px]";

  return (
    <div ref={containerRef} className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:gap-3 md:px-6 md:py-4">
        <h3 className="mr-2 text-[15px] font-semibold text-fg">리뷰 목록</h3>
        {versionFilter && (
          <span className={`${chip} border-accent bg-accent-glow text-accent`}>v{versionFilter}</span>
        )}
        {monthFilter && (
          <span className={`${chip} border-accent/25 bg-accent/10 text-accent`}>{monthFilter}</span>
        )}
        <div
          onClick={() => keywordInputRef.current?.focus()}
          className="flex min-w-[180px] basis-full cursor-text flex-wrap items-center gap-1 rounded-lg border border-line bg-surface-2 px-2 py-1 md:max-w-[360px] md:basis-auto"
        >
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-glow px-2 py-px text-xs font-semibold whitespace-nowrap text-accent"
            >
              {k}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setKeywords((prev) => prev.filter((v) => v !== k));
                  setPage(1);
                }}
                className="cursor-pointer p-0 text-[13px] leading-none font-bold text-accent"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={keywordInputRef}
            type="text"
            placeholder={keywords.length === 0 ? "키워드 입력 후 Enter" : ""}
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && keywordInput.trim()) {
                e.preventDefault();
                const next = keywordInput.trim().replace(/,$/, "");
                if (next && !keywords.includes(next)) {
                  setKeywords((prev) => [...prev, next]);
                  setPage(1);
                }
                setKeywordInput("");
              } else if (e.key === "Backspace" && !keywordInput && keywords.length > 0) {
                setKeywords((prev) => prev.slice(0, -1));
                setPage(1);
              }
            }}
            // iOS는 16px 미만 입력창에 포커스하면 화면을 확대하므로 모바일은 text-base
            className="min-w-20 flex-1 bg-transparent px-1 py-0.5 text-base text-fg outline-none md:text-[13px]"
          />
        </div>
        <select
          value={sentiment}
          onChange={(e) => {
            setSentiment(e.target.value as SentimentFilter);
            setPage(1);
          }}
          className={select}
        >
          <option value="all">전체 감성</option>
          <option value="positive">긍정</option>
          <option value="negative">부정</option>
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => {
            const v = e.target.value;
            setRatingFilter(v === "all" ? "all" : Number(v));
            setPage(1);
          }}
          className={select}
        >
          <option value="all">전체 평점</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>
              ★{s}
            </option>
          ))}
        </select>
        <label
          className={`flex cursor-pointer items-center gap-1.5 text-[13px] whitespace-nowrap select-none ${
            filterShort ? "font-semibold text-accent" : "font-normal text-fg-muted"
          }`}
        >
          <input
            type="checkbox"
            checked={filterShort}
            onChange={(e) => {
              setFilterShort(e.target.checked);
              setPage(1);
            }}
            className="size-3.5 cursor-pointer accent-accent"
          />
          무의미한 리뷰 제거
          <span className="text-[11px] font-normal text-fg-muted">({MIN_LENGTH}자 이상만)</span>
        </label>
        <div className="flex w-full items-center justify-between gap-2.5 md:ml-auto md:w-auto md:justify-start">
          <span className="text-[13px] text-fg-muted">
            {selectedPoint !== null
              ? `${pointFiltered.length.toLocaleString()} / ${sorted.length.toLocaleString()}건`
              : `${sorted.length.toLocaleString()}건`}
          </span>
          <button
            onClick={handleAnalyze}
            disabled={filtered.length === 0 || summary.status === "loading"}
            className={`flex min-h-10 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white transition-opacity md:min-h-0 ${
              filtered.length === 0
                ? "cursor-not-allowed opacity-40"
                : summary.status === "loading"
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
            }`}
          >
            {summary.status === "loading" ? (
              <>
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                분석 중...
              </>
            ) : (
              <>✦ AI 요약</>
            )}
          </button>
        </div>
      </div>

      {/* AI Summary Panel */}
      {summary.status !== "idle" && (
        <div className="border-b border-line bg-surface-2 px-4 py-3 md:px-6 md:py-4">
          {summary.status === "loading" && (
            <div className="py-2 text-center text-[13px] text-fg-muted">리뷰를 분석하는 중입니다...</div>
          )}
          {summary.status === "error" && (
            <div className="text-[13px] text-negative">오류: {summary.message}</div>
          )}
          {summary.status === "done" && (
            <div>
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-xs text-fg-muted">
                  전체 {summary.total.toLocaleString()}개 리뷰 분석
                  {summary.sampled < summary.total && ` (${summary.sampled}개 샘플)`}
                </span>
                <button
                  onClick={() => setSummary({ status: "idle" })}
                  className="cursor-pointer rounded-md border border-line px-2.5 py-0.5 text-xs text-fg-muted"
                >
                  닫기
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {summary.points.map((point, i) => (
                  <PointCard
                    key={i}
                    point={point}
                    selected={selectedPoint === i}
                    matchCount={pointMatchCounts[i] ?? 0}
                    onClick={() => {
                      setSelectedPoint(selectedPoint === i ? null : i);
                      setPage(1);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table (md 이상) / 카드 목록 (모바일) */}
      <div className="overflow-x-auto">
        {/* 모바일은 표 머리글이 없으므로 정렬 버튼을 따로 둔다 */}
        <div className="flex gap-2 border-b border-line bg-surface-2 px-4 py-2 md:hidden">
          {(["date", "rating"] as const).map((key) => {
            const active = sortKey === key;
            return (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`min-h-9 flex-1 cursor-pointer rounded-lg border text-[13px] ${
                  active
                    ? "border-accent bg-accent font-semibold text-white"
                    : "border-line bg-surface font-normal text-fg-muted"
                }`}
              >
                {key === "date" ? "날짜" : "평점"} {active ? (sortAsc ? "↑" : "↓") : "↕"}
              </button>
            );
          })}
        </div>
        <table className="block w-full border-collapse text-[13px] md:table">
          <thead className="hidden md:table-header-group">
            <tr className="bg-surface-2">
              <th
                onClick={() => toggleSort("date")}
                className="cursor-pointer px-4 py-2.5 text-left font-semibold whitespace-nowrap text-fg-muted select-none"
              >
                날짜 {sortKey === "date" ? (sortAsc ? "↑" : "↓") : "↕"}
              </th>
              <th
                onClick={() => toggleSort("rating")}
                className="cursor-pointer px-4 py-2.5 text-left font-semibold whitespace-nowrap text-fg-muted select-none"
              >
                평점 {sortKey === "rating" ? (sortAsc ? "↑" : "↓") : "↕"}
              </th>
              <th className="px-4 py-2.5 text-left font-semibold text-fg-muted">내용</th>
              <th className="px-4 py-2.5 text-left font-semibold text-fg-muted">버전</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {pageReviews.map((r) => (
              <ReviewRow key={r.id} r={r} keywords={keywords} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-line p-3 md:px-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`${pageBtn} border-line bg-surface-2 ${
              page === 1 ? "cursor-not-allowed text-fg-muted opacity-40" : "cursor-pointer text-fg"
            }`}
          >
            ‹ 이전
          </button>
          {(() => {
            const pages: (number | "...")[] = [];
            if (totalPages <= 10) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              const left = Math.max(2, page - 2);
              const right = Math.min(totalPages - 1, page + 2);
              pages.push(1);
              if (left > 2) pages.push("...");
              for (let i = left; i <= right; i++) pages.push(i);
              if (right < totalPages - 1) pages.push("...");
              pages.push(totalPages);
            }
            return pages.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 py-1.5 text-[13px] text-fg-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[34px] rounded-lg border px-2.5 py-1.5 text-[13px] ${
                    p === page
                      ? "cursor-default border-accent bg-accent font-bold text-white"
                      : "cursor-pointer border-line bg-surface-2 font-normal text-fg"
                  }`}
                >
                  {p}
                </button>
              )
            );
          })()}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`${pageBtn} border-line bg-surface-2 ${
              page === totalPages ? "cursor-not-allowed text-fg-muted opacity-40" : "cursor-pointer text-fg"
            }`}
          >
            다음 ›
          </button>
        </div>
      )}
    </div>
  );
}

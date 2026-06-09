"use client";

import { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { Review } from "@/lib/types";
import { format } from "date-fns";

type SortKey = "date" | "rating";
type SentimentFilter = "all" | "positive" | "negative";

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "긍정",
  negative: "부정",
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
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
          <mark key={i} style={{ background: "var(--accent)", color: "#ffffff", borderRadius: 3, padding: "0 2px" }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function ReviewRow({ r, i, keywords }: { r: Review; i: number; keywords: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const [needsExpand, setNeedsExpand] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setNeedsExpand(el.scrollHeight > el.clientHeight + 1);
  }, [r.id, r.text]);

  const rowBg = r.sentiment === "positive"
    ? "rgba(34,197,94,0.07)"
    : "rgba(239,68,68,0.07)";

  return (
    <tr
      onClick={() => needsExpand && setExpanded((p) => !p)}
      style={{
        borderTop: "1px solid var(--border)",
        background: rowBg,
        cursor: needsExpand ? "pointer" : "default",
      }}
    >
      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap", verticalAlign: "top" }}>
        {format(new Date(r.date), "yyyy-MM-dd")}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "left", color: "#f59e0b", fontWeight: 700, verticalAlign: "top" }}>
        {"★".repeat(r.rating)}
      </td>
      <td style={{ padding: "12px 16px", color: "var(--text-primary)", maxWidth: 420, verticalAlign: "top" }}>
        {r.title && (
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            <Highlight text={r.title} queries={keywords} />
          </div>
        )}
        <div
          ref={textRef}
          style={{
            color: "#c4c4d6",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          <Highlight text={r.text} queries={keywords} />
        </div>
        {needsExpand && (
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginTop: 2, display: "block" }}>
            {expanded ? "접기" : "더보기"}
          </span>
        )}
      </td>
      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap", verticalAlign: "top" }}>
        {r.version}
      </td>
    </tr>
  );
}

export default function ReviewTable({ reviews, versionFilter, monthFilter }: { reviews: Review[]; versionFilter?: string | null; monthFilter?: string | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [filterShort, setFilterShort] = useState(false);
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

  const MIN_LENGTH = 15;

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
    const s = [...filtered].sort((a, b) => {
      if (sortKey === "date") {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortAsc ? diff : -diff;
      } else {
        return sortAsc ? a.rating - b.rating : b.rating - a.rating;
      }
    });
    return s;
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageReviews = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Filters */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginRight: 8 }}>
          리뷰 목록
        </h3>
        {versionFilter && (
          <span
            style={{
              fontSize: 12,
              background: "var(--accent-glow)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: 20,
              padding: "2px 10px",
              fontWeight: 600,
            }}
          >
            v{versionFilter}
          </span>
        )}
        {monthFilter && (
          <span
            style={{
              fontSize: 12,
              background: "#7c6aff22",
              color: "#7c6aff",
              border: "1px solid #7c6aff44",
              borderRadius: 20,
              padding: "2px 10px",
              fontWeight: 600,
            }}
          >
            {monthFilter}
          </span>
        )}
        <div
          onClick={() => keywordInputRef.current?.focus()}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 8px",
            minWidth: 180,
            maxWidth: 360,
            cursor: "text",
          }}
        >
          {keywords.map((k) => (
            <span
              key={k}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "var(--accent-glow)",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                borderRadius: 20,
                padding: "1px 8px",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {k}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setKeywords((prev) => prev.filter((v) => v !== k));
                  setPage(1);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 13,
                  fontWeight: 700,
                }}
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
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13,
              minWidth: 80,
              flex: 1,
              padding: "2px 4px",
            }}
          />
        </div>
        <select
          value={sentiment}
          onChange={(e) => { setSentiment(e.target.value as SentimentFilter); setPage(1); }}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
          }}
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
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
          }}
        >
          <option value="all">전체 평점</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>★{s}</option>
          ))}
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            userSelect: "none",
            fontSize: 13,
            color: filterShort ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: filterShort ? 600 : 400,
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={filterShort}
            onChange={(e) => { setFilterShort(e.target.checked); setPage(1); }}
            style={{ accentColor: "var(--accent)", width: 14, height: 14, cursor: "pointer" }}
          />
          무의미한 리뷰 제거
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 400 }}>
            ({MIN_LENGTH}자 이상만)
          </span>
        </label>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-secondary)" }}>
          {sorted.length.toLocaleString()}건
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              <th
                onClick={() => toggleSort("date")}
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                날짜 {sortKey === "date" ? (sortAsc ? "↑" : "↓") : ""}
              </th>
              <th
                onClick={() => toggleSort("rating")}
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                평점 {sortKey === "rating" ? (sortAsc ? "↑" : "↓") : ""}
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>내용</th>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>버전</th>
            </tr>
          </thead>
          <tbody>
            {pageReviews.map((r, i) => (
              <ReviewRow key={r.id} r={r} i={i} keywords={keywords} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
            borderTop: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 12px",
              color: page === 1 ? "var(--text-secondary)" : "var(--text-primary)",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontSize: 13,
              opacity: page === 1 ? 0.4 : 1,
            }}
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
                <span key={`ellipsis-${i}`} style={{ padding: "6px 4px", fontSize: 13, color: "var(--text-secondary)" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? "var(--accent)" : "var(--surface2)",
                    border: `1px solid ${p === page ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    minWidth: 34,
                    color: p === page ? "#ffffff" : "var(--text-primary)",
                    cursor: p === page ? "default" : "pointer",
                    fontSize: 13,
                    fontWeight: p === page ? 700 : 400,
                  }}
                >
                  {p}
                </button>
              )
            );
          })()}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 12px",
              color: page === totalPages ? "var(--text-secondary)" : "var(--text-primary)",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              fontSize: 13,
              opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            다음 ›
          </button>
        </div>
      )}
    </div>
  );
}

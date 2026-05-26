"use client";

import { useState, useMemo } from "react";
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

const PAGE_SIZE = 20;

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ background: "#7c6aff44", color: "inherit", borderRadius: 2, padding: "0 1px" }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function ReviewTable({ reviews, versionFilter, monthFilter }: { reviews: Review[]; versionFilter?: string | null; monthFilter?: string | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [filterShort, setFilterShort] = useState(false);
  const [page, setPage] = useState(1);

  const MIN_LENGTH = 15;

  const filtered = useMemo(() => {
    let res = reviews;
    if (versionFilter) res = res.filter((r) => (r.version || "알 수 없음") === versionFilter);
    if (monthFilter) res = res.filter((r) => format(new Date(r.date), "yyyy-MM") === monthFilter);
    if (filterShort) res = res.filter((r) => r.text.trim().length >= MIN_LENGTH);
    if (sentiment !== "all") res = res.filter((r) => r.sentiment === sentiment);
    if (ratingFilter !== "all") res = res.filter((r) => r.rating === ratingFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      res = res.filter(
        (r) =>
          r.text.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q)
      );
    }
    return res;
  }, [reviews, versionFilter, monthFilter, sentiment, ratingFilter, search, filterShort]);

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
        <input
          type="text"
          placeholder="검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
            width: 180,
          }}
        />
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
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                평점 {sortKey === "rating" ? (sortAsc ? "↑" : "↓") : ""}
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>감성</th>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>작성자</th>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>내용</th>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>버전</th>
            </tr>
          </thead>
          <tbody>
            {pageReviews.map((r, i) => (
              <tr
                key={r.id}
                style={{
                  borderTop: "1px solid var(--border)",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                }}
              >
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {format(new Date(r.date), "yyyy-MM-dd")}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: `${SENTIMENT_COLOR[r.sentiment]}22`,
                      color: SENTIMENT_COLOR[r.sentiment],
                    }}
                  >
                    {SENTIMENT_LABEL[r.sentiment]}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  <Highlight text={r.userName} query={search} />
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-primary)", maxWidth: 420 }}>
                  {r.title && (
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      <Highlight text={r.title} query={search} />
                    </div>
                  )}
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    <Highlight text={r.text} query={search} />
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {r.version}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          padding: "12px 24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 14px",
            color: page === 1 ? "var(--text-secondary)" : "var(--text-primary)",
            cursor: page === 1 ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          이전
        </button>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 14px",
            color: page === totalPages ? "var(--text-secondary)" : "var(--text-primary)",
            cursor: page === totalPages ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          다음
        </button>
      </div>
    </div>
  );
}

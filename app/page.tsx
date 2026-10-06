"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ScrapeResult, AppInfo, SearchResult } from "@/lib/types";
import { classifyStore } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";
import YearRangeSlider from "@/components/YearRangeSlider";

type Status = "idle" | "loading" | "done" | "error";

const MIN_YEAR = 2010;
const MAX_YEAR = new Date().getFullYear();

const IDB_NAME = "stoview";
const IDB_STORE = "cache";
const SESSION_KEY = "stoview_session";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSave(result: ScrapeResult, url: string) {
  sessionStorage.setItem(SESSION_KEY, "1");
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ result, url }, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbLoad(): Promise<{ result: ScrapeResult; url: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get("current");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbClear() {
  sessionStorage.removeItem(SESSION_KEY);
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function parseSseChunk(raw: string): { event: string; data: string }[] {
  const results: { event: string; data: string }[] = [];
  const messages = raw.split("\n\n").filter(Boolean);
  for (const msg of messages) {
    const lines = msg.split("\n");
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) results.push({ event, data });
  }
  return results;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [yearRange, setYearRange] = useState<[number, number]>([MIN_YEAR, MAX_YEAR]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressCount, setProgressCount] = useState(0);
  const [liveAppInfo, setLiveAppInfo] = useState<AppInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [searchResults, setSearchResults] = useState<{ appstore: SearchResult[]; googleplay: SearchResult[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<SearchResult | null>(null);

  const isAllYears = yearRange[0] === MIN_YEAR && yearRange[1] === MAX_YEAR;

  // 새로고침 복원 (같은 세션 탭에서만)
  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) return;
    idbLoad().then((saved) => {
      if (!saved) return;
      setResult(saved.result);
      setStatus("done");
      setUrl(saved.url);
    }).catch(() => {});
  }, []);

  // result 변경 시 IndexedDB에 저장 + 탭 제목 업데이트
  useEffect(() => {
    if (!result) {
      document.title = "Stoview — 앱 리뷰 분석 대시보드";
      return;
    }
    document.title = `Stoview - ${result.appInfo.title} 리뷰`;
    idbSave(result, url).catch(() => {});
  }, [result, url]);

  // 앱 이름 입력 시 스토어 검색 (URL이면 검색하지 않음)
  const query = url.trim();
  const isSearchQuery = query.length >= 2 && !classifyStore(query) && !/^https?:\/\//i.test(query);

  useEffect(() => {
    if (!isSearchQuery || status === "loading") return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setSearchResults(data))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isSearchQuery, status]);

  // 수집 화면을 히스토리에 쌓아 브라우저 뒤로가기로 검색 화면에 돌아올 수 있게 한다
  const pushedRef = useRef(false);

  const resetView = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    pushedRef.current = false;
    setSearchOpen(true); // 뒤로가면 검색 결과 목록이 다시 보이도록
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setLiveAppInfo(null);
    setProgressCount(0);
    idbClear().catch(() => {});
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", resetView);
    return () => window.removeEventListener("popstate", resetView);
  }, [resetView]);

  const startScrape = useCallback(async (targetUrl: string) => {
    setSearchOpen(false);
    if (!pushedRef.current) {
      history.pushState({ stoview: "result" }, "");
      pushedRef.current = true;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setProgressMsg("앱 정보를 확인하는 중...");
    setProgressCount(0);
    setLiveAppInfo(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          startYear: yearRange[0],
          endYear: yearRange[1],
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "오류가 발생했습니다." }));
        setErrorMsg(err.error || "오류가 발생했습니다.");
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lastDouble = buffer.lastIndexOf("\n\n");
        const toProcess = lastDouble >= 0 ? buffer.slice(0, lastDouble + 2) : "";
        buffer = lastDouble >= 0 ? buffer.slice(lastDouble + 2) : buffer;

        const events = parseSseChunk(toProcess);
        for (const { event, data } of events) {
          try {
            const payload = JSON.parse(data);
            if (event === "progress") {
              setProgressMsg(payload.message || "");
              setProgressCount(payload.count || 0);
            } else if (event === "appinfo") {
              setLiveAppInfo(payload as AppInfo);
            } else if (event === "done") {
              setResult(payload as ScrapeResult);
              setStatus("done");
            } else if (event === "error") {
              setErrorMsg(payload.message || "오류가 발생했습니다.");
              setStatus("error");
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setStatus("error");
    }
  }, [yearRange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || isSearchQuery) return; // 앱 이름은 목록에서 선택
    startScrape(query);
  };

  // 목록에서는 선택만 하고, 분석은 시작 버튼으로 실행한다
  const handleSelectApp = (r: SearchResult) => {
    setSelectedApp(r);
    setUrl(r.url);
    setSearchOpen(false);
  };

  const handleExport = useCallback(async () => {
    if (!result) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: result.reviews, appInfo: result.appInfo }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      let filename = "stoview_export.xlsx";
      const match = cd.match(/filename\*=UTF-8''(.+)/);
      if (match) filename = decodeURIComponent(match[1]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("엑셀 내보내기 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  }, [result]);

  const handleReset = () => {
    setUrl("");
    setSelectedApp(null);
    const pushed = pushedRef.current;
    resetView(); // 화면은 즉시 초기화
    if (pushed) history.back(); // 쌓아둔 히스토리 항목 정리
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          height: 60,
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={handleReset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/stoview-logo-purple.svg" alt="Stoview" width={28} height={28} />
          <span style={{ fontFamily: "var(--font-logo)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            STOVIEW
          </span>
        </button>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 160px" }}>
        {status !== "done" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: status === "idle" ? 80 : 56,
              paddingBottom: status === "idle" ? 48 : 40,
              gap: 24,
            }}
          >
            {status === "idle" && (
              <div style={{ textAlign: "center" }}>
                <h1
                  style={{
                    fontFamily: "var(--font-logo)",
                    fontSize: 64,
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: "0 0 12px",
                    letterSpacing: "-1.5px",
                    lineHeight: 1.15,
                  }}
                >
                  STOVIEW
                </h1>
                <p style={{ fontSize: 18, color: "var(--text-secondary)", margin: 0 }}>
                  스토어 리뷰 분석
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", gap: 16, width: "100%", maxWidth: 680, flexDirection: "column" }}
            >
              {/* URL + button */}
              <div style={{ display: "flex", gap: 12, position: "relative" }}>
                <input
                  type="text"
                  value={selectedApp ? selectedApp.title : url}
                  onChange={(e) => {
                    setSelectedApp(null);
                    setUrl(e.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder="앱 이름 검색 또는 주소 붙여넣기"
                  required
                  disabled={status === "loading"}
                  style={{
                    flex: 1,
                    background: "var(--surface)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--accent)";
                    setSearchOpen(true);
                  }}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <button
                  type="submit"
                  disabled={status === "loading" || !url.trim() || isSearchQuery}
                  style={{
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 28px",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                    opacity: status === "loading" || !url.trim() || isSearchQuery ? 0.6 : 1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {status === "loading" ? "수집 중..." : "분석 시작"}
                </button>
                {searchOpen && isSearchQuery && status !== "loading" && (
                  <>
                    <div
                      onClick={() => setSearchOpen(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 40 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                        maxHeight: 560,
                        overflowY: "auto",
                        padding: 8,
                      }}
                    >
                      {!searchResults && (
                        <div style={{ padding: 16, fontSize: 13, color: "var(--text-secondary)" }}>검색 중...</div>
                      )}
                      {searchResults &&
                        (["appstore", "googleplay"] as const).map((type) => {
                          const list = searchResults[type];
                          if (list.length === 0) return null;
                          return (
                            <div key={type}>
                              <div
                                style={{
                                  padding: "8px 10px 4px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: type === "appstore" ? "#007aff" : "#01875f",
                                }}
                              >
                                {type === "appstore" ? "App Store" : "Google Play"}
                              </div>
                              {list.map((r) => (
                                <button
                                  key={r.url}
                                  type="button"
                                  onClick={() => handleSelectApp(r)}
                                  className="search-item"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    width: "100%",
                                    padding: "8px 10px",
                                    background: "transparent",
                                    border: "none",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={r.icon}
                                    alt=""
                                    style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, background: "var(--surface2)" }}
                                  />
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {r.title}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "var(--text-secondary)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {r.developer}
                                    </div>
                                  </div>
                                  {r.score > 0 && (
                                    <div style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
                                      ★ {r.score.toFixed(1)}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      {searchResults && searchResults.appstore.length === 0 && searchResults.googleplay.length === 0 && (
                        <div style={{ padding: 16, fontSize: 13, color: "var(--text-secondary)" }}>검색 결과가 없습니다.</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Year range slider */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px 20px 20px",
                }}
              >
                <YearRangeSlider
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  value={yearRange}
                  onChange={setYearRange}
                  disabled={status === "loading"}
                />
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                  {!isAllYears && (
                    <button
                      type="button"
                      onClick={() => setYearRange([MIN_YEAR, MAX_YEAR])}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: "2px 6px",
                        textDecoration: "underline",
                        flexShrink: 0,
                      }}
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>

            </form>

            {/* Loading state */}
            {status === "loading" && (
              <div style={{ width: "100%", maxWidth: 680 }}>
                {liveAppInfo && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 12,
                    }}
                  >
                    {liveAppInfo.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={liveAppInfo.icon} alt="icon" style={{ width: 44, height: 44, borderRadius: 10 }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                        {liveAppInfo.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{liveAppInfo.developer}</div>
                    </div>
                    {!isAllYears && (
                      <div
                        style={{
                          marginLeft: "auto",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--accent)",
                          background: "var(--accent-glow)",
                          padding: "3px 10px",
                          borderRadius: 6,
                          flexShrink: 0,
                        }}
                      >
                        {yearRange[0]} ~ {yearRange[1]}
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                    <div style={{ position: "relative", width: 28, height: 28, flexShrink: 0 }}>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          border: "2.5px solid var(--border)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          border: "2.5px solid transparent",
                          borderTopColor: "var(--accent)",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                      {progressMsg}
                    </div>
                    {progressCount > 0 && (
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: "var(--accent)",
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}
                      >
                        {progressCount.toLocaleString()}개
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 4,
                      background: "var(--surface2)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "var(--accent)",
                        borderRadius: 2,
                        animation: "indeterminate 1.6s ease-in-out infinite",
                      }}
                    />
                  </div>

                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, textAlign: "center" }}>
                    {!isAllYears
                      ? `${yearRange[0]}~${yearRange[1]}년 범위 — 기간을 벗어난 리뷰를 만나면 자동으로 멈춥니다`
                      : liveAppInfo?.storeType === "googleplay"
                      ? "구글플레이는 토큰이 끊길 때까지 전체 리뷰를 수집합니다"
                      : "앱스토어는 공개 API 기준 최대 ~1,000개까지 수집됩니다"}
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div
                style={{
                  background: "#ef444420",
                  border: "1px solid #ef444440",
                  borderRadius: 12,
                  padding: "14px 20px",
                  color: "var(--negative)",
                  fontSize: 14,
                  maxWidth: 680,
                  width: "100%",
                  textAlign: "center",
                }}
              >
                {errorMsg}
              </div>
            )}

          </div>
        )}

        {status === "done" && result && (
          <div style={{ paddingTop: 32 }}>
            <Dashboard
              reviews={result.reviews}
              appInfo={result.appInfo}
              onExport={handleExport}
              exporting={exporting}
            />
          </div>
        )}
      </main>

      <style>{`
        .search-item:hover { background: var(--surface2) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes indeterminate {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

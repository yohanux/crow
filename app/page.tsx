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

  const handleReset = () => {
    setUrl("");
    setSelectedApp(null);
    const pushed = pushedRef.current;
    resetView(); // 화면은 즉시 초기화
    if (pushed) history.back(); // 쌓아둔 히스토리 항목 정리
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-[100] flex h-[60px] items-center gap-4 border-b border-line bg-surface px-4 md:px-8">
        <button onClick={handleReset} className="flex cursor-pointer items-center gap-2.5 p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/stoview-logo-white.svg" alt="Stoview" width={32} height={32} className="opacity-30" />
          {/* Silver 폰트는 대문자가 줄 중앙보다 위에 놓여(상단 여백 300 / 하단 900, em 1900) 0.16em 내려 보정 */}
          <span className="font-logo translate-y-[0.16em] text-[32px] font-normal tracking-tight text-fg">STOVIEW</span>
        </button>
      </header>

      <main className="mx-auto max-w-[1200px] px-3 pb-24 md:px-6 md:pb-40">
        {status !== "done" && (
          <div
            className={`flex flex-col items-center gap-6 ${
              status === "idle" ? "pt-10 pb-8 md:pt-20 md:pb-12" : "pt-7 pb-6 md:pt-14 md:pb-10"
            }`}
          >
            {status === "idle" && (
              <div className="text-center">
                <div className="mb-3 flex flex-col items-center justify-center gap-2 md:gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/stoview-logo-purple.svg"
                    alt=""
                    className="size-[72px] animate-dot-hop md:size-24"
                  />
                  {/* 104×48 SVG 워드마크: 모바일 72px / 데스크톱 96px */}
                  <h1 className="m-0 leading-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/stoview-wordmark.svg"
                      alt="스토뷰"
                      width={104}
                      height={48}
                      className="h-[72px] w-auto md:h-24"
                    />
                  </h1>
                </div>
                <p className="m-0 text-lg text-fg-muted">스토어 리뷰 분석</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex w-full max-w-[680px] flex-col gap-4">
              {/* URL + button */}
              <div className="relative flex gap-3">
                <input
                  type="text"
                  value={selectedApp ? selectedApp.title : url}
                  onChange={(e) => {
                    setSelectedApp(null);
                    setUrl(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="앱 이름, 주소를 입력해주세요"
                  required
                  disabled={status === "loading"}
                  // iOS는 16px 미만 입력창에 포커스하면 화면을 확대하므로 모바일은 text-base
                  className="flex-1 rounded-xl border-[1.5px] border-line bg-surface px-[18px] py-3.5 text-base text-fg transition-colors outline-none focus:border-accent md:text-sm"
                />
                <button
                  type="submit"
                  disabled={status === "loading" || !url.trim() || isSearchQuery}
                  className="shrink-0 cursor-pointer rounded-xl bg-accent px-[18px] py-3.5 text-sm font-bold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:opacity-60 md:px-7"
                >
                  {status === "loading" ? "수집 중..." : "분석하기"}
                </button>

                {searchOpen && isSearchQuery && status !== "loading" && (
                  <>
                    <div onClick={() => setSearchOpen(false)} className="fixed inset-0 z-40" />
                    <div className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)] md:max-h-[560px]">
                      {!searchResults && <div className="p-4 text-[13px] text-fg-muted">검색 중...</div>}
                      {searchResults &&
                        (["appstore", "googleplay"] as const).map((type) => {
                          const list = searchResults[type];
                          if (list.length === 0) return null;
                          return (
                            <div key={type}>
                              <div
                                className={`px-2.5 pt-2 pb-1 text-[11px] font-bold ${
                                  type === "appstore" ? "text-appstore" : "text-googleplay"
                                }`}
                              >
                                {type === "appstore" ? "App Store" : "Google Play"}
                              </div>
                              {list.map((r) => (
                                <button
                                  key={r.url}
                                  type="button"
                                  onClick={() => handleSelectApp(r)}
                                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={r.icon} alt="" className="size-10 shrink-0 rounded-[9px] bg-surface-2" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-fg">{r.title}</div>
                                    <div className="truncate text-xs text-fg-muted">{r.developer}</div>
                                  </div>
                                  {r.score > 0 && (
                                    <div className="shrink-0 text-xs text-fg-muted">★ {r.score.toFixed(1)}</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      {searchResults && searchResults.appstore.length === 0 && searchResults.googleplay.length === 0 && (
                        <div className="p-4 text-[13px] text-fg-muted">검색 결과가 없습니다.</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Year range slider */}
              <div className="rounded-xl bg-surface px-5 pt-4 pb-5">
                <YearRangeSlider
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  value={yearRange}
                  onChange={setYearRange}
                  disabled={status === "loading"}
                />
                <div className="mt-2.5 flex items-center justify-end">
                  {!isAllYears && (
                    <button
                      type="button"
                      onClick={() => setYearRange([MIN_YEAR, MAX_YEAR])}
                      className="shrink-0 cursor-pointer px-1.5 py-0.5 text-xs text-fg-muted underline"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Loading state */}
            {status === "loading" && (
              <div className="w-full max-w-[680px]">
                {liveAppInfo && (
                  <div className="mb-3 flex items-center gap-3.5 rounded-xl bg-surface px-[18px] py-3.5">
                    {liveAppInfo.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={liveAppInfo.icon} alt="icon" className="size-11 rounded-[10px]" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-fg">{liveAppInfo.title}</div>
                    </div>
                    {!isAllYears && (
                      <div className="ml-auto shrink-0 rounded-md bg-accent-glow px-2.5 py-[3px] text-xs font-bold text-accent-text">
                        {yearRange[0]} ~ {yearRange[1]}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col items-center gap-3.5 rounded-xl bg-surface px-6 py-5">
                  <div className="flex w-full items-center gap-3">
                    <div className="relative size-7 shrink-0">
                      <div className="absolute inset-0 rounded-full border-[2.5px] border-line" />
                      <div className="absolute inset-0 animate-spin rounded-full border-[2.5px] border-transparent border-t-accent" />
                    </div>
                    <div className="flex-1 text-[13px] font-medium text-fg">{progressMsg}</div>
                    {progressCount > 0 && (
                      <div className="shrink-0 text-[22px] font-bold text-accent-text tabular-nums">
                        {progressCount.toLocaleString()}개
                      </div>
                    )}
                  </div>

                  <div className="h-1 w-full overflow-hidden rounded-sm bg-surface-2">
                    <div className="h-full animate-indeterminate rounded-sm bg-accent" />
                  </div>

                  <p className="m-0 text-center text-xs text-fg-muted">
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
              <div className="w-full max-w-[680px] rounded-xl border border-negative/25 bg-negative/[0.13] px-5 py-3.5 text-center text-sm text-negative">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {status === "done" && result && (
          <div className="pt-8">
            <Dashboard
              reviews={result.reviews}
              appInfo={result.appInfo}
            />
          </div>
        )}
      </main>
    </div>
  );
}

import { NextRequest } from "next/server";
import { classifyStore, extractAppStoreId, extractGooglePlayId, getSentiment } from "@/lib/utils";
import { Review, AppInfo } from "@/lib/types";

export const maxDuration = 300;

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function inRange(isoDate: string, startYear: number, endYear: number): boolean {
  const y = new Date(isoDate).getFullYear();
  return y >= startYear && y <= endYear;
}

function tooOld(isoDate: string, startYear: number): boolean {
  return new Date(isoDate).getFullYear() < startYear;
}

async function scrapeAppStore(
  appId: string,
  storeUrl: string,
  startYear: number,
  endYear: number,
  send: (event: string, data: unknown) => void
): Promise<{ appInfo: AppInfo; reviews: Review[] }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const store = require("app-store-scraper");

  let appInfo: AppInfo = {
    title: "알 수 없는 앱",
    icon: "",
    developer: "",
    score: 0,
    ratings: 0,
    storeType: "appstore",
    storeUrl,
  };

  try {
    const appData = await store.app({ id: appId, country: "kr", lang: "ko" });
    appInfo = {
      title: appData.title || "알 수 없는 앱",
      icon: appData.icon || "",
      developer: appData.developer || "",
      score: appData.score || 0,
      ratings: appData.ratings || 0,
      storeType: "appstore",
      storeUrl,
    };
    send("appinfo", appInfo);
  } catch {
    send("appinfo", appInfo);
  }

  const seen = new Set<string>();
  const reviews: Review[] = [];

  for (const sort of [store.sort.RECENT, store.sort.HELPFUL]) {
    let hitOldBoundary = false;
    for (let page = 1; page <= 10; page++) {
      try {
        const raw = await store.reviews({ id: appId, country: "kr", page, sort });
        if (!raw || raw.length === 0) break;

        let allTooOld = true;
        for (const r of raw) {
          const id = String(r.id);
          if (seen.has(id)) continue;
          seen.add(id);

          const isoDate = new Date(r.updated).toISOString();
          if (tooOld(isoDate, startYear)) {
            // Reviews are newest-first: once we see one that's too old, rest of pages will also be old
            hitOldBoundary = true;
            continue;
          }
          allTooOld = false;
          if (!inRange(isoDate, startYear, endYear)) continue;

          reviews.push({
            id,
            userName: r.userName || "익명",
            rating: r.score,
            title: r.title || "",
            text: r.text || "",
            date: isoDate,
            version: r.version,
            thumbsUp: 0,
            sentiment: getSentiment(r.score),
          });
        }

        send("progress", { count: reviews.length, message: `앱스토어 리뷰 수집 중... ${reviews.length}개` });
        if (hitOldBoundary && allTooOld) break;
      } catch {
        break;
      }
    }
    if (hitOldBoundary) break;
  }

  return { appInfo, reviews };
}

async function scrapeGooglePlay(
  appId: string,
  storeUrl: string,
  startYear: number,
  endYear: number,
  send: (event: string, data: unknown) => void
): Promise<{ appInfo: AppInfo; reviews: Review[] }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gplay = require("google-play-scraper").default || require("google-play-scraper");

  let appInfo: AppInfo = {
    title: "알 수 없는 앱",
    icon: "",
    developer: "",
    score: 0,
    ratings: 0,
    storeType: "googleplay",
    storeUrl,
  };

  try {
    const appData = await gplay.app({ appId, lang: "ko", country: "kr" });
    appInfo = {
      title: appData.title || "알 수 없는 앱",
      icon: appData.icon || "",
      developer: appData.developer || "",
      score: appData.score || 0,
      ratings: appData.ratings || 0,
      storeType: "googleplay",
      storeUrl,
    };
    send("appinfo", appInfo);
  } catch {
    send("appinfo", appInfo);
  }

  const reviews: Review[] = [];
  let nextToken: string | undefined = undefined;

  while (true) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = await gplay.reviews({
        appId,
        lang: "ko",
        country: "kr",
        sort: gplay.sort.NEWEST,
        num: 200,
        paginate: true,
        nextPaginationToken: nextToken,
      });

      const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : raw?.data || [];
      if (!items || items.length === 0) break;

      let hitOldBoundary = false;
      for (const r of items) {
        const isoDate = new Date(r.date as string | number).toISOString();
        if (tooOld(isoDate, startYear)) {
          hitOldBoundary = true;
          break;
        }
        if (!inRange(isoDate, startYear, endYear)) continue;

        reviews.push({
          id: String(r.id),
          userName: (r.userName as string) || "익명",
          rating: r.score as number,
          title: "",
          text: (r.text as string) || "",
          date: isoDate,
          version: r.version as string | undefined,
          thumbsUp: (r.thumbsUp as number) || 0,
          sentiment: getSentiment(r.score as number),
        });
      }

      send("progress", { count: reviews.length, message: `구글플레이 리뷰 수집 중... ${reviews.length}개` });

      if (hitOldBoundary) break;

      nextToken = Array.isArray(raw) ? undefined : (raw?.nextPaginationToken as string | undefined);
      if (!nextToken) break;
    } catch {
      break;
    }
  }

  return { appInfo, reviews };
}

export async function POST(req: NextRequest) {
  const { url, startYear, endYear } = await req.json();

  if (!url) {
    return new Response(JSON.stringify({ error: "URL이 필요합니다." }), { status: 400 });
  }

  const storeType = classifyStore(url);
  if (!storeType) {
    return new Response(JSON.stringify({ error: "앱스토어 또는 구글플레이 URL을 입력해주세요." }), { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const sy: number = startYear ?? 2008;
  const ey: number = endYear ?? currentYear;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(sseEvent(event, data));
      };

      try {
        send("progress", { count: 0, message: "앱 정보를 확인하는 중..." });

        let result: { appInfo: AppInfo; reviews: Review[] };

        if (storeType === "appstore") {
          const appId = extractAppStoreId(url);
          if (!appId) {
            send("error", { message: "앱스토어 앱 ID를 찾을 수 없습니다." });
            controller.close();
            return;
          }
          result = await scrapeAppStore(appId, url, sy, ey, send);
        } else {
          const appId = extractGooglePlayId(url);
          if (!appId) {
            send("error", { message: "구글플레이 앱 ID를 찾을 수 없습니다." });
            controller.close();
            return;
          }
          result = await scrapeGooglePlay(appId, url, sy, ey, send);
        }

        send("done", {
          appInfo: result.appInfo,
          reviews: result.reviews,
          totalFetched: result.reviews.length,
        });
      } catch (err) {
        console.error("Scrape error:", err);
        send("error", { message: "크롤링 중 오류가 발생했습니다. 다시 시도해주세요." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

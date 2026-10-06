import { NextRequest } from "next/server";
import { SearchResult } from "@/lib/types";

const LIMIT = 5;

async function searchAppStore(term: string): Promise<SearchResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const store = require("app-store-scraper");
  const list = await store.search({ term, num: LIMIT, country: "kr", lang: "ko" });
  return list
    .filter((a: { id?: unknown }) => a.id)
    .map((a: Record<string, unknown>) => ({
      title: String(a.title || ""),
      icon: String(a.icon || ""),
      developer: String(a.developer || ""),
      score: Number(a.score) || 0,
      storeType: "appstore" as const,
      url: `https://apps.apple.com/kr/app/id${a.id}`,
    }));
}

// google-play-scraper의 search()는 구글 마크업 변경으로 빈 결과를 반환하므로,
// 검색 페이지에서 앱 ID를 직접 추출한 뒤 app()으로 상세 정보를 가져온다.
async function searchGooglePlay(term: string): Promise<SearchResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gplay = require("google-play-scraper").default || require("google-play-scraper");
  const res = await fetch(
    `https://play.google.com/store/search?q=${encodeURIComponent(term)}&c=apps&hl=ko&gl=kr`,
    { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36" } }
  );
  const html = await res.text();
  const ids = [...new Set([...html.matchAll(/details\?id(?:=|\\u003d)([a-zA-Z0-9._]+)/g)].map((m) => m[1]))].slice(0, LIMIT);

  const apps = await Promise.allSettled(ids.map((appId) => gplay.app({ appId, lang: "ko", country: "kr" })));
  return apps.flatMap((r, i) => {
    if (r.status !== "fulfilled") return [];
    const a = r.value;
    return [
      {
        title: String(a.title || ""),
        icon: String(a.icon || ""),
        developer: String(a.developer || ""),
        score: Number(a.score) || 0,
        storeType: "googleplay" as const,
        url: `https://play.google.com/store/apps/details?id=${ids[i]}&hl=ko&gl=kr`,
      },
    ];
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return Response.json({ appstore: [], googleplay: [] });

  const [appstore, googleplay] = await Promise.allSettled([searchAppStore(q), searchGooglePlay(q)]);

  return Response.json({
    appstore: appstore.status === "fulfilled" ? appstore.value.slice(0, LIMIT) : [],
    googleplay: googleplay.status === "fulfilled" ? googleplay.value.slice(0, LIMIT) : [],
  });
}

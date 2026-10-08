import { NextRequest } from "next/server";
import { classifyStore, extractGooglePlayId, parseReleasedYear, shortAppName, sizedIcon } from "@/lib/utils";

/**
 * 주소로 직접 입력한 앱의 기본 정보(이름·아이콘·개발사)와 최초 등록 연도를 알려준다.
 * 이름 검색으로 고른 앱은 검색 결과에 이미 들어 있어서 이 API가 필요 없다.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (classifyStore(url) !== "googleplay") {
    return Response.json({ releasedYear: null });
  }
  const appId = extractGooglePlayId(url);
  if (!appId) return Response.json({ releasedYear: null });

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gplay = require("google-play-scraper").default || require("google-play-scraper");
    const app = await gplay.app({ appId, lang: "ko", country: "kr" });
    return Response.json({
      title: shortAppName(String(app.title || "")),
      icon: sizedIcon(String(app.icon || ""), 96),
      developer: String(app.developer || ""),
      releasedYear: parseReleasedYear(app.released),
    });
  } catch {
    return Response.json({ releasedYear: null });
  }
}

import { NextRequest, NextResponse } from "next/server";

const MAX_REVIEWS = 500;

type ReviewInput = { rating: number; text: string; sentiment: string };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다. .env.local에 추가해주세요." },
      { status: 500 }
    );
  }

  const { reviews }: { reviews: ReviewInput[] } = await req.json();

  if (!reviews || reviews.length === 0) {
    return NextResponse.json({ error: "분석할 리뷰가 없습니다." }, { status: 400 });
  }

  // Evenly sample if over limit
  const step = Math.ceil(reviews.length / MAX_REVIEWS);
  const sampled = reviews.filter((_, i) => i % step === 0).slice(0, MAX_REVIEWS);

  const reviewText = sampled
    .map((r, i) => `[${i + 1}] ★${r.rating} ${r.sentiment === "positive" ? "긍정" : "부정"}: ${r.text}`)
    .join("\n");

  const prompt = `당신은 앱 리뷰 분석 전문가입니다. 아래 앱 스토어 리뷰 ${sampled.length}개(전체 ${reviews.length}개 중 샘플)를 분석하여 사용자들이 공통적으로 언급하는 핵심 의견을 정리해주세요.

규칙:
- 리뷰가 적거나 내용이 단순하면 1~2개의 포인트만 반환
- 리뷰가 많고 다양하면 최대 5개의 포인트 반환
- 각 포인트는 실제 리뷰에서 반복적으로 나타나는 내용이어야 함
- type: "positive"(긍정), "negative"(부정), "suggestion"(개선요청) 중 하나
- title: 15자 이내 핵심 제목
- summary: 해당 의견에 대한 구체적 설명 (70자 이내)
- keywords: 관련 키워드 2~4개 (배열)

반드시 유효한 JSON 배열만 반환하세요. 마크다운 코드블록 없이:
[{"type":"positive","title":"...","summary":"...","keywords":["..."]}]

리뷰:
${reviewText}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini API 오류: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ error: "AI 응답을 파싱할 수 없습니다." }, { status: 500 });
    }

    const points = JSON.parse(match[0]);
    return NextResponse.json({ points, total: reviews.length, sampled: sampled.length });
  } catch (e) {
    return NextResponse.json({ error: `분석 중 오류: ${String(e)}` }, { status: 500 });
  }
}

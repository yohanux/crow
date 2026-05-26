import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crow — 앱 리뷰 분석 대시보드",
  description: "앱스토어 & 구글플레이 리뷰를 한 눈에 분석하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const logoFont = localFont({
  src: "./fonts/Silver.ttf",
  variable: "--font-logo-src",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Stoview — 앱 리뷰 분석 대시보드",
  description: "앱스토어 & 구글플레이 리뷰를 한 눈에 분석하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={logoFont.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

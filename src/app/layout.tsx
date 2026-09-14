import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraceAgent — AI 에이전트 실행 추적 & 디버깅 플랫폼",
  description:
    "AI 에이전트의 실행 과정을 추적하고 오류 원인을 분석하는 AI 블랙박스. 보이지 않는 AI의 실행 흐름을 명확하게 추적합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

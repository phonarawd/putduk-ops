import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "퍼뜩 관리",
  description: "퍼뜩 운영 업무를 쉽고 안전하게 처리하는 관리자 화면",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

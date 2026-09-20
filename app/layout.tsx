import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PUTDUK MINE OS",
  description: "PUTDUK 광산 운영과 금융 안전 제어를 위한 운영 콘솔",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

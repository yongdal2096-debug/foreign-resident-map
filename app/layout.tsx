import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://uridongne-map.pages.dev"),
  title: "우리동네 세계지도 | 국내 등록외국인 지역 통계",
  description:
    "법무부 공개통계로 살펴보는 전국 시도·시군구별 등록외국인 분포 지도입니다.",
  openGraph: {
    title: "우리동네 세계지도",
    description: "국내 등록외국인 지역 분포를 한눈에",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "우리동네 세계지도",
    description: "국내 등록외국인 지역 분포를 한눈에",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}

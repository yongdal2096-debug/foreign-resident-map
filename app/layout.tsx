import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://uridongne-map.pages.dev"),
  title: "우리동네 세계지도 | 우리 동네 외국인 통계",
  description:
    "제주부터 우리 동네까지, 지역 인구 100명당 중국·한국계 중국인 등록외국인 수와 비율 순위를 확인하는 공개통계 지도입니다.",
  openGraph: {
    title: "우리동네 세계지도",
    description: "제주 지역 인구 100명당 몇 명일까? 체감과 공개통계를 비교해보세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "우리동네 세계지도",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "우리동네 세계지도 소셜 미리보기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "우리동네 세계지도",
    description: "제주 지역 인구 100명당 몇 명일까? 체감과 공개통계를 비교해보세요.",
    images: ["/og.jpg"],
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

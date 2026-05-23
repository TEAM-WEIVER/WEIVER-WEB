import type { Metadata } from 'next';
import localFont from 'next/font/local';
import 'pretendard/dist/web/variable/pretendardvariable.css';
import './globals.css';

const pretendard = localFont({
  src: '../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: '위버',
  description: '검증된 인재를 엮다, Weiver',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}

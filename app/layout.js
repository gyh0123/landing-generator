import './globals.css'

export const metadata = {
  title: 'LP Generator — 링크로 랜딩페이지 자동 생성',
  description: '링크를 넣으면 AI가 DB 수집용 랜딩페이지를 자동으로 기획하고 제작합니다',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

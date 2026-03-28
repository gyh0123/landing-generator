# LP Generator — AI 랜딩페이지 자동 생성기

링크를 넣으면 AI가 자동으로 크롤링 → 기획 → HTML 코드를 생성하는 도구입니다.

## 기능
- 🔍 URL 크롤링 (제목, 헤딩, 본문, 연락처, 가격 추출)
- 🧠 AI 기획안 생성 (타겟, USP, 헤드라인, 디자인 방향)
- ✍️ DB 수집용 랜딩페이지 HTML 자동 생성
- 📱 모바일 미리보기
- ⬇️ HTML 다운로드
- 🔄 기획안 수정 후 재생성

## 로컬 실행

```bash
npm install
npm run dev
```

`.env.local` 파일 생성:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Vercel 배포

1. [vercel.com](https://vercel.com) → Import Git Repository
2. Environment Variables에 `ANTHROPIC_API_KEY` 추가
3. Deploy

또는 CLI:
```bash
npm i -g vercel
vercel --prod
```

## 기술 스택
- Next.js 14 (App Router)
- Cheerio (HTML 파싱)
- Anthropic Claude API
- Vercel 배포

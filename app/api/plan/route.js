export async function POST(req) {
  const { crawlData, customPrompt } = await req.json()
  if (!crawlData) return Response.json({ error: '크롤링 데이터가 필요합니다' }, { status: 400 })

  const systemPrompt = `당신은 퍼포먼스 마케팅 전문 랜딩페이지 기획자입니다.
크롤링 데이터를 분석해 DB 수집용 고전환율 랜딩페이지 기획안을 JSON으로 작성합니다.
핵심: 고객 관점, 설득 구조, 소구점 중심. 브랜드 자랑 금지.
반드시 순수 JSON만 출력하세요. 코드블록 없이.`

  const dataContext = `URL: ${crawlData.url}
제목: ${crawlData.title || crawlData.ogTitle}
헤딩: ${crawlData.headings?.slice(0, 8).join(' | ')}
본문: ${crawlData.bodyText?.slice(0, 1500)}
전화번호: ${crawlData.phones?.join(', ') || '없음'}
가격: ${crawlData.prices?.join(', ') || '없음'}
테마컬러: ${crawlData.themeColor || '없음'}
키컬러: ${crawlData.colors?.join(', ') || '없음'}
${customPrompt ? '추가요청: ' + customPrompt : ''}`

  const colorRules = `[컬러 규칙]
- 테마컬러 있으면 primary_color로 사용
- 없으면 키컬러 첫번째 사용
- 없으면 업종에 맞는 색상 선택 (주황/빨강 임의 사용 금지)
- accent_color는 primary와 대비되는 색`

  try {
    // 2개 AI 병렬 호출로 분할 — 각각 절반 분량이므로 30초 내 완료
    const [analysisResult, sectionsResult] = await Promise.all([

      // AI A: 분석 + 브랜드 + 디자인 + 폼 + 긴급성
      callPlanClaude(systemPrompt,
        `아래 데이터로 랜딩페이지 기획안의 분석/브랜드/디자인 파트를 작성하세요.

${dataContext}

[핵심 질문 — 반드시 답할 것]
1. 왜 이 브랜드인가? (경쟁사 대비 단 하나의 이유)
2. 어떤 타겟인가? (나이/상황/감정 구체적으로)

${colorRules}

아래 JSON 구조로 출력:
{
  "analysis": {
    "why_this_brand": {
      "core_reason": "경쟁사 대비 이 브랜드를 선택해야 할 단 하나의 이유",
      "unique_value": "이 브랜드만의 독자적 가치",
      "hero_message": "헤드라인 후보 문장 (고객 독백 방식)"
    },
    "target_definition": {
      "profile": "나이·성별·직업·상황",
      "situation": "지금 겪는 문제 상황",
      "emotion": "이 서비스 검색 시 감정",
      "first_check": "랜딩페이지에서 가장 먼저 확인하고 싶은 것"
    },
    "service_essence": "서비스 본질 한 줄",
    "customer_moment": "광고 클릭 시점 고객 상황",
    "real_desire": "고객이 진짜 원하는 결과",
    "persuasion_strategy": "설득 전략",
    "conversion_diagnosis": {
      "why_not_trust": "왜 안 믿는가",
      "why_not_submit": "왜 안 남기는가",
      "biggest_friction": "가장 큰 전환 마찰"
    },
    "top_objections": [
      {"type": "불신|이해부족|행동저항|시급성부족", "content": "고객 속마음", "resolution": "해소 방법"}
    ]
  },
  "brand": { "name": "브랜드명", "category": "업종", "target": "타겟 한 줄" },
  "design": {
    "primary_color": "hex", "secondary_color": "hex", "accent_color": "hex",
    "bg_color": "#ffffff", "font": "Noto Sans KR", "mood": "디자인 무드"
  },
  "form": {
    "title": "폼 제목", "subtitle": "저항 낮추는 서브",
    "submit_cta": "무료상담 신청하기", "micro_copy": "안심 문구",
    "trust_elements": ["신뢰요소1", "신뢰요소2", "신뢰요소3"]
  },
  "urgency": { "message": "긴급성 문구", "type": "countdown" },
  "sticky_cta": { "left": "전화번호", "right": "무료상담 신청하기" }
}`
      ),

      // AI B: 섹션 배열
      callPlanClaude(systemPrompt,
        `아래 데이터로 랜딩페이지의 설득 섹션 구조를 설계하세요.

${dataContext}

섹션 수: 8~10개
설득 흐름: hero → 공감/문제제기 → 해결책/혜택 → 차별점 → 프로세스 → 사회적증거(통계) → 후기 → FAQ → 최종설득 → CTA
각 섹션의 content는 구체적이고 상세하게 작성하세요.

아래 JSON 구조로 출력:
{
  "sections": [
    {
      "id": "영문id",
      "type": "섹션타입",
      "purpose": "설득 역할",
      "objection_resolved": "해소 의심",
      "headline": "헤드라인",
      "subheadline": "서브헤드",
      "content": "내용 (카드/통계/후기 등 구체적으로 상세하게)",
      "tone": "카피톤",
      "transition": "다음 섹션 연결",
      "cta": "CTA (있으면)"
    }
  ]
}`
      )
    ])

    // 결과 병합
    const plan = { ...analysisResult, ...sectionsResult }
    return Response.json({ success: true, plan })

  } catch (err) {
    console.error('Plan API error:', err)
    return Response.json({
      success: false,
      error: err.message || 'AI 분석 실패 — 다시 시도해주세요'
    }, { status: 500 })
  }
}

async function callPlanClaude(system, prompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000) // 55초 (Vercel 60초에 5초 버퍼)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text()
      throw new Error('AI 분석 실패: ' + errText)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    let clean = text.replace(/```json|```/g, '').trim()
    if (!clean.endsWith('}')) {
      const lastBrace = clean.lastIndexOf('}')
      if (lastBrace > 0) clean = clean.slice(0, lastBrace + 1)
    }
    return JSON.parse(clean)
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') throw new Error('AI 분석 시간 초과 — 다시 시도해주세요')
    throw err
  }
}

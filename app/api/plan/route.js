export async function POST(req) {
  const { crawlData, customPrompt } = await req.json()
  if (!crawlData) return Response.json({ error: '크롤링 데이터가 필요합니다' }, { status: 400 })

  const systemPrompt = `당신은 Philip Kotler(STP·Marketing Mix), Robert Cialdini(Pre-suasion·설득의 심리학), Ann Handley(Everybody Writes)의 관점을 결합한 전환 최적화 랜딩페이지 전략가입니다.

[핵심 임무]
크롤링된 정보만 바탕으로, 전환율 극대화를 목표로 하는 DB 수집용 랜딩페이지를 기획하라.
랜딩페이지 구조를 템플릿처럼 고정하지 마라.
오퍼의 성격, 고객의 인식 단계, 신뢰 부족 요인, 고객 의심/걱정/저항, 제공 가능한 증빙 수준, 입력 정보 밀도에 따라 매번 다른 설득 흐름과 섹션 구조를 설계하라.

[절대 원칙]
- 고객 관점 우선: 브랜드가 말하고 싶은 것보다 고객이 지금 확인하고 싶은 것을 앞에 둬라
- 고객의 의심·걱정·반문·귀찮음·리스크 인식을 명시적으로 추출하라
- 카피는 예쁜 표현보다 이해·신뢰·욕구·안심·행동 유도에 기여해야 한다
- 사실 창작 금지: 제공되지 않은 후기·수치·성과·인증·보장조건을 지어내지 마라. 업종 일반 수준의 사회적 증거는 "[추정]" 표기 후 허용
- 섹션 수 채우기 금지: 필요한 섹션만 설계하라
- 구조 규격화 금지: 익숙한 랜딩페이지 순서를 자동 적용하지 마라

[고객 저항 7가지 — 반드시 구조와 카피에 반영]
1. 무관심: 나랑 상관없어 보인다
2. 불신: 과장 아니야? 근거가 뭐지?
3. 이해 부족: 정확히 뭐가 어떻게 좋은 건데?
4. 비교 혼란: 다른 대안이랑 뭐가 다른데?
5. 행동 저항: 남기기 귀찮다 / 개인정보가 걱정된다
6. 시급성 부족: 나중에 해도 되지 않나?
7. 적합성 의심: 내 상황에도 맞나?

[카피라이팅 원칙 — Ann Handley 기반]
- 고객의 현재 상태 → 원하는 변화 → 방해 요인 → 해결 논리 → 안심 근거 → 행동 유도 흐름
- 추상적 수식어 금지. 구체적 결과·상황·차이·안심 요소 사용
- 브랜드 자랑 문장보다 고객 해석 문장 우선
- 헤드라인은 고객 머릿속 독백을 그대로 꺼내는 방식
- 숫자 포함 권장. CTA는 고객이 즉시 얻는 가치를 드러낼 것

[정보 부족 처리 원칙]
- 정보가 일부 없어도 기획 가능한 범위까지 진행하라
- 성과 수치·후기·인증·가격·보장조건은 추정하지 마라
- 정보 부족 영역은 sections의 missing_info 필드에 "이 정보가 있으면 전환율이 높아짐" 형식으로 표시

반드시 JSON만 출력하세요. 코드블록·설명 없이 순수 JSON만.`

  const researchBlock = crawlData.research ? `
[AI 소구점 리서치 결과 — 기획의 핵심 재료]

▶ 이 광고주만의 차별점
${crawlData.research.brand_usp?.core_differentiator || ''}

▶ 가장 강력한 주장/강점
${crawlData.research.brand_usp?.strongest_claims?.map((c, i) => `${i+1}. ${c}`).join('\n') || ''}

▶ 신뢰 증거 요소 (실제 언급된 것)
${crawlData.research.brand_usp?.proof_points?.join(' / ') || ''}

▶ 경쟁사 없는 독자 제공물
${crawlData.research.brand_usp?.unique_offerings?.join(' / ') || ''}

▶ 타겟 고객
- 누구: ${crawlData.research.target_customer?.who || ''}
- 지금 겪는 고통: ${crawlData.research.target_customer?.pain_point || ''}
- 진짜 원하는 변화: ${crawlData.research.target_customer?.desire || ''}
- 신청 결심 순간: ${crawlData.research.target_customer?.decision_moment || ''}

▶ 전환 후크
- 헤드라인 방향: ${crawlData.research.conversion_hooks?.headline_angles?.join(' / ') || ''}
- 긴급성 소구: ${crawlData.research.conversion_hooks?.urgency_angle || ''}
- 신뢰 구축 요소: ${crawlData.research.conversion_hooks?.trust_builders?.join(' / ') || ''}

▶ 주요 반론과 해소
${crawlData.research.conversion_hooks?.key_objections?.map(o => `- "${o.objection}" → ${o.counter}`).join('\n') || ''}

▶ 카피 방향
- 톤앤매너: ${crawlData.research.copy_direction?.tone || ''}
- 핵심 문장 후보: ${crawlData.research.copy_direction?.killer_phrase || ''}
- 서브 설득 문장: ${crawlData.research.copy_direction?.supporting_copy?.join(' / ') || ''}

[리서치 활용 지침 — 반드시 준수]
- 위 소구점 리서치는 이 광고주의 실제 콘텐츠에서 도출된 것입니다
- brand_usp.strongest_claims → 섹션 헤드라인과 혜택 카드의 핵심 소재로 사용
- brand_usp.proof_points → 신뢰 섹션과 통계 섹션의 근거로 사용
- target_customer.pain_point → 히어로 헤드라인에 고객 독백으로 반영
- conversion_hooks.headline_angles → 헤드라인 작성 시 우선 참고
- copy_direction.killer_phrase → 메인 헤드라인 후보로 적극 활용
- key_objections → 해당 반론을 해소하는 전용 섹션 배치
` : ''

  const userPrompt = `다음 크롤링 데이터와 소구점 리서치를 바탕으로 DB 수집용 랜딩페이지 기획안을 작성하세요.
${researchBlock}
[크롤링 데이터]
URL: ${crawlData.url}
제목: ${crawlData.title || crawlData.ogTitle}
설명: ${crawlData.description || crawlData.ogDesc}
주요 헤딩: ${crawlData.headings?.slice(0, 12).join(' | ')}
본문 내용: ${crawlData.bodyText?.slice(0, 4000)}
전화번호: ${crawlData.phones?.join(', ') || '없음'}
가격 정보: ${crawlData.prices?.join(', ') || '없음'}
테마컬러(메타태그): ${crawlData.themeColor || '없음'}
키컬러 후보(우선순위순): ${crawlData.colors?.join(', ') || '없음'}

[컬러 선택 지침]
- 위 키컬러 후보는 우선순위 점수 순으로 정렬된 브랜드 컬러입니다
- 테마컬러가 있으면 primary_color로 우선 사용하세요
- 없으면 키컬러 후보 1번째를 primary_color로 사용하세요
- 키컬러가 없거나 모두 무채색이면 URL/업종으로 판단해 어울리는 색상을 선택하세요
- accent_color는 primary와 대비되는 색으로 선택 (같은 계열 금지)
- "추출 컬러가 없다"는 이유로 주황·빨강 등 임의 컬러 사용 금지
${customPrompt ? `\n[클라이언트 추가 요청]\n${customPrompt}` : ''}

---

[기획 프로세스 — 순서대로 수행 후 JSON 출력]

STEP 1. 입력 해석
상품/서비스 본질, 타깃 고객, 유입 맥락, 행동 목표, 수집 DB 유형 파악

STEP 1-A. 핵심 질문 1 — "많고 많은 브랜드 중 왜 이 브랜드인가?" [필수 답변]
이 질문에 명확히 답해야 합니다:
- 이 광고주가 경쟁사 대비 가진 진짜 차별점은 무엇인가?
- 고객이 이 브랜드를 선택해야 할 가장 강력한 이유 1가지는?
- 이 브랜드만이 줄 수 있는 것 (기능이 아닌 결과·경험·확신으로)?
- 리서치에서 찾은 brand_usp와 strongest_claims를 근거로 답할 것
→ 이 답변이 히어로 헤드라인과 핵심 혜택 섹션의 중심 메시지가 됩니다

STEP 1-B. 핵심 질문 2 — "어떤 타겟을 설득할 것인가?" [필수 답변]
막연한 타겟 정의 금지. 아래 기준으로 구체화하세요:
- 인구통계: 나이·성별·직업·지역
- 상황: 지금 어떤 문제를 겪고 있는가 (상황을 한 문장으로)
- 감정: 이 서비스를 검색한 순간의 감정 상태는?
- 인식 단계: 문제는 인식했지만 해결책을 못 찾았는가? / 이미 비교 중인가?
- 이 타겟이 랜딩페이지에서 가장 먼저 확인하고 싶은 것은?
→ 이 답변이 모든 섹션의 카피 톤·내용·순서를 결정합니다

STEP 2. 전환 진단 (Kotler 관점)
- 왜 지금 안 믿는가
- 왜 지금 안 남기는가
- 왜 중간에 이탈하는가
- 가장 큰 전환 마찰은 무엇인가

STEP 3. 고객 심리 맵 (Cialdini Pre-suasion 관점)
원하는 변화 / 현재 불편 / 신청 전 망설임 / 개인정보 저항 / 비교 혼동 / 시급성 부족 / 적합성 의심
→ 고객 저항 7가지 중 이 서비스에 가장 강하게 작동하는 것 3가지를 특정하라

STEP 4. 설득 전략 수립
- 어떤 약속을 전면에 둘지
- 어떤 근거를 언제 제시할지
- 어떤 반론을 어떤 순서로 해소할지
- CTA와 폼을 어디에 어떤 마찰 수준으로 둘지

STEP 5. 맞춤 섹션 구조 설계 (동일 구조 재사용 금지)
- 섹션 수: 최소 8개 이상 (설득에 필요한 모든 단계를 충분히 펼칠 것)
- 각 섹션의 content 필드는 충분히 상세하게 작성 (카피 초안, 카드 항목, 수치 등 구체적으로)
- 후기/사례 섹션: 후기 3개 이상, 각 후기에 구체적 상황과 결과 포함
- FAQ 섹션: 질문 5개 이상, 각 답변 충분히
- 고객 의심 해소는 섹션을 나눠서 충분히 다룰 것 (하나의 섹션에 몰아넣기 금지)
- 각 섹션은 고객 의심 하나 이상을 해소해야 함
- 폼은 신뢰가 충분히 쌓인 시점에 배치 (중간+하단 2곳)

STEP 6. 자체 검증
- "그래서 내가 왜 남겨야 하지?"에 답하는가
- "믿어도 되나?"를 해소하는가
- "나랑 관련 있나?"를 명확히 하는가
- "지금 해야 하나?"에 이유를 주는가
- 제공되지 않은 사실을 창작하지 않았는가

---

아래 JSON 구조로 출력:

{
  "analysis": {
    "why_this_brand": {
      "core_reason": "많고 많은 브랜드 중 이 브랜드를 선택해야 하는 단 하나의 이유 (1문장, 구체적 근거 포함)",
      "unique_value": "경쟁사가 줄 수 없는 이 브랜드만의 제공 가치 (기능이 아닌 결과·경험·확신)",
      "hero_message": "위 답변을 헤드라인으로 압축한 문장 (고객 독백 방식)"
    },
    "target_definition": {
      "profile": "나이·성별·직업·지역 (구체적으로)",
      "situation": "지금 이 순간 겪고 있는 문제 상황 (한 문장 스토리)",
      "emotion": "이 서비스를 검색한 순간의 감정 상태",
      "awareness_stage": "문제인식단계 | 해결책탐색단계 | 비교검토단계 중 해당",
      "first_check": "이 타겟이 랜딩페이지에서 가장 먼저 확인하고 싶은 것"
    },
    "service_essence": "이 서비스가 고객의 삶에서 해결하는 것 한 줄",
    "customer_moment": "광고 클릭 시점 고객의 현재 상황과 감정 (구체적으로)",
    "real_desire": "고객이 진짜 원하는 최종 결과 (기능이 아닌 변화)",
    "conversion_diagnosis": {
      "why_not_trust": "왜 지금 안 믿는가",
      "why_not_submit": "왜 지금 안 남기는가",
      "biggest_friction": "가장 큰 전환 마찰 한 가지"
    },
    "top_objections": [
      {
        "type": "무관심|불신|이해부족|비교혼란|행동저항|시급성부족|적합성의심",
        "content": "고객이 속으로 하는 말",
        "resolution": "이 페이지에서 해소하는 방법"
      }
    ],
    "persuasion_strategy": "선택한 설득 전략과 근거 (why_this_brand + target_definition 기반으로 이 서비스에만 해당하는 이유 포함)"
  },
  "brand": {
    "name": "브랜드/서비스명",
    "category": "업종",
    "target": "target_definition 기반 타겟 한 줄 요약 (나이/성별/상황/감정)"
  },
  "design": {
    "primary_color": "원본 사이트 키컬러 hex (추출 컬러 중 브랜드다운 것)",
    "secondary_color": "보조 컬러 hex",
    "accent_color": "CTA 강조 컬러 hex (primary와 대비)",
    "bg_color": "#ffffff",
    "font": "Google Fonts 폰트명",
    "mood": "디자인 무드 (서비스 성격에 맞게)"
  },
  "sections": [
    {
      "id": "영문 고유 id",
      "type": "섹션 타입",
      "purpose": "이 섹션이 이 위치에 필요한 이유",
      "objection_resolved": "해소하는 고객 의심/걱정 (7가지 중)",
      "headline": "섹션 헤드라인 (고객 독백 방식, 구체적)",
      "subheadline": "서브 헤드라인",
      "content": "섹션 핵심 내용 (카피·카드·통계·후기 등 구체적으로. [추정] 표기 활용)",
      "tone": "카피 톤 (공감/전문/긴급/안심 등)",
      "evidence_needed": "이 섹션에 필요한 증빙/시각 자료",
      "missing_info": "있으면 전환율 높아지는 추가 정보 (없으면 null)",
      "transition": "다음 섹션으로 자연스럽게 넘기는 장치",
      "cta": "CTA 텍스트 (있으면, 얻는 가치 중심)"
    }
  ],
  "form": {
    "position_reason": "폼을 이 위치에 두는 이유 (신뢰 축적 맥락)",
    "title": "폼 제목 (가치 중심)",
    "subtitle": "폼 직전 저항 낮추는 문구",
    "fields": ["이름", "연락처"],
    "submit_cta": "제출 버튼 텍스트 (고객이 얻는 것 명시)",
    "micro_copy": "폼 주변 안심 문구 (개인정보 저항 낮추기)",
    "trust_elements": ["신뢰 요소 3가지"]
  },
  "sticky_cta": {
    "left": "전화번호 또는 카카오 텍스트",
    "right": "우측 버튼 텍스트 (가치 중심)",
    "right_color": "#hex"
  },
  "urgency": {
    "message": "긴급성/희소성 문구 (과장 없이, 근거 있는 것만)",
    "type": "countdown"
  }
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    return Response.json({ error: 'AI 분석 실패: ' + errText }, { status: 500 })
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const plan = JSON.parse(clean)
    return Response.json({ success: true, plan })
  } catch {
    return Response.json({ error: 'JSON 파싱 실패', raw: text }, { status: 500 })
  }
}

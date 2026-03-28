export async function POST(req) {
  const { plan, crawlData, customRequest } = await req.json()

  const phone = crawlData?.phones?.[0] || ''
  const pc = plan.design?.primary_color || '#1a1a2e'
  const ac = plan.design?.accent_color || '#e94560'
  const sc = plan.design?.secondary_color || '#16213e'
  const bg = plan.design?.bg_color || '#ffffff'
  const customNote = customRequest ? '\n추가 요청: ' + customRequest : ''

  // form 타입 섹션은 AI 5 전담 — AI 3/4 배분에서 제외
  const sections = plan.sections || []
  const nonFormSections = sections.filter(s =>
    !['form', 'cta_form', 'apply', 'contact', 'register', '신청', '폼'].some(t =>
      (s.type || '').toLowerCase().includes(t) || (s.id || '').toLowerCase().includes(t)
    )
  )
  const total = nonFormSections.length
  const cut1 = Math.ceil(total / 3)
  const cut2 = Math.ceil((total * 2) / 3)
  const secTop = nonFormSections.slice(0, cut1)
  const secMid = nonFormSections.slice(cut1, cut2)
  const secBot = nonFormSections.slice(cut2)

  const PRETENDARD = "@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');"

  // 공통 디자인 토큰
  const DS = [
    '=== 디자인 시스템 (변경 금지) ===',
    '--primary:' + pc + '  --accent:' + ac + '  --secondary:' + sc + '  --bg:' + bg,
    "font: 'Pretendard Variable', Pretendard, sans-serif (다른 폰트 절대 금지)",
    'max-width:480px margin:0 auto',
    '',
    '타이포그래피:',
    '  히어로H1: clamp(24px,6vw,34px) w800 ls:-1px lh:1.25',
    '  섹션H2: clamp(18px,5vw,24px) w700 ls:-0.5px',
    '  본문P: 14px w400 lh:1.8 color:#555',
    '  통계NUM: clamp(28px,7vw,44px) w900 ls:-2px',
    '',
    '컴포넌트:',
    '  섹션패딩: 56px 20px',
    '  카드: bg:#fff radius:14px shadow:0 2px 12px rgba(0,0,0,.07) border:1px solid #e8e8e8 p:20px',
    '  배경교차: .section-white(#fff) ↔ .section-gray(#f8f9fa) / 다크: .section-dark(var(--primary))',
    '',
    '대비규칙 (절대 위반 금지):',
    '  밝은배경(.section-white,.section-gray,카드,폼): 텍스트 #1a1a1a 또는 #555 (white 금지)',
    '  어두운배경(.section-dark): 텍스트 #fff (#1a1a1a 금지)',
    '  input/label: color:#1a1a1a background:#fff 고정',
  ].join('\n')

  // 섹션 HTML AI 공통 시스템 프롬프트
  const htmlSystem = [
    '당신은 Cialdini 설득 원칙에 정통한 퍼포먼스 마케팅 카피라이터 겸 퍼블리셔입니다.',
    '맡은 섹션을 완성도 높은 HTML로 구현하되, 단순히 기획안을 옮기는 것이 아니라',
    '각 섹션의 설득 역할(purpose)과 고객 의심(objection_resolved)을 카피에 녹여 진짜 설득력 있는 HTML을 만드세요.',
    'HTML 조각만 출력. DOCTYPE html head style script 태그 없이 순수 body 내부 HTML만.',
  ].join('\n')

  // 섹션별 HTML AI에 공통으로 들어가는 규칙
  const commonRules = [
    '[공통 필수 규칙]',
    '- img 태그 사용 금지 (이미지 없이 텍스트/이모지/CSS로만)',
    '- font-family 인라인 스타일 금지',
    '- 색상은 반드시 var(--primary) var(--accent) var(--secondary) 변수만',
    '- 각 섹션·카드에 class="fade-up" 적용',
    '- 밝은 배경에서 color:#fff 금지 / 어두운 배경에서 color:#1a1a1a 금지',
    '- 카드 텍스트: color:#1a1a1a 또는 #555',
    '- CTA 버튼 없음 (폼 제출 버튼 제외)',
    '- ⚠️ 폼(form 태그, input, 신청서) 절대 포함 금지 — 폼은 AI 5만 담당',
    '- 담당 섹션 목록에 form/신청/폼 타입이 있어도 무시하고 건너뜀',
    '',
    '[설득력 강화 원칙 — 반드시 적용]',
    '- 각 섹션 시작: 고객이 속으로 하는 말(objection)을 먼저 꺼내고 → 해소하는 순서',
    '- 헤드라인은 브랜드 자랑 금지. "당신은 지금 ~하고 있지 않습니까?" 고객 독백 방식',
    '- 본문은 구체적 상황·숫자·결과로 작성 (추상 형용사 금지)',
    '- 각 섹션 마지막에 sections[].transition 연결 문구 포함',
    '- 섹션 헤드라인 위: 작은 뱃지 텍스트 / 아래: 서브헤드 + 구분선(36px 3px accent색)',
    '',
    '[콘텐츠 볼륨]',
    '- 각 섹션은 풍성하게 작성. 헤드라인만 있는 빈 섹션 절대 금지',
    '- 카드형 섹션: 최소 4개 카드, 각 카드 제목+설명 2줄 이상',
    '- 후기 섹션: 별점★+이름+직업/상황+후기 3줄+인증뱃지 구조',
    '- 통계 섹션: 숫자에 data-target 속성 + 단위 + 설명 2줄',
    '- FAQ 섹션: 5개 이상 질문, 각 답변 2~3줄',
  ].join('\n')

  // 섹션 JSON을 카피라이팅 지침과 함께 포맷
  const formatSections = (secs, idx) => {
    if (!secs.length) return '(섹션 없음)'
    return secs.map((s, i) => [
      '--- 섹션 ' + (idx + i + 1) + ': ' + (s.type || '') + ' (id: ' + (s.id || '') + ') ---',
      '설득역할: ' + (s.purpose || ''),
      '해소할의심: ' + (s.objection_resolved || ''),
      '카피톤: ' + (s.tone || ''),
      '헤드라인: ' + (s.headline || ''),
      '서브헤드: ' + (s.subheadline || ''),
      '내용(그대로사용): ' + (s.content || ''),
      '필요증빙: ' + (s.evidence_needed || ''),
      '다음섹션연결: ' + (s.transition || ''),
      s.cta ? 'CTA: ' + s.cta : '',
      '배경클래스: ' + (i % 2 === 0 ? '.section-white' : '.section-gray'),
    ].filter(Boolean).join('\n')).join('\n\n')
  }

  const brandCtx = [
    '=== 핵심 설득 축 ===',
    '[왜 이 브랜드인가]',
    '핵심 이유: ' + (plan.analysis?.why_this_brand?.core_reason || ''),
    '독자 가치: ' + (plan.analysis?.why_this_brand?.unique_value || ''),
    '히어로 메시지: ' + (plan.analysis?.why_this_brand?.hero_message || ''),
    '',
    '[어떤 타겟을 설득하는가]',
    '프로필: ' + (plan.analysis?.target_definition?.profile || plan.brand?.target || ''),
    '상황: ' + (plan.analysis?.target_definition?.situation || ''),
    '감정: ' + (plan.analysis?.target_definition?.emotion || ''),
    '인식단계: ' + (plan.analysis?.target_definition?.awareness_stage || ''),
    '첫 확인사항: ' + (plan.analysis?.target_definition?.first_check || ''),
    '',
    '브랜드: ' + (plan.brand?.name || '') + ' (' + (plan.brand?.category || '') + ')',
    '설득전략: ' + (plan.analysis?.persuasion_strategy || ''),
    '고객현재감정: ' + (plan.analysis?.customer_moment || ''),
    '진짜욕구: ' + (plan.analysis?.real_desire || ''),
    '핵심마찰: ' + (plan.analysis?.conversion_diagnosis?.biggest_friction || ''),
  ].join('\n')

  const [cssJs, heroHtml, topHtml, midHtml, botHtml, stickyHtml] = await Promise.all([

    // AI 1: CSS + JS
    callClaude(
      'CSS/JS 전문가. <style>로 시작 </script>로 끝나는 순수 CSS+JS만 출력. 다른 텍스트 없이.',
      'CSS 전체 + JS 전체 작성.\n\n' + DS + '\n\n' +
      'Pretendard import (첫줄):\n' + PRETENDARD + '\n\n' +
      ':root { --primary:' + pc + '; --accent:' + ac + '; --secondary:' + sc + '; --bg:' + bg + '; }\n\n' +
      'CSS 필수 포함:\n' +
      "* { box-sizing:border-box; margin:0; padding:0; }\n" +
      "body { font-family:'Pretendard Variable',Pretendard,sans-serif; background:var(--bg); color:#1a1a1a; }\n" +
      '.section-white { background:#fff; padding:56px 20px; color:#1a1a1a; }\n' +
      '.section-gray { background:#f8f9fa; padding:56px 20px; color:#1a1a1a; }\n' +
      '.section-dark { background:var(--primary); padding:56px 20px; color:#fff; }\n' +
      '.section-white *,.section-gray * { color:inherit; }\n' +
      '.section-white h1,.section-white h2,.section-white h3,.section-gray h1,.section-gray h2,.section-gray h3 { color:#1a1a1a; }\n' +
      '.section-white p,.section-white li,.section-gray p,.section-gray li { color:#555; }\n' +
      '.section-dark h1,.section-dark h2,.section-dark h3 { color:#fff; }\n' +
      '.section-dark p,.section-dark li,.section-dark span { color:rgba(255,255,255,.85); }\n' +
      '.card { background:#fff; border-radius:14px; box-shadow:0 2px 12px rgba(0,0,0,.07); border:1px solid #e8e8e8; padding:20px; }\n' +
      '.card h3,.card h4,.card strong { color:#1a1a1a; }\n' +
      '.card p,.card span,.card li { color:#555; }\n' +
      'input,textarea { color:#1a1a1a !important; background:#fff; border:1.5px solid #e8e8e8; border-radius:10px; padding:14px 16px; font-size:15px; width:100%; outline:none; }\n' +
      'input:focus,textarea:focus { border-color:var(--accent); }\n' +
      'label { color:#1a1a1a; font-weight:600; font-size:13px; display:block; margin-bottom:6px; }\n' +
      '.btn-primary { background:var(--accent); color:#fff; width:100%; padding:18px; border-radius:50px; font-size:16px; font-weight:800; border:none; box-shadow:0 8px 20px rgba(0,0,0,.2); cursor:pointer; transition:transform .15s,box-shadow .15s; }\n' +
      '.btn-primary:hover { transform:translateY(-2px); box-shadow:0 12px 28px rgba(0,0,0,.25); }\n' +
      '.badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:.5px; background:rgba(0,0,0,.06); color:var(--accent); margin-bottom:10px; }\n' +
      '.divider { width:36px; height:3px; background:var(--accent); border-radius:2px; margin:10px auto 0; }\n' +
      '.urgency-banner { background:var(--accent); color:#fff; text-align:center; padding:10px 16px; font-size:13px; font-weight:700; position:sticky; top:0; z-index:998; }\n' +
      '.sticky-bar { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; height:64px; background:rgba(255,255,255,.97); backdrop-filter:blur(12px); border-top:1px solid #e8e8e8; display:flex; gap:10px; padding:0 16px; align-items:center; z-index:999; }\n' +
      '.fade-up { opacity:1; transform:none; transition:opacity .55s ease,transform .55s ease; }\n' +
      'body.js-ready .fade-up { opacity:0; transform:translateY(24px); }\n' +
      'body.js-ready .fade-up.visible { opacity:1; transform:translateY(0); }\n' +
      '나머지 통계/후기/FAQ/폼/뱃지/구분선 등 컴포넌트 클래스 추가 작성\n\n' +
      'JS (DOMContentLoaded):\n' +
      '1. body.classList.add("js-ready")\n' +
      '2. IntersectionObserver threshold:0.08 → .fade-up에 .visible\n' +
      '3. 카운트업: data-target → 1.5초 애니메이션\n' +
      '4. FAQ: .faq-question 클릭 → .faq-answer 토글\n' +
      '5. scrollToForm(): id="main-form" scrollIntoView smooth center\n' +
      '6. handleForm(e): preventDefault, 동의체크 미체크시 alert, 제출시 "무료 상담 신청이 완료되었습니다.\\n빠른 시간 내에 연락드리겠습니다!" alert 후 reset\n' +
      '7. 카운트다운 id="timer": 23:59:59부터 감소\n' +
      customNote
    ),

    // AI 2: 히어로 섹션 (단독 전담 — 설득의 첫인상)
    callClaude(
      htmlSystem,
      '히어로 섹션과 긴급배너를 작성하세요. 이 섹션이 전체 설득의 첫인상입니다.\n\n' +
      brandCtx + '\n\n' + DS + '\n\n' +
      '전화번호: ' + phone + customNote + '\n\n' +
      '[히어로 전담 지침 — 두 핵심 질문의 답을 헤드라인에 담을 것]\n' +
      '- 헤드라인: analysis.why_this_brand.hero_message를 기반으로 고객 독백 방식으로\n' +
      '- 서브헤드: target_definition.situation + real_desire 반영 (이 타겟의 상황과 원하는 변화)\n' +
      '- 본문: "왜 이 브랜드인가"의 답(unique_value)을 2~3줄로 풀어쓰기\n' +
      '- 신뢰지표 3개: target_definition.first_check를 해소하는 요소들로 구성\n' +
      commonRules + '\n\n' +
      '히어로 담당 섹션:\n' + formatSections(secTop.slice(0, 1), 0)
    ),

    // AI 3: 상단 섹션들 (공감·문제·혜택)
    callClaude(
      htmlSystem,
      '아래 담당 섹션들을 HTML로 구현하세요.\n\n' +
      brandCtx + '\n\n' + DS + '\n\n' +
      '전화번호: ' + phone + customNote + '\n\n' +
      commonRules + '\n\n' +
      '담당 섹션 (' + secTop.slice(1).length + '개):\n' +
      formatSections(secTop.slice(1), 1) + '\n\n' +
      '[설득 카피라이팅 지침]\n' +
      '- 각 섹션 시작에 objection_resolved의 고객 의심을 먼저 공감하는 문장으로 꺼낼 것\n' +
      '- "혹시 이런 생각 드시나요?" / "이게 정말 나한테 맞을까?" 형식의 공감 문구 활용\n' +
      '- content의 카피는 그대로 사용하되 HTML 구조로 풍성하게 표현\n' +
      '- 혜택 카드: 아이콘이모지 + 제목 + 설명 2줄 + 작은 강조 뱃지\n' +
      '- 통계: data-target 속성 + 단위 + 2줄 설명 (배경: .section-dark)\n' +
      '- ⚠️ form 태그, input, 신청서 절대 금지. 폼은 AI 5 전담'
    ),

    // AI 4: 중간 섹션들 (신뢰·증거·차별화)
    callClaude(
      htmlSystem,
      '아래 담당 섹션들을 HTML로 구현하세요.\n\n' +
      brandCtx + '\n\n' + DS + '\n\n' +
      '전화번호: ' + phone + customNote + '\n\n' +
      commonRules + '\n\n' +
      '담당 섹션 (' + secMid.length + '개):\n' +
      formatSections(secMid, cut1) + '\n\n' +
      '[신뢰 구축 카피라이팅 지침]\n' +
      '- 이 구간은 "믿어도 되나?"를 해소하는 구간\n' +
      '- 후기 카드: ★★★★★ + 이름(익명처리) + 직업/상황 + 후기 3줄 + ✓인증뱃지\n' +
      '  후기는 구체적 상황("처음엔 반신반의했는데...") + 구체적 결과("3주 만에...") 구조\n' +
      '- 비교/차별화: 표나 카드로 경쟁 대안과 차이 명확히\n' +
      '- 각 섹션 전환 연결문구(transition) 반드시 포함\n' +
      '- content 카피 그대로 사용, 임의 수정 금지\n' +
      '- ⚠️ form 태그, input, 신청서 절대 금지. 폼은 AI 5 전담'
    ),

    // AI 5: 하단 섹션들 + 폼 (마무리 설득 + DB 수집)
    callClaude(
      htmlSystem,
      '아래 담당 섹션들과 폼을 HTML로 구현하세요.\n\n' +
      brandCtx + '\n\n' + DS + '\n\n' +
      '전화번호: ' + phone + customNote + '\n\n' +
      commonRules + '\n\n' +
      '담당 섹션 (' + secBot.length + '개) + 폼:\n' +
      formatSections(secBot, cut2) + '\n\n' +
      '[마무리 설득 + 폼 카피라이팅 지침]\n' +
      '- 이 구간은 "지금 해야 하나?"와 "개인정보가 걱정된다"를 해소하는 구간\n' +
      '- FAQ: 고객이 실제로 할 법한 질문 5개+ (비용/과정/기간/안전성/취소 등), 각 2~3줄\n' +
      '- 폼 바로 위: analysis.conversion_diagnosis.biggest_friction을 해소하는 마지막 설득 문단 (3~4줄)\n' +
      '- 폼 헤드라인: form.title (행동 후 얻는 것 중심)\n' +
      '- 폼 서브: form.subtitle (저항 낮추기)\n\n' +
      '폼 구조 (id="main-form" onsubmit="handleForm(event)"):\n' +
      '  섹션클래스: .section-gray\n' +
      '  input[name=name][type=text][required][placeholder="이름"] style="color:#1a1a1a;background:#fff"\n' +
      '  input[name=phone][type=tel][required][placeholder="연락처 (숫자만)"] style="color:#1a1a1a;background:#fff"\n' +
      '  checkbox[required] "개인정보 수집·이용에 동의합니다"\n' +
      '  button.btn-primary type=submit: "무료상담 신청하기" (이 텍스트만 허용)\n' +
      '  버튼아래: form.micro_copy style="color:#999;font-size:12px;text-align:center;margin-top:8px"\n' +
      '  폼하단: form.trust_elements 3개 (아이콘+텍스트, color:#555)\n' +
      'CTA는 폼 제출 버튼 1개만 (다른 위치 버튼 금지)'
    ),

    // AI 6 (구 AI 4): 고정 UI
    callClaude(
      '모바일 UI 전문가. div로 시작하는 HTML 조각만 출력.',
      '하단 고정 CTA 바.\n' +
      '전화번호:' + phone + ' accent:' + ac + ' primary:' + pc + '\n\n' +
      '<div class="sticky-bar">\n' +
      '  <a href="tel:' + (phone || '#') + '" style="flex:1;border:1.5px solid var(--primary);color:var(--primary);border-radius:12px;height:44px;font-weight:700;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:14px;gap:6px">📞 전화상담</a>\n' +
      '  <button onclick="scrollToForm()" style="flex:2;background:var(--accent);color:#fff;border-radius:12px;height:44px;font-weight:800;border:none;font-size:14px;cursor:pointer">무료상담 신청하기</button>\n' +
      '</div>\n' +
      '<div style="height:80px"></div>'
    )
  ])

  const finalHtml =
    '<!DOCTYPE html>\n' +
    '<html lang="ko">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + (plan.brand?.name || '랜딩페이지') + '</title>\n' +
    '<meta name="description" content="' + (plan.analysis?.service_essence || '') + '">\n' +
    (cssJs || '') + '\n' +
    '</head>\n' +
    '<body>\n' +
    '<div style="max-width:480px;margin:0 auto;overflow-x:hidden">\n' +
    (heroHtml || '') + '\n' +
    (topHtml || '') + '\n' +
    (midHtml || '') + '\n' +
    (botHtml || '') + '\n' +
    '</div>\n' +
    (stickyHtml || '') + '\n' +
    '</body>\n' +
    '</html>'

  return Response.json({ success: true, html: finalHtml })
}

async function callClaude(system, prompt) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!res.ok) { console.error('Claude failed:', await res.text()); return '' }
    const data = await res.json()
    let text = data.content?.[0]?.text || ''
    return text.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim()
  } catch (err) {
    console.error('callClaude error:', err)
    return ''
  }
}

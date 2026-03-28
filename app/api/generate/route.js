export async function POST(req) {
  const { plan, crawlData, customRequest } = await req.json()

  const phone = crawlData?.phones?.[0] || ''
  const pc = plan.design?.primary_color || '#1a1a2e'
  const ac = plan.design?.accent_color || '#e94560'
  const sc = plan.design?.secondary_color || '#16213e'
  const bg = plan.design?.bg_color || '#ffffff'
  const customNote = customRequest ? '\n추가 요청: ' + customRequest : ''

  // form 타입 섹션 제외하고 상/하 2등분
  const sections = plan.sections || []
  const nonFormSections = sections.filter(s =>
    !['form', 'cta_form', 'apply', 'contact', 'register', '신청', '폼'].some(t =>
      (s.type || '').toLowerCase().includes(t) || (s.id || '').toLowerCase().includes(t)
    )
  )
  const half = Math.ceil(nonFormSections.length / 2)
  const secTop = nonFormSections.slice(0, half)
  const secBot = nonFormSections.slice(half)

  const PRETENDARD = "@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');"

  const DS = [
    '=== 디자인 시스템 (변경 금지) ===',
    '--primary:' + pc + '  --accent:' + ac + '  --secondary:' + sc + '  --bg:' + bg,
    "font: 'Pretendard Variable', Pretendard, sans-serif (다른 폰트 절대 금지)",
    'max-width:480px margin:0 auto',
    '섹션패딩: 56px 20px',
    '카드: bg:#fff radius:14px shadow:0 2px 12px rgba(0,0,0,.07) border:1px solid #e8e8e8 p:20px',
    '배경교차: .section-white(#fff) ↔ .section-gray(#f8f9fa) / 다크: .section-dark(var(--primary))',
    '대비규칙(절대준수): 밝은배경→텍스트 #1a1a1a/#555 (white금지) / 어두운배경→텍스트 #fff (#1a1a1a금지)',
    'input/label: color:#1a1a1a background:#fff 고정',
  ].join('\n')

  const brandCtx = [
    '[왜 이 브랜드인가]',
    '핵심이유: ' + (plan.analysis?.why_this_brand?.core_reason || ''),
    '독자가치: ' + (plan.analysis?.why_this_brand?.unique_value || ''),
    '히어로메시지: ' + (plan.analysis?.why_this_brand?.hero_message || ''),
    '',
    '[타겟]',
    '프로필: ' + (plan.analysis?.target_definition?.profile || plan.brand?.target || ''),
    '상황: ' + (plan.analysis?.target_definition?.situation || ''),
    '감정: ' + (plan.analysis?.target_definition?.emotion || ''),
    '첫확인사항: ' + (plan.analysis?.target_definition?.first_check || ''),
    '',
    '브랜드: ' + (plan.brand?.name || '') + ' (' + (plan.brand?.category || '') + ')',
    '설득전략: ' + (plan.analysis?.persuasion_strategy || ''),
    '고객감정: ' + (plan.analysis?.customer_moment || ''),
    '진짜욕구: ' + (plan.analysis?.real_desire || ''),
    '핵심마찰: ' + (plan.analysis?.conversion_diagnosis?.biggest_friction || ''),
  ].join('\n')

  const formatSections = (secs, startIdx) => {
    if (!secs.length) return '(섹션 없음)'
    return secs.map((s, i) => [
      '--- 섹션' + (startIdx + i + 1) + ': ' + (s.type || '') + ' ---',
      '역할: ' + (s.purpose || ''),
      '해소의심: ' + (s.objection_resolved || ''),
      '톤: ' + (s.tone || ''),
      '헤드라인: ' + (s.headline || ''),
      '서브: ' + (s.subheadline || ''),
      '내용: ' + (s.content || ''),
      '연결: ' + (s.transition || ''),
      '배경: ' + (i % 2 === 0 ? '.section-white' : '.section-gray'),
    ].filter(Boolean).join('\n')).join('\n\n')
  }

  const commonRules = [
    '- img 태그 사용 금지',
    '- font-family 인라인 스타일 금지',
    '- 색상은 var(--primary) var(--accent) var(--secondary) 변수만',
    '- 각 섹션·카드에 class="fade-up"',
    '- 밝은 배경에서 color:#fff 금지 / 어두운 배경에서 color:#1a1a1a 금지',
    '- 카드 텍스트: color:#1a1a1a 또는 #555',
    '- CTA 버튼 없음 (폼 제출 버튼 제외)',
    '- form 태그·input·신청서 절대 금지 (AI 3 전담)',
  ].join('\n')

  // AI 3개 병렬 실행
  const [cssJs, topHtml, botHtml] = await Promise.all([

    // AI 1: CSS + JS 전체
    callClaude(
      'CSS/JS 전문가. <style>로 시작 </script>로 끝나는 순수 CSS+JS만 출력. 다른 텍스트 없이.',
      'CSS 전체와 JS 전체를 작성하세요.\n\n' + DS + '\n\n' +
      'Pretendard import (첫줄):\n' + PRETENDARD + '\n\n' +
      ':root { --primary:' + pc + '; --accent:' + ac + '; --secondary:' + sc + '; --bg:' + bg + '; }\n\n' +
      'CSS 필수:\n' +
      "* { box-sizing:border-box; margin:0; padding:0; }\n" +
      "body { font-family:'Pretendard Variable',Pretendard,sans-serif; background:var(--bg); color:#1a1a1a; }\n" +
      '.section-white { background:#fff; padding:56px 20px; color:#1a1a1a; }\n' +
      '.section-gray { background:#f8f9fa; padding:56px 20px; color:#1a1a1a; }\n' +
      '.section-dark { background:var(--primary); padding:56px 20px; color:#fff; }\n' +
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
      '.btn-primary { background:var(--accent); color:#fff; width:100%; padding:18px; border-radius:50px; font-size:16px; font-weight:800; border:none; box-shadow:0 8px 20px rgba(0,0,0,.2); cursor:pointer; }\n' +
      '.badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:rgba(0,0,0,.06); color:var(--accent); margin-bottom:10px; }\n' +
      '.divider { width:36px; height:3px; background:var(--accent); border-radius:2px; margin:10px auto 0; }\n' +
      '.urgency-banner { background:var(--accent); color:#fff; text-align:center; padding:10px 16px; font-size:13px; font-weight:700; position:sticky; top:0; z-index:998; }\n' +
      '.sticky-bar { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; height:64px; background:rgba(255,255,255,.97); backdrop-filter:blur(12px); border-top:1px solid #e8e8e8; display:flex; gap:10px; padding:0 16px; align-items:center; z-index:999; }\n' +
      '.fade-up { opacity:1; transform:none; transition:opacity .55s ease,transform .55s ease; }\n' +
      'body.js-ready .fade-up { opacity:0; transform:translateY(24px); }\n' +
      'body.js-ready .fade-up.visible { opacity:1; transform:translateY(0); }\n' +
      '나머지 통계/후기/FAQ 등 컴포넌트 클래스 작성\n\n' +
      'JS (DOMContentLoaded):\n' +
      '1. body.classList.add("js-ready")\n' +
      '2. IntersectionObserver threshold:0.08 → .fade-up에 .visible\n' +
      '3. 카운트업: data-target → 1.5초 애니메이션\n' +
      '4. FAQ: .faq-question 클릭 → .faq-answer 토글\n' +
      '5. scrollToForm(): id="main-form" scrollIntoView smooth center\n' +
      '6. handleForm(e): preventDefault, 동의체크 미체크시 alert, 제출시 "무료 상담 신청이 완료되었습니다!\\n빠른 시간 내에 연락드리겠습니다!" alert 후 reset\n' +
      '7. 카운트다운 id="timer": 23:59:59부터 감소\n' +
      customNote
    ),

    // AI 2: 상단 HTML (긴급배너 + 히어로 + 앞쪽 섹션들)
    callClaude(
      '퍼포먼스 마케팅 퍼블리셔. HTML 조각만 출력. DOCTYPE html head style script 태그 없이 순수 HTML만.',
      '랜딩페이지 상단부 HTML을 작성하세요.\n\n' +
      brandCtx + '\n\n' + DS + '\n\n전화번호: ' + phone + customNote + '\n\n' +
      commonRules + '\n\n' +
      '담당: 긴급배너 + 히어로 + 아래 섹션들\n\n' +
      formatSections(secTop, 0) + '\n\n' +
      '[설득 지침]\n' +
      '- 긴급배너: <div class="urgency-banner">' + (plan.urgency?.message || '한정 혜택 진행 중') + ' <span id="timer"></span></div>\n' +
      '- 히어로: .section-dark 배경, why_this_brand.hero_message를 헤드라인으로\n' +
      '- 각 섹션 시작: objection_resolved 고객 의심을 먼저 공감 문장으로\n' +
      '- 섹션 헤드라인 위 뱃지 + 아래 서브헤드 + 구분선\n' +
      '- 혜택카드: 최소 4개, 아이콘+제목+설명 2줄\n' +
      '- 통계: data-target 속성 포함\n' +
      '- sections[].content 카피 그대로 사용'
    ),

    // AI 3: 하단 HTML + 폼 + 고정UI
    callClaude(
      '퍼포먼스 마케팅 퍼블리셔. HTML 조각만 출력. DOCTYPE html head style script 태그 없이 순수 HTML만.',
      '랜딩페이지 하단부 HTML + 폼 + 고정 CTA 바를 작성하세요.\n\n' +
      brandCtx + '\n\n' + DS + '\n\n전화번호: ' + phone + customNote + '\n\n' +
      '담당: 아래 섹션들 + 폼(최하단 1번만) + 고정 CTA 바\n\n' +
      formatSections(secBot, half) + '\n\n' +
      '[필수 규칙]\n' +
      '- img 태그 사용 금지\n' +
      '- font-family 인라인 스타일 금지\n' +
      '- 색상은 var() 변수만\n' +
      '- 밝은 배경에서 color:#fff 금지 / 어두운 배경에서 color:#1a1a1a 금지\n' +
      '- 폼은 딱 1번 최하단에만 (중간 폼 절대 금지)\n' +
      '- 각 섹션·카드에 class="fade-up"\n\n' +
      '[설득 지침]\n' +
      '- 후기카드: ★★★★★ + 이름(익명) + 직업/상황 + 후기 3줄 + ✓인증뱃지\n' +
      '- FAQ: 5개 이상, 각 답변 2~3줄, .faq-item > .faq-question + .faq-answer\n' +
      '- 폼 직전: biggest_friction 해소하는 마지막 설득 문단 (3~4줄)\n' +
      '- sections[].content 카피 그대로 사용\n\n' +
      '폼 구조 (id="main-form" onsubmit="handleForm(event)" class="section-gray" style="padding:56px 20px"):\n' +
      '  헤드라인: ' + (plan.form?.title || '무료 상담 신청') + '\n' +
      '  서브: ' + (plan.form?.subtitle || '') + '\n' +
      '  input[name=name][type=text][required][placeholder="이름"] style="color:#1a1a1a;background:#fff"\n' +
      '  input[name=phone][type=tel][required][placeholder="연락처 (숫자만)"] style="color:#1a1a1a;background:#fff"\n' +
      '  checkbox[required] "개인정보 수집·이용에 동의합니다"\n' +
      '  button.btn-primary type=submit: "무료상담 신청하기"\n' +
      '  버튼아래: ' + (plan.form?.micro_copy || '입력하신 정보는 안전하게 보호됩니다') + ' (style="color:#999;font-size:12px;text-align:center;margin-top:8px")\n' +
      '  폼하단: trust_elements 3개 (color:#555)\n\n' +
      '고정 CTA 바 (폼 다음에 바로 작성):\n' +
      '<div class="sticky-bar">\n' +
      '  <a href="tel:' + (phone || '#') + '" style="flex:1;border:1.5px solid var(--primary);color:var(--primary);border-radius:12px;height:44px;font-weight:700;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:14px">📞 전화상담</a>\n' +
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
    (topHtml || '') + '\n' +
    (botHtml || '') + '\n' +
    '</div>\n' +
    '</body>\n' +
    '</html>'

  // 핵심 파트가 비어있으면 에러 반환
  if (!topHtml && !botHtml) {
    return Response.json({ success: false, error: 'HTML 생성 실패 — 다시 시도해주세요' }, { status: 500 })
  }
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
        max_tokens: 5000,
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

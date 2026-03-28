import * as cheerio from 'cheerio'

function toAbsoluteUrl(src, baseUrl) {
  if (!src) return null
  try {
    if (src.startsWith('http')) return src
    if (src.startsWith('//')) return 'https:' + src
    return new URL(src, baseUrl).href
  } catch { return null }
}

function normalizeHex(hex) {
  hex = hex.replace('#', '').toLowerCase()
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
  return '#' + hex
}

function isNeutral(hex) {
  hex = hex.replace('#', '').toLowerCase()
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
  const r = parseInt(hex.slice(0,2),16)
  const g = parseInt(hex.slice(2,4),16)
  const b = parseInt(hex.slice(4,6),16)
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  const lightness = (max+min)/2/255
  const saturation = max === min ? 0 : (max-min)/(255 - Math.abs(2*lightness*255-255))
  return saturation < 0.15 || lightness > 0.92 || lightness < 0.08
}

function extractKeyColors(html, themeColor) {
  const scores = {}
  const addColor = (hex, score) => {
    try {
      const n = normalizeHex(hex)
      if (isNeutral(n)) return
      scores[n] = (scores[n] || 0) + score
    } catch {}
  }
  if (themeColor && themeColor.startsWith('#')) addColor(themeColor, 100)
  const cssVars = html.match(/--(?:primary|main|brand|key|point|theme|base|color|accent|highlight)[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi) || []
  cssVars.forEach(m => { const h = m.match(/#[0-9a-fA-F]{3,6}/)?.[0]; if (h) addColor(h, 80) })
  const sels = html.match(/(?:body|header|nav|\.header|\.nav|\.btn|\.button|\.cta|#header)[^{]*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/gi) || []
  sels.forEach(m => { const h = m.match(/#[0-9a-fA-F]{3,6}/)?.[0]; if (h) addColor(h, 60) })
  const cnt = {}
  ;(html.match(/#[0-9a-fA-F]{6}/g) || []).forEach(h => {
    const n = normalizeHex(h)
    if (!isNeutral(n)) cnt[n] = (cnt[n] || 0) + 1
  })
  Object.entries(cnt).forEach(([h, c]) => { if (c >= 3) addColor(h, c * 2) })
  return Object.entries(scores).sort((a,b) => b[1]-a[1]).map(([h]) => h).slice(0, 5)
}

// AI 리서치 호출
async function runResearch(title, bodyText, url) {
  const domain = (() => { try { return new URL(url).hostname } catch { return url } })()
  const systemPrompt = `당신은 퍼포먼스 마케팅 전략가입니다.
크롤링된 광고주 정보를 바탕으로, DB 수집용 랜딩페이지에 활용할 "이 광고주만의 소구점"을 중심으로 분석합니다.
일반적인 업종 정보가 아니라, 이 광고주가 경쟁사 대비 왜 선택받아야 하는지를 찾아내는 것이 핵심입니다.
반드시 JSON만 출력하세요. 코드블록 없이 순수 JSON만.`

  const userPrompt = `아래 광고주 정보를 분석해 랜딩페이지 소구점 리서치를 수행하세요.

서비스명: ${title}
URL: ${url}
본문 내용: ${bodyText.slice(0, 2500)}

[리서치 목표]
이 광고주의 랜딩페이지에 방문한 잠재고객이 "여기서 연락처를 남겨야겠다"고 결심하게 만드는
핵심 소구점을 찾아내세요. 업종 일반론이 아닌, 이 광고주의 실제 콘텐츠에서 근거를 찾으세요.

다음 JSON 구조로 출력하세요:
{
  "brand_usp": {
    "core_differentiator": "경쟁사 대비 이 광고주만의 핵심 차별점 (크롤링 내용 기반, 1~2줄)",
    "strongest_claims": ["광고주가 내세우는 가장 강력한 주장/강점 3가지 (실제 내용 기반)"],
    "proof_points": ["신뢰를 줄 수 있는 증거 요소 (수치, 수상, 인증, 경력 등 실제 언급된 것)"],
    "unique_offerings": ["경쟁사에 없는 이 광고주만의 특이한 제공물/서비스 2~3가지"]
  },
  "target_customer": {
    "who": "이 서비스가 가장 필요한 고객 프로필 (나이/상황/고민 구체적으로)",
    "pain_point": "이 고객이 지금 겪고 있는 가장 큰 고통 (단어가 아닌 상황으로 묘사)",
    "desire": "이 고객이 이 서비스를 통해 진짜 원하는 변화 (기능이 아닌 결과로)",
    "decision_moment": "이 고객이 '지금 당장 연락해야겠다'고 느끼는 순간"
  },
  "conversion_hooks": {
    "headline_angles": ["전환율 높을 것 같은 헤드라인 방향 3가지 (이 광고주 소구점 기반)"],
    "key_objections": [
      {
        "objection": "잠재고객이 신청을 망설이게 하는 구체적 반론",
        "counter": "이 광고주의 강점으로 해소하는 방법"
      }
    ],
    "urgency_angle": "이 광고주에게 맞는 긴급성/희소성 소구 방향",
    "trust_builders": ["이 광고주 콘텐츠에서 뽑을 수 있는 신뢰 구축 요소 4가지"]
  },
  "copy_direction": {
    "tone": "이 광고주 서비스에 맞는 카피 톤앤매너",
    "killer_phrase": "이 광고주를 한 줄로 표현하는 강력한 문장 (헤드라인 후보)",
    "supporting_copy": ["서브헤드라인이나 본문에 쓸 수 있는 설득 문장 3가지"]
  }
}`

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
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim()
    return JSON.parse(text)
  } catch (err) {
    console.error('Research failed:', err)
    return null
  }
}

export async function POST(req) {
  const { url } = await req.json()
  if (!url) return Response.json({ error: 'URL이 필요합니다' }, { status: 400 })

  try {
    // AI 1: 크롤링 + AI 2: 리서치 — 동시 실행
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const crawlPromise = fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      }
    })

    const crawlRes = await crawlPromise
    clearTimeout(timeout)
    if (!crawlRes.ok) throw new Error(`HTTP ${crawlRes.status}`)

    const html = await crawlRes.text()
    const $ = cheerio.load(html)

    // 컬러 추출
    const themeColorMeta = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["'][^>]*>/i)?.[1] || ''
    const rawColors = extractKeyColors(html, themeColorMeta)

    // HTML 파싱
    $('script, noscript, iframe, nav, footer, header').remove()
    $('[class*="cookie"], [class*="popup"], [class*="modal"], [id*="cookie"]').remove()

    const title = $('title').text().trim() || $('h1').first().text().trim()
    const description = $('meta[name="description"]').attr('content') || ''
    const ogTitle = $('meta[property="og:title"]').attr('content') || ''
    const ogDesc = $('meta[property="og:description"]').attr('content') || ''
    const ogImage = $('meta[property="og:image"]').attr('content') || ''
    const themeColor = themeColorMeta || ''

    const headings = []
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 1 && text.length < 200) headings.push(text)
    })

    const paragraphs = []
    $('p, li, span, div').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 20 && text.length < 500) {
        if (!paragraphs.includes(text)) paragraphs.push(text)
      }
    })

    const uniqueHeadings = [...new Set(headings)].slice(0, 15)
    const uniqueParagraphs = [...new Set(paragraphs)].slice(0, 30)
    const bodyText = uniqueParagraphs.join('\n').slice(0, 5000)

    const fullText = $.text()
    const phones = fullText.match(/(?:0\d{1,2}-\d{3,4}-\d{4}|1[05678]\d{2}-\d{4})/g) || []
    const prices = fullText.match(/[\d,]+원|₩[\d,]+/g) || []

    // AI 리서치 — 크롤링과 병렬로 실행 (크롤링 직후 바로 시작)
    const research = await runResearch(title || ogTitle, bodyText, url)

    return Response.json({
      success: true,
      data: {
        url,
        title,
        description,
        ogTitle,
        ogDesc,
        ogImage: toAbsoluteUrl(ogImage, url) || '',
        themeColor,
        colors: rawColors,
        headings: uniqueHeadings,
        paragraphs: uniqueParagraphs.slice(0, 20),
        phones: [...new Set(phones)].slice(0, 5),
        prices: [...new Set(prices)].slice(0, 10),
        bodyText,
        research, // AI 리서치 결과
      }
    })
  } catch (err) {
    return Response.json({
      error: '크롤링 실패: ' + err.message,
      detail: '해당 사이트가 크롤링을 차단하거나 접속이 불가능할 수 있습니다.'
    }, { status: 500 })
  }
}

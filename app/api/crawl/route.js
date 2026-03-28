import * as cheerio from 'cheerio'

// URL을 절대경로로 변환
function toAbsoluteUrl(src, baseUrl) {
  if (!src) return null
  try {
    if (src.startsWith('http')) return src
    if (src.startsWith('//')) return 'https:' + src
    return new URL(src, baseUrl).href
  } catch {
    return null
  }
}

// hex3 → hex6 정규화
function normalizeHex(hex) {
  hex = hex.replace('#', '').toLowerCase()
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
  return '#' + hex
}

// 무채색 여부 (흰/검정/회색 계열)
function isNeutral(hex) {
  hex = hex.replace('#', '').toLowerCase()
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
  const r = parseInt(hex.slice(0,2),16)
  const g = parseInt(hex.slice(2,4),16)
  const b = parseInt(hex.slice(4,6),16)
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  const lightness = (max+min)/2/255
  const saturation = max === min ? 0 : (max-min)/(255 - Math.abs(2*lightness*255-255))
  // 채도 낮거나(회색), 명도 너무 높거나(흰색), 너무 낮으면(검정) 제외
  return saturation < 0.15 || lightness > 0.92 || lightness < 0.08
}

// 우선순위 기반 키컬러 추출
function extractKeyColors(html, themeColor) {
  const scores = {}

  const addColor = (hex, score) => {
    try {
      const n = normalizeHex(hex)
      if (isNeutral(n)) return
      scores[n] = (scores[n] || 0) + score
    } catch {}
  }

  // 1순위: theme-color 메타태그 (가장 신뢰도 높음)
  if (themeColor && themeColor.startsWith('#')) addColor(themeColor, 100)

  // 2순위: CSS 변수 선언 (:root 안의 --color, --primary, --brand 등)
  const cssVarMatches = html.match(/--(?:primary|main|brand|key|point|theme|base|color|accent|highlight)[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi) || []
  cssVarMatches.forEach(m => {
    const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0]
    if (hex) addColor(hex, 80)
  })

  // 3순위: background-color on body, header, nav, .header, .nav, .btn
  const importantSelectors = html.match(/(?:body|header|nav|\.header|\.nav|\.btn|\.button|\.cta|#header)[^{]*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/gi) || []
  importantSelectors.forEach(m => {
    const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0]
    if (hex) addColor(hex, 60)
  })

  // 4순위: 일반 hex 색상 등장 횟수 (많이 등장할수록 브랜드 컬러일 가능성)
  const allHex = html.match(/#[0-9a-fA-F]{6}/g) || []
  const hexCount = {}
  allHex.forEach(h => {
    const n = normalizeHex(h)
    if (!isNeutral(n)) hexCount[n] = (hexCount[n] || 0) + 1
  })
  Object.entries(hexCount).forEach(([hex, count]) => {
    if (count >= 3) addColor(hex, count * 2)
  })

  // 점수 기준 정렬
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex)
    .slice(0, 5)
}

export async function POST(req) {
  const { url } = await req.json()

  if (!url) return Response.json({ error: 'URL이 필요합니다' }, { status: 400 })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      }
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    // 컬러 추출 (script/style 제거 전에)
    const themeColorMeta = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["'][^>]*>/i)?.[1] || ""
    const rawColors = extractKeyColors(html, themeColorMeta)

    // Remove noise
    $('script, noscript, iframe, nav, footer, header').remove()
    $('[class*="cookie"], [class*="popup"], [class*="modal"], [id*="cookie"]').remove()

    const title = $('title').text().trim() || $('h1').first().text().trim()
    const description = $('meta[name="description"]').attr('content') || ''
    const ogTitle = $('meta[property="og:title"]').attr('content') || ''
    const ogDesc = $('meta[property="og:description"]').attr('content') || ''
    const ogImage = $('meta[property="og:image"]').attr('content') || ''

    const themeColor = themeColorMeta || ''

    // 이미지 추출 (절대 URL로 변환, 의미있는 것만)
    const images = []
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src')
      const alt = $(el).attr('alt') || ''
      const absUrl = toAbsoluteUrl(src, url)
      if (absUrl) {
        // 아이콘/로고/작은 이미지 제외
        const isIcon = absUrl.match(/icon|logo|favicon|sprite|pixel|tracking|1x1/i)
        const isTooSmall = absUrl.match(/\.(gif)$/i)
        if (!isIcon && !isTooSmall) {
          images.push({ url: absUrl, alt })
        }
      }
    })

    // og:image도 포함
    if (ogImage) {
      const absOg = toAbsoluteUrl(ogImage, url)
      if (absOg && !images.find(i => i.url === absOg)) {
        images.unshift({ url: absOg, alt: ogTitle || title })
      }
    }

    // Extract meaningful text
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

    const fullText = $.text()
    const phones = fullText.match(/(?:0\d{1,2}-\d{3,4}-\d{4}|1[05678]\d{2}-\d{4})/g) || []
    const emails = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
    const prices = fullText.match(/[\d,]+원|₩[\d,]+/g) || []

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
        emails: [...new Set(emails)].slice(0, 3),
        prices: [...new Set(prices)].slice(0, 10),
        bodyText: uniqueParagraphs.join('\n').slice(0, 5000),
      }
    })
  } catch (err) {
    return Response.json({
      error: '크롤링 실패: ' + err.message,
      detail: '해당 사이트가 크롤링을 차단하거나 접속이 불가능할 수 있습니다.'
    }, { status: 500 })
  }
}

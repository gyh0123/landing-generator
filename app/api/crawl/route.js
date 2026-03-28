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
      }
    })
  } catch (err) {
    return Response.json({
      error: '크롤링 실패: ' + err.message,
      detail: '해당 사이트가 크롤링을 차단하거나 접속이 불가능할 수 있습니다.'
    }, { status: 500 })
  }
}

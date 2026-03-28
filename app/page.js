'use client'
import { useState, useRef, useEffect } from 'react'
import styles from './page.module.css'

const STEPS = ['URL 입력', '크롤링 분석', '기획안 생성', 'HTML 생성', '완료']


// 미리보기용 HTML: fade-up visible 강제 처리 (정규식 최소화)
function previewHtml(html) {
  if (!html) return html
  return html
    .replace(/class="fade-up"/g, 'class="fade-up visible"')
    .replace(/body\.js-ready \.fade-up \{[^}]*\}/g, '')
}

export default function Home() {
  const [step, setStep] = useState(0) // 0=input, 1=crawling, 2=planning, 3=generating, 4=done
  const [url, setUrl] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [crawlData, setCrawlData] = useState(null)
  const [plan, setPlan] = useState(null)
  const [html, setHtml] = useState('')
  const [error, setError] = useState('')
  const [editingPlan, setEditingPlan] = useState(false)
  const [planText, setPlanText] = useState('')
  const [previewMode, setPreviewMode] = useState('code') // code | preview
  const [customRequest, setCustomRequest] = useState('')
  const [progress, setProgress] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const timerRef = useRef(null)
  const iframeRef = useRef(null)

  const addProgress = (icon, title, desc, done=false) => {
    setProgress(prev => {
      const next = [...prev]
      const idx = next.findIndex(p => p.title === title)
      if (idx >= 0) { next[idx] = { icon, title, desc, done } }
      else next.push({ icon, title, desc, done })
      return next
    })
  }

  const reset = () => {
    setStep(0); setUrl(''); setCrawlData(null); setPlan(null)
    setHtml(''); setError(''); setPlanText(''); setCustomPrompt('')
    setCustomRequest(''); setProgress([]); setElapsed(0); setStartTime(null); if(timerRef.current) clearInterval(timerRef.current)
  }

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const handleError = (msg) => {
    stopTimer()
    setError(msg || '알 수 없는 오류가 발생했습니다')
    setStep(0)
  }

  const fetchWithTimeout = async (url, options, timeoutMs = 60000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)
      return res
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') throw new Error('요청 시간 초과 — 다시 시도해주세요')
      throw err
    }
  }

  const runAll = async () => {
    if (!url) return
    setError('')

    setProgress([])
    setElapsed(0)
    const st = Date.now()
    setStartTime(st)
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - st) / 1000)), 500)

    try {
      // Step 1: Crawl
      setStep(1)
      addProgress('🔍', '사이트 크롤링', '웹사이트 HTML 파싱 중...', false)
      const crawlRes = await fetchWithTimeout('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }, 20000)
      if (!crawlRes.ok) {
        const errData = await crawlRes.json().catch(() => ({}))
        handleError(errData.error || '크롤링 실패 (HTTP ' + crawlRes.status + ')'); return
      }
      const crawlJson = await crawlRes.json()
      if (!crawlJson.success) {
        handleError(crawlJson.error + (crawlJson.detail ? '\n' + crawlJson.detail : '')); return
      }
      setCrawlData(crawlJson.data)
      addProgress('🔍', '사이트 크롤링', '완료 — ' + (crawlJson.data.headings?.length || 0) + '개 헤딩, 컬러 ' + (crawlJson.data.colors?.length || 0) + '개 추출', true)

      // Step 2: Plan
      setStep(2)
      addProgress('📋', '설득 구조 기획', 'Kotler·Cialdini 프레임으로 설득 흐름 설계 중...', false)
      addProgress('🎯', '타겟 & 소구점 정의', '왜 이 브랜드인가 / 누구를 설득할 것인가 분석 중...', false)
      const planRes = await fetchWithTimeout('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crawlData: crawlJson.data, customPrompt })
      }, 65000)
      if (!planRes.ok) {
        const errData = await planRes.json().catch(() => ({}))
        handleError(errData.error || 'AI 기획 실패 (HTTP ' + planRes.status + ')'); return
      }
      const planJson = await planRes.json()
      if (!planJson.success) {
        handleError(planJson.error || 'AI 기획안 생성 실패'); return
      }
      setPlan(planJson.plan)
      setPlanText(JSON.stringify(planJson.plan, null, 2))
      addProgress('📋', '설득 구조 기획', '완료 — ' + (planJson.plan.sections?.length || 0) + '개 섹션 설계', true)
      addProgress('🎯', '타겟 & 소구점 정의',
        '완료 — 타겟: ' + (planJson.plan.brand?.target?.slice(0, 30) || '') + '...', true)

      // Step 3: Generate HTML (5 AI 병렬)
      setStep(3)
      addProgress('🎨', 'CSS · JS 생성', 'AI 1 — 디자인 시스템 및 인터랙션 작성 중...', false)
      addProgress('🦸', '히어로 + 상단 생성', 'AI 2 — 긴급배너 + 히어로 + 상단 섹션 작성 중...', false)
      addProgress('🔧', '중단 섹션 생성', 'AI 3 — 차별점·프로세스·비교 섹션 작성 중...', false)
      addProgress('💬', '후기 · FAQ 생성', 'AI 4 — 후기·FAQ·마지막 설득 섹션 작성 중...', false)
      addProgress('📬', '폼 + CTA 생성', 'AI 5 — 신청폼 + 고정 CTA 바 작성 중...', false)
      const genRes = await fetchWithTimeout('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planJson.plan, crawlData: crawlJson.data, customRequest })
      }, 65000)
      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}))
        handleError(errData.error || 'HTML 생성 실패 (HTTP ' + genRes.status + ')'); return
      }
      const genJson = await genRes.json()
      if (!genJson.success) {
        handleError(genJson.error || 'HTML 생성 실패'); return
      }
      setHtml(genJson.html)
      addProgress('🎨', 'CSS · JS 생성', '완료', true)
      addProgress('🦸', '히어로 + 상단 생성', '완료', true)
      addProgress('🔧', '중단 섹션 생성', '완료', true)
      addProgress('💬', '후기 · FAQ 생성', '완료', true)
      addProgress('📬', '폼 + CTA 생성', '완료', true)
      stopTimer()
      setStep(4)
    } catch (err) {
      console.error('runAll error:', err)
      handleError(err.message || '오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const regenerateHtml = async () => {
    setStep(3)
    setError('')
    let currentPlan = plan
    if (editingPlan) {
      try { currentPlan = JSON.parse(planText) } catch { setError('기획안 JSON 오류'); setStep(4); return }
    }
    try {
      const genRes = await fetchWithTimeout('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: currentPlan, crawlData, customRequest })
      }, 65000)
      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}))
        setError(errData.error || 'HTML 생성 실패'); setStep(4); return
      }
      const genJson = await genRes.json()
      if (!genJson.success) { setError(genJson.error || 'HTML 생성 실패'); setStep(4); return }
      setHtml(genJson.html)
      addProgress('🎨', 'CSS · JS 생성', '완료', true)
      addProgress('🦸', '히어로 + 상단 생성', '완료', true)
      addProgress('🔧', '중단 섹션 생성', '완료', true)
      addProgress('💬', '후기 · FAQ 생성', '완료', true)
      addProgress('📬', '폼 + CTA 생성', '완료', true)
      stopTimer()
      setStep(4)
    } catch (err) {
      console.error('regenerateHtml error:', err)
      setError(err.message || 'HTML 재생성 실패'); setStep(4)
    }
  }

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `landing-${Date.now()}.html`
    a.click()
  }

  const isLoading = step >= 1 && step <= 3

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span>LP Generator</span>
        </div>
        <p className={styles.logoSub}>링크 → AI 분석 → 랜딩페이지 자동 생성</p>
      </header>

      {/* Step Indicator */}
      <div className={styles.stepBar}>
        {STEPS.map((s, i) => {
          const doneCount = progress.filter(p => p.done).length
          const totalCount = progress.length || 1
          const pct = Math.round((doneCount / Math.max(totalCount, 1)) * 100)
          const isCurrentStep = i === step && isLoading
          return (
            <div key={i} className={`${styles.stepItem} ${i <= step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
              <div className={styles.stepDot}>
                {i < step ? '✓' : isCurrentStep ? pct + '%' : i + 1}
              </div>
              <span className={styles.stepLabel}>{s}</span>
              {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ''}`} />}
            </div>
          )
        })}
      </div>
      {isLoading && (() => {
        const mins = Math.floor(elapsed / 60)
        const secs = elapsed % 60
        const timeStr = mins > 0 ? mins + '분 ' + secs + '초' : secs + '초'
        return <div className={styles.elapsedBadge}>⏱ {timeStr}</div>
      })()}

      {/* Error */}
      {error && (
        <div className={styles.errorBox}>
          <span>⚠</span>
          <pre>{error}</pre>
        </div>
      )}

      {/* Step 0: URL Input */}
      {step === 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>분석할 웹사이트 URL을 입력하세요</h2>
          <p className={styles.cardDesc}>경쟁사, 자사, 참고 사이트 등 랜딩페이지로 만들고 싶은 서비스의 URL을 입력하면 AI가 자동으로 분석합니다.</p>

          <div className={styles.inputGroup}>
            <label className={styles.label}>웹사이트 URL</label>
            <input
              className={styles.input}
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAll()}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>추가 요청사항 <span className={styles.optional}>(선택)</span></label>
            <textarea
              className={styles.textarea}
              placeholder="예: 40~60대 여성 타겟으로 기획해줘 / 가격 강조 / 한방 의원 느낌으로"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <button className={styles.btnPrimary} onClick={runAll} disabled={!url}>
            <span>🚀</span> 랜딩페이지 자동 생성 시작
          </button>

          <div className={styles.howItWorks}>
            <div className={styles.step2Item}>
              <div className={styles.step2Num}>1</div>
              <div>
                <strong>크롤링 분석</strong>
                <p>URL에서 서비스명, 주요 내용, 가격, 연락처 등을 자동 추출</p>
              </div>
            </div>
            <div className={styles.step2Item}>
              <div className={styles.step2Num}>2</div>
              <div>
                <strong>기획안 생성</strong>
                <p>타겟, USP, 헤드라인, 디자인 방향 등 마케팅 기획안 작성</p>
              </div>
            </div>
            <div className={styles.step2Item}>
              <div className={styles.step2Num}>3</div>
              <div>
                <strong>HTML 코드 작성</strong>
                <p>완성된 DB 수집용 랜딩페이지 HTML 파일 생성 및 다운로드</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (() => {
        const doneCount = progress.filter(p => p.done).length
        const totalCount = progress.length || 1
        const pct = Math.round((doneCount / Math.max(totalCount, 1)) * 100)
        const mins = Math.floor(elapsed / 60)
        const secs = elapsed % 60
        const timeStr = mins > 0 ? mins + '분 ' + secs + '초' : secs + '초'
        return (
        <div className={styles.card}>
          <div className={styles.loadingWrap}>
            <div className={styles.progressTopBar}>
              <div className={styles.progressTopLeft}>
                <div className={styles.spinner} />
                <div>
                  <div className={styles.loadingText}>
                    {step === 1 && '사이트 크롤링 중...'}
                    {step === 2 && '설득 구조 기획 중...'}
                    {step === 3 && 'AI 5개 병렬 HTML 생성 중...'}
                  </div>
                  <p className={styles.loadingDesc}>
                    {step === 1 && '웹사이트에서 서비스 정보를 수집하고 있습니다'}
                    {step === 2 && '"왜 이 브랜드인가 / 누구를 설득할 것인가" 기획 중'}
                    {step === 3 && 'CSS + 히어로 + 중단 + 후기/FAQ + 폼을 5개 AI로 동시 생성 후 합칩니다'}
                  </p>
                </div>
              </div>
              <div className={styles.progressTopRight}>
                <div className={styles.pctNum}>{pct}%</div>
                <div className={styles.elapsedTime}>⏱ {timeStr}</div>
              </div>
            </div>
            <div className={styles.progressBarWrap}>
              <div className={styles.progressBarFill} style={{width: pct + '%'}} />
            </div>
            {progress.length > 0 && (
              <div className={styles.progressList}>
                {progress.map((p, i) => (
                  <div key={i} className={styles.progressItem + (p.done ? ' ' + styles.progressDone : '')}>
                    <div className={styles.progressIcon}>
                      {p.done ? '✓' : <span className={styles.progressSpinner} />}
                    </div>
                    <div className={styles.progressContent}>
                      <div className={styles.progressTitle}>{p.icon} {p.title}</div>
                      <div className={styles.progressDesc}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )
      })()}

      {/* Step 4: Done */}
      {step === 4 && plan && (
        <div className={styles.resultWrap}>
          {/* Plan Section */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>📋 기획안</h2>
              <div className={styles.cardActions}>
                <button className={styles.btnSecondary} onClick={() => setEditingPlan(!editingPlan)}>
                  {editingPlan ? '✓ 편집 완료' : '✏️ 편집'}
                </button>
              </div>
            </div>

            {editingPlan ? (
              <textarea
                className={styles.codeArea}
                value={planText}
                onChange={e => setPlanText(e.target.value)}
                rows={20}
              />
            ) : (
              <div className={styles.planGrid}>
                <PlanCard icon="💡" title="왜 이 브랜드인가?" items={[
                  ['핵심 이유', plan.analysis?.why_this_brand?.core_reason],
                  ['독자 가치', plan.analysis?.why_this_brand?.unique_value],
                  ['히어로 메시지', plan.analysis?.why_this_brand?.hero_message],
                ]} />
                <PlanCard icon="🎯" title="어떤 타겟을 설득하는가?" items={[
                  ['프로필', plan.analysis?.target_definition?.profile],
                  ['상황', plan.analysis?.target_definition?.situation],
                  ['감정', plan.analysis?.target_definition?.emotion],
                  ['인식단계', plan.analysis?.target_definition?.awareness_stage],
                  ['첫 확인사항', plan.analysis?.target_definition?.first_check],
                ]} />
                <PlanCard icon="🔍" title="설득 전략" items={[
                  ['서비스 본질', plan.analysis?.service_essence],
                  ['설득 전략', plan.analysis?.persuasion_strategy],
                  ['핵심 마찰', plan.analysis?.conversion_diagnosis?.biggest_friction],
                ]} />
                <PlanCard icon="🎨" title="디자인" items={[
                  ['무드', plan.design?.mood],
                  ['메인컬러', plan.design?.primary_color],
                  ['강조컬러', plan.design?.accent_color],
                  ['섹션수', plan.sections?.length + '개'],
                ]} extra={
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <div style={{width:24,height:24,borderRadius:6,background:plan.design?.primary_color}} title={plan.design?.primary_color}/>
                    <div style={{width:24,height:24,borderRadius:6,background:plan.design?.secondary_color}} title={plan.design?.secondary_color}/>
                    <div style={{width:24,height:24,borderRadius:6,background:plan.design?.accent_color}} title={plan.design?.accent_color}/>
                  </div>
                } />
              </div>
            )}

            <div className={styles.regenSection}>
              <input
                className={styles.input}
                placeholder="재생성 요청사항 (예: 더 긴급하게, 가격 부각, 젊은 톤으로)"
                value={customRequest}
                onChange={e => setCustomRequest(e.target.value)}
              />
              <button className={styles.btnPrimary} onClick={regenerateHtml}>
                🔄 HTML 재생성
              </button>
            </div>
          </div>

          {/* HTML Result */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>💻 생성된 HTML</h2>
              <div className={styles.cardActions}>
                <div className={styles.toggleGroup}>
                  <button
                    className={`${styles.toggleBtn} ${previewMode === 'code' ? styles.toggleActive : ''}`}
                    onClick={() => setPreviewMode('code')}
                  >코드</button>
                  <button
                    className={`${styles.toggleBtn} ${previewMode === 'preview' ? styles.toggleActive : ''}`}
                    onClick={() => setPreviewMode('preview')}
                  >미리보기</button>
                </div>
                <button className={styles.btnPrimary} onClick={downloadHtml}>
                  ⬇️ HTML 다운로드
                </button>
              </div>
            </div>

            {previewMode === 'code' ? (
              <div className={styles.codeWrap}>
                <div className={styles.codeBar}>
                  <span className={styles.codeDot} style={{background:'#ff5f56'}}/>
                  <span className={styles.codeDot} style={{background:'#ffbd2e'}}/>
                  <span className={styles.codeDot} style={{background:'#27c93f'}}/>
                  <span style={{marginLeft:'auto',fontSize:12,color:'var(--text3)'}}>
                    {html.length.toLocaleString()} chars
                  </span>
                </div>
                <pre className={styles.codeContent}>{html}</pre>
              </div>
            ) : (
              <div className={styles.previewWrap}>
                <div className={styles.previewBar}>
                  <span>📱 모바일 미리보기</span>
                  <span style={{fontSize:11,color:'var(--text3)'}}>다운로드 후 브라우저에서 열면 애니메이션 포함 전체 확인 가능</span>
                </div>
                <div className={styles.phoneMock}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml(html)}
                    className={styles.previewFrame}
                    sandbox="allow-scripts allow-forms"
                    title="Landing Page Preview"
                    onLoad={e => {
                      try {
                        const doc = e.target.contentDocument
                        if (doc && doc.body) {
                          const h = doc.body.scrollHeight
                          if (h > 200) e.target.style.height = h + 'px'
                        }
                      } catch(err) {}
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className={styles.bottomActions}>
            <button className={styles.btnSecondary} onClick={reset}>
              ← 새 URL로 시작
            </button>
            <button className={styles.btnPrimary} onClick={downloadHtml}>
              ⬇️ HTML 다운로드
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function PlanCard({ icon, title, items, extra }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px',
    }}>
      <div style={{fontSize:13,fontWeight:600,color:'var(--accent2)',marginBottom:12}}>
        {icon} {title}
      </div>
      {items.map(([k, v]) => v && (
        <div key={k} style={{display:'flex',gap:8,marginBottom:6,fontSize:13}}>
          <span style={{color:'var(--text3)',minWidth:60,flexShrink:0}}>{k}</span>
          <span style={{color:'var(--text)'}}>{v}</span>
        </div>
      ))}
      {extra}
    </div>
  )
}

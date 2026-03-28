'use client'
import { useState, useRef } from 'react'
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
    setCustomRequest(''); setProgress([])
  }

  const runAll = async () => {
    if (!url) return
    setError('')

    setProgress([])
    // Step 1: Crawl
    setStep(1)
    addProgress('🔍', '사이트 크롤링', '웹사이트 HTML 파싱 중...', false)
    addProgress('🧠', '소구점 리서치', 'AI가 광고주 강점 분석 중...', false)
    const crawlRes = await fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
    const crawlJson = await crawlRes.json()
    if (!crawlJson.success) {
      setError(crawlJson.error + (crawlJson.detail ? '\n' + crawlJson.detail : ''))
      setStep(0); return
    }
    setCrawlData(crawlJson.data)
    addProgress('🔍', '사이트 크롤링', '완료 — ' + (crawlJson.data.headings?.length || 0) + '개 헤딩, 컬러 ' + (crawlJson.data.colors?.length || 0) + '개 추출', true)
    addProgress('🧠', '소구점 리서치', crawlJson.data.research
      ? '완료 — ' + (crawlJson.data.research.brand_usp?.core_differentiator?.slice(0, 40) || '소구점 분석 완료') + '...'
      : '완료', true)

    // Step 2: Plan
    setStep(2)
    addProgress('📋', '설득 구조 기획', 'Kotler·Cialdini 프레임으로 설득 흐름 설계 중...', false)
    addProgress('🎯', '타겟 & 소구점 정의', '왜 이 브랜드인가 / 누구를 설득할 것인가 분석 중...', false)
    const planRes = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crawlData: crawlJson.data, customPrompt })
    })
    const planJson = await planRes.json()
    if (!planJson.success) {
      setError(planJson.error); setStep(0); return
    }
    setPlan(planJson.plan)
    setPlanText(JSON.stringify(planJson.plan, null, 2))
    addProgress('📋', '설득 구조 기획', '완료 — ' + (planJson.plan.sections?.length || 0) + '개 섹션 설계', true)
    addProgress('🎯', '타겟 & 소구점 정의',
      '완료 — 타겟: ' + (planJson.plan.brand?.target?.slice(0, 30) || '') + '...', true)

    // Step 3: Generate HTML
    setStep(3)
    addProgress('🎨', 'CSS · 디자인 시스템 생성', 'AI 1 — Pretendard 기반 컴포넌트 스타일 작성 중...', false)
    addProgress('🦸', '히어로 섹션 생성', 'AI 2 — 첫인상 설득 섹션 작성 중...', false)
    addProgress('📝', '상단 섹션 생성', 'AI 3 — 공감·혜택 섹션 작성 중...', false)
    addProgress('🔐', '신뢰 섹션 생성', 'AI 4 — 증거·후기 섹션 작성 중...', false)
    addProgress('📬', '폼 · 마무리 섹션 생성', 'AI 5 — FAQ·폼 섹션 작성 중...', false)
    const genRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planJson.plan, crawlData: crawlJson.data, customRequest })
    })
    const genJson = await genRes.json()
    if (!genJson.success) {
      setError(genJson.error); setStep(3); return
    }
    setHtml(genJson.html)
    addProgress('🎨', 'CSS · 디자인 시스템 생성', '완료', true)
    addProgress('🦸', '히어로 섹션 생성', '완료', true)
    addProgress('📝', '상단 섹션 생성', '완료', true)
    addProgress('🔐', '신뢰 섹션 생성', '완료', true)
    addProgress('📬', '폼 · 마무리 섹션 생성', '완료', true)
    setStep(4)
  }

  const regenerateHtml = async () => {
    setStep(3)
    setError('')
    let currentPlan = plan
    if (editingPlan) {
      try { currentPlan = JSON.parse(planText) } catch { setError('기획안 JSON 오류'); setStep(4); return }
    }
    const genRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: currentPlan, crawlData, customRequest })
    })
    const genJson = await genRes.json()
    if (!genJson.success) { setError(genJson.error); setStep(4); return }
    setHtml(genJson.html)
    addProgress('🎨', 'CSS · 디자인 시스템 생성', '완료', true)
    addProgress('🦸', '히어로 섹션 생성', '완료', true)
    addProgress('📝', '상단 섹션 생성', '완료', true)
    addProgress('🔐', '신뢰 섹션 생성', '완료', true)
    addProgress('📬', '폼 · 마무리 섹션 생성', '완료', true)
    setStep(4)
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
        {STEPS.map((s, i) => (
          <div key={i} className={`${styles.stepItem} ${i <= step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
            <div className={styles.stepDot}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={styles.stepLabel}>{s}</span>
            {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ''}`} />}
          </div>
        ))}
      </div>

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
      {isLoading && (
        <div className={styles.card}>
          <div className={styles.loadingWrap}>
            <div className={styles.loadingHeader}>
              <div className={styles.spinner} />
              <div>
                <div className={styles.loadingText}>
                  {step === 1 && '크롤링 + AI 소구점 리서치 중...'}
                  {step === 2 && '설득 구조 기획 중...'}
                  {step === 3 && 'AI 6개 병렬 HTML 생성 중...'}
                </div>
                <p className={styles.loadingDesc}>
                  {step === 1 && '사이트 분석과 광고주 소구점 리서치를 동시에 진행합니다'}
                  {step === 2 && '"왜 이 브랜드인가 / 누구를 설득할 것인가" 기획 중'}
                  {step === 3 && '히어로·섹션·폼을 각 AI가 병렬로 작성 후 합칩니다 (약 30~50초)'}
                </p>
              </div>
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
      )}

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

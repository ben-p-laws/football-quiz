'use client'

import { useState, useEffect, useRef } from 'react'
import NavBar from './NavBar'

function pickDaily(quizzes: Quiz[]): Quiz {
  const byUnit: Record<string, Quiz[]> = {}
  for (const q of quizzes) {
    if (!byUnit[q.unit]) byUnit[q.unit] = []
    byUnit[q.unit].push(q)
  }
  const units = Object.keys(byUnit).sort()
  const d     = new Date()
  const seed  = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  const unit  = units[seed % units.length]
  const pool  = byUnit[unit]
  return pool[Math.floor(seed / units.length) % pool.length]
}

function pickRandom(quizzes: Quiz[]): Quiz {
  // Step 1: pick category equally across all 6 — guarantees yellow cards/per90 get fair share
  const UNITS = ['apps', 'goals', 'assists', 'clean sheets', 'yellow cards', 'per 90']
  const unit  = UNITS[Math.floor(Math.random() * UNITS.length)]
  const pool  = quizzes.filter(q => q.unit === unit)
  if (!pool.length) return quizzes[Math.floor(Math.random() * quizzes.length)]

  // Step 2: within that category apply 20/40/40 scope weighting
  const allTime = pool.filter(q => q.type === 'alltime')
  const clubs   = pool.filter(q => q.type === 'club')
  const nats    = pool.filter(q => q.type === 'nationality')

  const r = Math.random()
  if (r < 0.2 && allTime.length) return allTime[Math.floor(Math.random() * allTime.length)]
  if (r < 0.6 && clubs.length)   return clubs[Math.floor(Math.random() * clubs.length)]
  if (nats.length)                return nats[Math.floor(Math.random() * nats.length)]
  return pool[Math.floor(Math.random() * pool.length)]
}

function normalize(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}

function fuzzyMatch(input: string, target: string) {
  const a = normalize(input)
  const b = normalize(target)
  if (a === b) return true
  if (b.includes(a) && a.length >= 4) return true
  if (Math.abs(a.length - b.length) > 3) return false
  let dp = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0]; dp[0] = j
    for (let i = 1; i <= a.length; i++) {
      const temp = dp[i]
      dp[i] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[i], dp[i-1])
      prev = temp
    }
  }
  return dp[a.length] <= Math.max(1, Math.floor(b.length * 0.25))
}

type Answer = {
  player:      string
  display:     string
  value:       string
  rawValue:    number
  nationality: string
  team:        string
}

type Quiz = {
  key:         string
  label:       string
  description: string
  unit:        string
  type:        'alltime' | 'club' | 'nationality'
  answers:     Answer[]
}


const s = {
  page:   { minHeight: '100vh', background: '#0a0f1e', fontFamily: "'DM Sans', -apple-system, sans-serif", paddingBottom: 60 } as React.CSSProperties,
  select: { width: '100%', background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '11px 16px', fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer', outline: 'none' } as React.CSSProperties,
  input:  { background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', fontSize: 15, color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
}

function LoadingAnimation() {
  const BARS = 10
  const cycle = 2.2
  const stagger = cycle / BARS
  return (
    <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <style>{`
        @keyframes ten-bar {
          0%, 100% { background: #1e2d4a; }
          30%, 80% { background: rgba(34,197,94,0.7); }
        }
        @keyframes ten-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          {Array.from({ length: BARS }, (_, i) => (
            <div key={i} style={{
              width: 10,
              height: `${(i + 1) * 18}px`,
              borderRadius: 3,
              background: '#1e2d4a',
              animation: `ten-bar ${cycle}s ease ${i * stagger}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#8899bb', animation: 'ten-pulse 1.5s ease infinite' }}>
          Loading Tenable...
        </div>
      </div>
    </div>
  )
}

export default function TenableQuiz() {
  const [allQuizzes, setAllQuizzes]       = useState<Quiz[]>([])
  const [allPlayers, setAllPlayers]       = useState<string[]>([])
  const [availableClubs, setAvailableClubs]   = useState<string[]>([])
  const [availableNats, setAvailableNats]     = useState<string[]>([])
  const [statsLoading, setStatsLoading]   = useState(true)
  const [activeTab, setActiveTab]         = useState<'daily' | 'random' | 'custom'>('daily')
  const [currentQuiz, setCurrentQuiz]     = useState<Quiz | null>(null)
  const [customStat, setCustomStat]       = useState('apps')
  const [customClub, setCustomClub]       = useState('')
  const [customNat, setCustomNat]         = useState('')
  const [customQuiz, setCustomQuiz]       = useState<Quiz | null>(null)
  const [customLoading, setCustomLoading] = useState(false)
  const [copied, setCopied]               = useState(false)
  const [guessed, setGuessed]             = useState<Record<number, boolean>>({})
  const [lives, setLives]                 = useState(3)
  const [input, setInput]                 = useState('')
  const [message, setMessage]             = useState<{ type: string; text: string } | null>(null)
  const [gameOver, setGameOver]           = useState(false)
  const [showClues, setShowClues]         = useState(false)
  const [shake, setShake]                 = useState(false)
  const [showSugg, setShowSugg]           = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const isCustom = sp.get('custom') === '1'

    fetch('/api/tenables')
      .then(r => r.json())
      .then(data => {
        const quizzes: Quiz[] = data.quizzes || []
        const players: string[] = data._allPlayers || []
        setAllQuizzes(quizzes)
        setAllPlayers(players)
        setAvailableClubs(data._allClubs || [])
        setAvailableNats(data._topNationalities || [])
        setStatsLoading(false)

        if (isCustom) {
          const stat = sp.get('stat') || 'apps'
          const club = sp.get('club') || ''
          const nat  = sp.get('nat')  || ''
          setCustomStat(stat)
          setCustomClub(club)
          setCustomNat(nat)
          setActiveTab('custom')
          const params = new URLSearchParams({ custom: '1', stat })
          if (club) params.set('club', club)
          if (nat)  params.set('nat', nat)
          setCustomLoading(true)
          fetch(`/api/tenables?${params}`)
            .then(r => r.json())
            .then(d => {
              if (d.custom) {
                setCustomQuiz(d.custom)
                setCurrentQuiz(d.custom)
              }
              setCustomLoading(false)
            })
            .catch(() => setCustomLoading(false))
        } else if (quizzes.length > 0) {
          setCurrentQuiz(pickDaily(quizzes))
        }
      })
      .catch(() => setStatsLoading(false))
  }, [])

  function resetGame() {
    setGuessed({})
    setLives(3)
    setInput('')
    setMessage(null)
    setGameOver(false)
    setShowClues(false)
    setShake(false)
    setShowSugg(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function switchToDaily() {
    if (allQuizzes.length === 0) return
    setCurrentQuiz(pickDaily(allQuizzes))
    setActiveTab('daily')
    resetGame()
  }

  function switchToRandom() {
    if (allQuizzes.length === 0) return
    setCurrentQuiz(pickRandom(allQuizzes))
    setActiveTab('random')
    resetGame()
  }

  function newRandom() {
    if (allQuizzes.length === 0) return
    setCurrentQuiz(pickRandom(allQuizzes))
    resetGame()
  }

  function switchToCustom() {
    setActiveTab('custom')
    setCurrentQuiz(customQuiz)
    resetGame()
  }

  async function generateCustom() {
    const params = new URLSearchParams({ custom: '1', stat: customStat })
    if (customClub) params.set('club', customClub)
    if (customNat)  params.set('nat', customNat)
    setCustomLoading(true)
    try {
      const r = await fetch(`/api/tenables?${params}`)
      const d = await r.json()
      if (d.custom) {
        setCustomQuiz(d.custom)
        setCurrentQuiz(d.custom)
        resetGame()
      }
    } finally {
      setCustomLoading(false)
    }
  }

  function shareCustom() {
    const params = new URLSearchParams({ custom: '1', stat: customStat })
    if (customClub) params.set('club', customClub)
    if (customNat)  params.set('nat', customNat)
    const url = `${window.location.origin}/tenables?${params}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function processGuess(name: string, isExact = false) {
    if (!currentQuiz || gameOver) return
    const answers = currentQuiz.answers

    // If exact match requested (autocomplete click), check already guessed
    if (isExact) {
      const alreadyGuessedIdx = answers.findIndex((a, i) => guessed[i] && a.display === name)
      if (alreadyGuessedIdx !== -1) { setInput(''); setShowSugg(false); return }
    }

    let matchIdx = -1
    if (isExact) {
      matchIdx = answers.findIndex((a, i) => !guessed[i] && a.display === name)
    } else {
      const q = name.trim()
      for (let i = 0; i < answers.length; i++) {
        if (guessed[i]) continue
        const ans = answers[i]
        if (
          fuzzyMatch(q, ans.player) ||
          fuzzyMatch(q, ans.display) ||
          ans.display.split(' ').some(p => p.length >= 3 && fuzzyMatch(q, p))
        ) { matchIdx = i; break }
      }
    }

    setInput('')
    setShowSugg(false)

    if (matchIdx !== -1) {
      const newGuessed = { ...guessed, [matchIdx]: true }
      setGuessed(newGuessed)
      const ans = answers[matchIdx]
      if (Object.keys(newGuessed).length === answers.length) {
        setGameOver(true)
        setMessage({ type: 'win', text: '🏆 Amazing! You found all 10!' })
      } else {
        setMessage({ type: 'correct', text: `✓ ${ans.display} — ${ans.value} ${currentQuiz.unit}` })
      }
    } else {
      const newLives = lives - 1
      setLives(newLives)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      if (newLives <= 0) {
        setGameOver(true)
        setMessage({ type: 'lose', text: '❌ No lives left! See the answers below.' })
      } else {
        const label = isExact ? name : name.trim()
        setMessage({ type: 'wrong', text: `✗ "${label}" not in the top 10 · ${newLives} ${newLives === 1 ? 'life' : 'lives'} left` })
      }
    }
  }

  const quiz    = currentQuiz
  const answers = quiz?.answers ?? []
  const barMax  = answers[0]?.rawValue || 1
  const foundCount = Object.keys(guessed).length
  const allFound   = foundCount === answers.length && answers.length > 0

  const sugg = showSugg && input.trim().length >= 2
    ? allPlayers.filter(n => normalize(n).includes(normalize(input))).slice(0, 10)
    : []

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes slideIn { from{transform:scaleX(0);opacity:0} to{transform:scaleX(1);opacity:1} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        .bar-fill { transform-origin:left; animation:slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards }
        .shake { animation:shake 0.5s ease }
        .msg { animation:fadeIn 0.2s ease }
      `}</style>

      <NavBar />

      {/* Header */}
      <div style={{ background: '#111827', borderBottom: '1px solid #1e2d4a', padding: '16px 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['daily', 'random', 'custom'] as const).map(tab => (
              <button key={tab}
                onClick={() => { if (tab === 'daily') switchToDaily(); else if (tab === 'random') switchToRandom(); else switchToCustom() }}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${activeTab === tab ? '#dc2626' : '#1e2d4a'}`, background: activeTab === tab ? 'rgba(220,38,38,0.12)' : 'transparent', color: activeTab === tab ? '#dc2626' : '#8899bb', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {tab === 'daily' ? '📅 Daily' : tab === 'random' ? '🎲 Random' : '🛠 Custom'}
              </button>
            ))}
          </div>

          {/* Preset info */}
          {(activeTab === 'daily' || activeTab === 'random') && quiz && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2 }}>{quiz.label}</div>
                <div style={{ fontSize: 12, color: '#8899bb' }}>{quiz.description}</div>
              </div>
              {activeTab === 'random' && (
                <button onClick={newRandom}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #1e2d4a', background: 'transparent', color: '#8899bb', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  🔀 New Challenge
                </button>
              )}
            </div>
          )}
          {(activeTab === 'daily' || activeTab === 'random') && statsLoading && (
            <div style={{ fontSize: 13, color: '#8899bb' }}>Loading quiz...</div>
          )}

          {/* Custom controls */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8899bb', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>Stat</label>
                  <select value={customStat} onChange={e => setCustomStat(e.target.value)} style={s.select}>
                    <option value="apps">Appearances</option>
                    <option value="goals">Goals</option>
                    <option value="assists">Assists</option>
                    <option value="goals_p90">Goals per 90</option>
                    <option value="clean_sheets">Clean Sheets</option>
                    <option value="yellow_cards">Yellow Cards</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8899bb', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>Club</label>
                  <select value={customClub} onChange={e => setCustomClub(e.target.value)} style={s.select}>
                    <option value="">All Clubs</option>
                    {availableClubs.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8899bb', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>Nationality</label>
                  <select value={customNat} onChange={e => setCustomNat(e.target.value)} style={s.select}>
                    <option value="">All Nationalities</option>
                    {availableNats.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <button onClick={generateCustom} disabled={customLoading}
                    style={{ padding: '11px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', fontWeight: 800, fontSize: 14, cursor: customLoading ? 'not-allowed' : 'pointer', opacity: customLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {customLoading ? 'Loading...' : 'Generate Quiz'}
                  </button>
                </div>
              </div>
              {customQuiz && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{customQuiz.label}</div>
                  <button onClick={shareCustom}
                    style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1e2d4a', background: copied ? 'rgba(34,197,94,0.12)' : 'transparent', color: copied ? '#22c55e' : '#8899bb', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {copied ? '✓ Copied!' : '🔗 Share'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {statsLoading && <LoadingAnimation />}

        {!statsLoading && activeTab === 'custom' && !currentQuiz && !customLoading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8899bb', fontSize: 14 }}>
            Configure your quiz above and click Generate Quiz
          </div>
        )}

        {!statsLoading && activeTab === 'custom' && customLoading && <LoadingAnimation />}

        {!statsLoading && quiz && !customLoading && (
          <>
            {/* Lives + progress */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ fontSize: 20, opacity: i < lives ? 1 : 0.2, transition: 'opacity 0.2s' }}>❤️</span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 120, height: 6, background: '#1e2d4a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(foundCount / 10) * 100}%`, height: '100%', background: '#22c55e', borderRadius: 3, transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontSize: 12, color: '#8899bb', fontWeight: 600 }}>{foundCount}/10</span>
              </div>
            </div>

            {/* Feedback message */}
            {message && (
              <div className="msg" style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600,
                background: (message.type === 'correct' || message.type === 'win') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: (message.type === 'correct' || message.type === 'win') ? '#22c55e' : '#ef4444',
                border: `1px solid ${(message.type === 'correct' || message.type === 'win') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {message.text}
              </div>
            )}

            {/* Input */}
            {!gameOver && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <div className={shake ? 'shake' : ''} style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); setShowSugg(true) }}
                    onFocus={() => setShowSugg(true)}
                    onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                    onKeyDown={e => { if (e.key === 'Enter') processGuess(input) }}
                    placeholder="Type a player name..."
                    style={{ ...s.input, flex: 1 }}
                    autoComplete="off"
                  />
                  <button onClick={() => processGuess(input)} disabled={!input.trim()}
                    style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: input.trim() ? '#dc2626' : '#1e2d4a', color: 'white', fontWeight: 800, fontSize: 14, cursor: input.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    Guess
                  </button>
                </div>
                {sugg.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 72, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, marginTop: 4, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {sugg.map(name => (
                      <div key={name} onMouseDown={() => processGuess(name, true)}
                        style={{ padding: '10px 14px', fontSize: 14, color: 'white', cursor: 'pointer', borderBottom: '1px solid #1e2d4a' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e2d4a'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
              <button onClick={() => setShowClues(v => !v)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1e2d4a', background: showClues ? 'rgba(220,38,38,0.12)' : 'transparent', color: showClues ? '#dc2626' : '#8899bb', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {showClues ? 'Hide Clues' : 'Show Clues'}
              </button>
              {!gameOver && (
                <button onClick={() => { setGameOver(true); setMessage({ type: 'lose', text: 'You gave up. Here are the answers.' }) }}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1e2d4a', background: 'transparent', color: '#8899bb', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Give Up
                </button>
              )}
              {(gameOver || allFound) && (
                <button onClick={resetGame}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔄 Replay
                </button>
              )}
            </div>

            {/* Win card */}
            {allFound && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '24px', textAlign: 'center' as const, marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', marginBottom: 4 }}>You found all 10!</div>
                <div style={{ fontSize: 13, color: '#8899bb' }}>{quiz.description}</div>
                {lives < 3 && (
                  <div style={{ fontSize: 12, color: '#8899bb', marginTop: 6 }}>
                    {3 - lives} {3 - lives === 1 ? 'life' : 'lives'} lost
                  </div>
                )}
              </div>
            )}

            {/* Answer bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {answers.map((ans, i) => {
                const isGuessed  = !!guessed[i]
                const isRevealed = gameOver && !isGuessed
                const barPct     = Math.max(8, (ans.rawValue / barMax) * 100)

                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#4a5568', width: 16, textAlign: 'right' as const, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, height: 44, background: '#0a0f1e', borderRadius: 8, border: `1px solid ${isGuessed ? 'rgba(34,197,94,0.4)' : isRevealed ? 'rgba(239,68,68,0.4)' : '#1e2d4a'}`, position: 'relative', overflow: 'hidden' }}>
                      {/* Bar fill */}
                      <div
                        className={isGuessed ? 'bar-fill' : ''}
                        style={{
                          position: 'absolute', top: 0, left: 0, height: '100%',
                          width: `${barPct}%`,
                          background: isGuessed ? 'rgba(34,197,94,0.2)' : isRevealed ? 'rgba(239,68,68,0.2)' : 'transparent',
                          borderRight: isGuessed ? '2px solid rgba(34,197,94,0.6)' : isRevealed ? '2px solid rgba(239,68,68,0.6)' : 'none',
                        }}
                      />
                      {/* Content */}
                      <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isGuessed ? '#22c55e' : isRevealed ? '#ef4444' : '#8899bb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(isGuessed || isRevealed) ? ans.display : '?'}
                            {showClues && <span style={{ fontSize: 10, fontWeight: 400, color: isGuessed ? 'rgba(34,197,94,0.7)' : isRevealed ? 'rgba(239,68,68,0.7)' : '#4a5568', marginLeft: 6 }}>{ans.nationality} · {ans.team}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: isGuessed ? '#22c55e' : isRevealed ? '#ef4444' : '#8899bb', flexShrink: 0 }}>
                          {ans.value}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

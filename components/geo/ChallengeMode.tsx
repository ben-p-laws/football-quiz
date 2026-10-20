'use client'

import { useState, useRef, useEffect } from 'react'
import { CITIES, City, formatPopFull, computeRank, diffColor, getContinent } from '@/lib/geo/city-data'

const TOTAL_ROUNDS = 10

type RoundResult = {
  target: City
  guess: City
  rank: number
  pct: number
  abovePct: number
}

function pickTargets(): City[] {
  const notable = CITIES.filter(c => c.capital || c.pop >= 1_000_000)
  const shuffled = [...notable].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, TOTAL_ROUNDS)
}

function ScoreBadge({ score }: { score: number }) {
  const max = TOTAL_ROUNDS * CITIES.length
  const color = score <= TOTAL_ROUNDS * 5 ? '#22c55e' : score <= TOTAL_ROUNDS * 50 ? '#eab308' : '#ef4444'
  return (
    <span style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: '-1px' }}>
      {score.toLocaleString()}
    </span>
  )
}

export default function ChallengeMode() {
  const [targets, setTargets] = useState<City[]>(pickTargets)
  const [round, setRound] = useState(0)               // 0–9
  const [results, setResults] = useState<RoundResult[]>([])
  const [roundState, setRoundState] = useState<'guessing' | 'revealed'>('guessing')
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<City[]>([])
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const target = targets[round]
  const finished = round >= TOTAL_ROUNDS
  const totalScore = results.reduce((s, r) => s + r.rank, 0)

  function restart() {
    setTargets(pickTargets())
    setRound(0)
    setResults([])
    setRoundState('guessing')
    setInput('')
    setSuggestions([])
  }

  function handleInput(val: string) {
    setInput(val)
    if (val.length < 2) { setSuggestions([]); return }
    const v = val.toLowerCase()
    const isTarget = (c: City) => c.name === target.name && c.country === target.country
    const starts = CITIES.filter(c => !isTarget(c) && c.name.toLowerCase().startsWith(v))
    const contains = CITIES.filter(c => !isTarget(c) && !c.name.toLowerCase().startsWith(v) && c.name.toLowerCase().includes(v))
    setSuggestions([...starts, ...contains].slice(0, 8))
    setSelectedIdx(-1)
  }

  function submitGuess(city: City) {
    if (city.name === target.name && city.country === target.country) return
    const diff = Math.abs(city.pop - target.pop)
    const pct = (diff / target.pop) * 100
    const abovePct = ((city.pop - target.pop) / target.pop) * 100
    const rank = computeRank(city, target)
    setResults(prev => [...prev, { target, guess: city, rank, pct, abovePct }])
    setRoundState('revealed')
    setInput('')
    setSuggestions([])
  }

  function nextRound() {
    setRound(r => r + 1)
    setRoundState('guessing')
    setInput('')
    setSuggestions([])
    setSelectedIdx(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const pick = selectedIdx >= 0 ? suggestions[selectedIdx] : suggestions.length === 1 ? suggestions[0] : null
      if (pick) submitGuess(pick)
    }
    if (e.key === 'Escape') { setSuggestions([]); setSelectedIdx(-1) }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setSuggestions([])
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function shareResult() {
    const lines = [
      `🌍 City Population Challenge`,
      `Score: ${totalScore.toLocaleString()} (lower = better)`,
      '',
      ...results.map((r, i) => {
        const c = diffColor(r.pct)
        return `${c.emoji} R${i + 1} ${r.target.name} → ${r.guess.name} #${r.rank}`
      }),
      '',
      'topbinsfooty.com/geo/challenge',
    ]
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }

  const roundResult = results[round - (roundState === 'revealed' ? 0 : 1)]
  const currentResult = roundState === 'revealed' ? results[results.length - 1] : null

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", paddingBottom: 48 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        .geo-input::placeholder { color: #4a5568; }
        .geo-input:focus { outline: none; border-color: #dc2626 !important; }
        .geo-suggestion:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ padding: '16px 0 14px', borderBottom: '1px solid #1e2d4a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/geo" style={{ color: '#4a5568', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</a>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>Population Challenge</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>10 rounds · one guess each · lowest score wins</div>
          </div>
          {finished && (
            <button onClick={restart} style={{ background: '#1e2d4a', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#8899bb', cursor: 'pointer' }}>
              🔄 Play again
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!finished && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#8899bb' }}>Round {round + 1} of {TOTAL_ROUNDS}</span>
              {results.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4a5568' }}>
                  Score so far: <span style={{ color: 'white' }}>{results.reduce((s, r) => s + r.rank, 0).toLocaleString()}</span>
                </span>
              )}
            </div>
            <div style={{ height: 4, background: '#1e2d4a', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(round / TOTAL_ROUNDS) * 100}%`, background: '#dc2626', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {!finished && target && (
          <>
            {/* Target card */}
            <div style={{ margin: '16px 0 12px', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Target city</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', marginBottom: 4 }}>{target.name}</div>
              <div style={{ fontSize: 13, color: '#8899bb', marginBottom: 8 }}>{target.country}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', letterSpacing: '-0.3px' }}>{formatPopFull(target.pop)}</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>population</div>
            </div>

            {/* Input or result */}
            {roundState === 'guessing' ? (
              <div ref={dropdownRef} style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="geo-input"
                    value={input}
                    onChange={e => handleInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a city name…"
                    autoComplete="off"
                    autoFocus
                    style={{ flex: 1, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: 'white', fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={() => {
                      const pick = selectedIdx >= 0 ? suggestions[selectedIdx] : suggestions.length === 1 ? suggestions[0] : null
                      if (pick) submitGuess(pick)
                    }}
                    disabled={suggestions.length === 0}
                    style={{ background: '#dc2626', border: 'none', borderRadius: 10, padding: '0 18px', fontSize: 18, cursor: suggestions.length === 0 ? 'not-allowed' : 'pointer', opacity: suggestions.length === 0 ? 0.4 : 1, color: 'white' }}
                  >→</button>
                </div>
                {suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {suggestions.map((c, i) => (
                      <div key={c.name} className="geo-suggestion" onMouseDown={() => submitGuess(c)}
                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: i === selectedIdx ? 'rgba(220,38,38,0.1)' : 'transparent', borderBottom: i < suggestions.length - 1 ? '1px solid #1a2540' : 'none' }}>
                        <span style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontSize: 12, color: '#4a5568' }}>{c.country}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : currentResult && (
              <>
                {/* Round result */}
                {(() => {
                  const c = diffColor(currentResult.pct)
                  const dir = currentResult.abovePct > 0 ? '▲' : '▼'
                  return (
                    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: c.text, textTransform: 'uppercase', lineHeight: 1 }}>rank</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: c.text, lineHeight: 1.1 }}>#{currentResult.rank}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{currentResult.guess.name}</div>
                        <div style={{ fontSize: 11, color: '#8899bb' }}>{currentResult.guess.country}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{formatPopFull(currentResult.guess.pop)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{dir}{Math.abs(currentResult.abovePct).toFixed(1)}% off</div>
                      </div>
                    </div>
                  )
                })()}
                <button onClick={nextRound}
                  style={{ width: '100%', background: '#dc2626', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 800, color: 'white', cursor: 'pointer', marginBottom: 16 }}>
                  {round + 1 < TOTAL_ROUNDS ? `Next round →` : 'See final score →'}
                </button>
              </>
            )}

            {/* Round history (compact) */}
            {results.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Previous rounds</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {results.map((r, i) => {
                    const c = diffColor(r.pct)
                    return (
                      <div key={i} style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#4a5568', width: 20, flexShrink: 0 }}>R{i + 1}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#8899bb', flex: 1 }}>{r.target.name}</span>
                        <span style={{ fontSize: 11, color: 'white' }}>→ {r.guess.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: c.text, marginLeft: 8 }}>#{r.rank}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Final score screen */}
        {finished && (
          <div style={{ marginTop: 20 }}>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, padding: '24px 20px', textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Final score</div>
              <ScoreBadge score={totalScore} />
              <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>total rank (lower = better · perfect = {TOTAL_ROUNDS})</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <button onClick={shareResult} style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer' }}>Copy result</button>
                <button onClick={restart} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer' }}>🔄 Play again</button>
              </div>
            </div>

            {/* Full breakdown */}
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map((r, i) => {
                const c = diffColor(r.pct)
                const dir = r.abovePct > 0 ? '▲' : '▼'
                return (
                  <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: '#4a5568', width: 22, flexShrink: 0 }}>R{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#8899bb' }}>{r.target.name} ({formatPopFull(r.target.pop)})</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{r.guess.name}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: c.text }}>#{r.rank}</div>
                      <div style={{ fontSize: 11, color: c.text }}>{dir}{Math.abs(r.abovePct).toFixed(1)}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

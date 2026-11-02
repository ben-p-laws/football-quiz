'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  CirclePuzzle,
  getDailyPuzzle,
  getRandomPuzzle,
  guessPct,
  parsePopGuess,
  formatPopGuess,
} from '@/lib/geo/circle-puzzles'
import { diffColor } from '@/lib/geo/city-data'

const CircleMapView = dynamic(() => import('./CircleMapView'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#0a0f1e', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#4a5568', fontSize: 13 }}>Loading map…</span>
    </div>
  ),
})

type DailyRecord = { date: string; pct: number; guess: number }

export default function PopulationCircle() {
  const [puzzle, setPuzzle] = useState<CirclePuzzle>(() => getDailyPuzzle())
  const [mode, setMode] = useState<'daily' | 'free'>('daily')
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dailyDone, setDailyDone] = useState<DailyRecord | null>(null)
  const [copied, setCopied] = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('popCircle_daily')
      if (raw) {
        const rec: DailyRecord = JSON.parse(raw)
        if (rec.date === todayStr) {
          setDailyDone(rec)
          setSubmitted(true)
        }
      }
    } catch {}
  }, [todayStr])

  const parsed = parsePopGuess(input)
  const canSubmit = parsed !== null

  function handleSubmit() {
    if (!parsed || submitted) return
    const pct = guessPct(parsed, puzzle.population)
    setSubmitted(true)
    if (mode === 'daily') {
      const rec: DailyRecord = { date: todayStr, pct, guess: parsed }
      setDailyDone(rec)
      try { localStorage.setItem('popCircle_daily', JSON.stringify(rec)) } catch {}
    }
  }

  function handleNextFree() {
    setPuzzle(getRandomPuzzle(puzzle.id))
    setInput('')
    setSubmitted(false)
    setCopied(false)
  }

  function handlePlayFree() {
    setMode('free')
    setPuzzle(getRandomPuzzle(puzzle.id))
    setInput('')
    setSubmitted(false)
    setCopied(false)
  }

  const guessNum = submitted ? (mode === 'daily' && dailyDone ? dailyDone.guess : parsed ?? 0) : 0
  const pct = submitted ? guessPct(guessNum, puzzle.population) : 0
  const colors = diffColor(pct)

  function handleShare() {
    const text = [
      '🌍 Population Circle',
      `📍 ${puzzle.label}`,
      `🎯 ${formatPopGuess(puzzle.population)}`,
      `💭 ${formatPopGuess(guessNum)} — ${colors.emoji}${pct.toFixed(1)}% off`,
      'topbinsfooty.com/geo/circle',
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const s = {
    page: { background: '#0a0f1e', minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" } as React.CSSProperties,
    inner: { maxWidth: 560, margin: '0 auto', padding: '0 20px' } as React.CSSProperties,
    header: { padding: '20px 0 16px', borderBottom: '1px solid #1e2d4a', marginBottom: 16 } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');`}</style>

      <div style={s.inner}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a href="/geo" style={{ color: '#4a5568', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</a>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>Population Circle</div>
                <div style={{ fontSize: 11, color: '#4a5568' }}>{mode === 'daily' ? 'Daily puzzle' : 'Free mode'}</div>
              </div>
            </div>
            {mode === 'free' && !submitted && (
              <button
                onClick={handleNextFree}
                style={{ background: 'none', border: '1px solid #1e2d4a', borderRadius: 8, padding: '6px 12px', color: '#8899bb', fontSize: 12, cursor: 'pointer' }}
              >
                New circle
              </button>
            )}
          </div>
        </div>

        <div style={{ height: 300, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
          <CircleMapView lat={puzzle.lat} lng={puzzle.lng} radiusKm={puzzle.radiusKm} />
        </div>

        {!submitted ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#8899bb', marginBottom: 10, fontWeight: 500 }}>
              Estimate the population inside the circle
            </div>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="e.g. 2m, 500k, 1.5b…"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#111827',
                border: '1px solid #1e2d4a',
                borderRadius: 10,
                padding: '12px 14px',
                color: 'white',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: 6,
              }}
            />
            <div style={{ fontSize: 12, color: input.trim() === '' ? '#4a5568' : canSubmit ? '#8899bb' : '#ef4444', marginBottom: 12, minHeight: 18 }}>
              {input.trim() === '' ? '' : canSubmit ? formatPopGuess(parsed!) : 'Invalid'}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%',
                background: canSubmit ? '#dc2626' : '#1e2d4a',
                border: 'none',
                borderRadius: 10,
                padding: '13px',
                color: canSubmit ? 'white' : '#4a5568',
                fontSize: 14,
                fontWeight: 800,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              Submit guess
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: '20px 18px',
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: colors.text, marginBottom: 4 }}>
                {pct.toFixed(1)}% off
              </div>
              <div style={{ fontSize: 13, color: '#8899bb', marginBottom: 14 }}>
                {puzzle.label}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Your guess</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{formatPopGuess(guessNum)}</div>
                </div>
                <div style={{ width: 1, background: '#1e2d4a' }} />
                <div>
                  <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Actual</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.text }}>{formatPopGuess(puzzle.population)}</div>
                </div>
              </div>
            </div>

            {mode === 'daily' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleShare}
                  style={{
                    flex: 1,
                    background: '#111827',
                    border: '1px solid #1e2d4a',
                    borderRadius: 10,
                    padding: '12px',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {copied ? 'Copied!' : 'Share result'}
                </button>
                <button
                  onClick={handlePlayFree}
                  style={{
                    flex: 1,
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Play free →
                </button>
              </div>
            ) : (
              <button
                onClick={handleNextFree}
                style={{
                  width: '100%',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: 10,
                  padding: '13px',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Next circle →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  CirclePuzzle,
  getDailyPuzzle,
  getDailyFreePool,
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
type FreeRecord  = { date: string; index: number }

type Stats = {
  bin_0_5: number; bin_5_10: number; bin_10_20: number
  bin_20_40: number; bin_40_60: number; bin_60_plus: number
}

const BINS: { key: keyof Stats; label: string }[] = [
  { key: 'bin_0_5',    label: '0–5%'   },
  { key: 'bin_5_10',   label: '5–10%'  },
  { key: 'bin_10_20',  label: '10–20%' },
  { key: 'bin_20_40',  label: '20–40%' },
  { key: 'bin_40_60',  label: '40–60%' },
  { key: 'bin_60_plus',label: '60%+'   },
]

function pctToBinKey(pct: number): keyof Stats {
  if (pct <= 5)  return 'bin_0_5'
  if (pct <= 10) return 'bin_5_10'
  if (pct <= 20) return 'bin_10_20'
  if (pct <= 40) return 'bin_20_40'
  if (pct <= 60) return 'bin_40_60'
  return 'bin_60_plus'
}

const FREE_POOL_SIZE = 10

export default function PopulationCircle() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [freePool] = useState<CirclePuzzle[]>(() => getDailyFreePool())

  const [puzzle, setPuzzle] = useState<CirclePuzzle>(() => getDailyPuzzle())
  const [mode, setMode] = useState<'daily' | 'free'>('daily')
  const [freeIndex, setFreeIndex] = useState(0)
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dailyDone, setDailyDone] = useState<DailyRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('popCircle_daily')
      if (raw) {
        const rec: DailyRecord = JSON.parse(raw)
        if (rec.date === todayStr) {
          setDailyDone(rec)
          setSubmitted(true)
          fetchStats()
        }
      }
    } catch {}
  }, [todayStr])

  async function fetchStats() {
    try {
      const res = await fetch(`/api/geo/circle-stats?date=${todayStr}`)
      if (res.ok) {
        const data = await res.json()
        if (data) setStats(data as Stats)
      }
    } catch {}
  }

  const parsed = parsePopGuess(input)
  const canSubmit = parsed !== null
  const freeExhausted = mode === 'free' && freeIndex >= FREE_POOL_SIZE

  async function handleSubmit() {
    if (!parsed || submitted) return
    const pct = guessPct(parsed, puzzle.population)
    setSubmitted(true)

    if (mode === 'daily') {
      const rec: DailyRecord = { date: todayStr, pct, guess: parsed }
      setDailyDone(rec)
      try { localStorage.setItem('popCircle_daily', JSON.stringify(rec)) } catch {}

      try {
        await fetch('/api/geo/circle-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: todayStr, puzzleId: puzzle.id, pct }),
        })
        await fetchStats()
      } catch {}
    } else {
      try { localStorage.setItem('popCircle_free', JSON.stringify({ date: todayStr, index: freeIndex + 1 } as FreeRecord)) } catch {}
    }
  }

  function handleNextFree() {
    const next = freeIndex + 1
    setFreeIndex(next)
    setPuzzle(freePool[next] ?? freePool[0])
    setInput('')
    setSubmitted(false)
    setCopied(false)
  }

  function handlePlayFree() {
    let startIndex = 0
    try {
      const raw = localStorage.getItem('popCircle_free')
      if (raw) {
        const rec: FreeRecord = JSON.parse(raw)
        if (rec.date === todayStr) startIndex = rec.index
      }
    } catch {}
    setMode('free')
    setFreeIndex(startIndex)
    setPuzzle(freePool[startIndex] ?? freePool[0])
    setInput('')
    setSubmitted(false)
    setCopied(false)
  }

  const guessNum = submitted ? (mode === 'daily' && dailyDone ? dailyDone.guess : parsed ?? 0) : 0
  const pct = submitted ? guessPct(guessNum, puzzle.population) : 0
  const colors = diffColor(pct)
  const myBinKey = submitted ? pctToBinKey(pct) : null

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

  const totalPlayers = stats ? BINS.reduce((s, b) => s + (stats[b.key] ?? 0), 0) : 0
  const maxBinCount  = stats ? Math.max(...BINS.map(b => stats[b.key] ?? 0), 1) : 1

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
            {mode === 'free' && (
              <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>
                {Math.min(freeIndex + 1, FREE_POOL_SIZE)} / {FREE_POOL_SIZE}
              </span>
            )}
          </div>
        </div>

        {freeExhausted ? (
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, padding: '40px 20px', textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌍</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'white', marginBottom: 6 }}>That&apos;s all for today</div>
            <div style={{ fontSize: 13, color: '#8899bb' }}>Come back tomorrow for {FREE_POOL_SIZE} more circles</div>
          </div>
        ) : (
          <div key={puzzle.id} style={{ height: 300, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <CircleMapView lat={puzzle.lat} lng={puzzle.lng} radiusKm={puzzle.radiusKm} />
          </div>
        )}

        {!freeExhausted && !submitted ? (
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
                width: '100%', boxSizing: 'border-box',
                background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10,
                padding: '12px 14px', color: 'white', fontSize: 16, fontFamily: 'inherit', outline: 'none', marginBottom: 6,
              }}
            />
            <div style={{ fontSize: 12, color: input.trim() === '' ? '#4a5568' : canSubmit ? '#8899bb' : '#ef4444', marginBottom: 12, minHeight: 18 }}>
              {input.trim() === '' ? '' : canSubmit ? formatPopGuess(parsed!) : 'Invalid'}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%', background: canSubmit ? '#dc2626' : '#1e2d4a', border: 'none',
                borderRadius: 10, padding: '13px', color: canSubmit ? 'white' : '#4a5568',
                fontSize: 14, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'background 0.15s',
              }}
            >
              Submit guess
            </button>
          </div>
        ) : !freeExhausted && (
          <div style={{ marginBottom: 20 }}>
            {/* Result card */}
            <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: '20px 18px', marginBottom: 12 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: colors.text, marginBottom: 4 }}>
                {pct.toFixed(1)}% off
              </div>
              <div style={{ fontSize: 13, color: '#8899bb', marginBottom: 14 }}>{puzzle.label}</div>
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

            {/* Distribution chart — daily mode only */}
            {mode === 'daily' && stats && totalPlayers > 0 && (
              <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today&apos;s players</div>
                  <div style={{ fontSize: 11, color: '#4a5568' }}>{totalPlayers.toLocaleString()} {totalPlayers === 1 ? 'player' : 'players'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {BINS.map(({ key, label }) => {
                    const count = stats[key] ?? 0
                    const isMe = key === myBinKey
                    const barPct = Math.round((count / maxBinCount) * 100)
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 44, fontSize: 11, fontWeight: isMe ? 800 : 400, color: isMe ? 'white' : '#4a5568', textAlign: 'right', flexShrink: 0 }}>
                          {label}
                        </div>
                        <div style={{ flex: 1, height: 22, background: '#0a0f1e', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${Math.max(barPct, count > 0 ? 3 : 0)}%`,
                            background: isMe ? colors.text : '#1e2d4a',
                            borderRadius: 4, transition: 'width 0.4s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                          }}>
                            {count > 0 && barPct >= 20 && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: isMe ? '#000' : '#8899bb' }}>{count}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ width: 20, fontSize: 11, fontWeight: isMe ? 800 : 400, color: isMe ? colors.text : '#4a5568', textAlign: 'left', flexShrink: 0 }}>
                          {barPct < 20 && count > 0 ? count : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {mode === 'daily' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleShare} style={{ flex: 1, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? 'Copied!' : 'Share result'}
                </button>
                <button onClick={handlePlayFree} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: 10, padding: '12px', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Play free →
                </button>
              </div>
            ) : (
              <button onClick={handleNextFree} style={{ width: '100%', background: '#dc2626', border: 'none', borderRadius: 10, padding: '13px', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {freeIndex + 1 < FREE_POOL_SIZE ? 'Next circle →' : 'Finish →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

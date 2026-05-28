'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Wheel ────────────────────────────────────────────────────────────────────
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]
const SECTOR_DEG  = 360 / 37
const RED         = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

function numColor(n: number) {
  if (n === 0) return '#16a34a'
  return RED.has(n) ? '#dc2626' : '#222e42'
}

function WheelSVG({ rotation, size = 200 }: { rotation: number; size?: number }) {
  const cx = 50, cy = 50, r = 46, ir = 14
  const toRad = (deg: number) => (deg - 90) * Math.PI / 180
  const sectors = WHEEL_ORDER.map((num, i) => {
    const a1 = i * SECTOR_DEG, a2 = a1 + SECTOR_DEG
    const x1 = cx + r * Math.cos(toRad(a1)), y1 = cy + r * Math.sin(toRad(a1))
    const x2 = cx + r * Math.cos(toRad(a2)), y2 = cy + r * Math.sin(toRad(a2))
    const ix1 = cx + ir * Math.cos(toRad(a1)), iy1 = cy + ir * Math.sin(toRad(a1))
    const ix2 = cx + ir * Math.cos(toRad(a2)), iy2 = cy + ir * Math.sin(toRad(a2))
    const mid = a1 + SECTOR_DEG / 2, tr = (r + ir) / 2
    const tx = cx + tr * Math.cos(toRad(mid)), ty = cy + tr * Math.sin(toRad(mid))
    return { num, d: `M${ix1} ${iy1}L${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}L${ix2} ${iy2}A${ir} ${ir} 0 0 0 ${ix1} ${iy1}Z`, tx, ty, rot: mid + 90 }
  })
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '18px solid #f59e0b' }} />
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50px 50px', transition: 'transform 3.5s cubic-bezier(0.17,0.67,0.12,1.0)' }}>
          {sectors.map(({ num, d, tx, ty, rot }) => (
            <g key={num}>
              <path d={d} fill={numColor(num)} stroke="#0a0f1e" strokeWidth="0.3" />
              <text x={tx} y={ty} fontSize="3.2" fill="white" textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${rot},${tx},${ty})`} style={{ userSelect: 'none', fontWeight: 700 }}>{num}</text>
            </g>
          ))}
          <circle cx={cx} cy={cy} r={ir - 1} fill="#0d1424" stroke="#1e3a5f" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={2} fill="#f59e0b" />
        </g>
        <circle cx={cx} cy={cy} r={48} fill="none" stroke="#1e3a5f" strokeWidth="2" />
      </svg>
    </div>
  )
}

// ── Stat definitions ──────────────────────────────────────────────────────────
type StatCat = { id: string; label: string; club?: string }
const BASE_STATS: StatCat[] = [
  { id: 'goals',        label: 'Career Goals' },
  { id: 'assists',      label: 'Career Assists' },
  { id: 'ga',           label: 'Career G+A' },
  { id: 'yellow_cards', label: 'Career Yellow Cards' },
  { id: 'clean_sheets', label: 'Career Clean Sheets' },
]
const TOP_CLUBS = ['Arsenal','Chelsea','Liverpool','Manchester City','Manchester United','Tottenham Hotspur','Everton','West Ham United','Aston Villa','Newcastle United','Leicester City']

type PlayerData = {
  goals: number; assists: number; games: number; yellow_cards: number; clean_sheets: number
  clubGoals: Record<string, number>; clubAssists: Record<string, number>
  clubGames: Record<string, number>; clubYellowCards: Record<string, number>; clubCleanSheets: Record<string, number>
}

function statVal(p: PlayerData, id: string, club?: string): number {
  const g  = club ? (p.clubGoals[club]      || 0) : p.goals
  const a  = club ? (p.clubAssists[club]     || 0) : p.assists
  const yw = club ? (p.clubYellowCards[club] || 0) : p.yellow_cards
  const cs = club ? (p.clubCleanSheets[club] || 0) : p.clean_sheets
  if (id === 'goals')        return g
  if (id === 'assists')      return a
  if (id === 'ga')           return g + a
  if (id === 'yellow_cards') return yw
  if (id === 'clean_sheets') return cs
  return 0
}

function validate(players: Record<string, PlayerData>, cat: StatCat, target: number): boolean {
  const vals = Object.values(players).map(p => statVal(p, cat.id, cat.club))
  return vals.filter(v => v === target).length >= 1 && vals.filter(v => Math.abs(v - target) <= 5).length >= 4
}

// ── Bet logic ─────────────────────────────────────────────────────────────────
// "street" = vertical column of 3 (same as standard roulette street)
// street s (1-based): contains numbers [3s-2, 3s-1, 3s]
type BetType = 'number' | 'street' | 'third'

function streetOf(n: number)  { return Math.ceil(n / 3) }              // 1-12
function thirdOf(n: number)   { return n <= 12 ? 1 : n <= 24 ? 2 : 3 }
function streetNums(n: number) {
  const s = streetOf(n)
  return [3 * s - 2, 3 * s - 1, 3 * s]
}

function betCovers(type: BetType, stat: number, target: number): boolean {
  if (stat < 1 || stat > 36) return false
  if (type === 'number') return stat === target
  if (type === 'street') return streetOf(stat) === streetOf(target)
  if (type === 'third')  return thirdOf(stat)  === thirdOf(target)
  return false
}
function betMultiplier(type: BetType) {
  return type === 'number' ? 36 : type === 'street' ? 12 : 3
}

// ── Felt table (always visible) ───────────────────────────────────────────────
const ROWS = [
  [3,6,9,12,15,18,21,24,27,30,33,36],
  [2,5,8,11,14,17,20,23,26,29,32,35],
  [1,4,7,10,13,16,19,22,25,28,31,34],
]

function FeltTable({ target, selectedBet, revealed }: { target: number | null; selectedBet: BetType | null; revealed: boolean }) {
  const showTarget = revealed && target !== null
  const covered = (n: number) => {
    if (!showTarget || !selectedBet) return false
    return betCovers(selectedBet, n, target!)
  }
  const isTarget = (n: number) => showTarget && n === target

  return (
    <div style={{
      background: 'linear-gradient(160deg,#1a5c2a 0%,#14471f 60%,#0f3518 100%)',
      borderRadius: 12,
      padding: '10px',
      border: '3px solid #0d2b14',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 3 }}>
        {ROWS.map((row) =>
          row.map(n => {
            const tgt = isTarget(n)
            const cov = covered(n)
            const isRed = RED.has(n)
            let bg = isRed ? '#b91c1c' : '#111827'
            if (tgt) bg = '#f59e0b'
            else if (cov) bg = isRed ? '#dc2626' : '#374151'
            return (
              <div key={n} style={{
                background: bg,
                border: `1px solid ${tgt ? '#fbbf24' : cov ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 4,
                padding: '6px 2px',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: tgt ? 900 : 600,
                color: tgt ? '#0a0f1e' : 'white',
                opacity: showTarget && !tgt && !cov ? 0.45 : 1,
                lineHeight: 1,
                boxShadow: tgt ? '0 0 8px rgba(245,158,11,0.6)' : 'none',
              }}>{n}</div>
            )
          })
        )}
      </div>
      {/* Third labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, marginTop: 4 }}>
        {[{ t: 1, label: '1st 12' }, { t: 2, label: '2nd 12' }, { t: 3, label: '3rd 12' }].map(({ t, label }) => {
          const active = showTarget && selectedBet === 'third' && target !== null && thirdOf(target) === t
          return (
            <div key={t} style={{
              background: active ? 'rgba(245,158,11,0.25)' : 'rgba(0,0,0,0.2)',
              border: `1px solid ${active ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 4, padding: '3px', textAlign: 'center',
              fontSize: 9, fontWeight: 700, color: active ? '#fbbf24' : 'rgba(255,255,255,0.5)',
            }}>{label}</div>
          )
        })}
      </div>
    </div>
  )
}

// ── Slot display ──────────────────────────────────────────────────────────────
function SlotDisplay({ category, spinning }: { category: StatCat | null; spinning: boolean }) {
  const [idx, setIdx] = useState(0)
  const labels = [...BASE_STATS.map(s => s.label), ...TOP_CLUBS.flatMap(c => [`Goals for ${c}`, `Assists for ${c}`])]
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (spinning) { ref.current = setInterval(() => setIdx(i => (i + 1) % labels.length), 80) }
    else if (ref.current) clearInterval(ref.current)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [spinning])
  return (
    <div style={{ background: '#0d1424', border: '2px solid #1e3a5f', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 52 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: spinning ? '#6b7fa3' : '#f59e0b', textAlign: 'center' }}>
        {spinning ? labels[idx] : (category?.label ?? '—')}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'spinning' | 'betting' | 'result' | 'gameover'

export default function Roulette() {
  const [players, setPlayers]     = useState<Record<string, PlayerData> | null>(null)
  const [playerNames, setNames]   = useState<string[]>([])
  const [loading, setLoading]     = useState(true)

  const [phase, setPhase]         = useState<Phase>('intro')
  const [winnings, setWinnings]   = useState(0)
  const [round, setRound]         = useState(1)
  const [wheelRot, setWheelRot]   = useState(0)
  const [spinning, setSpinning]   = useState(false)

  const [target, setTarget]       = useState<number | null>(null)
  const [category, setCategory]   = useState<StatCat | null>(null)
  const [betType, setBetType]     = useState<BetType | null>(null)

  const [query, setQuery]         = useState('')
  const [suggestions, setSugg]    = useState<string[]>([])
  const [chosen, setChosen]       = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState('')
  const [won, setWon]             = useState(false)

  const history = useRef<{ target: number; cat: string; player: string; stat: number; won: boolean }[]>([])

  useEffect(() => {
    fetch('/api/football-golf?data=1').then(r => r.json()).then(({ players: p }) => {
      setPlayers(p); setNames(Object.keys(p).sort()); setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!query || query.length < 2) { setSugg([]); return }
    const q = query.toLowerCase()
    setSugg(playerNames.filter(n => n.toLowerCase().includes(q)).slice(0, 8))
  }, [query, playerNames])

  const spin = useCallback(() => {
    if (!players) return
    setPhase('spinning'); setSpinning(true); setBetType(null); setChosen(null); setQuery('')

    const allCats: StatCat[] = [
      ...BASE_STATS,
      ...TOP_CLUBS.flatMap(c => [
        { id: 'goals',   label: `Goals for ${c}`,   club: c },
        { id: 'assists', label: `Assists for ${c}`, club: c },
      ]),
    ]
    let cTarget = 7, cCat = BASE_STATS[0], found = false
    for (let i = 0; i < 200 && !found; i++) {
      const n = Math.floor(Math.random() * 36) + 1
      for (const cat of [...allCats].sort(() => Math.random() - 0.5)) {
        if (validate(players, cat, n)) { cTarget = n; cCat = cat; found = true; break }
      }
    }

    const idx   = WHEEL_ORDER.indexOf(cTarget)
    const delta = ((-idx * SECTOR_DEG - SECTOR_DEG / 2 - wheelRot) % 360 + 360) % 360 + 360 * 6
    setTarget(cTarget); setCategory(cCat); setWheelRot(wheelRot + delta)

    setTimeout(() => { setSpinning(false); setPhase('betting') }, 3700)
  }, [players, wheelRot])

  const submit = useCallback(() => {
    if (!betType || !chosen || !players || target === null || !category) return
    const p    = players[chosen]
    const val  = p ? statVal(p, category.id, category.club) : 0
    const hits = betCovers(betType, val, target)
    const mult = betMultiplier(betType)
    const delta = hits ? mult : 0
    const next = winnings + delta
    setWinnings(next); setWon(hits)
    const sNums = target ? streetNums(target).join(', ') : ''
    const tLabel = target ? (thirdOf(target) === 1 ? '1–12' : thirdOf(target) === 2 ? '13–24' : '25–36') : ''
    const betDesc = betType === 'number' ? `exactly ${target}` : betType === 'street' ? `in street [${sNums}]` : `in third ${tLabel}`
    setResultMsg(
      hits
        ? `${chosen} has ${val} ${category.label.toLowerCase()} — that's ${betDesc}. +${mult}!`
        : `${chosen} has ${val} ${category.label.toLowerCase()}. Needed ${betDesc}.`
    )
    history.current.push({ target: target!, cat: category!.label, player: chosen, stat: val, won: hits })
    setPhase(round >= 10 ? 'gameover' : 'result')
  }, [betType, chosen, players, target, category, winnings, round])

  const nextRound = useCallback(() => {
    setRound(r => r + 1); setTarget(null); setCategory(null); setBetType(null)
    setChosen(null); setQuery(''); setResultMsg(''); setPhase('intro')
  }, [])

  const restart = useCallback(() => {
    setWinnings(0); setRound(1); setTarget(null); setCategory(null); setBetType(null)
    setChosen(null); setQuery(''); setResultMsg(''); history.current = []; setPhase('intro')
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 56px)', color: '#8899bb' }}>
      Loading player data…
    </div>
  )

  const canBet = phase === 'betting'
  const canSubmit = canBet && betType !== null && chosen !== null

  const streetLabel = target ? streetNums(target).join(', ') : '—'
  const thirdLabel  = target ? (thirdOf(target) === 1 ? '1–12' : thirdOf(target) === 2 ? '13–24' : '25–36') : '—'

  if (phase === 'gameover') return (
    <div style={{ color: 'white', padding: '24px 16px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{winnings === 0 ? '😬' : winnings >= 50 ? '🏆' : '🎰'}</div>
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{winnings === 0 ? 'Nothing!' : winnings >= 50 ? 'Big winner!' : 'Game Over'}</div>
      <div style={{ fontSize: 14, color: '#8899bb', marginBottom: 24 }}>Finished with <span style={{ color: '#f59e0b', fontWeight: 700 }}>{winnings}</span> winnings</div>
      <div style={{ background: '#111827', borderRadius: 12, padding: '12px', marginBottom: 20, textAlign: 'left' }}>
        {history.current.map((r, i) => (
          <div key={i} style={{ fontSize: 12, color: r.won ? '#22c55e' : '#dc2626', padding: '4px 0', borderBottom: i < history.current.length - 1 ? '1px solid #1e2d4a' : 'none' }}>
            R{i + 1}: {r.cat} = {r.target} → {r.player} had {r.stat} {r.won ? '✓' : '✗'}
          </div>
        ))}
      </div>
      <button onClick={restart} style={{ background: '#dc2626', border: 'none', borderRadius: 8, color: 'white', fontSize: 15, fontWeight: 800, padding: '12px 32px', cursor: 'pointer' }}>
        Play Again
      </button>
    </div>
  )

  return (
    <div style={{ color: 'white', padding: '12px 16px 20px', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#f59e0b', letterSpacing: 3, fontWeight: 700 }}>♠ ♥ ♦ ♣</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: '2px 0 0', letterSpacing: -0.5 }}>
            Football <span style={{ color: '#f59e0b' }}>Roulette</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#6b7fa3', letterSpacing: 1 }}>ROUND</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{round}/10</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#6b7fa3', letterSpacing: 1 }}>WINNINGS</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: winnings < 0 ? '#dc2626' : '#f59e0b' }}>{winnings > 0 ? '+' : ''}{winnings}</div>
          </div>
        </div>
      </div>

      {/* Wheel + stat + spin */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <WheelSVG rotation={wheelRot} size={160} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: '#6b7fa3', letterSpacing: 2, marginBottom: 4 }}>STAT CATEGORY</div>
            <SlotDisplay category={category} spinning={spinning} />
          </div>
          {target !== null && !spinning && (
            <div style={{ background: '#0d1424', border: '1px solid #1e3a5f', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 9, color: '#6b7fa3', letterSpacing: 2 }}>TARGET</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#f59e0b', lineHeight: 1.1 }}>{target}</div>
              <div style={{ fontSize: 10, color: '#8899bb' }}>Find a player with {target}</div>
            </div>
          )}
          {(phase === 'intro' || phase === 'spinning') && (
            <button onClick={spin} disabled={spinning} style={{
              background: spinning ? '#1e2d4a' : '#dc2626', border: 'none', borderRadius: 8,
              color: spinning ? '#4a5a7a' : 'white', fontSize: 15, fontWeight: 900,
              padding: '12px', cursor: spinning ? 'default' : 'pointer', letterSpacing: 2,
            }}>{spinning ? 'SPINNING…' : 'SPIN'}</button>
          )}
        </div>
      </div>

      {/* Felt table — always visible */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#6b7fa3', letterSpacing: 2, marginBottom: 4 }}>TABLE</div>
        <FeltTable target={target} selectedBet={betType} revealed={phase === 'betting' || phase === 'result'} />
      </div>

      {/* Bet type selector — 3 fixed options based on target */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
        {([
          { type: 'number' as BetType, mult: 36, label: 'Number', sub: target ? String(target) : '—' },
          { type: 'street'  as BetType, mult: 12, label: 'Street',  sub: streetLabel },
          { type: 'third'   as BetType, mult: 3,  label: 'Third',   sub: thirdLabel },
        ]).map(({ type, mult, label, sub }) => {
          const active = betType === type
          return (
            <button key={type} onClick={() => canBet && setBetType(type)} style={{
              background: active ? '#f59e0b' : canBet ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? '#f59e0b' : canBet ? 'rgba(245,158,11,0.4)' : '#1e2d4a'}`,
              borderRadius: 8, padding: '8px 4px', cursor: canBet ? 'pointer' : 'default',
              color: active ? '#0a0f1e' : canBet ? 'white' : '#4a5a7a',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 900 }}>{mult}x</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>{sub}</div>
            </button>
          )
        })}
      </div>

      {/* Player picker */}
      <div style={{ marginBottom: 8, position: 'relative', opacity: canBet ? 1 : 0.4 }}>
        <div style={{ fontSize: 9, color: '#6b7fa3', letterSpacing: 2, marginBottom: 4 }}>PICK A PLAYER</div>
        <input
          value={chosen ?? query}
          onChange={e => { if (!canBet) return; setChosen(null); setQuery(e.target.value) }}
          placeholder={canBet ? 'Type player name…' : 'Spin first'}
          disabled={!canBet}
          style={{
            width: '100%', boxSizing: 'border-box', background: '#0d1424',
            border: `1px solid ${chosen ? '#22c55e' : '#1e3a5f'}`,
            borderRadius: 8, color: 'white', fontSize: 16, padding: '10px 12px', outline: 'none',
          }}
        />
        {suggestions.length > 0 && !chosen && canBet && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #1e3a5f', borderRadius: 8, zIndex: 50, overflow: 'hidden', marginTop: 2 }}>
            {suggestions.map(s => (
              <div key={s} onClick={() => { setChosen(s); setQuery(s); setSugg([]) }}
                style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #1e2d4a', color: '#e2e8f0' }}
                className="roulette-sug">{s}</div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      {canBet && (
        <button onClick={submit} disabled={!canSubmit} style={{
          width: '100%', background: canSubmit ? '#dc2626' : '#1e2d4a', border: 'none',
          borderRadius: 8, color: canSubmit ? 'white' : '#4a5a7a',
          fontSize: 14, fontWeight: 800, padding: '12px', cursor: canSubmit ? 'pointer' : 'default', letterSpacing: 1,
        }}>
          {canSubmit ? 'SUBMIT' : 'Select a bet and player'}
        </button>
      )}

      {/* Result */}
      {phase === 'result' && (
        <div style={{ marginTop: 10, background: won ? 'rgba(34,197,94,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${won ? '#22c55e' : '#dc2626'}`, borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: won ? '#22c55e' : '#dc2626', marginBottom: 4 }}>{won ? 'WIN!' : 'MISS'}</div>
          <div style={{ fontSize: 12, color: '#c4cfe8', lineHeight: 1.5, marginBottom: 10 }}>{resultMsg}</div>
          <button onClick={nextRound} style={{ background: '#dc2626', border: 'none', borderRadius: 6, color: 'white', fontSize: 13, fontWeight: 800, padding: '8px 20px', cursor: 'pointer' }}>
            Next Round →
          </button>
        </div>
      )}

      <style>{`.roulette-sug:hover { background: rgba(255,255,255,0.06); }`}</style>
    </div>
  )
}

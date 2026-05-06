'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import NavBar from '@/components/NavBar'

// ── Category definitions ────────────────────────────────────────────────────────

const CLUBS_LIST = [
  'Arsenal', 'Chelsea', 'Liverpool', 'Manchester United', 'Manchester City',
  'Tottenham Hotspur', 'Everton', 'Aston Villa', 'Newcastle United', 'West Ham United',
  'Leicester City', 'Blackburn Rovers', 'Leeds United', 'Southampton', 'Middlesbrough',
]

const NAT_LIST = [
  { code: 'ENG', label: 'English' }, { code: 'FRA', label: 'French' },
  { code: 'ESP', label: 'Spanish' }, { code: 'IRL', label: 'Irish' },
  { code: 'SCO', label: 'Scottish' }, { code: 'WAL', label: 'Welsh' },
  { code: 'NED', label: 'Dutch' },   { code: 'GER', label: 'German' },
  { code: 'POR', label: 'Portuguese' }, { code: 'ARG', label: 'Argentine' },
  { code: 'BRA', label: 'Brazilian' }, { code: 'BEL', label: 'Belgian' },
  { code: 'SEN', label: 'Senegalese' }, { code: 'NOR', label: 'Norwegian' },
]

type StatKey = 'goals' | 'assists' | 'appearances' | 'yellow_cards' | 'clean_sheets'
type Category = { key: StatKey; label: string; clubFilter?: string; natFilter?: string }

const ALL_TIME: Category[] = [
  { key: 'goals',        label: 'All-time PL Goals' },
  { key: 'assists',      label: 'All-time PL Assists' },
  { key: 'appearances',  label: 'All-time PL Appearances' },
  { key: 'clean_sheets', label: 'All-time PL Clean Sheets' },
  { key: 'yellow_cards', label: 'All-time PL Yellow Cards' },
]

const CLUB_CATS: Category[] = CLUBS_LIST.flatMap(club => [
  { key: 'goals',        label: `PL Goals for ${club}`,        clubFilter: club },
  { key: 'assists',      label: `PL Assists for ${club}`,      clubFilter: club },
  { key: 'appearances',  label: `PL Appearances for ${club}`,  clubFilter: club },
  { key: 'clean_sheets', label: `PL Clean Sheets for ${club}`, clubFilter: club },
  { key: 'yellow_cards', label: `PL Yellow Cards for ${club}`, clubFilter: club },
])

const NAT_CATS: Category[] = NAT_LIST.flatMap(({ code, label }) => [
  { key: 'goals',        label: `${label} PL Goals`,        natFilter: code },
  { key: 'assists',      label: `${label} PL Assists`,      natFilter: code },
  { key: 'appearances',  label: `${label} PL Appearances`,  natFilter: code },
  { key: 'yellow_cards', label: `${label} PL Yellow Cards`, natFilter: code },
])

function normSearch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['''`]/g, '').toLowerCase()
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function pickCategory(remaining: number): Category {
  let pool: Category[]
  if (remaining > 200) {
    pool = [...ALL_TIME, ...ALL_TIME, ...NAT_CATS.filter(c => c.key === 'goals' || c.key === 'appearances')]
  } else if (remaining >= 80) {
    pool = [...ALL_TIME, ...CLUB_CATS, ...NAT_CATS]
  } else {
    pool = [...CLUB_CATS, ...CLUB_CATS, ...NAT_CATS]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Hole generation ─────────────────────────────────────────────────────────────

type Hazard = { start: number; end: number }
type Hole = { number: number; par: number; distance: number; hazard: Hazard | null }

function randBetween(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateHazard(distance: number): Hazard {
  // Water hazard at 60–72% of hole distance, 20 yards wide, rounded to 5s
  const start = Math.round(distance * (0.60 + Math.random() * 0.12) / 5) * 5
  return { start, end: start + 20 }
}

function generateHoles(count: 3 | 6 | 9 | 18): Hole[] {
  const holes: Hole[] = []
  const groups = count / 3
  for (let g = 0; g < groups; g++) {
    for (const par of shuffle([3, 4, 5])) {
      const distance = par === 3 ? randBetween(160, 240)
        : par === 4 ? randBetween(320, 380)
        : randBetween(430, 500)
      const hazard = par === 3 ? generateHazard(distance) : null
      holes.push({ number: holes.length + 1, par, distance, hazard })
    }
  }
  return holes
}

// ── Club types ──────────────────────────────────────────────────────────────────

type ClubType = 'driver' | 'iron' | 'wedge' | 'putter'

function getClub(remaining: number): ClubType {
  if (remaining > 260) return 'driver'
  if (remaining >= 120) return 'iron'
  if (remaining >= 20)  return 'wedge'
  return 'putter'
}

const CLUB_RANGES: Record<ClubType, [number, number]> = {
  driver: [250, 300],
  iron:   [120, 260],
  wedge:  [20,  119],
  putter: [0,   20],
}

const CLUB_LABEL: Record<ClubType, string> = {
  driver: 'Driver', iron: 'Iron', wedge: 'Wedge', putter: 'Putter',
}

// ── Types ───────────────────────────────────────────────────────────────────────

type ShotResult = {
  total: number
  breakdown: { name: string; value: number }[]
  isOOB: boolean
  isHoled: boolean
  isGimme: boolean
  isOffGreen: boolean
  penaltyReason: string
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function FootballGolf() {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup')
  const [numHoles, setNumHoles] = useState<3 | 6 | 9 | 18>(9)
  const [holes, setHoles] = useState<Hole[]>([])
  const [holeIdx, setHoleIdx] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [strokes, setStrokes] = useState(0)
  const [scores, setScores] = useState<(number | null)[]>([])
  const [question, setQuestion] = useState<Category | null>(null)
  const [playerInputs, setPlayerInputs] = useState(['', '', ''])
  const [suggestions, setSuggestions] = useState<string[][]>([[], [], []])
  const [confirmedPlayers, setConfirmedPlayers] = useState<(string | null)[]>([null, null, null])
  const [shotResult, setShotResult] = useState<ShotResult | null>(null)
  const [inputError, setInputError] = useState('')
  const [allPlayerNames, setAllPlayerNames] = useState<string[]>([])
  const [playerData, setPlayerData] = useState<Record<string, any>>({})
  const [namesLoading, setNamesLoading] = useState(true)
  const searchTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>([null, null, null])
  const normalisedNames = useRef<string[]>([])

  // Fast: names only (~100KB) — enables autocomplete as soon as possible
  useEffect(() => {
    fetch('/api/football-golf?names=1')
      .then(r => r.json())
      .then(d => {
        const names: string[] = d.playerNames || []
        setAllPlayerNames(names)
        normalisedNames.current = names.map(normSearch)
        setNamesLoading(false)
      })
      .catch(() => setNamesLoading(false))
  }, [])

  // Slower: full stats (~1.9MB) — enables client-side shot calculation
  useEffect(() => {
    fetch('/api/football-golf?data=1')
      .then(r => r.json())
      .then(d => { setPlayerData(d.players || {}) })
      .catch(() => {})
  }, [])

  const currentHole = holes[holeIdx]
  const club = remaining > 0 ? getClub(remaining) : 'driver'
  const [, clubMax] = CLUB_RANGES[club]  // clubMin unused; only upper bound enforced

  const completedScores = scores.filter(s => s !== null) as number[]
  const completedPar = holes.slice(0, completedScores.length).reduce((s, h) => s + h.par, 0)
  const totalStrokes = completedScores.reduce((s, n) => s + n, 0)
  const vsPar = totalStrokes - completedPar

  function startGame() {
    const hs = generateHoles(numHoles)
    setHoles(hs)
    setScores(new Array(numHoles).fill(null))
    setHoleIdx(0)
    setRemaining(hs[0].distance)
    setStrokes(0)
    setShotResult(null)
    setQuestion(pickCategory(hs[0].distance))
    resetInputs()
    setPhase('playing')
  }

  function resetInputs() {
    setPlayerInputs(['', '', ''])
    setConfirmedPlayers([null, null, null])
    setSuggestions([[], [], []])
    setInputError('')
  }

  function onInputChange(idx: number, val: string) {
    setPlayerInputs(prev => { const n = [...prev]; n[idx] = val; return n })
    setConfirmedPlayers(prev => { const n = [...prev]; n[idx] = null; return n })
    if (val.length < 2) {
      setSuggestions(prev => { const n = [...prev]; n[idx] = []; return n })
      return
    }
    const q = normSearch(val)
    const matches = allPlayerNames.filter((_, i) => normalisedNames.current[i]?.includes(q)).slice(0, 8)
    setSuggestions(prev => { const n = [...prev]; n[idx] = matches; return n })
  }

  function confirmSuggestion(idx: number, name: string) {
    setPlayerInputs(prev => { const n = [...prev]; n[idx] = name; return n })
    setConfirmedPlayers(prev => { const n = [...prev]; n[idx] = name; return n })
    setSuggestions(prev => { const n = [...prev]; n[idx] = []; return n })
  }

  function submitShot() {
    if (!question || !currentHole) return
    const named = confirmedPlayers.filter(Boolean) as string[]
    if (named.length === 0) { setInputError('Select at least one player'); return }
    setInputError('')

    // Client-side stat lookup — no API call needed
    const breakdown: { name: string; value: number }[] = []
    let total = 0
    for (const name of named) {
      const p = playerData[name]
      if (!p) { breakdown.push({ name, value: 0 }); continue }
      if (question.natFilter && p.nationality !== question.natFilter) { breakdown.push({ name, value: 0 }); continue }
      let value = 0
      if (question.clubFilter) {
        const cf = question.clubFilter
        if      (question.key === 'goals')        value = p.clubGoals[cf]       || 0
        else if (question.key === 'assists')      value = p.clubAssists[cf]     || 0
        else if (question.key === 'appearances')  value = p.clubGames[cf]       || 0
        else if (question.key === 'yellow_cards') value = p.clubYellowCards[cf] || 0
        else if (question.key === 'clean_sheets') value = p.clubCleanSheets[cf] || 0
      } else {
        if      (question.key === 'goals')        value = p.goals
        else if (question.key === 'assists')      value = p.assists
        else if (question.key === 'appearances')  value = p.games
        else if (question.key === 'yellow_cards') value = p.yellow_cards
        else if (question.key === 'clean_sheets') value = p.clean_sheets
      }
      breakdown.push({ name, value })
      total += value
    }

    // OOB: exceeded club max OR landed in a water hazard
    const ballPos = currentHole.distance - remaining
    let isOOB = false
    let penaltyReason = ''
    if (total > clubMax) {
      isOOB = true
      penaltyReason = `Exceeded ${CLUB_LABEL[club]} max of ${clubMax} yds`
    }
    if (!isOOB && currentHole.hazard) {
      const newBallPos = ballPos + total
      const { start, end } = currentHole.hazard
      if (newBallPos >= start && newBallPos <= end) {
        isOOB = true
        penaltyReason = `Water hazard! Shot landed ${start}–${end} yds from tee`
      }
    }

    // Holed: within 5 yds of pin in either direction
    const overshoot = total - remaining
    const isHoled = !isOOB && overshoot >= 0 && overshoot <= 5
    const isGimme = !isOOB && !isHoled && remaining - total >= 0 && remaining - total <= 5
    const isOffGreen = false

    setShotResult({ total, breakdown, isOOB, isHoled, isGimme, isOffGreen, penaltyReason })
  }

  function advanceFromResult() {
    if (!shotResult || !currentHole) return
    const newStrokes = strokes + 1 + (shotResult.isOOB ? 1 : 0)

    if (shotResult.isOOB) {
      // Ball stays, new question same distance
      setStrokes(newStrokes)
      setShotResult(null)
      setQuestion(pickCategory(remaining))
      resetInputs()
      return
    }

    if (shotResult.isHoled || shotResult.isGimme) {
      finishHole(newStrokes)
      return
    }

    if (shotResult.isOffGreen) {
      // Ball went past green, new distance = how far past
      const newRemaining = shotResult.total - remaining
      setRemaining(newRemaining)
      setStrokes(newStrokes)
      setShotResult(null)
      setQuestion(pickCategory(newRemaining))
      resetInputs()
      return
    }

    // Normal advance — if overshot by >5 yds, ball is past the flag (use overshoot as new distance)
    const undershoot = remaining - shotResult.total  // positive = still short, negative = past
    const newRemaining = undershoot >= 0 ? undershoot : -undershoot
    if (newRemaining <= 5) {
      finishHole(newStrokes)
      return
    }
    setRemaining(newRemaining)
    setStrokes(newStrokes)
    setShotResult(null)
    setQuestion(pickCategory(newRemaining))
    resetInputs()
  }

  function finishHole(finalStrokes: number) {
    const newScores = [...scores]
    newScores[holeIdx] = finalStrokes
    setScores(newScores)
    setShotResult(null)
    resetInputs()
    if (holeIdx + 1 >= holes.length) {
      setPhase('done')
    } else {
      const nextIdx = holeIdx + 1
      setHoleIdx(nextIdx)
      setRemaining(holes[nextIdx].distance)
      setStrokes(0)
      setQuestion(pickCategory(holes[nextIdx].distance))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (phase === 'setup') {
    return <><NavBar /><SetupScreen numHoles={numHoles} setNumHoles={setNumHoles} onStart={startGame} /></>
  }

  if (phase === 'done') {
    return <><NavBar /><DoneScreen holes={holes} scores={scores as number[]} onRestart={() => setPhase('setup')} /></>
  }

  if (!currentHole) return null

  const ballPos = currentHole.distance - remaining
  const vsParStr = vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : String(vsPar)

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0f1e', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        input:focus { outline: none; }
      `}</style>

      <NavBar />

      <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <Scorecard holes={holes} scores={scores} currentIdx={holeIdx} vsParStr={vsParStr} vsPar={vsPar} />

        {/* Main content: left 75% controls, right 25% course */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>

          {/* Left panel — 75% */}
          <div style={{ flex: 3, padding: '12px 14px 20px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {/* Club + distance row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0 4px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Hole {currentHole.number} · Par {currentHole.par}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
              {remaining} yards to pin
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
              {(() => {
                const base = `${CLUB_LABEL[club]} · max ${clubMax} yds`
                if (!currentHole.hazard) return base
                const distToStart = currentHole.hazard.start - ballPos
                const distToEnd = currentHole.hazard.end - ballPos
                if (distToEnd <= 0) return base
                const hazardText = distToStart <= 0
                  ? ' · 💧 In water zone'
                  : ` · 💧 Water: ${distToStart}–${distToEnd} yds ahead`
                const hazardColor = distToStart <= 0 ? '#f87171' : '#60a5fa'
                return <>{base}<span style={{ color: hazardColor }}>{hazardText}</span></>
              })()}
            </div>
          </div>

          {/* Question card */}
          {question && (
            <div style={{ background: '#1e2d4a', borderRadius: 10, padding: '9px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                Category
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>{question.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                Up to 3 players — combined stat = shot distance
              </div>
            </div>
          )}

          {/* Shot result or inputs */}
          {shotResult ? (
            <ShotResultPanel result={shotResult} club={club} remaining={remaining} onContinue={advanceFromResult} />
          ) : (
            <>
              {namesLoading && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '4px 0' }}>
                  Loading players…
                </div>
              )}
              {[0, 1, 2].map(idx => (
                <PlayerInputRow
                  key={idx}
                  idx={idx}
                  value={playerInputs[idx]}
                  confirmed={!!confirmedPlayers[idx]}
                  suggestions={suggestions[idx]}
                  onChange={val => onInputChange(idx, val)}
                  onConfirm={name => confirmSuggestion(idx, name)}
                  onClear={() => {
                    setPlayerInputs(prev => { const n = [...prev]; n[idx] = ''; return n })
                    setConfirmedPlayers(prev => { const n = [...prev]; n[idx] = null; return n })
                    setSuggestions(prev => { const n = [...prev]; n[idx] = []; return n })
                  }}
                />
              ))}
              {inputError && (
                <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>{inputError}</div>
              )}
              <button
                onClick={submitShot}
                disabled={confirmedPlayers.every(p => !p)}
                style={{
                  background: confirmedPlayers.every(p => !p) ? '#1a2540' : '#dc2626',
                  color: 'white', border: 'none', borderRadius: 10, padding: '13px 0',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.2s', marginTop: 2,
                }}
              >
                ⛳ Take Shot
              </button>
            </>
          )}
        </div>

          {/* Right panel — 25% course view */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <CourseView hole={currentHole} ballPos={ballPos} strokes={strokes} />
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Scorecard ───────────────────────────────────────────────────────────────────

function Scorecard({ holes, scores, currentIdx, vsParStr, vsPar }: {
  holes: Hole[]; scores: (number | null)[]; currentIdx: number; vsParStr: string; vsPar: number
}) {
  const vsParColor = vsPar < 0 ? '#22c55e' : vsPar > 0 ? '#ef4444' : 'white'
  return (
    <div style={{ background: '#111827', padding: '8px 12px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 'max-content' }}>
        <div style={{ width: 22, fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>H</div>
        {holes.map((h, i) => (
          <div key={i} style={{
            width: 26, textAlign: 'center', borderRadius: 4, padding: '2px 0',
            background: i === currentIdx ? 'rgba(220,38,38,0.2)' : 'transparent',
          }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>P{h.par}</div>
            <div style={{
              fontSize: 13, fontWeight: 800,
              color: scores[i] == null ? 'rgba(255,255,255,0.18)'
                : (scores[i]! < h.par) ? '#22c55e'
                : (scores[i]! > h.par) ? '#ef4444'
                : 'white',
            }}>
              {scores[i] ?? '·'}
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 6, paddingLeft: 6, borderLeft: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>TOT</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: vsParColor }}>{vsParStr}</div>
        </div>
      </div>
    </div>
  )
}

// ── Course view ─────────────────────────────────────────────────────────────────

function CourseView({ hole, ballPos, strokes }: { hole: Hole; ballPos: number; strokes: number }) {
  const progress = hole.distance > 0 ? Math.min(1, ballPos / hole.distance) : 0
  // tee is at y=148, green is at y=14 — ball travels upward as progress increases
  const ballY = 148 - progress * 134
  // Convert a yard-from-tee distance to SVG y coordinate
  const yardToY = (d: number) => 148 - (d / hole.distance) * 134

  return (
    <div style={{ userSelect: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <svg width="100%" viewBox="0 3 100 152" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', flex: 1 }}>
        <defs>
          <linearGradient id="fairway" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a4a1a" />
            <stop offset="100%" stopColor="#2d6a2d" />
          </linearGradient>
        </defs>
        {/* Fairway */}
        <rect x={38} y={12} width={24} height={142} rx={3} fill="url(#fairway)" />
        {/* Water hazard (par 3 only) */}
        {hole.hazard && (() => {
          const y1 = yardToY(hole.hazard.end)
          const y2 = yardToY(hole.hazard.start)
          return (
            <>
              <rect x={38} y={y1} width={24} height={y2 - y1} fill="#1d4ed8" opacity={0.85} />
              <text x={50} y={(y1 + y2) / 2 + 1.5} fontSize={4} fill="rgba(255,255,255,0.7)" textAnchor="middle" fontWeight="bold">💧</text>
            </>
          )
        })()}
        {/* Tee box */}
        <rect x={42} y={148} width={16} height={5} rx={2} fill="#4ade80" opacity={0.9} />
        {/* Green */}
        <ellipse cx={50} cy={17} rx={13} ry={7} fill="#16a34a" />
        <ellipse cx={50} cy={17} rx={10} ry={5} fill="#22c55e" opacity={0.6} />
        {/* Hole */}
        <circle cx={50} cy={17} r={1.8} fill="#0a0f1e" />
        {/* Flag pole + flag */}
        <line x1={50} y1={17} x2={50} y2={5} stroke="rgba(255,255,255,0.7)" strokeWidth={0.7} />
        <polygon points="50,5 57,8 50,11" fill="#dc2626" />
        {/* Yardage markers */}
        <text x={34} y={18} fontSize={4.5} fill="rgba(255,255,255,0.3)" fontWeight="bold" textAnchor="end">0</text>
        <text x={34} y={152} fontSize={4.5} fill="rgba(255,255,255,0.3)" fontWeight="bold" textAnchor="end">{hole.distance}</text>
        {/* Ball shadow */}
        <ellipse cx={50} cy={ballY + 2} rx={3} ry={1} fill="rgba(0,0,0,0.3)" />
        {/* Ball */}
        <circle cx={50} cy={ballY} r={3.2} fill="white" />
      </svg>
      <div style={{
        textAlign: 'center', fontSize: 9, fontWeight: 700,
        color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif",
        padding: '4px 4px 8px',
      }}>
        H{hole.number} · P{hole.par}<br />{hole.distance}y · S{strokes + 1}
      </div>
    </div>
  )
}

// ── Player input row ────────────────────────────────────────────────────────────

function PlayerInputRow({ idx, value, confirmed, suggestions, onChange, onConfirm, onClear }: {
  idx: number; value: string; confirmed: boolean; suggestions: string[]
  onChange: (v: string) => void; onConfirm: (n: string) => void
  onClear: () => void
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="text"
          placeholder={idx === 0 ? 'Player 1 (required)' : `Player ${idx + 1} (optional)`}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
          style={{
            flex: 1,
            background: confirmed ? 'rgba(34,197,94,0.12)' : '#1e2d4a',
            border: `1.5px solid ${confirmed ? 'rgba(34,197,94,0.4)' : 'transparent'}`,
            borderRadius: 8, padding: '9px 12px',
            fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'inherit',
          }}
        />
        {(value || confirmed) && (
          <button onClick={onClear} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
            fontSize: 16, cursor: 'pointer', padding: '4px 6px', lineHeight: 1,
          }}>×</button>
        )}
      </div>
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#1e2d4a', borderRadius: 8, marginTop: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {suggestions.map(name => (
            <div
              key={name}
              onMouseDown={() => onConfirm(name)}
              style={{
                padding: '9px 12px', fontSize: 13, fontWeight: 700, color: 'white',
                cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shot result panel ───────────────────────────────────────────────────────────

function ShotResultPanel({ result, club, remaining, onContinue }: {
  result: ShotResult; club: ClubType; remaining: number; onContinue: () => void
}) {
  const { total, breakdown, isOOB, isHoled, isGimme, isOffGreen, penaltyReason } = result

  const headline = isOOB ? '🚫 Out of Bounds'
    : isHoled || isGimme ? '⛳ In the Hole!'
    : isOffGreen ? '😬 Off the Green'
    : `${total} yds`

  const headlineColor = isOOB ? '#ef4444' : (isHoled || isGimme) ? '#22c55e' : isOffGreen ? '#f59e0b' : 'white'

  const subtext = isOOB ? `${penaltyReason} · +1 stroke penalty`
    : isGimme ? `${remaining - total} yards remaining — auto gimme`
    : isHoled ? `${total - remaining === 0 ? 'Holed out' : `${total - remaining} yds past flag`}`
    : isOffGreen ? `Went ${total - remaining} yds past the flag`
    : `${remaining - total} yds remaining`

  const btnLabel = isOOB ? 'Retake Shot →'
    : (isHoled || isGimme) ? 'Next Hole →'
    : 'Next Shot →'

  return (
    <div style={{ background: '#1e2d4a', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: headlineColor }}>{headline}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{subtext}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {breakdown.map(b => (
          <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{b.name}</span>
            <span style={{ fontWeight: 800, color: 'white' }}>{b.value}</span>
          </div>
        ))}
        <div style={{
          display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, color: 'white',
          borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 7, marginTop: 2,
        }}>
          <span>Total</span>
          <span>{total} yds</span>
        </div>
      </div>
      <button onClick={onContinue} style={{
        background: isOOB ? '#7f1d1d' : '#dc2626',
        color: 'white', border: 'none', borderRadius: 8, padding: '11px 0',
        fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {btnLabel}
      </button>
    </div>
  )
}

// ── Setup screen ────────────────────────────────────────────────────────────────

function SetupScreen({ numHoles, setNumHoles, onStart }: {
  numHoles: number; setNumHoles: (n: any) => void; onStart: () => void
}) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0f1e',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 32, fontFamily: "'DM Sans', sans-serif", padding: 24,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⛳</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: 'white', marginTop: 10, letterSpacing: '-0.5px' }}>Football Golf</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.5 }}>
          Name PL players to hit the green.<br />Their combined stat = your shot distance.
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 300 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, textAlign: 'center' }}>
          How many holes?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([3, 6, 9, 18] as const).map(n => (
            <button key={n} onClick={() => setNumHoles(n)} style={{
              background: numHoles === n ? '#dc2626' : '#1e2d4a',
              color: 'white', border: 'none', borderRadius: 10, padding: '16px 0',
              fontSize: 20, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onStart} style={{
        background: '#dc2626', color: 'white', border: 'none', borderRadius: 12,
        padding: '14px 52px', fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Tee Off →
      </button>
    </div>
  )
}

// ── Done screen ─────────────────────────────────────────────────────────────────

function DoneScreen({ holes, scores, onRestart }: {
  holes: Hole[]; scores: number[]; onRestart: () => void
}) {
  const totalStrokes = scores.reduce((s, n) => s + n, 0)
  const totalPar = holes.reduce((s, h) => s + h.par, 0)
  const vsPar = totalStrokes - totalPar
  const vsParStr = vsPar === 0 ? 'Even' : vsPar > 0 ? `+${vsPar}` : String(vsPar)
  const vsParColor = vsPar < 0 ? '#22c55e' : vsPar > 0 ? '#ef4444' : 'white'

  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0f1e',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 24, fontFamily: "'DM Sans', sans-serif", padding: 24,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>
      <div style={{ fontSize: 48 }}>⛳</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Final Score
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, color: vsParColor, lineHeight: 1 }}>{vsParStr}</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
          {totalStrokes} strokes · Par {totalPar}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 340, background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr',
          padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {['Hole', 'Par', 'Score', '+/−'].map(h => (
            <div key={h} style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>
        {holes.map((h, i) => {
          const s = scores[i] ?? 0
          const diff = s - h.par
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr',
              padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>{h.number}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{h.par}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{s}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: diff < 0 ? '#22c55e' : diff > 0 ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
                {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onRestart} style={{
        background: '#dc2626', color: 'white', border: 'none', borderRadius: 12,
        padding: '14px 52px', fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Play Again
      </button>
    </div>
  )
}

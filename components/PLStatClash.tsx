'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import NavBar from './NavBar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Entity { pid: number; name: string }
interface Category {
  id: string; label: string; unit: string; weight: number; floor: number
  range: { min: number; max: number }
  playerMap: Record<number, { name: string; value: number }>
}
type ClubStatKey = 'goals' | 'assists' | 'games' | 'clean_sheets'
type PMEntry = { playerMap: Record<number, { name: string; value: number }>; range: { min: number; max: number } }
type ClubData = Record<string, Partial<Record<ClubStatKey, PMEntry>>>
interface RoundResult {
  category: Category; target: number
  p1: { player: Entity; value: number; score: number } | null
  p2: { player: Entity; value: number; score: number } | null
}

// ─── Closest answer helper ────────────────────────────────────────────────────

function findClosest(cat: Category, target: number): { name: string; value: number } | null {
  let best: { name: string; value: number } | null = null
  let minDiff = Infinity
  for (const d of Object.values(cat.playerMap as Record<string, { name: string; value: number }>)) {
    const diff = Math.abs(d.value - target)
    if (diff < minDiff) { minDiff = diff; best = d }
  }
  return best
}

// ─── Club stat display config ─────────────────────────────────────────────────

const CLUB_STAT: Record<ClubStatKey, { labelPrefix: string; unit: string; floor: number }> = {
  goals:        { labelPrefix: 'Goals for',        unit: 'goals',        floor: 1 },
  assists:      { labelPrefix: 'Assists for',      unit: 'assists',      floor: 1 },
  games:        { labelPrefix: 'Apps for',         unit: 'apps',         floor: 5 },
  clean_sheets: { labelPrefix: 'Clean Sheets for', unit: 'clean sheets', floor: 1 },
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calcScore(guess: number, target: number, floor: number): number {
  if (guess === 0 && target > 0) return 30
  if (guess === target) return 0
  const diff = Math.abs(guess - target)
  const divisor = Math.max(floor, target * 0.05)
  return Math.min(20, Math.ceil(diff / divisor))
}

function scoreLabel(score: number): { text: string; color: string } {
  if (score === 0)  return { text: 'Perfect!',    color: '#22c55e' }
  if (score <= 3)   return { text: 'Very close!', color: '#86efac' }
  if (score <= 6)   return { text: 'Close',        color: '#fbbf24' }
  if (score <= 10)  return { text: 'Not bad',      color: '#dc2626' }
  if (score <= 20)  return { text: 'Far off',      color: '#ef4444' }
  return { text: 'No stat!', color: '#7f1d1d' }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page:  { minHeight: '100vh', background: '#0a0f1e', fontFamily: "'DM Sans', -apple-system, sans-serif", paddingBottom: 60 } as React.CSSProperties,
  card:  { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '16px 20px' } as React.CSSProperties,
  btn:   (color = '#dc2626'): React.CSSProperties => ({ background: color, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }),
  ghost: { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#8899bb', cursor: 'pointer' } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' } as React.CSSProperties,
  input: { background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', fontSize: 15, color: 'white', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
}

// ─── PlayerSearch ─────────────────────────────────────────────────────────────

function PlayerSearch({
  allPlayers, onLock, lockedPlayer, excludePid, autoFocus, label,
}: {
  allPlayers: Entity[]; onLock: (p: Entity) => void
  lockedPlayer: Entity | null; excludePid?: number
  autoFocus?: boolean; label: string
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && !lockedPlayer) inputRef.current?.focus()
  }, [autoFocus, lockedPlayer])

  const results = search.length > 1
    ? allPlayers.filter(p => p.pid !== excludePid && p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : []

  function pick(p: Entity) { setSearch(''); setOpen(false); onLock(p) }

  if (lockedPlayer) return (
    <div style={{ ...s.card, textAlign: 'center', padding: '12px 20px' }}>
      <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginBottom: 3 }}>✓ Locked in</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{lockedPlayer.name}</div>
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8899bb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <input ref={inputRef} value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search player..."
        style={s.input}
      />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, marginTop: 4, zIndex: 50, overflow: 'hidden' }}>
          {results.map(p => (
            <div key={p.pid} onMouseDown={() => pick(p)}
              style={{ padding: '10px 14px', fontSize: 14, color: 'white', cursor: 'pointer', borderBottom: '1px solid #1e2d4a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Round generation ─────────────────────────────────────────────────────────

function buildRounds(
  n: number,
  careerCats: Category[],
  clubData: ClubData
): RoundResult[] {
  const clubNames = Object.keys(clubData)
  const hasClubs = clubNames.length > 0

  // Build weighted career pool
  const careerPool: Category[] = []
  for (const cat of careerCats) {
    const times = Math.max(1, Math.round(cat.weight * 4))
    for (let i = 0; i < times; i++) careerPool.push(cat)
  }

  return Array.from({ length: n }, () => {
    // 50% career, 50% club-specific when club data is available
    if (hasClubs && Math.random() < 0.5) {
      const club = clubNames[Math.floor(Math.random() * clubNames.length)]
      const statKeys = (Object.keys(clubData[club]) as ClubStatKey[])
      const statKey = statKeys[Math.floor(Math.random() * statKeys.length)]
      const pm = clubData[club][statKey]!
      const cfg = CLUB_STAT[statKey]
      const cat: Category = {
        id: `${statKey}_${club}`,
        label: `${cfg.labelPrefix} ${club}`,
        unit: cfg.unit,
        weight: 1,
        floor: cfg.floor,
        range: pm.range,
        playerMap: pm.playerMap,
      }
      const target = Math.round(cat.range.min + Math.random() * (cat.range.max - cat.range.min))
      return { category: cat, target, p1: null, p2: null }
    }

    // Career round
    if (!careerPool.length) {
      // Fallback: shouldn't happen but guard anyway
      return { category: careerCats[0], target: 10, p1: null, p2: null }
    }
    const cat = careerPool[Math.floor(Math.random() * careerPool.length)]
    const target = Math.round(cat.range.min + Math.random() * (cat.range.max - cat.range.min))
    return { category: cat, target, p1: null, p2: null }
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const LS_USERNAME = 'topbins_statclash_username'

type LbEntry = { display_name: string; username: string; score: number; created_at: string }

function LeaderboardPanel({ leaderboard, currentDisplayName }: { leaderboard: LbEntry[]; currentDisplayName: string }) {
  if (!leaderboard.length) return null
  const top10 = leaderboard.slice(0, 10)
  const userIdx = leaderboard.findIndex(r => r.display_name === currentDisplayName)
  const userInTop10 = userIdx >= 0 && userIdx < 10
  return (
    <div style={s.card}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12 }}>🏆 Leaderboard</div>
      {top10.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4a' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: i === 0 ? '#f59e0b' : '#4a5568', width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
            <span style={{ fontSize: 13, color: row.display_name === currentDisplayName ? '#dc2626' : 'white', fontWeight: row.display_name === currentDisplayName ? 700 : 400 }}>{row.display_name}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: row.display_name === currentDisplayName ? '#dc2626' : '#8899bb' }}>{row.score}</span>
        </div>
      ))}
      {!userInTop10 && userIdx >= 0 && (() => {
        const row = leaderboard[userIdx]
        return (
          <>
            <div style={{ padding: '4px 0', color: '#2a3d5e', fontSize: 11 }}>···</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', background: 'rgba(220,38,38,0.06)', borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#dc2626', width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{row.display_name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{row.score}</span>
            </div>
          </>
        )
      })()}
    </div>
  )
}

const STAT_MAX: Record<string, number> = {
  'Goals':        260,
  'Assists':      162,
  'Appearances':  672,
  'Clean Sheets': 195,
  'Yellow Cards': 88,
}
const STAT_LABELS = Object.keys(STAT_MAX)

function LoadingAnimation() {
  const [label, setLabel] = useState(STAT_LABELS[0])
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    async function cycle() {
      let idx = 0
      while (!cancelled) {
        const lbl = STAT_LABELS[idx % STAT_LABELS.length]
        const max = STAT_MAX[lbl]
        setLabel(lbl)
        setCount(0)
        const final = 1 + Math.floor(Math.random() * max)
        for (let step = 0; step < 20; step++) {
          if (cancelled) return
          setCount(Math.floor(Math.random() * max))
          await delay(55)
        }
        setCount(final)
        await delay(750)
        idx++
      }
    }
    cycle()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', minWidth: 160 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </div>
      <div style={{ fontSize: 64, fontWeight: 800, color: '#dc2626', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </div>
      <p style={{ color: '#4a5568', fontSize: 12, margin: 0 }}>Loading Stat Clash</p>
    </div>
  )
}

export default function PLStatClash() {
  const [loading, setLoading]       = useState(true)
  const [fetching, setFetching]     = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [clubData, setClubData]     = useState<ClubData>({})
  const [allPlayers, setAllPlayers] = useState<Entity[]>([])
  const [clubs, setClubs]           = useState<string[]>([])
  const [selectedClub, setSelectedClub] = useState('')

  const [username, setUsername]         = useState('')
  const [usernameSet, setUsernameSet]   = useState(false)
  const [leaderboard, setLeaderboard]   = useState<LbEntry[]>([])
  const [submitted, setSubmitted]       = useState(false)

  const [mode, setMode]             = useState<'solo' | 'vs'>('solo')
  const [numRounds, setNumRounds]   = useState(10)
  const [p1Name, setP1Name]         = useState('')
  const [p2Name, setP2Name]         = useState('')

  const [started, setStarted]               = useState(false)
  const [rounds, setRounds]                 = useState<RoundResult[]>([])
  const [currentRound, setCurrentRound]     = useState(0)
  const [roundRevealed, setRoundRevealed]   = useState(false)
  const [gameOver, setGameOver]             = useState(false)
  const [lockedIn, setLockedIn]             = useState<{ p1?: Entity; p2?: Entity }>({})

  // Load saved username
  useEffect(() => {
    const saved = localStorage.getItem(LS_USERNAME)
    if (saved) { setUsername(saved); setUsernameSet(true) }
  }, [])

  const fetchData = useCallback(async (club?: string, rounds = 10) => {
    setFetching(true)
    setClubData({})
    setCategories([])
    const params = new URLSearchParams()
    if (club) params.set('club', club)
    params.set('rounds', String(rounds))
    const data = await fetch(`/api/stat-clash?${params}`).then(r => r.json())
    setCategories(data.categories ?? [])
    setClubData(data.clubData ?? {})
    setAllPlayers(data.allPlayers ?? [])
    setLeaderboard(data.leaderboard ?? [])
    if (!club && (data.clubs ?? []).length) setClubs(data.clubs)
    setFetching(false)
  }, [])

  useEffect(() => { fetchData(undefined, 10).finally(() => setLoading(false)) }, [fetchData])

  // Lightweight leaderboard refresh when rounds slider changes (lobby only)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (started) return
    fetch(`/api/stat-clash?leaderboard_only=true&rounds=${numRounds}`)
      .then(r => r.json())
      .then(d => setLeaderboard(d.leaderboard ?? []))
  }, [numRounds, started])

  async function submitScore(finalScore: number) {
    if (submitted) return
    setSubmitted(true)
    await fetch('/api/stat-clash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, score: finalScore, num_rounds: numRounds, selected_club: selectedClub }),
    })
    const data = await fetch(`/api/stat-clash?leaderboard_only=true&rounds=${numRounds}`).then(r => r.json())
    setLeaderboard(data.leaderboard ?? [])
  }

  function handleSetUsername() {
    const trimmed = username.trim()
    if (!trimmed) return
    setUsername(trimmed)
    localStorage.setItem(LS_USERNAME, trimmed)
    setUsernameSet(true)
  }

  function startGame(cats = categories, cd = clubData) {
    if (!cats.length && !Object.keys(cd).length) return
    setRounds(buildRounds(numRounds, cats, cd))
    setCurrentRound(0)
    setRoundRevealed(false)
    setGameOver(false)
    setLockedIn({})
    setSubmitted(false)
    setStarted(true)
  }

  function getVal(player: Entity, cat: Category): number {
    return (cat.playerMap as any)[player.pid]?.value || 0
  }

  function lockIn(player: Entity, which: 1 | 2) {
    const round = rounds[currentRound]
    const val   = getVal(player, round.category)
    const score = calcScore(val, round.target, round.category.floor)

    if (mode === 'solo') {
      setRounds(prev => prev.map((r, i) => i === currentRound ? { ...r, p1: { player, value: val, score } } : r))
      setRoundRevealed(true)
      return
    }
    if (which === 1) {
      setLockedIn({ p1: player })
    } else {
      setLockedIn(prev => {
        const p1 = prev.p1!
        const p1Val   = getVal(p1, round.category)
        const p1Score = calcScore(p1Val, round.target, round.category.floor)
        setRounds(rs => rs.map((r, i) => i === currentRound
          ? { ...r, p1: { player: p1, value: p1Val, score: p1Score }, p2: { player, value: val, score } }
          : r
        ))
        setRoundRevealed(true)
        return {}
      })
    }
  }

  function nextRound() {
    if (currentRound + 1 >= rounds.length) {
      setGameOver(true)
      if (mode === 'solo' && username) {
        const finalScore = rounds.reduce((sum, r) => sum + (r.p1?.score ?? 0), 0)
        submitScore(finalScore)
      }
    } else {
      setCurrentRound(i => i + 1); setRoundRevealed(false); setLockedIn({})
    }
  }

  const totalScore = (w: 1 | 2) =>
    rounds.reduce((sum, r) => sum + ((w === 1 ? r.p1 : r.p2)?.score ?? 0), 0)

  const p1Label = mode === 'vs' ? (p1Name || 'Player 1') : 'You'
  const p2Label = p2Name || 'Player 2'

  const currentDisplayName = selectedClub ? `${username} (${selectedClub})` : username

  // ── Username entry ────────────────────────────────────────────────────────────
  if (!loading && !usernameSet) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
        <div style={{ ...s.card, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12 }}>Choose a username</div>
          <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSetUsername()} placeholder="Your name..." style={s.input} autoFocus />
          <p style={{ fontSize: 11, color: '#4a5568', margin: '8px 0 0' }}>Saved for the leaderboard</p>
        </div>
        <button onClick={handleSetUsername} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: '14px' }}>Continue</button>
      </div>
    </div>
  )

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <LoadingAnimation />
      </div>
    </div>
  )

  // ── Game over ────────────────────────────────────────────────────────────────
  if (gameOver) {
    const s1 = totalScore(1)
    const s2 = mode === 'vs' ? totalScore(2) : null
    const winner = s2 !== null ? (s1 < s2 ? p1Label : s2 < s1 ? p2Label : 'Tie') : null

    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 520, margin: '20px auto', padding: '0 20px' }}>
          <button onClick={() => { setStarted(false); setGameOver(false) }} style={{ ...s.btn(), width: '100%', marginBottom: 16 }}>
            Play Again
          </button>
          <div style={{ ...s.card, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
            <h2 style={{ color: 'white', margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>
              {winner ? (winner === 'Tie' ? "It's a Tie!" : `${winner} Wins!`) : 'Game Over!'}
            </h2>
            {mode === 'solo' ? (
              <p style={{ color: '#8899bb', margin: 0 }}>Total: <strong style={{ color: '#dc2626' }}>{s1} pts</strong></p>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 8 }}>
                {[{ n: p1Label, t: s1, o: s2! }, { n: p2Label, t: s2!, o: s1 }].map((p, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#8899bb' }}>{p.n}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: p.t <= p.o ? '#22c55e' : '#ef4444' }}>{p.t}</div>
                    <div style={{ fontSize: 11, color: '#4a5568' }}>pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mode === 'vs' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { name: p1Label, picks: rounds.map(r => ({ r, pick: r.p1, sl: r.p1 ? scoreLabel(r.p1.score) : null })) },
                { name: p2Label, picks: rounds.map(r => ({ r, pick: r.p2, sl: r.p2 ? scoreLabel(r.p2.score) : null })) },
              ].map((col, ci) => (
                <div key={ci}>
                  <div style={{ fontSize: 11, color: '#8899bb', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' as const }}>{col.name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {col.picks.map(({ r, pick, sl }, i) => (
                      <div key={i} style={{ ...s.card, padding: '10px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', height: 90, minWidth: 0, overflow: 'hidden', borderColor: (sl?.color || '#1e2d4a') + '55' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, color: '#4a5568', fontWeight: 600 }}>R{i + 1}</span>
                          <span style={{ fontSize: 20, fontWeight: 800, color: sl?.color, lineHeight: 1 }}>{pick?.score}<span style={{ fontSize: 9, fontWeight: 400 }}>pts</span></span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{pick?.player?.name}</div>
                        <div style={{ fontSize: 10, color: '#4a5568', lineHeight: 1.4, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                          {r.category.label} · {pick?.value} / {r.target}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {rounds.map((r, i) => {
                const a = r.p1 ? scoreLabel(r.p1.score) : null
                return (
                  <div key={i} style={{ ...s.card, padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 90, minWidth: 0, overflow: 'hidden', borderColor: (a?.color || '#1e2d4a') + '55' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10, color: '#4a5568', fontWeight: 600 }}>R{i + 1}</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: a?.color, lineHeight: 1 }}>{r.p1?.score}<span style={{ fontSize: 9, fontWeight: 400 }}>pts</span></span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{r.p1?.player?.name}</div>
                    <div style={{ fontSize: 10, color: '#4a5568', lineHeight: 1.4, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                      {r.category.label} · {r.p1?.value} / {r.target}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: '#4a5568', textAlign: 'center', marginBottom: 12 }}>
              {numRounds}-round leaderboard
            </div>
            <LeaderboardPanel leaderboard={leaderboard} currentDisplayName={currentDisplayName} />
          </div>
        </div>
      </div>
    )
  }

  // ── Lobby ────────────────────────────────────────────────────────────────────
  if (!started) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>TopBins</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Stat Clash</h1>
          <p style={{ fontSize: 13, color: '#8899bb', margin: 0 }}>
            {selectedClub
              ? `All stats are for ${selectedClub} only. Pick the player closest to each target.`
              : 'A mix of career and club-specific targets. Pick the player closest to each stat.'}
          </p>
        </div>

        <button onClick={() => startGame()} disabled={fetching} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: 14, opacity: fetching ? 0.5 : 1, marginBottom: 16 }}>
          {fetching ? 'Loading...' : selectedClub ? `Start — ${selectedClub} only` : 'Start Game'}
        </button>

        <div style={{ fontSize: 11, color: '#4a5568', textAlign: 'center', marginBottom: 12 }}>
          {numRounds}-round leaderboard
        </div>
        <LeaderboardPanel leaderboard={leaderboard} currentDisplayName={currentDisplayName} />

        <div style={{ ...s.card, marginBottom: 16, marginTop: 16 }}>
          <div style={{ ...s.label, marginBottom: 12 }}>Mode</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['solo', 'vs'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ ...s.btn(mode === m ? '#dc2626' : '#1e2d4a'), flex: 1, fontSize: 13 }}>
                {m === 'solo' ? '🏆 Solo' : '⚔️ vs Friend'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'vs' && (
          <div style={{ ...s.card, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...s.label, marginBottom: 4 }}>Player Names</div>
            <input value={p1Name} onChange={e => setP1Name(e.target.value)} placeholder="Player 1 name" style={s.input} />
            <input value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder="Player 2 name" style={s.input} />
          </div>
        )}

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.label, marginBottom: 10 }}>Rounds</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[5, 10, 20, 30].map(n => (
              <button key={n} onClick={() => setNumRounds(n)} style={{ ...s.btn(numRounds === n ? '#dc2626' : '#1e2d4a'), flex: 1, fontSize: 14, padding: '10px 0' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {clubs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...s.label, marginBottom: 8 }}>Filter by Club</div>
            <select
              value={selectedClub}
              onChange={async e => {
                const c = e.target.value
                setSelectedClub(c)
                await fetchData(c || undefined)
              }}
              style={{ ...s.input, cursor: 'pointer' }}
            >
              <option value="">All Clubs (mixed career + club stats)</option>
              {clubs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div style={{ ...s.card, marginBottom: 20 }}>
          <div style={{ ...s.label, marginBottom: 10 }}>Scoring</div>
          {[
            { pts: '0',    text: 'Perfect match',            color: '#22c55e' },
            { pts: '1–3',  text: 'Very close',               color: '#86efac' },
            { pts: '4–6',  text: 'Close',                    color: '#fbbf24' },
            { pts: '7–10', text: 'Not bad',                  color: '#dc2626' },
            { pts: '11–20',text: 'Far off',                  color: '#ef4444' },
            { pts: '30',   text: 'No stat in that category', color: '#7f1d1d' },
          ].map(row => (
            <div key={row.pts} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8899bb', marginBottom: 4 }}>
              <span>{row.text}</span>
              <span style={{ color: row.color, fontWeight: 700 }}>{row.pts} pts</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )

  // ── Game loop ─────────────────────────────────────────────────────────────────
  const round = rounds[currentRound]

  return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 480, margin: '32px auto', padding: '0 20px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Round {currentRound + 1} / {rounds.length}
            </div>
            {selectedClub && <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>⚽ {selectedClub} only</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {mode === 'vs' ? (
              <div style={{ display: 'flex', gap: 16 }}>
                {([1, 2] as const).map(w => (
                  <div key={w} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#8899bb' }}>{w === 1 ? p1Label : p2Label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{totalScore(w)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{totalScore(1)} pts</div>
            )}
            <button onClick={() => { setStarted(false); setGameOver(false) }} style={s.ghost}>Restart</button>
          </div>
        </div>

        <div style={{ ...s.card, textAlign: 'center', padding: '28px 20px', marginBottom: 20 }}>
          <div style={{ ...s.label, marginBottom: 10 }}>{round.category.label}</div>
          <div style={{ fontSize: 64, fontWeight: 800, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>{round.target}</div>
          <div style={{ fontSize: 14, color: '#8899bb', marginTop: 8 }}>{round.category.unit}</div>
        </div>

        {mode === 'vs' && !roundRevealed && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#8899bb', marginBottom: 14 }}>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>{lockedIn.p1 ? p2Label : p1Label}</span>'s turn
          </div>
        )}

        {!roundRevealed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {mode === 'solo' ? (
              <PlayerSearch allPlayers={allPlayers} onLock={p => lockIn(p, 1)} lockedPlayer={null} autoFocus label="Search player" />
            ) : (
              <>
                <PlayerSearch allPlayers={allPlayers} onLock={p => lockIn(p, 1)} lockedPlayer={lockedIn.p1 ?? null} excludePid={lockedIn.p2?.pid} autoFocus={!lockedIn.p1} label={p1Label} />
                {lockedIn.p1 && (
                  <PlayerSearch allPlayers={allPlayers} onLock={p => lockIn(p, 2)} lockedPlayer={lockedIn.p2 ?? null} excludePid={lockedIn.p1?.pid} autoFocus label={p2Label} />
                )}
              </>
            )}
          </div>
        )}

        {roundRevealed && (() => {
          const closest = findClosest(round.category, round.target)
          const p1Pick = rounds[currentRound].p1
          const p2Pick = rounds[currentRound].p2
          const pickedNames = [p1Pick?.player.name, p2Pick?.player.name].filter(Boolean)
          const userFoundClosest = closest && pickedNames.includes(closest.name)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {([p1Pick, p2Pick] as const).map((entry, j) => {
                if (!entry) return null
                const sl = scoreLabel(entry.score)
                return (
                  <div key={j} style={{ ...s.card, background: 'rgba(220,38,38,0.06)' }}>
                    {mode === 'vs' && <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 4 }}>{j === 0 ? p1Label : p2Label}</div>}
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6 }}>{entry.player.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, color: '#8899bb' }}>{entry.value} {round.category.unit} (target: {round.target})</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: sl.color }}>{entry.score} pts — {sl.text}</div>
                    </div>
                  </div>
                )
              })}
              {closest && (
                <div style={{ ...s.card, border: userFoundClosest ? '1px solid #22c55e' : '1px solid #1e2d4a', background: userFoundClosest ? 'rgba(34,197,94,0.08)' : '#111827' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: userFoundClosest ? '#22c55e' : '#8899bb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                    {userFoundClosest ? '✓ Perfect answer!' : 'Closest answer'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{closest.name}</div>
                    <div style={{ fontSize: 13, color: '#8899bb' }}>{closest.value} {round.category.unit}</div>
                  </div>
                </div>
              )}
              <button onClick={nextRound} style={{ ...s.btn(), width: '100%' }}>
                {currentRound + 1 >= rounds.length ? 'See Results' : 'Next Round →'}
              </button>
            </div>
          )
        })()}

        {currentRound > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ ...s.label, marginBottom: 10 }}>Previous Rounds</div>
            {mode === 'vs' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[...rounds.slice(0, currentRound)].reverse().map((r, i) => {
                  const sl1 = r.p1 ? scoreLabel(r.p1.score) : null
                  return (
                    <div key={i} style={{ ...s.card, padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 90, minWidth: 0, overflow: 'hidden', opacity: 0.75, borderColor: (sl1?.color || '#1e2d4a') + '55' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 10, color: '#4a5568', fontWeight: 600 }}>R{currentRound - i}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {([r.p1, r.p2] as const).map((e, j) => e ? <span key={j} style={{ fontSize: 12, fontWeight: 800, color: scoreLabel(e.score).color }}>{e.score}</span> : null)}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'white', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{r.category.label}</div>
                      <div style={{ fontSize: 10, color: '#4a5568' }}>Target: {r.target}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[...rounds.slice(0, currentRound)].reverse().map((r, i) => {
                  const a = r.p1 ? scoreLabel(r.p1.score) : null
                  return (
                    <div key={i} style={{ ...s.card, padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 90, minWidth: 0, overflow: 'hidden', opacity: 0.75, borderColor: (a?.color || '#1e2d4a') + '55' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 10, color: '#4a5568', fontWeight: 600 }}>R{currentRound - i}</span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: a?.color, lineHeight: 1 }}>{r.p1?.score}<span style={{ fontSize: 9, fontWeight: 400 }}>pts</span></span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'white', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{r.p1?.player?.name}</div>
                      <div style={{ fontSize: 10, color: '#4a5568' }}>{r.p1?.value} / {r.target}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

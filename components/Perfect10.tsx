'use client'
import React, { useState, useEffect, useRef } from 'react'
import NavBar from '@/components/NavBar'
import { PLAYERS, CATEGORIES, CATEGORY_KEYS, type P10Player, type CategoryKey } from '@/lib/perfect10-players'
import { supabase } from '@/lib/supabase'

// ── Geometry ─────────────────────────────────────────────────────────────────

const SVG_SIZE = 280
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const R_POLY  = 102
const R_LABEL = 122  // label anchor distance from centre

function toRad(deg: number) { return (deg * Math.PI) / 180 }

// Corner i: angle = -90 + i*36
function vertexXY(i: number, r: number) {
  const a = toRad(-90 + i * 36)
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

// Side i midpoint direction: halfway between vertex i and vertex i+1
function sideXY(i: number, r: number) {
  const a = toRad(-90 + (i + 0.5) * 36)
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

const VERTICES = Array.from({ length: 10 }, (_, i) => vertexXY(i, R_POLY))
const BG_POLY  = VERTICES.map(v => `${v.x},${v.y}`).join(' ')

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(val: number) {
  if (val >= 95) return '#22c55e'   // green
  if (val >= 90) return '#16a34a'   // dark green
  if (val >= 85) return '#eab308'   // yellow
  if (val >= 80) return '#ca8a04'   // dark yellow
  if (val >= 75) return '#f97316'   // orange
  if (val >= 70) return '#ea580c'   // dark orange
  if (val >= 65) return '#ef4444'   // red
  return '#b91c1c'                  // dark red
}

function scoreColorRGB(val: number) {
  if (val >= 95) return '34,197,94'
  if (val >= 90) return '22,163,74'
  if (val >= 85) return '234,179,8'
  if (val >= 80) return '202,138,4'
  if (val >= 75) return '249,115,22'
  if (val >= 70) return '234,88,12'
  if (val >= 65) return '239,68,68'
  return '185,28,28'
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'lobby' | 'playing' | 'reveal' | 'done'
type LeaderboardRow = { id: string; display_name: string; score: number }

// ── Root component ────────────────────────────────────────────────────────────

export default function Perfect10() {
  const [phase, setPhase]               = useState<Phase>('lobby')
  const [playerName, setPlayerName]     = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('perfect10_name') ?? '') : ''
  )
  const [leaderboard, setLeaderboard]   = useState<LeaderboardRow[]>([])
  const [userBest, setUserBest]         = useState<{ rank: number; row: LeaderboardRow } | null>(null)
  const [loadingLb, setLoadingLb]       = useState(false)

  // Game state
  const [round, setRound]               = useState(0)
  const [spinning, setSpinning]         = useState(false)
  const [spinText, setSpinText]         = useState('???')
  const [currentPlayer, setCurrentPlayer] = useState<P10Player | null>(null)
  const [assignments, setAssignments]   = useState<(P10Player | null)[]>(Array(10).fill(null))
  const [usedIds, setUsedIds]           = useState<Set<string>>(new Set())
  const [revealStep, setRevealStep]     = useState(-1)
  const [submitted, setSubmitted]       = useState(false)
  const [submitting, setSubmitting]     = useState(false)

  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSpinPending = useRef(false)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  useEffect(() => {
    if (phase === 'lobby' || phase === 'done') fetchLeaderboard()
  }, [phase])

  async function fetchLeaderboard(name?: string) {
    setLoadingLb(true)
    const { data } = await supabase
      .from('perfect10_scores')
      .select('id, display_name, score')
      .order('score', { ascending: false })
      .limit(1000)
    if (data) {
      const seen = new Set<string>()
      const deduped = (data as LeaderboardRow[]).filter(row => {
        if (seen.has(row.display_name)) return false
        seen.add(row.display_name)
        return true
      })
      setLeaderboard(deduped.slice(0, 20))

      const lookup = (name ?? playerName).trim().toLowerCase()
      if (lookup) {
        const idx = deduped.findIndex(r => r.display_name.toLowerCase() === lookup)
        if (idx >= 20) setUserBest({ rank: idx + 1, row: deduped[idx] })
        else setUserBest(null)
      }
    }
    setLoadingLb(false)
  }

  function startGame() {
    setRound(0)
    setSpinning(false)
    setSpinText('???')
    setCurrentPlayer(null)
    setAssignments(Array(10).fill(null))
    setUsedIds(new Set())
    setRevealStep(-1)
    setSubmitted(false)
    setPhase('playing')
  }

  function doSpin(excludeIds: Set<string>) {
    const available = PLAYERS.filter(p => !excludeIds.has(p.id))
    const target    = available[Math.floor(Math.random() * available.length)]
    setSpinning(true)

    // 14 fast ticks × 30ms + 3 slow × 110ms ≈ 750ms total
    let step = 0
    const FAST = 14, SLOW = 3

    function tick() {
      const pool = PLAYERS.filter(p => !excludeIds.has(p.id))
      setSpinText(pool[Math.floor(Math.random() * pool.length)].name)
      step++
      if (step < FAST) {
        timerRef.current = setTimeout(tick, 30)
      } else if (step < FAST + SLOW) {
        timerRef.current = setTimeout(tick, 110)
      } else {
        setSpinText(target.name)
        setCurrentPlayer(target)
        setSpinning(false)
      }
    }
    tick()
  }

  function spinSlot() {
    if (spinning || currentPlayer) return
    doSpin(usedIds)
  }

  function assign(catIndex: number) {
    if (!currentPlayer || assignments[catIndex] !== null) return
    const next       = [...assignments]
    next[catIndex]   = currentPlayer
    const nextUsed   = new Set([...usedIds, currentPlayer.id])
    setAssignments(next)
    setUsedIds(nextUsed)
    setCurrentPlayer(null)
    setSpinText('???')

    const nextRound = round + 1
    if (nextRound >= 10) {
      setPhase('reveal')
      setRevealStep(-1)
      timerRef.current = setTimeout(() => animateReveal(0), 400)
    } else {
      setRound(nextRound)
      // Auto-spin — flag suppresses Spin button during the gap
      autoSpinPending.current = true
      timerRef.current = setTimeout(() => { autoSpinPending.current = false; doSpin(nextUsed) }, 350)
    }
  }

  function animateReveal(step: number) {
    if (step >= 10) { setPhase('done'); return }
    setRevealStep(step)
    timerRef.current = setTimeout(() => animateReveal(step + 1), 300)
  }

  const totalScore = assignments.reduce((sum, p, i) => {
    if (!p) return sum
    return sum + p[CATEGORY_KEYS[i]]
  }, 0)

  async function submitScore() {
    if (submitted || submitting || !playerName.trim()) return
    setSubmitting(true)
    await supabase.from('perfect10_scores').insert({
      display_name: playerName.trim(),
      score: totalScore,
      assignments: assignments.map((p, i) => ({
        category: CATEGORY_KEYS[i],
        player: p?.name ?? null,
        score: p ? p[CATEGORY_KEYS[i]] : 0,
      })),
    })
    const name = playerName.trim()
    localStorage.setItem('perfect10_name', name)
    setSubmitted(true)
    setSubmitting(false)
    fetchLeaderboard(name)
  }

  // ── Route to screens ──────────────────────────────────────────────────────

  if (phase === 'lobby') return (
    <><NavBar />
      <LobbyScreen leaderboard={leaderboard} userBest={userBest} loading={loadingLb} onPlay={startGame} />
    </>
  )

  return (
    <><NavBar />
      <GameScreen
        round={round} spinning={spinning} spinText={spinText}
        currentPlayer={currentPlayer} assignments={assignments}
        onSpin={spinSlot} onAssign={assign}
        suppressSpinButton={autoSpinPending.current}
        revealStep={revealStep}
        totalScore={totalScore}
        done={phase === 'done'}
        revealing={phase === 'reveal'}
        playerName={playerName} onNameChange={setPlayerName}
        submitted={submitted} submitting={submitting}
        onSubmit={submitScore} leaderboard={leaderboard} userBest={userBest}
        loadingLb={loadingLb} onPlayAgain={startGame}
      />
    </>
  )
}

// ── Shared leaderboard list ───────────────────────────────────────────────────

function LeaderboardList({ leaderboard, userBest, loading }: {
  leaderboard: LeaderboardRow[]
  userBest?: { rank: number; row: LeaderboardRow } | null
  loading: boolean
}) {
  const rankColor = (i: number) => i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : '#4a5568'
  const rowStyle = (highlight: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', padding: '8px 11px',
    background: highlight ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${highlight ? 'rgba(220,38,38,0.25)' : '#1e2d4a'}`,
    borderRadius: 8, marginBottom: 5,
  })

  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Top Scores</div>
      {loading ? (
        <div style={{ fontSize: 13, color: '#4a5568', textAlign: 'center', padding: '14px 0' }}>Loading…</div>
      ) : leaderboard.length === 0 ? (
        <div style={{ fontSize: 13, color: '#4a5568', textAlign: 'center', padding: '14px 0' }}>No scores yet — be the first!</div>
      ) : (
        <>
          {leaderboard.map((row, i) => (
            <div key={row.id} style={rowStyle(i === 0)}>
              <div style={{ width: 32, fontSize: 11, fontWeight: 800, color: rankColor(i), flexShrink: 0 }}>#{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'white' }}>{row.display_name}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: i === 0 ? '#dc2626' : 'white' }}>{row.score}</div>
            </div>
          ))}
          {userBest && (
            <>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#2a3d5e', margin: '6px 0 5px', letterSpacing: '0.05em' }}>· · ·</div>
              <div style={rowStyle(false)}>
                <div style={{ width: 32, fontSize: 11, fontWeight: 800, color: '#4a5568', flexShrink: 0 }}>#{userBest.rank}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{userBest.row.display_name}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.6)' }}>{userBest.row.score}</div>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

// ── Lobby ─────────────────────────────────────────────────────────────────────

function LobbyScreen({ leaderboard, userBest, loading, onPlay }: {
  leaderboard: LeaderboardRow[]
  userBest: { rank: number; row: LeaderboardRow } | null
  loading: boolean
  onPlay: () => void
}) {
  return (
    <div style={{ minHeight: 'calc(100dvh - 56px)', background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 40px', gap: 20, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');*{box-sizing:border-box;}`}</style>

      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1 }}>
          Perfect <span style={{ color: '#dc2626' }}>10</span>
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 10, maxWidth: 300, lineHeight: 1.6 }}>
          Spin the slot machine. Assign each player to a category.<br />Max score: <strong style={{ color: 'white' }}>1000</strong>. Chase perfection.
        </div>
      </div>

      <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '14px 18px', maxWidth: 360, width: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>How to play</div>
        {[
          ['🎰', 'Hit Spin: a random player is revealed'],
          ['📍', 'Tap a category on the polygon to assign them'],
          ['🔁', 'Repeat for all 10 players'],
          ['🏆', 'Scores revealed at the end and your position in the global leaderboard'],
        ].map(([icon, text], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 3 ? 9 : 0 }}>
            <div style={{ fontSize: 15, lineHeight: 1.5, flexShrink: 0 }}>{icon}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{text}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onPlay}
        style={{ background: '#dc2626', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 900, color: 'white', cursor: 'pointer', width: '100%', maxWidth: 360 }}
      >
        Play →
      </button>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <LeaderboardList leaderboard={leaderboard} userBest={userBest} loading={loading} />
      </div>
    </div>
  )
}

// ── Game screen ───────────────────────────────────────────────────────────────

function GameScreen({ round, spinning, spinText, currentPlayer, assignments, onSpin, onAssign, suppressSpinButton, revealStep = -1, totalScore = 0, done = false, revealing = false, playerName = '', onNameChange, submitted = false, submitting = false, onSubmit, leaderboard = [], userBest = null, loadingLb = false, onPlayAgain }: {
  round: number
  spinning: boolean
  spinText: string
  currentPlayer: P10Player | null
  assignments: (P10Player | null)[]
  onSpin: () => void
  onAssign: (i: number) => void
  suppressSpinButton: boolean
  revealStep?: number
  totalScore?: number
  done?: boolean
  revealing?: boolean
  playerName?: string
  onNameChange?: (v: string) => void
  submitted?: boolean
  submitting?: boolean
  onSubmit?: () => void
  leaderboard?: LeaderboardRow[]
  userBest?: { rank: number; row: LeaderboardRow } | null
  loadingLb?: boolean
  onPlayAgain?: () => void
}) {
  const filled = assignments.filter(Boolean).length
  const inGame = !done && !revealing
  const [copied, setCopied] = useState(false)

  function buildShareText() {
    const scoreEmoji = totalScore >= 950 ? '🔥' : totalScore >= 900 ? '👍' : totalScore >= 850 ? '😐' : totalScore >= 800 ? '😬' : '💩'
    const entries = CATEGORIES.map((cat, i) => {
      const val = assignments[i]?.[cat.key] ?? 0
      const block = val >= 95 ? '🟩' : val >= 85 ? '🟨' : val >= 75 ? '🟧' : '🟥'
      return `${block} ${cat.short} ${val}`
    })
    // Emoji are 2 JS chars but 1 visual char wide — subtract 1 per entry to get visual length
    const visualLen = (s: string) => [...s].length - (s.match(/\p{Emoji}/gu)?.length ?? 0)
    const maxLeft = Math.max(...Array.from({ length: 5 }, (_, i) => visualLen(entries[i * 2])))
    const lines = Array.from({ length: 5 }, (_, i) => {
      const left = entries[i * 2]
      const pad = ' '.repeat(maxLeft - visualLen(left) + 2)
      return `${left}${pad}${entries[i * 2 + 1]}`
    }).join('\n')
    return `Perfect 10 ${scoreEmoji} ${totalScore}/1000\n\n${lines}\n\ntopbinsfooty.com/perfect10\n\n#Football #Perfect10 #WorldCup2026`
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ minHeight: 'calc(100dvh - 56px)', background: '#0a0f1e', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');*{box-sizing:border-box;}`}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Progress bar — hidden during reveal/done but kept in layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, opacity: inGame ? 1 : 0, transition: 'opacity 0.3s' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Player {filled + 1} / 10</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{ width: 16, height: 3, borderRadius: 2, background: i < filled ? '#dc2626' : '#1e2d4a' }} />
            ))}
          </div>
          <div style={{ flex: 1 }} />
          {inGame && (
            <button
              onClick={onPlayAgain}
              style={{ background: 'transparent', border: '1px solid #1e2d4a', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#4a5568', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Restart
            </button>
          )}
        </div>

        {/* Score header / tap-to-assign — same slot, swaps between game and results */}
        <div style={{ textAlign: 'center', marginBottom: 4, minHeight: 36 }}>
          {(done || revealing) ? (
            done ? (
              <>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1.5px', color: totalScore >= 950 ? '#22c55e' : totalScore >= 900 ? '#16a34a' : totalScore >= 850 ? '#eab308' : totalScore >= 800 ? '#ca8a04' : totalScore >= 750 ? '#f97316' : totalScore >= 700 ? '#ea580c' : totalScore >= 650 ? '#ef4444' : '#b91c1c', lineHeight: 1 }}>
                  {totalScore}
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>/1000</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  {totalScore >= 950 ? 'Great' : totalScore >= 900 ? 'Good' : totalScore >= 850 ? 'Not bad' : totalScore >= 800 ? 'OK' : 'Stinker'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', paddingTop: 10 }}>Revealing…</div>
            )
          ) : (
            <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 10, opacity: currentPlayer ? 1 : 0, transition: 'opacity 0.2s' }}>
              Tap a category to assign
            </div>
          )}
        </div>

        {/* Polygon */}
        <DecagonBoard
          assignments={assignments} currentPlayer={inGame ? currentPlayer : null}
          onAssign={inGame ? onAssign : () => {}} revealStep={revealStep}
          spinning={spinning} spinText={spinText} onSpin={inGame ? onSpin : undefined}
          suppressSpinButton={suppressSpinButton}
        />

        {/* Results — appear below decagon in same view */}
        {(done || revealing) && (
          <div style={{ marginTop: 16 }}>

            {/* Category breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {CATEGORIES.map((cat, i) => {
                const p = assignments[i]
                const score = p ? p[cat.key] : 0
                const revealed = revealStep >= i
                return (
                  <div key={cat.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: revealed && p ? `rgba(${scoreColorRGB(score)},0.07)` : '#111827',
                    border: `1px solid ${revealed && p ? `rgba(${scoreColorRGB(score)},0.28)` : '#1e2d4a'}`,
                    borderRadius: 8, padding: '7px 11px',
                    opacity: revealed ? 1 : 0.35,
                    transition: 'all 0.3s',
                  }}>
                    <div style={{ width: 56, fontSize: 9, fontWeight: 800, color: '#4a5568', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat.short}</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p ? p.name : '—'}</div>
                    {revealed && p && (
                      <div style={{ fontSize: 15, fontWeight: 900, color: scoreColor(score), flexShrink: 0, minWidth: 24, textAlign: 'right' }}>{score}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Submit + leaderboard */}
            {done && (
              <div style={{ marginTop: 16 }}>
                {!submitted ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={playerName}
                      onChange={e => onNameChange?.(e.target.value)}
                      placeholder="Your name"
                      maxLength={20}
                      onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
                      style={{ flex: 1, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <button
                      onClick={onSubmit}
                      disabled={submitting || !playerName.trim()}
                      style={{ background: '#dc2626', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 900, color: 'white', cursor: submitting || !playerName.trim() ? 'not-allowed' : 'pointer', opacity: !playerName.trim() ? 0.5 : 1, fontFamily: 'inherit' }}
                    >
                      {submitting ? '…' : 'Submit'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#22c55e', textAlign: 'center', padding: '6px 0' }}>Score submitted! ✓</div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={handleShare}
                    style={{ flex: 1, background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : '#1e2d4a'}`, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, color: copied ? '#22c55e' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  >
                    {copied ? 'Copied! ✓' : '🔗 Share'}
                  </button>
                  <button
                    onClick={onPlayAgain}
                    style={{ flex: 1, background: 'transparent', border: '1px solid #1e2d4a', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Play Again
                  </button>
                </div>

                <div style={{ marginTop: 18 }}>
                  <LeaderboardList leaderboard={leaderboard} userBest={userBest} loading={loadingLb} />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Decagon SVG board ─────────────────────────────────────────────────────────

function DecagonBoard({ assignments, currentPlayer, onAssign, revealStep, spinning = false, spinText = '', onSpin, suppressSpinButton = false }: {
  assignments: (P10Player | null)[]
  currentPlayer: P10Player | null
  onAssign: (i: number) => void
  revealStep: number
  spinning?: boolean
  spinText?: string
  onSpin?: () => void
  suppressSpinButton?: boolean
}) {
  const canAssign = currentPlayer !== null

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} style={{ display: 'block' }}>
        {/* Spokes from centre to each vertex */}
        {VERTICES.map((v, i) => (
          <line key={i} x1={CX} y1={CY} x2={v.x} y2={v.y} stroke="#111827" strokeWidth="1" />
        ))}

        {/* Growing score polygon — unrevealed vertices collapse to centre */}
        {revealStep >= 0 && (() => {
          const pts = CATEGORIES.map((cat, i) => {
            const p = assignments[i]
            if (!p || revealStep < i) return `${CX},${CY}`
            const r = (p[cat.key] / 100) * R_POLY
            const v = vertexXY(i, r)
            return `${v.x},${v.y}`
          }).join(' ')
          return (
            <polygon
              points={pts}
              fill="rgba(255,255,255,0.07)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )
        })()}

        {/* Dots at each revealed polygon vertex */}
        {revealStep >= 0 && CATEGORIES.map((cat, i) => {
          const p = assignments[i]
          if (!p || revealStep < i) return null
          const r = (p[cat.key] / 100) * R_POLY
          const { x, y } = vertexXY(i, r)
          return <circle key={i} cx={x} cy={y} r={3.5} fill={scoreColor(p[cat.key])} stroke="#0a0f1e" strokeWidth="1.5" />
        })}

        {/* Outer decagon */}
        <polygon points={BG_POLY} fill="none" stroke="#1e2d4a" strokeWidth="1.5" />
      </svg>

      {/* Category labels at corners */}
      {CATEGORIES.map((cat, i) => {
        const { x, y } = vertexXY(i, R_LABEL)
        const xPct = `${(x / SVG_SIZE) * 100}%`
        const yPct = `${(y / SVG_SIZE) * 100}%`
        const p         = assignments[i]
        const clickable = canAssign && !p
        const revealed  = revealStep >= i && revealStep >= 0
        const score     = p && revealed ? p[cat.key] : null

        // colours: revealed=score colour, assigned=blue, clickable=red, empty=neutral
        const scoreCol = revealed && p ? scoreColor(p[cat.key]) : null
        const scoreRGB = revealed && p ? scoreColorRGB(p[cat.key]) : null
        const bg     = scoreRGB ? `rgba(${scoreRGB},0.12)` : p ? 'rgba(59,130,246,0.12)' : clickable ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.04)'
        const border = scoreRGB ? `rgba(${scoreRGB},0.4)`  : p ? 'rgba(59,130,246,0.4)'  : clickable ? 'rgba(220,38,38,0.4)'  : '#1e2d4a'
        const color  = scoreCol ?? (p ? '#60a5fa' : clickable ? '#f87171' : '#4a5568')

        return (
          <div
            key={cat.key}
            onClick={() => clickable && onAssign(i)}
            style={{
              position: 'absolute',
              left: xPct, top: yPct,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              cursor: clickable ? 'pointer' : 'default',
              padding: '3px 6px',
              borderRadius: 6,
              background: bg,
              border: `1px solid ${border}`,
              minWidth: 60,
              maxWidth: 72,
              transition: 'background 0.15s, border-color 0.15s',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
              {cat.label}
            </div>
            {p ? (
              <div style={{ fontSize: 10, fontWeight: 700, color: scoreCol ? `rgba(${scoreRGB},0.8)` : 'rgba(96,165,250,0.7)', maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {score !== null ? String(score) : p.name.split(' ').slice(-1)[0]}
              </div>
            ) : (
              <div style={{ fontSize: 9, color: clickable ? 'rgba(220,38,38,0.5)' : '#2a3d5e' }}>—</div>
            )}
          </div>
        )
      })}

      {/* Centre — slot machine or score */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '36%', zIndex: 20 }}>
        {revealStep >= 0 ? null : currentPlayer ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.2, wordBreak: 'break-word' }}>{currentPlayer.name}</div>
          </>
        ) : spinning ? (
          <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626', lineHeight: 1.2, wordBreak: 'break-word' }}>{spinText}</div>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2a3d5e', marginBottom: 5 }}>
              {assignments.filter(Boolean).length}/10
            </div>
            {onSpin && !suppressSpinButton && (
              <button
                onClick={onSpin}
                style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 900, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                🎰 Spin
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

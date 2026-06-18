'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'
import PitchView, { type PitchSlot } from './PitchView'
import SquadPanel from './SquadPanel'
import type { FplPlayer } from './PlayerCard'

// ── Types ───────────────────────────────────────────────────────────────────

type Position = FplPlayer['position']
type Formation = readonly [number, number, number, number] // GKP, DEF, MID, FWD

const FORMATIONS: Formation[] = [
  [1, 3, 4, 3],
  [1, 3, 5, 2],
  [1, 4, 4, 2],
  [1, 4, 5, 1],
  [1, 4, 3, 3],
  [1, 5, 4, 1],
  [1, 5, 3, 2],
]

type TeamSeason = { team: string; season: string }
type GameState = 'loading' | 'name-entry' | 'no-data' | 'playing' | 'end'

const LS_NAME = 'fpl_draft_name'
const LS_DEVICE_ID = 'fpl_draft_device_id'
const LS_BEST = 'fpl_draft_best'

// ── Utilities ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function countByPosition(players: FplPlayer[]): Record<Position, number> {
  const c: Record<Position, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 }
  for (const p of players) c[p.position]++
  return c
}

/**
 * Given the current picks, return which positions are still allowed for the
 * next pick. A position is allowed iff there exists a valid formation that
 * already matches the existing picks and lets us put another player in that
 * position without exceeding the formation's count for that position.
 *
 * Remaining slots after this pick = 10 - (current count). We also need enough
 * room left over for the other positions in some formation.
 */
function allowedPositions(picks: FplPlayer[]): Record<Position, boolean> {
  const counts = countByPosition(picks)
  const remainingTotal = 11 - picks.length
  const out: Record<Position, boolean> = { GKP: false, DEF: false, MID: false, FWD: false }
  if (remainingTotal <= 0) return out

  for (const pos of ['GKP', 'DEF', 'MID', 'FWD'] as Position[]) {
    const tentative: Record<Position, number> = { ...counts, [pos]: counts[pos] + 1 }
    // Need at least one formation where every position's count is still <= formation's
    // requirement, AND the total picks (including tentative) <= 11.
    const fits = FORMATIONS.some(([g, d, m, f]) =>
      tentative.GKP <= g &&
      tentative.DEF <= d &&
      tentative.MID <= m &&
      tentative.FWD <= f
    )
    if (fits) out[pos] = true
  }
  return out
}

/** After all 11 picks, find a valid formation. Returns null if none. */
function findFormation(picks: FplPlayer[]): Formation | null {
  if (picks.length !== 11) return null
  const c = countByPosition(picks)
  return FORMATIONS.find(([g, d, m, f]) =>
    c.GKP === g && c.DEF === d && c.MID === m && c.FWD === f
  ) ?? null
}

// Build a fixed pitch with empty slots based on the chosen formation; placeholder
// shows projected formation while in progress.
function projectedFormation(picks: FplPlayer[]): Formation {
  const c = countByPosition(picks)
  // Choose the first formation that the picks fit into (counts ≤ formation slots).
  const fit = FORMATIONS.find(([g, d, m, f]) =>
    c.GKP <= g && c.DEF <= d && c.MID <= m && c.FWD <= f
  )
  return fit ?? [1, 4, 4, 2]
}

function buildSlots(picks: FplPlayer[], revealAll = false): PitchSlot[] {
  const formation = findFormation(picks) ?? projectedFormation(picks)
  const [g, d, m, f] = formation
  const slots: PitchSlot[] = []
  const byPos: Record<Position, FplPlayer[]> = { GKP: [], DEF: [], MID: [], FWD: [] }
  for (const p of picks) byPos[p.position].push(p)

  function add(pos: Position, count: number) {
    for (let i = 0; i < count; i++) {
      const player = byPos[pos][i] ?? null
      slots.push({ position: pos, player, revealed: revealAll && !!player })
    }
  }
  add('GKP', g)
  add('DEF', d)
  add('MID', m)
  add('FWD', f)
  return slots
}

// ── Round selection ─────────────────────────────────────────────────────────

function pickRounds(allPlayers: FplPlayer[]): TeamSeason[] {
  const seen = new Set<string>()
  const combos: TeamSeason[] = []
  for (const p of allPlayers) {
    const key = `${p.team}|${p.season}`
    if (seen.has(key)) continue
    seen.add(key)
    combos.push({ team: p.team, season: p.season })
  }
  return shuffle(combos).slice(0, 11)
}

// ── Component ───────────────────────────────────────────────────────────────

export default function FplDraftGame() {
  const router = useRouter()
  const [state, setState] = useState<GameState>('loading')
  const [allPlayers, setAllPlayers] = useState<FplPlayer[]>([])
  const [rounds, setRounds] = useState<TeamSeason[]>([])
  const [picks, setPicks] = useState<FplPlayer[]>([])
  const [roundIdx, setRoundIdx] = useState(0)
  const [name, setName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [deviceId, setDeviceId] = useState<string>('')
  const [best, setBest] = useState<number | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)

  // ── Initial load: data + name/device ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/data/fpl-players.json', { cache: 'force-cache' })
        const json = await res.json() as { players: FplPlayer[] }
        if (cancelled) return
        setAllPlayers(json.players ?? [])

        // localStorage
        const storedName = localStorage.getItem(LS_NAME) ?? ''
        let storedDevice = localStorage.getItem(LS_DEVICE_ID)
        if (!storedDevice) {
          storedDevice = makeDeviceId()
          localStorage.setItem(LS_DEVICE_ID, storedDevice)
        }
        const storedBest = Number(localStorage.getItem(LS_BEST) ?? '0') || 0
        setDeviceId(storedDevice)
        setBest(storedBest || null)

        if ((json.players ?? []).length === 0) {
          setState('no-data')
          return
        }
        if (!storedName) {
          setState('name-entry')
        } else {
          setName(storedName)
          startGame(json.players)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setState('no-data')
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startGame = useCallback((players?: FplPlayer[]) => {
    const pool = players ?? allPlayers
    const newRounds = pickRounds(pool)
    setRounds(newRounds)
    setPicks([])
    setRoundIdx(0)
    setNewBest(false)
    setRevealedCount(0)
    setState('playing')
  }, [allPlayers])

  function confirmName() {
    const n = nameInput.trim()
    if (!n) return
    localStorage.setItem(LS_NAME, n)
    setName(n)
    startGame()
  }

  // ── Current round data ──
  const currentRound = rounds[roundIdx]
  const pickedIds = useMemo(() => new Set(picks.map(p => p.id)), [picks])
  const allowed = useMemo(() => allowedPositions(picks), [picks])

  const currentSquad = useMemo(() => {
    if (!currentRound) return []
    return allPlayers.filter(p => p.team === currentRound.team && p.season === currentRound.season)
  }, [allPlayers, currentRound])

  function handlePick(player: FplPlayer) {
    if (state !== 'playing') return
    if (pickedIds.has(player.id)) return
    if (!allowed[player.position]) return
    const nextPicks = [...picks, player]
    setPicks(nextPicks)
    if (nextPicks.length >= 11) {
      finishGame(nextPicks)
    } else {
      setRoundIdx(i => i + 1)
    }
  }

  // ── End game ──
  const totalScore = useMemo(() => picks.reduce((s, p) => s + p.fpl_points, 0), [picks])

  function finishGame(finalPicks: FplPlayer[]) {
    const total = finalPicks.reduce((s, p) => s + p.fpl_points, 0)
    const prevBest = Number(localStorage.getItem(LS_BEST) ?? '0') || 0
    const isNewBest = total > prevBest
    if (isNewBest) {
      localStorage.setItem(LS_BEST, String(total))
      setBest(total)
    }
    setNewBest(isNewBest)
    setState('end')

    // Animate reveal
    setRevealedCount(0)
    let i = 0
    const tick = () => {
      i++
      setRevealedCount(i)
      if (i < finalPicks.length) setTimeout(tick, 220)
    }
    setTimeout(tick, 350)

    // Persist to leaderboard (best only)
    void persistScore(total, isNewBest, prevBest)
  }

  async function persistScore(score: number, isNewBest: boolean, prevBest: number) {
    if (!name || !deviceId) return
    setSubmitting(true)
    try {
      // Read existing row to avoid overwriting a higher score for this device.
      const { data: existing } = await supabase
        .from('fpl_draft_leaderboard')
        .select('best_score')
        .eq('device_id', deviceId)
        .maybeSingle()
      const existingBest = (existing && typeof existing.best_score === 'number') ? existing.best_score : prevBest
      if (score <= existingBest && !isNewBest) {
        return
      }
      const bestToStore = Math.max(score, existingBest)
      await supabase
        .from('fpl_draft_leaderboard')
        .upsert(
          {
            device_id: deviceId,
            name,
            best_score: bestToStore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'device_id' }
        )
    } catch (err) {
      console.error('leaderboard upsert', err)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Share ──
  function buildShareText() {
    return `FPL Draft 11 — ${totalScore} pts. Can you beat me? topbinsfooty.com/fpl-draft`
  }
  function handleShare() {
    const text = buildShareText()
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener')
  }

  // ── Render ──
  if (state === 'loading') {
    return (
      <>
        <NavBar />
        <div style={pageStyle}>
          <div style={{ color: '#8899bb', fontSize: 14, padding: 40 }}>Loading…</div>
        </div>
      </>
    )
  }

  if (state === 'no-data') {
    return (
      <>
        <NavBar />
        <div style={pageStyle}>
          <div style={{ ...cardStyle, maxWidth: 480, margin: '40px auto' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              FPL Draft 11
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 10 }}>
              Data coming soon
            </div>
            <div style={{ fontSize: 13, color: '#8899bb', lineHeight: 1.6 }}>
              We&apos;re still loading the squads. Pop back shortly and you&apos;ll be drafting your ultimate XI.
            </div>
          </div>
        </div>
      </>
    )
  }

  if (state === 'name-entry') {
    return (
      <>
        <NavBar />
        <div style={pageStyle}>
          <div style={{ ...cardStyle, maxWidth: 420, margin: '60px auto' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              FPL Draft 11
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '6px 0 4px', letterSpacing: '-0.5px' }}>
              Pick a display name
            </h1>
            <p style={{ fontSize: 13, color: '#8899bb', margin: '0 0 18px', lineHeight: 1.5 }}>
              Used on the leaderboard. You can&apos;t skip — but you can be Brian.
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmName()}
              maxLength={20}
              placeholder="e.g. Big Sam"
              style={inputStyle}
            />
            <button
              onClick={confirmName}
              disabled={!nameInput.trim()}
              style={{ ...primaryButton, marginTop: 14, opacity: nameInput.trim() ? 1 : 0.5, cursor: nameInput.trim() ? 'pointer' : 'not-allowed' }}
            >
              Start drafting →
            </button>
          </div>
        </div>
      </>
    )
  }

  // playing / end
  const slots = buildSlots(picks, state === 'end')
  const slotsForDisplay = state === 'end'
    ? slots.map((s, i) => ({ ...s, revealed: i < revealedCount }))
    : slots

  return (
    <>
      <NavBar />
      <div style={pageStyle}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 18px 40px' }}>
          {/* Header bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                FPL Draft 11
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                {state === 'playing' ? `Pick ${Math.min(roundIdx + 1, 11)} of 11` : 'Final XI'}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11, color: '#4a5568' }}>
              Hi, <span style={{ color: 'white', fontWeight: 700 }}>{name}</span>
            </div>
            <button
              onClick={() => router.push('/fpl-draft/leaderboard')}
              style={ghostButton}
            >
              Leaderboard
            </button>
            <button onClick={() => startGame()} style={ghostButton}>
              Restart
            </button>
          </div>

          {/* Progress bar */}
          {state === 'playing' && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i < picks.length ? '#dc2626' : '#1e2d4a',
                }} />
              ))}
            </div>
          )}

          {/* Layout */}
          <div className="fpld-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            <div>
              <PitchView
                slots={slotsForDisplay}
                totalScore={totalScore}
                showTotal={state === 'end' && revealedCount >= slots.length}
              />
            </div>
            <div>
              {state === 'playing' && currentRound && (
                <SquadPanel
                  team={currentRound.team}
                  season={currentRound.season}
                  squad={currentSquad}
                  pickedIds={pickedIds}
                  allowedPositions={allowed}
                  onPick={handlePick}
                />
              )}
              {state === 'end' && (
                <EndPanel
                  picks={picks}
                  totalScore={totalScore}
                  best={best}
                  newBest={newBest}
                  onPlayAgain={() => startGame()}
                  onShare={handleShare}
                  copied={copied}
                  submitting={submitting}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .fpld-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

// ── End screen panel ────────────────────────────────────────────────────────

function EndPanel({
  picks,
  totalScore,
  best,
  newBest,
  onPlayAgain,
  onShare,
  copied,
  submitting,
}: {
  picks: FplPlayer[]
  totalScore: number
  best: number | null
  newBest: boolean
  onPlayAgain: () => void
  onShare: () => void
  copied: boolean
  submitting: boolean
}) {
  const orderedPicks = useMemo(() => {
    const order: Position[] = ['GKP', 'DEF', 'MID', 'FWD']
    return [...picks].sort((a, b) =>
      order.indexOf(a.position) - order.indexOf(b.position) || b.fpl_points - a.fpl_points
    )
  }, [picks])

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Final score
        </div>
        <div style={{ fontSize: 44, fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1 }}>
          {totalScore}
        </div>
        <div style={{ fontSize: 12, color: '#8899bb', marginTop: 4 }}>
          {newBest ? 'New personal best! 🎉' : best != null ? `Personal best: ${best}` : 'First run!'}
        </div>
        {submitting && (
          <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>Saving…</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
        {orderedPicks.map(p => (
          <div key={p.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid #1e2d4a',
            borderRadius: 8,
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 900,
              color: POS_TEXT[p.position],
              background: POS_BG[p.position],
              padding: '2px 6px',
              borderRadius: 4,
              minWidth: 32,
              textAlign: 'center',
            }}>
              {p.position}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 10, color: '#4a5568' }}>{p.team} · {p.season}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>{p.fpl_points}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onShare} style={{
          flex: 1,
          background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${copied ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.35)'}`,
          color: '#22c55e',
          padding: '11px',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          {copied ? 'Copied! ✓' : 'Share'}
        </button>
        <button onClick={onPlayAgain} style={{ ...primaryButton, flex: 1 }}>
          Play Again
        </button>
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────

const POS_TEXT: Record<Position, string> = {
  GKP: '#facc15',
  DEF: '#22c55e',
  MID: '#38bdf8',
  FWD: '#dc2626',
}
const POS_BG: Record<Position, string> = {
  GKP: 'rgba(250,204,21,0.15)',
  DEF: 'rgba(34,197,94,0.15)',
  MID: 'rgba(56,189,248,0.15)',
  FWD: 'rgba(220,38,38,0.15)',
}

const pageStyle: React.CSSProperties = {
  minHeight: 'calc(100dvh - 56px)',
  background: '#0a0f1e',
  color: 'white',
  fontFamily: "'DM Sans', -apple-system, sans-serif",
}

const cardStyle: React.CSSProperties = {
  background: '#111827',
  border: '1px solid #1e2d4a',
  borderRadius: 14,
  padding: 18,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a0f1e',
  border: '1px solid #1e2d4a',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 15,
  color: 'white',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const primaryButton: React.CSSProperties = {
  background: '#dc2626',
  border: 'none',
  borderRadius: 10,
  padding: '12px 18px',
  fontSize: 14,
  fontWeight: 900,
  color: 'white',
  cursor: 'pointer',
  fontFamily: 'inherit',
  width: '100%',
}

const ghostButton: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #1e2d4a',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 700,
  color: '#8899bb',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

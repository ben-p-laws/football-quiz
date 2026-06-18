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
type GameState = 'loading' | 'name-entry' | 'no-data' | 'lobby' | 'spinning' | 'playing' | 'end'
type LeaderboardEntry = { device_id: string; name: string; best_score: number }

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

// Always emit max possible slots — PitchView trims based on viable formations
const MAX_SLOTS: Record<Position, number> = { GKP: 1, DEF: 5, MID: 5, FWD: 3 }

function buildSlots(picks: FplPlayer[], revealAll = false): PitchSlot[] {
  const byPos: Record<Position, FplPlayer[]> = { GKP: [], DEF: [], MID: [], FWD: [] }
  for (const p of picks) byPos[p.position].push(p)
  const slots: PitchSlot[] = []
  for (const pos of ['GKP', 'DEF', 'MID', 'FWD'] as Position[]) {
    for (let i = 0; i < MAX_SLOTS[pos]; i++) {
      const player = byPos[pos][i] ?? null
      slots.push({ position: pos, player, revealed: revealAll && !!player })
    }
  }
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
  // Pick 11 with no team appearing twice (different seasons of same club excluded)
  const shuffled = shuffle(combos)
  const seenTeam = new Set<string>()
  const result: TeamSeason[] = []
  for (const combo of shuffled) {
    if (seenTeam.has(combo.team)) continue
    seenTeam.add(combo.team)
    result.push(combo)
    if (result.length >= 11) break
  }
  return result
}

// ── Component ───────────────────────────────────────────────────────────────

export default function FplDraftGame() {
  const router = useRouter()
  const [state, setState] = useState<GameState>('loading')
  const [allPlayers, setAllPlayers] = useState<FplPlayer[]>([])
  const [rounds, setRounds] = useState<TeamSeason[]>([])
  const [picks, setPicks] = useState<FplPlayer[]>([])
  const [pickedNames, setPickedNames] = useState<Set<string>>(new Set())
  const [roundIdx, setRoundIdx] = useState(0)
  const [name, setName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [deviceId, setDeviceId] = useState<string>('')
  const [best, setBest] = useState<number | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)
  const [spinDisplay, setSpinDisplay] = useState<TeamSeason | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const allCombosRef = React.useRef<TeamSeason[]>([])

  // ── Initial load: data + name/device ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/data/fpl-players.json', { cache: 'no-cache' })
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
        // pre-build all combos for slot machine
        const seen = new Set<string>()
        const combos: TeamSeason[] = []
        for (const p of json.players) {
          const key = `${p.team}|${p.season}`
          if (!seen.has(key)) { seen.add(key); combos.push({ team: p.team, season: p.season }) }
        }
        allCombosRef.current = combos

        if (!storedName) {
          setState('name-entry')
        } else {
          setName(storedName)
          // pass players directly — allPlayers state update hasn't flushed yet
          const newRounds = pickRounds(json.players)
          setRounds(newRounds)
          setState('lobby')
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

  // Fetch leaderboard whenever lobby is shown
  useEffect(() => {
    if (state !== 'lobby') return
    supabase
      .from('fpl_draft_leaderboard')
      .select('device_id, name, best_score')
      .order('best_score', { ascending: false })
      .limit(10)
      .then(({ data }) => { setLeaderboard((data ?? []) as LeaderboardEntry[]) })
  }, [state])

  const startGame = useCallback((players?: FplPlayer[]) => {
    const pool = players ?? allPlayers
    const newRounds = pickRounds(pool)
    setRounds(newRounds)
    setPicks([])
    setPickedNames(new Set())
    setRoundIdx(0)
    setNewBest(false)
    setRevealedCount(0)
    setState('lobby')
  }, [allPlayers])

  const beginRound = useCallback((roundIndex: number, roundList: TeamSeason[]) => {
    const target = roundList[roundIndex]
    if (!target) return
    const combos = allCombosRef.current
    setState('spinning')
    setSpinDisplay(combos[0] ?? target)
    let ticks = 0
    const totalTicks = 11
    const spin = () => {
      ticks++
      if (ticks < totalTicks) {
        const random = combos[Math.floor(Math.random() * combos.length)]
        setSpinDisplay(random)
        const delay = ticks < 7 ? 40 : ticks < 10 ? 70 : 130
        setTimeout(spin, delay)
      } else {
        setSpinDisplay(target)
        setTimeout(() => setState('playing'), 250)
      }
    }
    setTimeout(spin, 40)
  }, [])

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
    if (pickedNames.has(player.name.toLowerCase())) return
    if (!allowed[player.position]) return
    const nextPicks = [...picks, player]
    setPicks(nextPicks)
    setPickedNames(prev => new Set([...prev, player.name.toLowerCase()]))
    if (nextPicks.length >= 11) {
      finishGame(nextPicks)
    } else {
      const nextIdx = roundIdx + 1
      setRoundIdx(nextIdx)
      beginRound(nextIdx, rounds)
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

    // Fetch leaderboard early (before upsert so it shows quickly)
    supabase
      .from('fpl_draft_leaderboard')
      .select('device_id, name, best_score')
      .order('best_score', { ascending: false })
      .limit(10)
      .then(({ data }) => { setLeaderboard((data ?? []) as LeaderboardEntry[]) })

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
      // Refresh leaderboard after upsert so user's new score appears
      const { data } = await supabase
        .from('fpl_draft_leaderboard')
        .select('device_id, name, best_score')
        .order('best_score', { ascending: false })
        .limit(10)
      setLeaderboard((data ?? []) as LeaderboardEntry[])
    } catch (err) {
      console.error('leaderboard upsert', err)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Share ──
  // Replace with the URL of the pinned @topbinsfooty tweet once live
  const TOPBINS_TWEET_URL = 'https://x.com/TopBins_Footy/status/2067538417735578062?s=20'

  function buildShareText() {
    return `Ultimate FPL draft, ${totalScore} total.\nChallenge me at topbinsfooty.com/fpl-draft\n#football #worldcup2026 #soccer`
  }
  function handleWhatsApp() {
    const text = buildShareText()
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener')
  }
  function handleRetweet() {
    window.open(TOPBINS_TWEET_URL, '_blank', 'noopener')
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

  // lobby — instructions before first pick
  if (state === 'lobby') {
    return (
      <>
        <NavBar />
        <div style={pageStyle}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 18px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FPL Draft 11</div>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: 'white', margin: '6px 0 0', letterSpacing: '-1px', lineHeight: 1.1 }}>
                Draft the ultimate FPL XI
              </h1>
              <p style={{ fontSize: 14, color: '#8899bb', marginTop: 10, lineHeight: 1.6 }}>
                11 rounds. Each round a random Premier League team &amp; season is revealed. Pick one player from that squad. Scores are hidden until the end, maximise your total FPL points.
              </p>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                ['🎰', 'Each round, a slot machine reveals a random team & season'],
                ['📋', 'Pick one player from that squad to fill your XI'],
                ['📐', 'Formation rules apply, you must end with a valid 11'],
                ['🏆', 'Scores revealed at the end — compete for the leaderboard'],
              ] as [string, string][]).map(([icon, text], i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, lineHeight: 1.4, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => beginRound(0, rounds)} style={{ ...primaryButton, fontSize: 16, padding: '16px 0' }}>
              Start Draft →
            </button>
            {name && (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#4a5568' }}>
                Playing as <span style={{ color: 'white', fontWeight: 700 }}>{name}</span>
              </div>
            )}

            {/* Leaderboard */}
            {leaderboard !== null && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Leaderboard
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {leaderboard.length === 0 && (
                    <div style={{ fontSize: 12, color: '#4a5568', textAlign: 'center', padding: '12px 0' }}>No entries yet — you could be first!</div>
                  )}
                  {leaderboard.map((entry, i) => {
                    const isMe = entry.device_id === deviceId
                    return (
                      <div key={entry.device_id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        background: isMe ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isMe ? 'rgba(220,38,38,0.25)' : '#1e2d4a'}`,
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', minWidth: 18, textAlign: 'right' }}>{i + 1}</div>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isMe ? 'white' : '#aabbcc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: isMe ? '#dc2626' : 'white' }}>{entry.best_score}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── End screen ──────────────────────────────────────────────────────────
  if (state === 'end') {
    const endSlots = buildSlots(picks, true)
    // Reveal the nth filled slot (not nth array index — empty slots skew the count)
    let filledSeen = 0
    const slotsForDisplay = endSlots.map((s) => {
      if (!s.player) return s
      filledSeen++
      return { ...s, revealed: filledSeen <= revealedCount }
    })
    const revealComplete = revealedCount >= picks.length

    return (
      <>
        <NavBar />
        <div style={pageStyle}>
          <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '12px 20px 40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FPL Draft 11</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>Final XI</div>
              </div>
              <div style={{ flex: 1 }} />
              {name && <div style={{ fontSize: 11, color: '#4a5568' }}>Hi, <span style={{ color: 'white', fontWeight: 700 }}>{name}</span></div>}
              <button onClick={() => router.push('/fpl-draft/leaderboard')} style={ghostButton}>Leaderboard</button>
              <button onClick={() => startGame()} style={ghostButton}>Restart</button>
            </div>

            {/* Progress bar — all filled */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: '#dc2626' }} />
              ))}
            </div>

            {/* Total score */}
            <div style={{ textAlign: 'center', padding: '6px 0 14px', minHeight: 68 }}>
              {revealComplete ? (
                <>
                  <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1 }}>
                    {totalScore}
                  </div>
                  <div style={{ fontSize: 12, color: '#8899bb', marginTop: 5 }}>
                    {newBest ? '🎉 New personal best!' : best != null ? `Personal best: ${best}` : 'First run!'}
                    {submitting && <span style={{ color: '#4a5568', marginLeft: 8 }}>Saving…</span>}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#4a5568', paddingTop: 24 }}>Revealing scores…</div>
              )}
            </div>

            {/* Vertical pitch with scores */}
            <PitchView slots={slotsForDisplay} vertical />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={handleWhatsApp} style={{
                flex: 1,
                background: 'rgba(37,211,102,0.1)',
                border: '1px solid rgba(37,211,102,0.35)',
                color: '#25d366',
                padding: '11px',
                borderRadius: 10,
                fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                WhatsApp
              </button>
              <button onClick={handleRetweet} style={{
                flex: 1,
                background: 'rgba(29,161,242,0.1)',
                border: '1px solid rgba(29,161,242,0.35)',
                color: '#1da1f2',
                padding: '11px',
                borderRadius: 10,
                fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Retweet
              </button>
              <button onClick={() => startGame()} style={{ ...primaryButton, flex: 1 }}>
                Play Again
              </button>
            </div>

            {/* Mini leaderboard */}
            {leaderboard !== null && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Leaderboard
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {leaderboard.length === 0 && (
                    <div style={{ fontSize: 12, color: '#4a5568', textAlign: 'center', padding: '12px 0' }}>No entries yet — you could be first!</div>
                  )}
                  {leaderboard.map((entry, i) => {
                    const isMe = entry.device_id === deviceId
                    return (
                      <div key={entry.device_id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        background: isMe ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isMe ? 'rgba(220,38,38,0.25)' : '#1e2d4a'}`,
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', minWidth: 18, textAlign: 'right' }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isMe ? 'white' : '#aabbcc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: isMe ? '#dc2626' : 'white' }}>
                          {entry.best_score}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // spinning / playing — always show split layout
  const slots = buildSlots(picks, false)
  const slotsForDisplay = slots

  return (
    <>
      <NavBar />
      <div style={pageStyle}>
        <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '12px 20px 40px' }}>
          {/* Header bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FPL Draft 11</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                {`Pick ${Math.min(roundIdx + 1, 11)} of 11`}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {name && <div style={{ fontSize: 11, color: '#4a5568' }}>Hi, <span style={{ color: 'white', fontWeight: 700 }}>{name}</span></div>}
            <button onClick={() => router.push('/fpl-draft/leaderboard')} style={ghostButton}>Leaderboard</button>
            <button onClick={() => startGame()} style={ghostButton}>Restart</button>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < picks.length ? '#dc2626' : '#1e2d4a' }} />
            ))}
          </div>

          {/* Horizontal formation strip */}
          <PitchView slots={slotsForDisplay} />

          {/* Action panel below formation */}
          <div style={{ marginTop: 12 }}>
            {state === 'spinning' && spinDisplay && (
              <div style={{
                background: '#111827',
                border: '1px solid #1e2d4a',
                borderRadius: 14,
                padding: '28px 18px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Round {roundIdx + 1}
                </div>
                <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 8 }}>Drawing team…</div>
                <div style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {spinDisplay.team}
                </div>
                <div style={{ fontSize: 14, color: '#8899bb', fontWeight: 700 }}>{spinDisplay.season}</div>
              </div>
            )}
            {state === 'playing' && currentRound && (
              <SquadPanel
                team={currentRound.team}
                season={currentRound.season}
                squad={currentSquad}
                pickedIds={pickedIds}
                pickedNames={pickedNames}
                allowedPositions={allowed}
                onPick={handlePick}
              />
            )}
          </div>
        </div>
      </div>
    </>
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

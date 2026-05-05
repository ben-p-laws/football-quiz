'use client'

import { useState, useEffect, useRef } from 'react'

const STATS = [
  { key: 'goals',            label: 'Goals',            emoji: '⚽' },
  { key: 'assists',          label: 'Assists',           emoji: '🎯' },
  { key: 'appearances',      label: 'Appearances',       emoji: '🎮' },
  { key: 'yellow_cards',     label: 'Yellow Cards',      emoji: '🟨' },
  { key: 'red_cards',        label: 'Red Cards',         emoji: '🟥' },
  { key: 'youngest_scorer',  label: 'Youngest Scorer',   emoji: '👶' },
  { key: 'oldest_player',    label: 'Oldest Player',     emoji: '👴' },
  { key: 'penalties_scored', label: 'Penalties Scored',  emoji: '🥅' },
]

const TOTAL_ROUNDS = STATS.length

function rankColor(rank: number): string {
  if (rank <= 10) return 'rgba(34,197,94,0.9)'
  if (rank <= 20) return 'rgba(134,239,172,0.75)'
  if (rank <= 30) return 'rgba(251,191,36,0.9)'
  if (rank <= 40) return 'rgba(249,115,22,0.9)'
  return 'rgba(239,68,68,0.9)'
}

function rankDisplay(rank: number): string {
  return rank >= 50 ? '50+' : String(rank)
}

function totalScore(locked: Record<string, LockedStat>): number {
  return Object.values(locked).reduce((sum, s) => sum + Math.min(s.rank, 50), 0)
}

type Player = { name: string }
type RankEntry = { rank: number; value: string }
type Rankings = Record<string, Record<string, RankEntry>>
type LockedStat = { rank: number; color: string; value: string }
type LBEntry = { username: string; score: number }

const PILL_H = 32
const SCORE_W = 36

const ITEM_H = 80
const SPIN_DURATION = 1100
const REPEATS = 10

export default function SocialMinimiseClient() {
  const [players, setPlayers] = useState<Player[]>([])
  const [rankings, setRankings] = useState<Rankings>({})
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [currentIdx, setCurrentIdx] = useState(0)
  const [spinOffset, setSpinOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const [round, setRound] = useState(0)
  const [pickedThisRound, setPickedThisRound] = useState(false)
  const [lockedStats, setLockedStats] = useState<Record<string, LockedStat>>({})
  const [username, setUsername] = useState('')

  const usedNamesRef = useRef<Set<string>>(new Set())
  const [coverIdx, setCoverIdx] = useState(0)

  const currentPlayer = players[currentIdx]
  const lockedCount = Object.keys(lockedStats).length
  const gameOver = lockedCount === TOTAL_ROUNDS

  // SPIN_LIST built from players (after load)
  const spinList = Array(REPEATS).fill(null).flatMap(() => players)
  const N = players.length

  useEffect(() => {
    const saved = localStorage.getItem('topbins_username')
    if (saved) setUsername(saved)
    fetch('/api/social-minimise')
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players ?? [])
        setRankings(d.rankings ?? {})
        setLeaderboard(d.leaderboard ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (N === 0) return
    const idx = Math.floor(Math.random() * N)
    setCurrentIdx(idx)
    setSpinOffset(-(N + idx) * ITEM_H)
    const buf = new Uint8Array(1); crypto.getRandomValues(buf); setCoverIdx(buf[0] % N)
  }, [N])

  useEffect(() => {
    if (!pickedThisRound || gameOver) return
    const t = setTimeout(() => doSpin(), 200)
    return () => clearTimeout(t)
  }, [pickedThisRound, gameOver])

  useEffect(() => {
    if (!gameOver || lockedCount < TOTAL_ROUNDS) return
    const score = totalScore(lockedStats)
    const name = username || localStorage.getItem('topbins_username') || 'Anonymous'
    fetch('/api/social-minimise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, score }),
    })
      .then(r => r.json())
      .then(d => { if (d.leaderboard) setLeaderboard(d.leaderboard) })
      .catch(() => {})
  }, [gameOver])

  function doSpin() {
    if (N === 0) return
    const available = players.map((_, i) => i).filter(i => !usedNamesRef.current.has(players[i].name))
    const pool = available.length > 0 ? available : players.map((_, i) => i)
    const targetIdx = pool[Math.floor(Math.random() * pool.length)]
    const targetPosInList = (REPEATS - 2) * N + targetIdx
    usedNamesRef.current = new Set([...usedNamesRef.current, players[targetIdx].name])

    setIsAnimating(true)
    setPickedThisRound(false)
    setRound(r => r + 1)
    setSpinOffset(-(targetPosInList * ITEM_H))

    setTimeout(() => {
      setCurrentIdx(targetIdx)
      setIsAnimating(false)
      setSpinOffset(-(N + targetIdx) * ITEM_H)
    }, SPIN_DURATION + 50)
  }

  function startGame() {
    if (loading || isAnimating || N === 0) return
    doSpin()
  }

  function pickStat(statKey: string) {
    if (isAnimating || pickedThisRound || round === 0 || lockedStats[statKey] || !currentPlayer) return
    const info = rankings[statKey]?.[currentPlayer.name] ?? null
    const rank = info?.rank ?? 50
    const color = rankColor(rank)
    setLockedStats(prev => ({ ...prev, [statKey]: { rank, color, value: info?.value ?? 'N/A' } }))
    setPickedThisRound(true)
  }

  function resetGame() {
    setLockedStats({})
    setRound(0)
    setPickedThisRound(false)
    usedNamesRef.current = new Set()
    if (N > 0) {
      const b = new Uint8Array(1); crypto.getRandomValues(b); setCoverIdx(b[0] % N)
    }
  }

  const score = totalScore(lockedStats)

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 390,
        minHeight: '100dvh',
        backgroundImage: `linear-gradient(rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.68) 60%, rgba(0,0,0,0.82) 100%), url('/social-bg.jpg')`,
        backgroundSize: '100% auto',
        backgroundPosition: 'center bottom',
        backgroundColor: '#0a0f1e',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', gap: 12, padding: '10px 14px', zIndex: 20 }}>
          <button onClick={resetGame} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}>
            ↩ Restart
          </button>
          {round === 0 && (
            <button onClick={startGame} disabled={loading || isAnimating} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 800, color: loading ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Loading...' : '🎰 Start'}
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </div>
          {round > 0 && (
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
              {gameOver ? '· Game over!' : `· ${round} / ${TOTAL_ROUNDS}`}
            </div>
          )}
        </div>

        {/* Content row */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>

          {/* Left: stat pills */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7, padding: '0 6px 0 40px' }}>
            {STATS.map(s => {
              const locked = lockedStats[s.key]
              const isClickable = !locked && !pickedThisRound && round > 0 && !isAnimating
              const bg = locked ? locked.color : 'rgba(90,90,90,0.8)'
              return (
                <div key={s.key} style={{ display: 'flex', gap: 3 }}>
                  <div
                    onClick={() => pickStat(s.key)}
                    style={{
                      background: bg,
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderRadius: 7,
                      padding: '0 8px',
                      height: PILL_H,
                      cursor: isClickable ? 'pointer' : 'default',
                      userSelect: 'none',
                      transition: 'background 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
                      {s.emoji} {s.label}
                    </div>
                  </div>
                  <div style={{
                    background: locked ? locked.color : 'transparent',
                    borderRadius: 7,
                    width: SCORE_W,
                    height: PILL_H,
                    flexShrink: 0,
                    transition: 'background 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 900, color: 'white',
                  }}>
                    {locked ? rankDisplay(locked.rank) : ''}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: spinner or game-over */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 10px 0 16px', gap: 20, position: 'relative', overflow: 'hidden' }}>
            {gameOver ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your Score</div>
                  <div style={{ fontSize: 64, fontWeight: 900, color: 'white', lineHeight: 1, textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>{score}</div>
                </div>
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' }}>Leaderboard</div>
                  {leaderboard.slice(0, 5).map((e, i) => {
                    const borderColor = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.25)'
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 8px', marginBottom: 3,
                        background: e.username === (username || 'Anonymous') && e.score === score
                          ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.07)',
                        borderRadius: 6,
                        border: `1.5px solid ${borderColor}`,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'white', width: 18 }}>#{i + 1}</div>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.username}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'white' }}>{e.score}</div>
                      </div>
                    )
                  })}
                  {leaderboard.length === 0 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>No scores yet</div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Cover — blurred name before game starts */}
                {round === 0 && !isAnimating && N > 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'blur(6px)', zIndex: 10, pointerEvents: 'none' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'white', textAlign: 'center', padding: '0 12px', lineHeight: 1.3 }}>
                      {players[coverIdx]?.name}
                    </div>
                  </div>
                )}

                {/* Spinner */}
                <div style={{ height: ITEM_H, width: '100%', overflow: 'hidden', position: 'relative', visibility: round === 0 && !isAnimating ? 'hidden' : 'visible' }}>
                  <div style={{
                    transform: `translateY(${spinOffset}px)`,
                    transition: isAnimating ? `transform ${SPIN_DURATION}ms cubic-bezier(0.08, 0.6, 0.18, 1)` : 'none',
                    willChange: 'transform',
                    visibility: isAnimating ? 'visible' : 'hidden',
                  }}>
                    {spinList.map((player, i) => (
                      <div key={i} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'white', textAlign: 'center', padding: '0 8px', lineHeight: 1.3 }}>
                          {player.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isAnimating && round > 0 && currentPlayer && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'white', textAlign: 'center', padding: '0 8px', lineHeight: 1.3 }}>
                        {currentPlayer.name}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', minHeight: 16 }}>
                  {round > 0 && !isAnimating ? 'Pick a stat to lock it in' : ''}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 10, fontSize: 13, fontWeight: 800, color: '#dc2626', letterSpacing: '0.02em' }}>
          www.topbins.co.uk
        </div>

        <div style={{ flex: 1 }} />
      </div>
    </div>
  )
}

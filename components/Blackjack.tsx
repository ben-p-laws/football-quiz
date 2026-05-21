'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type StatType = 'goals' | 'assists' | 'yellow_cards' | 'clean_sheets'
type Mode     = 'easy' | 'hard'
type Phase    = 'idle' | 'player' | 'dealer' | 'result'
type Result   = 'win' | 'lose' | 'push'

interface RawCard  { player: string; team: string; value: number }
interface GameCard extends RawCard { id: string; faceDown: boolean; animIn: boolean }
interface LeaderEntry { username: string; streak: number; mode: string }

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATS: StatType[] = ['goals', 'assists', 'yellow_cards', 'clean_sheets']
const STAT_LABEL: Record<StatType, string> = {
  goals: 'Goals', assists: 'Assists',
  yellow_cards: 'Yellow Cards', clean_sheets: 'Clean Sheets',
}
const STAT_ICON: Record<StatType, string> = {
  goals: '⚽', assists: '🎯', yellow_cards: '🟨', clean_sheets: '🧤',
}

// TopBins logo SVG (same as NavBar)
const TB_LOGO = (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="rgba(0,0,0,0.4)"/>
    <rect x="0" y="0" width="28" height="4" fill="rgba(255,255,255,0.6)"/>
    <rect x="24" y="4" width="4" height="28" fill="rgba(255,255,255,0.6)"/>
    <line x1="4"  y1="4" x2="2"  y2="32" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <line x1="9"  y1="4" x2="7"  y2="32" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <line x1="14" y1="4" x2="12" y2="32" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <line x1="19" y1="4" x2="17" y2="32" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <line x1="0" y1="9"  x2="24" y2="9"  stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <line x1="0" y1="14" x2="24" y2="14" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <line x1="0" y1="19" x2="24" y2="19" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <line x1="0" y1="24" x2="24" y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
    <circle cx="17" cy="15" r="6.2" fill="white" opacity="0.7"/>
    <circle cx="17" cy="15" r="7.2" fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.4"/>
  </svg>
)

// ─── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
function allTotal(cards: GameCard[]): number {
  return cards.reduce((s, c) => s + c.value, 0)
}
function visibleTotal(cards: GameCard[]): number {
  return cards.filter(c => !c.faceDown).reduce((s, c) => s + c.value, 0)
}

// ─── Playing Card ───────────────────────────────────────────────────────────────
function PlayingCard({ card, stat, mode, reveal }: {
  card: GameCard; stat: StatType; mode: Mode; reveal: boolean
}) {
  const showValue = !card.faceDown && (mode === 'easy' || reveal)

  if (card.faceDown) {
    return (
      <div style={{
        width: 100, height: 150, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #1a2744 25%, #0d1b36 50%, #1a2744 75%)',
        border: '2px solid #3a5080',
        boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: card.animIn ? 'translateY(0) rotate(-1deg)' : 'translateY(-120px)',
        opacity: card.animIn ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }} />
        <div style={{ fontSize: 30, opacity: 0.2 }}>♦</div>
        <div style={{ position: 'absolute', top: 7, left: 9, fontSize: 10, color: 'rgba(255,255,255,0.18)', fontWeight: 700 }}>TB</div>
        <div style={{ position: 'absolute', bottom: 7, right: 9, fontSize: 10, color: 'rgba(255,255,255,0.18)', fontWeight: 700, transform: 'rotate(180deg)' }}>TB</div>
      </div>
    )
  }

  return (
    <div style={{
      width: 100, height: 150, borderRadius: 10, flexShrink: 0,
      background: 'white', border: '1px solid #d1d5db',
      boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', padding: '7px 8px',
      transform: card.animIn ? 'translateY(0)' : 'translateY(-120px)',
      opacity: card.animIn ? 1 : 0,
      transition: 'transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
    }}>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</div>
        <div style={{ fontSize: 10 }}>{STAT_ICON[stat]}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#111', lineHeight: 1.25, wordBreak: 'break-word' }}>{card.player}</div>
        <div style={{ fontSize: 8.5, color: '#6b7280', lineHeight: 1.2 }}>{card.team}</div>
        {!showValue && <div style={{ fontSize: 18, fontWeight: 900, color: '#9ca3af' }}>?</div>}
      </div>
      <div style={{ alignSelf: 'flex-end', transform: 'rotate(180deg)', lineHeight: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</div>
        <div style={{ fontSize: 10 }}>{STAT_ICON[stat]}</div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function Blackjack() {
  const [mode,        setMode]        = useState<Mode | null>(null)
  const [seasons,     setSeasons]     = useState<string[]>([])
  const [phase,       setPhase]       = useState<Phase>('idle')
  const [stat,        setStat]        = useState<StatType>('goals')
  const [season,      setSeason]      = useState('')
  const [playerHand,  setPlayerHand]  = useState<GameCard[]>([])
  const [dealerHand,  setDealerHand]  = useState<GameCard[]>([])
  const [result,      setResult]      = useState<Result | null>(null)
  const [reveal,      setReveal]      = useState(false)
  const [streak,      setStreak]      = useState(0)
  const [bestStreak,  setBestStreak]  = useState(0)
  const [username,    setUsername]    = useState('')
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [showLB,      setShowLB]      = useState(false)
  const [busy,        setBusy]        = useState(false)
  const [busting,     setBusting]     = useState(false)  // bust flash overlay
  const [newDeal,     setNewDeal]     = useState(false)  // pulsing new deal button

  const dealerRef = useRef<GameCard[]>([])
  const deckRef   = useRef<GameCard[]>([])
  const playerRef = useRef<GameCard[]>([])

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/blackjack?seasons=1').then(r => r.json()).then(setSeasons)
    fetch('/api/blackjack?leaderboard=1')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setLeaderboard(d))
    const saved = localStorage.getItem('bj_best_streak')
    if (saved) setBestStreak(parseInt(saved))
    const savedName = localStorage.getItem('bj_username')
    if (savedName) setUsername(savedName)
  }, [])

  const saveUsername = useCallback((name: string) => {
    setUsername(name)
    localStorage.setItem('bj_username', name)
  }, [])

  // ── Deal new hand ─────────────────────────────────────────────────────────────
  async function dealHand() {
    if (!mode || seasons.length === 0 || busy) return
    setBusy(true)
    setResult(null)
    setReveal(false)
    setBusting(false)
    setNewDeal(false)
    setPlayerHand([])
    setDealerHand([])
    dealerRef.current = []
    playerRef.current = []

    const newStat   = STATS[Math.floor(Math.random() * STATS.length)]
    const poolSize  = Math.min(seasons.length, 12)
    const newSeason = seasons[Math.floor(Math.random() * poolSize)]
    setStat(newStat)
    setSeason(newSeason)

    const res  = await fetch(`/api/blackjack?stat=${newStat}&season=${newSeason}`)
    const raw: RawCard[] = await res.json()
    if (!Array.isArray(raw) || raw.length < 4) { setBusy(false); return }

    const shuffled = shuffle(raw)
    const cards = shuffled.map((c, i): GameCard => ({ ...c, id: `${i}-${c.player}`, faceDown: false, animIn: false }))
    const [p1, d1, p2, d2] = cards
    deckRef.current = cards.slice(4)

    // Animate deal: p1 → d1 → p2 → d2(face-down)
    setTimeout(() => {
      const c = { ...p1, animIn: true }
      playerRef.current = [c]
      setPlayerHand([c])
    }, 0)
    setTimeout(() => {
      const c = { ...d1, animIn: true }
      dealerRef.current = [c]
      setDealerHand([c])
    }, 350)
    setTimeout(() => {
      const c = { ...p2, animIn: true }
      playerRef.current = [...playerRef.current, c]
      setPlayerHand([...playerRef.current])
    }, 700)
    setTimeout(() => {
      const c = { ...d2, faceDown: true, animIn: true }
      dealerRef.current = [...dealerRef.current, c]
      setDealerHand([...dealerRef.current])
      setBusy(false)

      // Check for immediate bust on initial deal
      const pTotal = allTotal(playerRef.current)
      if (pTotal > 21) {
        setTimeout(() => triggerBust(), 400)
      } else {
        setPhase('player')
      }
    }, 1050)
  }

  // ── Hit ───────────────────────────────────────────────────────────────────────
  function hit() {
    if (phase !== 'player' || busy || deckRef.current.length === 0) return
    const card = deckRef.current[0]
    deckRef.current = deckRef.current.slice(1)
    const newCard: GameCard = { ...card, animIn: true }
    const newHand = [...playerRef.current, newCard]
    playerRef.current = newHand
    setPlayerHand([...newHand])

    if (allTotal(newHand) > 21) {
      setTimeout(() => triggerBust(), 500)
    }
  }

  // ── Bust flow: flash → reveal dealer → dealer plays → new deal button ─────────
  function triggerBust() {
    setPhase('dealer')
    setBusting(true)
    // After bust flash, reveal dealer and play
    setTimeout(() => {
      setBusting(false)
      const revealed = dealerRef.current.map(c => ({ ...c, faceDown: false }))
      dealerRef.current = revealed
      setDealerHand([...revealed])
      setTimeout(() => playDealer(), 700)
    }, 1600)
  }

  // ── Stand → dealer plays ───────────────────────────────────────────────────────
  function stand() {
    if (phase !== 'player' || busy) return
    setPhase('dealer')
    const revealed = dealerRef.current.map(c => ({ ...c, faceDown: false }))
    dealerRef.current = revealed
    setDealerHand([...revealed])
    setTimeout(() => playDealer(), 600)
  }

  function playDealer() {
    const current = dealerRef.current
    const t = allTotal(current)
    if (t >= 17 || deckRef.current.length === 0) {
      endHand(current, playerRef.current)
      return
    }
    const card = deckRef.current[0]
    deckRef.current = deckRef.current.slice(1)
    const newCard: GameCard = { ...card, faceDown: false, animIn: true }
    const newHand = [...current, newCard]
    dealerRef.current = newHand
    setDealerHand([...newHand])
    setTimeout(playDealer, 900)
  }

  // ── Resolve ───────────────────────────────────────────────────────────────────
  function endHand(dHand: GameCard[], pHand: GameCard[]) {
    const pTotal  = allTotal(pHand)
    const dTotal  = allTotal(dHand)
    const pBusted = pTotal > 21
    const dBusted = dTotal > 21

    const r: Result = pBusted ? 'lose'
      : dBusted || pTotal > dTotal ? 'win'
      : pTotal < dTotal ? 'lose'
      : 'push'

    const revealedDealer = dHand.map(c => ({ ...c, faceDown: false }))
    dealerRef.current = revealedDealer
    setDealerHand([...revealedDealer])
    setReveal(true)
    setResult(r)
    setPhase('result')

    setStreak(prev => {
      const next = r === 'win' ? prev + 1 : r === 'lose' ? 0 : prev
      setBestStreak(best => {
        const newBest = Math.max(best, next)
        localStorage.setItem('bj_best_streak', String(newBest))
        if (r === 'lose' && prev > 0 && username) submitScore(prev)
        return newBest
      })
      return next
    })

    // Flash the new deal button into view
    setTimeout(() => setNewDeal(true), 400)
  }

  async function submitScore(finalStreak: number) {
    try {
      const res = await fetch('/api/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, streak: finalStreak, mode }),
      })
      const data = await res.json()
      if (Array.isArray(data)) setLeaderboard(data)
    } catch { /* silent */ }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const playerTotal  = allTotal(playerRef.current)
  const dealerShown  = phase === 'result' ? allTotal(dealerRef.current) : visibleTotal(dealerRef.current)
  const playerBusted = playerTotal > 21
  const dealerBusted = phase === 'result' && allTotal(dealerRef.current) > 21

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 16px 40px', gap: 16 }}>

      {/* Keyframe animations */}
      <style>{`
        @keyframes bust-in {
          0%   { transform: scale(0.3) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(2deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
        }
        @keyframes pulse-deal {
          0%, 100% { box-shadow: 0 4px 20px rgba(245,158,11,0.4); transform: scale(1); }
          50%       { box-shadow: 0 4px 40px rgba(245,158,11,0.9); transform: scale(1.05); }
        }
        @keyframes fade-bust {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* ── Mode selection ─────────────────────────────────────────────────────── */}
      {!mode && (
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 12, color: '#4ade80', letterSpacing: 4, fontWeight: 700, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 6px', letterSpacing: -1 }}>
            Topbins <span style={{ color: '#f59e0b' }}>Casino</span>
          </h1>
          <p style={{ color: '#8899bb', margin: '0 0 28px', fontSize: 13, lineHeight: 1.6 }}>
            The top 52 players from a random season and stat form the deck.<br/>
            Card value = their stat figure. Get closest to 21 without busting.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <button onClick={() => setMode('easy')} style={{
              padding: '24px 12px', borderRadius: 14, cursor: 'pointer',
              background: 'linear-gradient(135deg, #14532d, #166534)',
              border: '2px solid #22c55e', color: 'white',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🃏</div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Easy</div>
              <div style={{ fontSize: 11, color: '#86efac', marginTop: 5 }}>Stat values shown on cards</div>
            </button>
            <button onClick={() => setMode('hard')} style={{
              padding: '24px 12px', borderRadius: 14, cursor: 'pointer',
              background: 'linear-gradient(135deg, #7c2d12, #991b1b)',
              border: '2px solid #ef4444', color: 'white',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🂠</div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Hard</div>
              <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 5 }}>Stats hidden — revealed at end</div>
            </button>
          </div>
          {leaderboard.length > 0 && (
            <div style={{ background: '#111827', borderRadius: 12, padding: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 10, letterSpacing: 1 }}>HALL OF FAME</div>
              {leaderboard.slice(0, 5).map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1f2937', fontSize: 13 }}>
                  <span style={{ color: i === 0 ? '#f59e0b' : '#cbd5e1' }}>{i + 1}. {e.username}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>🔥 {e.streak} <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 11 }}>({e.mode})</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Game view ──────────────────────────────────────────────────────────── */}
      {mode && (
        <>
          {/* Top nav chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 540 }}>
            <button onClick={() => { setMode(null); setPhase('idle'); setResult(null); setReveal(false); setBusting(false); setNewDeal(false); setPlayerHand([]); setDealerHand([]) }}
              style={{ padding: '5px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>
              ← Menu
            </button>
            <div style={{ padding: '5px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', fontSize: 12, color: '#cbd5e1' }}>
              {mode === 'easy' ? '🃏 Easy' : '🂠 Hard'}
            </div>
            <div style={{ padding: '5px 12px', borderRadius: 20, background: streak > 0 ? '#78350f' : '#1f2937', border: `1px solid ${streak > 0 ? '#f59e0b' : '#374151'}`, fontSize: 12, color: streak > 0 ? '#fde68a' : '#8899bb' }}>
              🔥 {streak} {bestStreak > 0 ? `· Best: ${bestStreak}` : ''}
            </div>
            <button onClick={() => setShowLB(v => !v)} style={{ padding: '5px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>
              🏆 Board
            </button>
          </div>

          {/* Stat + Season — big display */}
          {season ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b', letterSpacing: -0.5, lineHeight: 1 }}>
                {STAT_ICON[stat]} {STAT_LABEL[stat]}
              </div>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: 3, letterSpacing: 1 }}>
                {season}
              </div>
            </div>
          ) : (
            <div style={{ height: 52 }} />
          )}

          {/* Casino table */}
          <div style={{
            width: '100%', maxWidth: 520,
            background: 'linear-gradient(135deg, #c9a84c 0%, #f0d060 40%, #c9a84c 70%, #a07828 100%)',
            borderRadius: 180, padding: 7,
            boxShadow: '0 16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
            position: 'relative',
          }}>
            {/* Felt */}
            <div style={{
              borderRadius: 170, overflow: 'hidden',
              background: 'radial-gradient(ellipse at 50% 30%, #236b35 0%, #1a5428 60%, #163f20 100%)',
              padding: '20px 28px',
              boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.5)',
              minHeight: 380, display: 'flex', flexDirection: 'column', gap: 0,
              position: 'relative',
            }}>

              {/* Bust flash overlay */}
              {busting && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(140,0,0,0.65)',
                  animation: 'fade-bust 1.6s ease-in-out forwards',
                  pointerEvents: 'none',
                  borderRadius: 170,
                }}>
                  <div style={{
                    fontSize: 72, fontWeight: 900, color: 'white',
                    textShadow: '0 0 40px #ff4444, 0 4px 8px rgba(0,0,0,0.6)',
                    letterSpacing: 6,
                    animation: 'bust-in 0.4s cubic-bezier(.22,.68,0,1.3) forwards',
                  }}>
                    BUST!
                  </div>
                </div>
              )}

              {/* Dealer row */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>DEALER</span>
                  {(phase === 'dealer' || phase === 'result') && dealerHand.length > 0 && (
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: '1px 9px', borderRadius: 20,
                      background: 'rgba(0,0,0,0.35)',
                      color: dealerBusted ? '#f87171' : 'rgba(255,255,255,0.85)',
                    }}>
                      {dealerBusted ? `BUST ${allTotal(dealerRef.current)}` : allTotal(dealerRef.current)}
                    </span>
                  )}
                  {phase === 'player' && dealerHand.length > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '1px 9px', borderRadius: 20, background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.5)' }}>
                      {visibleTotal(dealerHand)} + ?
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', minHeight: 155 }}>
                  {dealerHand.map(c => <PlayingCard key={c.id} card={c} stat={stat} mode={mode} reveal={reveal} />)}
                </div>
              </div>

              {/* Centre brand */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  background: 'rgba(0,0,0,0.18)', borderRadius: 40, padding: '8px 20px',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  {TB_LOGO}
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginTop: 1 }}>TOPBINS CASINO</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>♠  BLACKJACK  ♠</div>
                </div>
              </div>

              {/* Player row */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', minHeight: 155 }}>
                  {playerHand.map(c => <PlayingCard key={c.id} card={c} stat={stat} mode={mode} reveal={reveal} />)}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>YOU</span>
                  {playerHand.length > 0 && (
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: '1px 9px', borderRadius: 20,
                      background: 'rgba(0,0,0,0.35)',
                      color: playerBusted ? '#f87171' : playerTotal === 21 ? '#4ade80' : 'rgba(255,255,255,0.85)',
                    }}>
                      {playerBusted ? `BUST ${playerTotal}` : playerTotal === 21 ? '21 🎉' : playerTotal}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', minHeight: 54 }}>
            {phase === 'idle' && !busy && (
              <button onClick={dealHand} style={{
                padding: '13px 52px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none', color: '#111',
                boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
              }}>
                Deal
              </button>
            )}

            {phase === 'player' && !busy && !busting && (
              <>
                <button onClick={hit} style={{
                  padding: '13px 44px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  border: 'none', color: 'white',
                  boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
                }}>
                  Hit
                </button>
                <button onClick={stand} style={{
                  padding: '13px 44px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #374151, #1f2937)',
                  border: '2px solid #4b5563', color: 'white',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  Stand
                </button>
              </>
            )}

            {phase === 'dealer' && !busting && (
              <div style={{ fontSize: 14, color: '#8899bb', fontStyle: 'italic' }}>Dealer playing…</div>
            )}

            {phase === 'result' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{
                  padding: '10px 28px', borderRadius: 50,
                  background: result === 'win' ? 'rgba(21,128,61,0.35)' : result === 'lose' ? 'rgba(185,28,28,0.35)' : 'rgba(71,85,105,0.35)',
                  border: `2px solid ${result === 'win' ? '#22c55e' : result === 'lose' ? '#ef4444' : '#64748b'}`,
                  color: result === 'win' ? '#4ade80' : result === 'lose' ? '#f87171' : '#94a3b8',
                  fontSize: 17, fontWeight: 900,
                }}>
                  {result === 'win' ? `🎉 WIN${streak > 1 ? ` · ${streak} in a row!` : '!'}` : result === 'lose' ? '💀 Lose' : '🤝 Push'}
                </div>
                {newDeal && (
                  <button onClick={dealHand} style={{
                    padding: '13px 48px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none', color: '#111',
                    animation: 'pulse-deal 1.2s ease-in-out infinite',
                  }}>
                    New Hand
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Username row */}
          <input
            value={username}
            onChange={e => saveUsername(e.target.value)}
            placeholder="Your name for leaderboard"
            maxLength={20}
            style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 13,
              background: '#111827', border: '1px solid #374151',
              color: 'white', outline: 'none', width: 220, textAlign: 'center',
            }}
          />

          {/* Leaderboard */}
          {showLB && (
            <div style={{ width: '100%', maxWidth: 400, background: '#111827', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 12, letterSpacing: 1 }}>🏆 LONGEST STREAKS</div>
              {leaderboard.length === 0
                ? <div style={{ color: '#6b7280', fontSize: 13 }}>No entries yet. Be the first!</div>
                : leaderboard.map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1f2937', fontSize: 13 }}>
                    <span style={{ color: i < 3 ? '#f59e0b' : '#cbd5e1' }}>
                      {['🥇','🥈','🥉'][i] ?? `${i+1}.`} {e.username}
                    </span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                      🔥 {e.streak} <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 10 }}>({e.mode})</span>
                    </span>
                  </div>
                ))
              }
            </div>
          )}
        </>
      )}
    </div>
  )
}

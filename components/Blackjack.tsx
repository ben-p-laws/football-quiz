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
const SUIT_ICONS = ['♠', '♥', '♦', '♣']

// ─── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
function visibleTotal(cards: GameCard[]): number {
  return cards.filter(c => !c.faceDown).reduce((s, c) => s + c.value, 0)
}
function allTotal(cards: GameCard[]): number {
  return cards.reduce((s, c) => s + c.value, 0)
}

// ─── Card Component ─────────────────────────────────────────────────────────────
function PlayingCard({
  card, stat, mode, reveal,
}: { card: GameCard; stat: StatType; mode: Mode; reveal: boolean }) {
  const showValue = !card.faceDown && (mode === 'easy' || reveal)

  if (card.faceDown) {
    return (
      <div style={{
        width: 100, height: 150, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #1a2744 25%, #0d1b36 50%, #1a2744 75%)',
        border: '2px solid #3a5080',
        boxShadow: '0 6px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: card.animIn ? 'translateY(0) rotate(-1deg)' : 'translateY(-100px)',
        opacity: card.animIn ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Diamond pattern */}
        <div style={{ position: 'absolute', inset: 4, border: '2px solid rgba(255,255,255,0.08)', borderRadius: 7 }} />
        <div style={{ fontSize: 32, opacity: 0.25, letterSpacing: 2 }}>♦</div>
        <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>TB</div>
        <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 700, transform: 'rotate(180deg)' }}>TB</div>
      </div>
    )
  }

  return (
    <div style={{
      width: 100, height: 150, borderRadius: 10, flexShrink: 0,
      background: 'white', border: '1px solid #d1d5db',
      boxShadow: '0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)',
      display: 'flex', flexDirection: 'column', padding: '7px 8px',
      transform: card.animIn ? 'translateY(0)' : 'translateY(-100px)',
      opacity: card.animIn ? 1 : 0,
      transition: 'transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
    }}>
      {/* Top-left corner value */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: 17, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</span>
        <span style={{ fontSize: 11 }}>{STAT_ICON[stat]}</span>
      </div>

      {/* Center: player info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 3 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#111', lineHeight: 1.25, wordBreak: 'break-word' }}>
          {card.player}
        </div>
        <div style={{ fontSize: 8.5, color: '#6b7280', lineHeight: 1.2 }}>{card.team}</div>
        {!showValue && (
          <div style={{ fontSize: 14, fontWeight: 900, color: '#6b7280', marginTop: 4 }}>?</div>
        )}
      </div>

      {/* Bottom-right corner (inverted) */}
      <div style={{ alignSelf: 'flex-end', transform: 'rotate(180deg)', display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: 17, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</span>
        <span style={{ fontSize: 11 }}>{STAT_ICON[stat]}</span>
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

  // Refs for async dealer play (avoids stale closures)
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

  // ── Card factory ─────────────────────────────────────────────────────────────
  function makeCard(raw: RawCard, idx: number, faceDown = false): GameCard {
    return { ...raw, id: `${idx}-${raw.player}`, faceDown, animIn: false }
  }

  // ── Deal new hand ─────────────────────────────────────────────────────────────
  async function dealHand() {
    if (!mode || seasons.length === 0 || busy) return
    setBusy(true)
    setResult(null)
    setReveal(false)
    setPlayerHand([])
    setDealerHand([])
    dealerRef.current = []
    playerRef.current = []

    // Pick random stat + recent season
    const newStat   = STATS[Math.floor(Math.random() * STATS.length)]
    const poolSize  = Math.min(seasons.length, 12)
    const newSeason = seasons[Math.floor(Math.random() * poolSize)]
    setStat(newStat)
    setSeason(newSeason)

    const res  = await fetch(`/api/blackjack?stat=${newStat}&season=${newSeason}`)
    const raw: RawCard[] = await res.json()

    if (!Array.isArray(raw) || raw.length < 4) {
      setBusy(false)
      return
    }

    const shuffled = shuffle(raw)
    const cards    = shuffled.map((c, i) => makeCard(c, i))
    deckRef.current = cards.slice(4)

    const [p1, d1, p2, d2] = cards

    // Animate deal sequence: p1 → d1 → p2 → d2 (face-down)
    const deal = (card: GameCard, delay: number, faceDown = false) =>
      new Promise<void>(resolve =>
        setTimeout(() => {
          const c = { ...card, faceDown, animIn: true }
          if (faceDown) {
            dealerRef.current = [...dealerRef.current, c]
            setDealerHand([...dealerRef.current])
          } else if (dealerRef.current.length === 1 && playerRef.current.length === 0) {
            // Dealer already has d1, this is for player
          }
          resolve()
        }, delay)
      )

    // Sequence the 4 deals manually
    setTimeout(() => {
      const c = { ...p1, animIn: true }
      playerRef.current = [c]
      setPlayerHand([c])
    }, 0)

    setTimeout(() => {
      const c = { ...d1, animIn: true }
      dealerRef.current = [c]
      setDealerHand([c])
    }, 400)

    setTimeout(() => {
      const c = { ...p2, animIn: true }
      playerRef.current = [...playerRef.current, c]
      setPlayerHand([...playerRef.current])
    }, 800)

    setTimeout(() => {
      const c = { ...d2, faceDown: true, animIn: true }
      dealerRef.current = [...dealerRef.current, c]
      setDealerHand([...dealerRef.current])
      setPhase('player')
      setBusy(false)
    }, 1200)
  }

  // ── Hit ───────────────────────────────────────────────────────────────────────
  function hit() {
    if (phase !== 'player' || busy || deckRef.current.length === 0) return
    const card = deckRef.current[0]
    deckRef.current = deckRef.current.slice(1)
    const newCard = { ...card, animIn: true }
    const newHand = [...playerRef.current, newCard]
    playerRef.current = newHand
    setPlayerHand([...newHand])

    if (allTotal(newHand) > 21) {
      setTimeout(() => endHand(dealerRef.current, newHand, true), 500)
    }
  }

  // ── Stand → dealer plays ───────────────────────────────────────────────────────
  function stand() {
    if (phase !== 'player' || busy) return
    setPhase('dealer')
    // Reveal dealer's hidden card
    const revealed = dealerRef.current.map(c => ({ ...c, faceDown: false }))
    dealerRef.current = revealed
    setDealerHand([...revealed])
    setTimeout(() => playDealer(), 600)
  }

  function playDealer() {
    const current = dealerRef.current
    const t = allTotal(current)
    if (t >= 17) {
      endHand(current, playerRef.current, false)
      return
    }
    if (deckRef.current.length === 0) {
      endHand(current, playerRef.current, false)
      return
    }
    const card = deckRef.current[0]
    deckRef.current = deckRef.current.slice(1)
    const newCard = { ...card, faceDown: false, animIn: true }
    const newHand = [...current, newCard]
    dealerRef.current = newHand
    setDealerHand([...newHand])
    setTimeout(playDealer, 900)
  }

  // ── Resolve ───────────────────────────────────────────────────────────────────
  function endHand(dHand: GameCard[], pHand: GameCard[], playerBusted: boolean) {
    const pTotal = allTotal(pHand)
    const dTotal = allTotal(dHand)
    let r: Result
    if (playerBusted || pTotal > 21) {
      r = 'lose'
    } else if (dTotal > 21 || pTotal > dTotal) {
      r = 'win'
    } else if (pTotal < dTotal) {
      r = 'lose'
    } else {
      r = 'push'
    }

    // Reveal all cards in hard mode
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
        if (r === 'lose' && prev > 0 && username) {
          submitScore(prev)
        }
        return newBest
      })
      return next
    })
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

  // ── Derived display values ────────────────────────────────────────────────────
  const playerTotal  = allTotal(playerRef.current)
  const dealerTotal  = phase === 'result' ? allTotal(dealerRef.current) : visibleTotal(dealerRef.current)
  const playerBusted = playerTotal > 21
  const dealerBusted = phase === 'result' && allTotal(dealerRef.current) > 21

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: 'white', padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

      {/* ── Mode selection overlay ─────────────────────────────────────────────── */}
      {!mode && (
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 13, color: '#4ade80', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>
            ♠ ♥ ♦ ♣
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 4px', letterSpacing: -1 }}>
            Topbins <span style={{ color: '#f59e0b' }}>Casino</span>
          </h1>
          <p style={{ color: '#8899bb', margin: '0 0 32px', fontSize: 14 }}>
            Football Blackjack — top 52 players from a random season and stat form the deck.
            Get closest to 21 without busting.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <button onClick={() => setMode('easy')} style={{
              padding: '28px 16px', borderRadius: 16, cursor: 'pointer',
              background: 'linear-gradient(135deg, #166534, #15803d)',
              border: '2px solid #22c55e', color: 'white',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🃏</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Easy</div>
              <div style={{ fontSize: 12, color: '#86efac', marginTop: 6 }}>Stat values shown on cards</div>
            </button>

            <button onClick={() => setMode('hard')} style={{
              padding: '28px 16px', borderRadius: 16, cursor: 'pointer',
              background: 'linear-gradient(135deg, #7c2d12, #b91c1c)',
              border: '2px solid #ef4444', color: 'white',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🂠</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Hard</div>
              <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>Stats hidden — revealed at end</div>
            </button>
          </div>

          {/* Leaderboard preview */}
          {leaderboard.length > 0 && (
            <div style={{ background: '#111827', borderRadius: 12, padding: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 10, letterSpacing: 1 }}>HALL OF FAME</div>
              {leaderboard.slice(0, 5).map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937', fontSize: 13 }}>
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
          {/* Info bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 620 }}>
            <button onClick={() => { setMode(null); setPhase('idle'); setResult(null); setReveal(false); setPlayerHand([]); setDealerHand([]); }}
              style={{ padding: '4px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>
              ← Menu
            </button>
            <div style={{ padding: '4px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', fontSize: 12, color: '#cbd5e1' }}>
              {mode === 'easy' ? '🃏 Easy' : '🂠 Hard'}
            </div>
            {season && (
              <div style={{ padding: '4px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', fontSize: 12, color: '#cbd5e1' }}>
                {STAT_ICON[stat]} {STAT_LABEL[stat]} · {season}
              </div>
            )}
            <div style={{ padding: '4px 12px', borderRadius: 20, background: streak > 0 ? '#78350f' : '#1f2937', border: `1px solid ${streak > 0 ? '#f59e0b' : '#374151'}`, fontSize: 12, color: streak > 0 ? '#fde68a' : '#8899bb' }}>
              🔥 Streak: {streak} {bestStreak > 0 ? `· Best: ${bestStreak}` : ''}
            </div>
            <button onClick={() => setShowLB(v => !v)}
              style={{ padding: '4px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>
              🏆 Board
            </button>
          </div>

          {/* Casino table */}
          <div style={{
            width: '100%', maxWidth: 620,
            background: 'linear-gradient(160deg, #b8960c 0%, #f0c040 50%, #b8960c 100%)',
            borderRadius: 200, padding: 8,
            boxShadow: '0 12px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)',
          }}>
            <div style={{
              borderRadius: 190, overflow: 'hidden',
              background: 'linear-gradient(180deg, #1a5c2a 0%, #1f6e33 40%, #1d6530 60%, #1a5c2a 100%)',
              padding: '28px 24px 24px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4), inset 0 -2px 8px rgba(0,0,0,0.3)',
              minHeight: 460, display: 'flex', flexDirection: 'column',
            }}>

              {/* Dealer section */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>DEALER</span>
                  {(phase === 'dealer' || phase === 'result') && dealerHand.length > 0 && (
                    <span style={{
                      fontSize: 13, fontWeight: 800,
                      color: dealerBusted ? '#f87171' : 'rgba(255,255,255,0.9)',
                      background: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: '2px 10px',
                    }}>
                      {dealerBusted ? `BUST ${allTotal(dealerRef.current)}` : allTotal(dealerRef.current)}
                    </span>
                  )}
                  {phase === 'player' && dealerHand.length > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: '2px 10px' }}>
                      {visibleTotal(dealerHand)} + ?
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', minHeight: 150 }}>
                  {dealerHand.map(c => (
                    <PlayingCard key={c.id} card={c} stat={stat} mode={mode!} reveal={reveal} />
                  ))}
                </div>
              </div>

              {/* Center brand */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 50, padding: '10px 28px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, marginBottom: 2 }}>
                    {SUIT_ICONS.join('  ')}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>
                    TOPBINS CASINO
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginTop: 1 }}>
                    BLACKJACK
                  </div>
                </div>
              </div>

              {/* Player section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>YOU</span>
                  {playerHand.length > 0 && (
                    <span style={{
                      fontSize: 13, fontWeight: 800,
                      color: playerBusted ? '#f87171' : playerTotal === 21 ? '#4ade80' : 'rgba(255,255,255,0.9)',
                      background: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: '2px 10px',
                    }}>
                      {playerBusted ? `BUST ${playerTotal}` : playerTotal === 21 ? `21 🎉` : playerTotal}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', minHeight: 150 }}>
                  {playerHand.map(c => (
                    <PlayingCard key={c.id} card={c} stat={stat} mode={mode!} reveal={reveal} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {phase === 'idle' && (
              <button onClick={dealHand} disabled={busy || seasons.length === 0}
                style={{
                  padding: '14px 48px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none', color: '#111',
                  boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                  opacity: busy ? 0.6 : 1,
                }}>
                {busy ? 'Dealing…' : 'Deal'}
              </button>
            )}

            {phase === 'player' && !busy && (
              <>
                <button onClick={hit}
                  style={{
                    padding: '14px 40px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    border: 'none', color: 'white',
                    boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
                  }}>
                  Hit
                </button>
                <button onClick={stand}
                  style={{
                    padding: '14px 40px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #374151, #1f2937)',
                    border: '2px solid #4b5563', color: 'white',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}>
                  Stand
                </button>
              </>
            )}

            {phase === 'dealer' && (
              <div style={{ fontSize: 14, color: '#8899bb', fontStyle: 'italic' }}>Dealer playing…</div>
            )}

            {phase === 'result' && (
              <>
                {/* Result banner */}
                <div style={{
                  padding: '12px 32px', borderRadius: 50,
                  background: result === 'win' ? 'rgba(21,128,61,0.3)' : result === 'lose' ? 'rgba(185,28,28,0.3)' : 'rgba(71,85,105,0.3)',
                  border: `2px solid ${result === 'win' ? '#22c55e' : result === 'lose' ? '#ef4444' : '#64748b'}`,
                  color: result === 'win' ? '#4ade80' : result === 'lose' ? '#f87171' : '#94a3b8',
                  fontSize: 18, fontWeight: 900,
                }}>
                  {result === 'win' ? '🎉 WIN! ' + (streak > 1 ? `${streak} in a row!` : '') : result === 'lose' ? '💀 BUST / LOSE' : '🤝 PUSH'}
                </div>
                <button onClick={dealHand} disabled={busy}
                  style={{
                    padding: '14px 40px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none', color: '#111',
                    boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                  }}>
                  Next Hand
                </button>
              </>
            )}
          </div>

          {/* Username input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={username}
              onChange={e => saveUsername(e.target.value)}
              placeholder="Your name (for leaderboard)"
              maxLength={20}
              style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 13,
                background: '#111827', border: '1px solid #374151',
                color: 'white', outline: 'none', width: 220,
              }}
            />
          </div>

          {/* Leaderboard panel */}
          {showLB && (
            <div style={{ width: '100%', maxWidth: 420, background: '#111827', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 14, letterSpacing: 1 }}>🏆 HALL OF FAME — LONGEST STREAKS</div>
              {leaderboard.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 13 }}>No entries yet. Be the first!</div>
              ) : leaderboard.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1f2937', fontSize: 14 }}>
                  <span style={{ color: i < 3 ? '#f59e0b' : '#cbd5e1' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {e.username}
                  </span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                    🔥 {e.streak} <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 11 }}>({e.mode})</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

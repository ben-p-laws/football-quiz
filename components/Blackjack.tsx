'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type StatType = 'goals' | 'assists' | 'yellow_cards' | 'clean_sheets' | 'club_seasons'
type Mode     = 'easy' | 'hard' | 'expert'
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
  club_seasons: 'Seasons at Club',
}
const STAT_ICON: Record<StatType, string> = {
  goals: '⚽', assists: '🎯', yellow_cards: '🟨', clean_sheets: '🧤',
  club_seasons: '🏟️',
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

// TB badge — matches the Chrome tab favicon exactly (navy bg, white T, red B)
function TbBadge({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#0a0f1e"/>
      <text x="2" y="23" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="18" fill="white">T</text>
      <text x="17" y="23" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="18" fill="#dc2626">B</text>
    </svg>
  )
}

// Full TB logo for table centre / watermark (larger contexts only)
let _tbLogoSeq = 0
function TbMiniLogo({ size = 12 }: { size?: number }) {
  const clipId = useRef(`tbml-${++_tbLogoSeq}`).current
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs><clipPath id={clipId}><circle cx="17" cy="15" r="6.1"/></clipPath></defs>
      <rect width="32" height="32" rx="7" fill="#0a0f1e"/>
      <rect width="28" height="4" fill="#e2e8f0"/>
      <rect x="24" y="4" width="4" height="28" fill="#e2e8f0"/>
      <line x1="4"  y1="4" x2="2"  y2="32" stroke="#334155" strokeWidth="0.8"/>
      <line x1="9"  y1="4" x2="7"  y2="32" stroke="#334155" strokeWidth="0.8"/>
      <line x1="14" y1="4" x2="12" y2="32" stroke="#334155" strokeWidth="0.8"/>
      <line x1="19" y1="4" x2="17" y2="32" stroke="#334155" strokeWidth="0.8"/>
      <line x1="0" y1="9"  x2="24" y2="9"  stroke="#334155" strokeWidth="0.8"/>
      <line x1="0" y1="14" x2="24" y2="14" stroke="#334155" strokeWidth="0.8"/>
      <line x1="0" y1="19" x2="24" y2="19" stroke="#334155" strokeWidth="0.8"/>
      <line x1="0" y1="24" x2="24" y2="24" stroke="#334155" strokeWidth="0.8"/>
      <circle cx="17" cy="15" r="6.2" fill="white"/>
      <circle cx="17" cy="15" r="7.2" fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.5"/>
      <g clipPath={`url(#${clipId})`}>
        <path transform="translate(16.5,12.5)" fill="#dc2626" d="M0,-4 L0.95,-1.31 L3.8,-1.24 L1.53,0.5 L2.35,3.24 L0,1.6 L-2.35,3.24 L-1.53,0.5 L-3.8,-1.24 L-0.95,-1.31 Z"/>
        <path transform="translate(13,17.5)"   fill="#dc2626" d="M0,-4 L0.95,-1.31 L3.8,-1.24 L1.53,0.5 L2.35,3.24 L0,1.6 L-2.35,3.24 L-1.53,0.5 L-3.8,-1.24 L-0.95,-1.31 Z"/>
        <path transform="translate(21,17.5)"   fill="#dc2626" d="M0,-4 L0.95,-1.31 L3.8,-1.24 L1.53,0.5 L2.35,3.24 L0,1.6 L-2.35,3.24 L-1.53,0.5 L-3.8,-1.24 L-0.95,-1.31 Z"/>
      </g>
    </svg>
  )
}

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
        width: 82, height: 124, borderRadius: 8, flexShrink: 0,
        background: '#0a0f1e',
        border: '2px solid #dc2626',
        boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: card.animIn ? 'translateY(0) rotate(-1deg)' : 'translateY(-120px)',
        opacity: card.animIn ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid pattern matching site */}
        <svg style={{ position: 'absolute', inset: 0 }} width="82" height="124" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="0" x2="20" y2="124" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="40" y1="0" x2="40" y2="124" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="60" y1="0" x2="60" y2="124" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="25" x2="82" y2="25" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="50" x2="82" y2="50" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="75" x2="82" y2="75" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="100" x2="82" y2="100" stroke="#1e2d4a" strokeWidth="1"/>
        </svg>
        {/* Inner red border frame */}
        <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(220,38,38,0.3)', borderRadius: 4 }} />
        {/* Centre TB logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <TbMiniLogo size={38} />
        </div>
        {/* Corner logos */}
        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 1 }}>
          <TbBadge size={11} />
        </div>
        <div style={{ position: 'absolute', bottom: 6, right: 6, transform: 'rotate(180deg)', zIndex: 1 }}>
          <TbBadge size={11} />
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: 82, height: 124, borderRadius: 8, flexShrink: 0,
      background: 'white', border: '1px solid #d1d5db',
      boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      position: 'relative', overflow: 'hidden',
      transform: card.animIn ? 'translateY(0)' : 'translateY(-120px)',
      opacity: card.animIn ? 1 : 0,
      transition: 'transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
    }}>
      {/* Faint centre watermark */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.11, pointerEvents: 'none', zIndex: 0 }}>
        <TbMiniLogo size={50} />
      </div>
      {/* Top-left corner */}
      <div style={{ position: 'absolute', top: 6, left: 7, lineHeight: 1, zIndex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</div>
        <div style={{ fontSize: 9 }}>{STAT_ICON[stat]}</div>
      </div>
      {/* Top-right corner: TB badge */}
      <div style={{ position: 'absolute', top: 5, right: 5, zIndex: 1 }}>
        <TbBadge size={13} />
      </div>
      {/* Centre: player name + team */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 62, textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#111', lineHeight: 1.2, wordBreak: 'break-word' }}>{card.player}</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#1f2937', lineHeight: 1.2, marginTop: 2 }}>{card.team}</div>
        {!showValue && <div style={{ fontSize: 16, fontWeight: 900, color: '#9ca3af', marginTop: 3 }}>?</div>}
      </div>
      {/* Bottom-left corner: TB badge (inverted) */}
      <div style={{ position: 'absolute', bottom: 5, left: 5, transform: 'rotate(180deg)', zIndex: 1 }}>
        <TbBadge size={13} />
      </div>
      {/* Bottom-right corner: stat value + icon (inverted) */}
      <div style={{ position: 'absolute', bottom: 6, right: 7, transform: 'rotate(180deg)', lineHeight: 1, zIndex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</div>
        <div style={{ fontSize: 9 }}>{STAT_ICON[stat]}</div>
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
  const [busy,           setBusy]           = useState(false)
  const [busting,        setBusting]        = useState(false)
  const [newDeal,        setNewDeal]        = useState(false)
  const [blackjackFlash, setBlackjackFlash] = useState(false)
  const [hadBlackjack,   setHadBlackjack]   = useState(false)
  const [pendingBust,      setPendingBust]      = useState(false)
  const [pendingBlackjack, setPendingBlackjack] = useState(false)
  const [nextCard,         setNextCard]         = useState<GameCard | null>(null)

  const dealerRef       = useRef<GameCard[]>([])
  const deckRef         = useRef<GameCard[]>([])
  const playerRef       = useRef<GameCard[]>([])
  const hadBlackjackRef = useRef(false)

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
    setBlackjackFlash(false)
    setHadBlackjack(false)
    setPendingBust(false)
    setPendingBlackjack(false)
    setNextCard(null)
    hadBlackjackRef.current = false
    setPlayerHand([])
    setDealerHand([])
    dealerRef.current = []
    playerRef.current = []

    const newStat: StatType = Math.random() < 0.25
      ? 'club_seasons'
      : STATS[Math.floor(Math.random() * STATS.length)]
    setStat(newStat)

    let fetchUrl: string
    if (newStat === 'club_seasons') {
      setSeason('All Time')
      fetchUrl = '/api/blackjack?stat=club_seasons'
    } else {
      const newSeason = seasons[Math.floor(Math.random() * seasons.length)]
      setSeason(newSeason)
      fetchUrl = `/api/blackjack?stat=${newStat}&season=${newSeason}`
    }

    const res  = await fetch(fetchUrl)
    const raw: RawCard[] = await res.json()
    if (!Array.isArray(raw) || raw.length < 4) { setBusy(false); return }

    const shuffled = shuffle(raw)

    // Guarantee the initial 2 player cards don't bust — scan for valid pair
    let p1Idx = 0, p2Idx = -1
    outer:
    for (let i = 0; i < Math.min(shuffled.length, 40); i++) {
      for (let j = i + 1; j < Math.min(shuffled.length, 40); j++) {
        if (shuffled[i].value + shuffled[j].value <= 21) {
          p1Idx = i; p2Idx = j; break outer
        }
      }
    }
    if (p2Idx === -1) { p1Idx = 0; p2Idx = 1 } // fallback (all combos bust — extremely rare)

    const mk = (c: RawCard, idx: number, fd = false): GameCard =>
      ({ ...c, id: `${idx}-${c.player}`, faceDown: fd, animIn: false })

    const playerSet  = new Set([p1Idx, p2Idx])
    const afterPlayer = shuffled.filter((_, i) => !playerSet.has(i))
    const p1 = mk(shuffled[p1Idx], 0)
    const p2 = mk(shuffled[p2Idx], 1)

    // Guarantee the initial 2 dealer cards don't bust
    let d1Idx = 0, d2Idx = -1
    outerD:
    for (let i = 0; i < Math.min(afterPlayer.length, 40); i++) {
      for (let j = i + 1; j < Math.min(afterPlayer.length, 40); j++) {
        if (afterPlayer[i].value + afterPlayer[j].value <= 21) {
          d1Idx = i; d2Idx = j; break outerD
        }
      }
    }
    if (d2Idx === -1) { d1Idx = 0; d2Idx = 1 }

    const dealerSet = new Set([d1Idx, d2Idx])
    const d1 = mk(afterPlayer[d1Idx], 2)
    const d2 = mk(afterPlayer[d2Idx], 3, true)
    deckRef.current = afterPlayer.filter((_, i) => !dealerSet.has(i)).map((c, i) => mk(c, i + 4))
    if (mode === 'expert') setNextCard(deckRef.current[0] || null)

    // Animate deal: p1 → d1 → p2 → d2(face-down)
    setTimeout(() => {
      playerRef.current = [{ ...p1, animIn: true }]
      setPlayerHand([...playerRef.current])
    }, 0)
    setTimeout(() => {
      dealerRef.current = [{ ...d1, animIn: true }]
      setDealerHand([...dealerRef.current])
    }, 600)
    setTimeout(() => {
      playerRef.current = [...playerRef.current, { ...p2, animIn: true }]
      setPlayerHand([...playerRef.current])
    }, 900)
    setTimeout(() => {
      dealerRef.current = [...dealerRef.current, { ...d2, animIn: true }]
      setDealerHand([...dealerRef.current])
      setBusy(false)

      const pTotal = p1.value + p2.value
      if (pTotal === 21) {
        setHadBlackjack(true)
        hadBlackjackRef.current = true
        setPhase('dealer')
        setBlackjackFlash(true)
        setTimeout(() => {
          setBlackjackFlash(false)
          const revealed = dealerRef.current.map(c => ({ ...c, faceDown: false }))
          dealerRef.current = revealed
          setDealerHand([...revealed])
          setTimeout(() => playDealer(), 700)
        }, 1600)
      } else {
        setPhase('player')
      }
    }, 1350)
  }

  // ── Hit ───────────────────────────────────────────────────────────────────────
  function hit() {
    if (phase !== 'player' || busy || deckRef.current.length === 0) return
    const card = deckRef.current[0]
    deckRef.current = deckRef.current.slice(1)
    if (mode === 'expert') setNextCard(deckRef.current[0] || null)
    const newCard: GameCard = { ...card, animIn: true }
    const newHand = [...playerRef.current, newCard]
    playerRef.current = newHand
    setPlayerHand([...newHand])

    const total = allTotal(newHand)
    if (total > 21) {
      if (mode === 'easy') {
        setTimeout(() => triggerBust(), 500)
      } else {
        setPendingBust(true)
      }
    } else if (total === 21) {
      if (mode === 'easy') {
        setPhase('dealer')
        setBlackjackFlash(true)
        setTimeout(() => {
          setBlackjackFlash(false)
          const revealed = dealerRef.current.map(c => ({ ...c, faceDown: false }))
          dealerRef.current = revealed
          setDealerHand([...revealed])
          setTimeout(() => playDealer(), 700)
        }, 1600)
      } else {
        setPendingBlackjack(true)
      }
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
    if (pendingBust) {
      setPendingBust(false)
      setTimeout(() => triggerBust(), 0)
      return
    }
    if (pendingBlackjack) {
      setPendingBlackjack(false)
      setPhase('dealer')
      setBlackjackFlash(true)
      setTimeout(() => {
        setBlackjackFlash(false)
        const revealed = dealerRef.current.map(c => ({ ...c, faceDown: false }))
        dealerRef.current = revealed
        setDealerHand([...revealed])
        setTimeout(() => playDealer(), 700)
      }, 1600)
      return
    }
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
    setTimeout(playDealer, 1100)
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
      const next = r === 'win' ? prev + (hadBlackjackRef.current ? 2 : 1) : r === 'lose' ? 0 : prev
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
        @keyframes bj-in {
          0%   { transform: scale(0.3) rotate(8deg);  opacity: 0; }
          60%  { transform: scale(1.1) rotate(-2deg); opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
        }
        @keyframes fade-bj {
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
          <p style={{ color: '#8899bb', margin: '0 0 20px', fontSize: 13, lineHeight: 1.6 }}>
            The top 52 players from a random season and stat form the deck.<br/>
            Card value = their stat figure. Get closest to 21 without busting.
          </p>
          <input
            value={username}
            onChange={e => saveUsername(e.target.value)}
            placeholder="Enter your name for the leaderboard"
            maxLength={20}
            style={{
              padding: '10px 18px', borderRadius: 20, fontSize: 13, marginBottom: 20,
              background: '#111827', border: '1px solid #374151',
              color: 'white', outline: 'none', width: '100%', textAlign: 'center',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
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
          <button onClick={() => setMode('expert')} style={{
            width: '100%', padding: '20px 12px', borderRadius: 14, cursor: 'pointer',
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            border: '2px solid #818cf8', color: 'white', marginBottom: 24,
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔮</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Expert</div>
            <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 5 }}>
              Stats hidden — but the next card is always shown. Use your knowledge.
            </div>
          </button>
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
            <button onClick={() => { setMode(null); setPhase('idle'); setResult(null); setReveal(false); setBusting(false); setNewDeal(false); setBlackjackFlash(false); setHadBlackjack(false); setPendingBust(false); setPendingBlackjack(false); setNextCard(null); setPlayerHand([]); setDealerHand([]) }}
              style={{ padding: '5px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>
              ← Menu
            </button>
            <div style={{ padding: '5px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', fontSize: 12, color: '#cbd5e1' }}>
              {mode === 'easy' ? '🃏 Easy' : mode === 'hard' ? '🂠 Hard' : '🔮 Expert'}
            </div>
            <div style={{ padding: '5px 12px', borderRadius: 20, background: streak > 0 ? '#78350f' : '#1f2937', border: `1px solid ${streak > 0 ? '#f59e0b' : '#374151'}`, fontSize: 12, color: streak > 0 ? '#fde68a' : '#8899bb' }}>
              🔥 {streak} {bestStreak > 0 ? `· Best: ${bestStreak}` : ''}
            </div>
            <button onClick={() => setShowLB(v => !v)} style={{ padding: '5px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>
              🏆 Board
            </button>
          </div>


          {/* Casino table */}
          <div style={{
            width: '100%', maxWidth: 450,
            background: 'linear-gradient(135deg, #c9a84c 0%, #f0d060 40%, #c9a84c 70%, #a07828 100%)',
            borderRadius: 150, padding: 7,
            boxShadow: '0 16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
            position: 'relative',
          }}>
            {/* Felt */}
            <div style={{
              borderRadius: 142, overflow: 'hidden',
              background: 'radial-gradient(ellipse at 50% 30%, #236b35 0%, #1a5428 60%, #163f20 100%)',
              padding: '18px 24px',
              boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.5)',
              minHeight: 330, display: 'flex', flexDirection: 'column', gap: 0,
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
                  borderRadius: 142,
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

              {/* Blackjack flash overlay (easy mode) */}
              {blackjackFlash && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,80,20,0.70)',
                  animation: 'fade-bj 1.6s ease-in-out forwards',
                  pointerEvents: 'none',
                  borderRadius: 142,
                }}>
                  <div style={{
                    fontSize: 52, fontWeight: 900, color: '#f59e0b',
                    textShadow: '0 0 40px #fde68a, 0 4px 8px rgba(0,0,0,0.6)',
                    letterSpacing: 4,
                    animation: 'bj-in 0.4s cubic-bezier(.22,.68,0,1.3) forwards',
                  }}>
                    BLACKJACK!
                  </div>
                </div>
              )}

              {/* Dealer row */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>DEALER</span>
                  {(phase === 'dealer' || phase === 'result') && dealerHand.length > 0 && (mode === 'easy' || reveal) && (
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: '1px 9px', borderRadius: 20,
                      background: 'rgba(0,0,0,0.35)',
                      color: dealerBusted ? '#f87171' : 'rgba(255,255,255,0.85)',
                    }}>
                      {dealerBusted ? `BUST ${allTotal(dealerRef.current)}` : allTotal(dealerRef.current)}
                    </span>
                  )}
                  {phase === 'player' && dealerHand.length > 0 && mode === 'easy' && (
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '1px 9px', borderRadius: 20, background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.5)' }}>
                      {visibleTotal(dealerHand)} + ?
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', minHeight: 128, alignItems: 'flex-start' }}>
                  {dealerHand.map((c, i) => (
                    <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -18, zIndex: i, position: 'relative' }}>
                      <PlayingCard card={c} stat={stat} mode={mode} reveal={reveal} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Side logos + TOPBINS CASINO text */}
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center center', opacity: 0.45, zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <TbMiniLogo size={22} />
                <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: 2.5 }}>TOPBINS CASINO</div>
              </div>
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', transformOrigin: 'center center', opacity: 0.45, zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <TbMiniLogo size={22} />
                <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: 2.5 }}>TOPBINS CASINO</div>
              </div>

              {/* Centre stat + New Hand overlay */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 0', position: 'relative' }}>
                {/* New Hand button — pops up here when result is ready */}
                {phase === 'result' && newDeal && (
                  <button onClick={dealHand} style={{
                    position: 'absolute', zIndex: 20,
                    padding: '12px 40px', borderRadius: 50, fontSize: 15, fontWeight: 800,
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: '3px solid rgba(255,255,255,0.3)', color: '#111',
                    animation: 'pulse-deal 1.2s ease-in-out infinite',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}>
                    New Hand
                  </button>
                )}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  background: 'rgba(0,0,0,0.18)', borderRadius: 40, padding: '7px 18px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  opacity: phase === 'result' && newDeal ? 0.25 : 1,
                  textAlign: 'center',
                }}>
                  {season ? (
                    <>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#f59e0b', lineHeight: 1.1, letterSpacing: -0.3 }}>
                        {STAT_ICON[stat]} {STAT_LABEL[stat]}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1 }}>
                        {season}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>TOPBINS CASINO</div>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 2 }}>♠  BLACKJACK  ♠</div>
                    </>
                  )}
                </div>
              </div>

              {/* Player row */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'center', minHeight: 128, alignItems: 'flex-start' }}>
                  {playerHand.map((c, i) => (
                    <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -18, zIndex: i, position: 'relative' }}>
                      <PlayingCard card={c} stat={stat} mode={mode} reveal={reveal} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>YOU</span>
                  {playerHand.length > 0 && (mode === 'easy' || reveal) && (
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

            {/* Expert mode: next card — absolutely positioned to the right of the table */}
            {mode === 'expert' && phase === 'player' && nextCard && !pendingBlackjack && (
              <div style={{
                position: 'absolute', right: -94, top: '50%', transform: 'translateY(-50%)',
                zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(129,140,248,0.7)', letterSpacing: 2.5, whiteSpace: 'nowrap' }}>NEXT CARD</div>
                <div style={{ filter: 'drop-shadow(0 0 10px rgba(129,140,248,0.55))' }}>
                  <PlayingCard card={{ ...nextCard, faceDown: false, animIn: true }} stat={stat} mode="hard" reveal={false} />
                </div>
              </div>
            )}
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
                <button onClick={hit} disabled={pendingBlackjack} style={{
                  padding: '13px 44px', borderRadius: 50, fontSize: 16, fontWeight: 800,
                  cursor: pendingBlackjack ? 'not-allowed' : 'pointer',
                  background: pendingBlackjack
                    ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  border: 'none', color: 'white',
                  boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
                  opacity: pendingBlackjack ? 0.5 : 1,
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  padding: '10px 28px', borderRadius: 50,
                  background: result === 'win' ? 'rgba(21,128,61,0.35)' : result === 'lose' ? 'rgba(185,28,28,0.35)' : 'rgba(71,85,105,0.35)',
                  border: `2px solid ${result === 'win' ? '#22c55e' : result === 'lose' ? '#ef4444' : '#64748b'}`,
                  color: result === 'win' ? '#4ade80' : result === 'lose' ? '#f87171' : '#94a3b8',
                  fontSize: 17, fontWeight: 900,
                }}>
                  {result === 'win' ? `🎉 WIN${streak > 1 ? ` · ${streak} in a row!` : '!'}` : result === 'lose' ? '💀 Lose' : '🤝 Push'}
                </div>
                {hadBlackjack && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', letterSpacing: 2 }}>
                    ♠ BLACKJACK ♠
                  </div>
                )}
              </div>
            )}
          </div>

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

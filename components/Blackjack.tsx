'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type StatType = 'goals' | 'assists' | 'yellow_cards' | 'clean_sheets' | 'club_seasons'
type Phase    = 'idle' | 'betting' | 'player' | 'dealer' | 'result'
type Result   = 'win' | 'lose' | 'push'

interface RawCard  { player: string; team: string; value: number }
interface GameCard extends RawCard { id: string; faceDown: boolean; animIn: boolean }

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
const CHIP_AMOUNTS = [10, 20, 30, 40, 50]
const CHIP_CFG: Record<number, { bg: string; stripe: string; text: string }> = {
  10: { bg: '#f1f5f9', stripe: '#dc2626', text: '#1f2937' },
  20: { bg: '#1d4ed8', stripe: '#bfdbfe', text: 'white'   },
  30: { bg: '#15803d', stripe: '#bbf7d0', text: 'white'   },
  40: { bg: '#c2410c', stripe: '#fed7aa', text: 'white'   },
  50: { bg: '#1e1b4b', stripe: '#c7d2fe', text: 'white'   },
}
const STARTING_CHIPS = 50
const GOAL_CHIPS     = 250

// ─── SVG helpers ───────────────────────────────────────────────────────────────
function TbBadge({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#0a0f1e"/>
      <text x="2" y="23" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="18" fill="white">T</text>
      <text x="17" y="23" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="18" fill="#dc2626">B</text>
    </svg>
  )
}

let _seq = 0
function TbMiniLogo({ size = 12 }: { size?: number }) {
  const id = useRef(`tbml-${++_seq}`).current
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs><clipPath id={id}><circle cx="17" cy="15" r="6.1"/></clipPath></defs>
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
      <g clipPath={`url(#${id})`}>
        <path transform="translate(16.5,12.5)" fill="#dc2626" d="M0,-4 L0.95,-1.31 L3.8,-1.24 L1.53,0.5 L2.35,3.24 L0,1.6 L-2.35,3.24 L-1.53,0.5 L-3.8,-1.24 L-0.95,-1.31 Z"/>
        <path transform="translate(13,17.5)"   fill="#dc2626" d="M0,-4 L0.95,-1.31 L3.8,-1.24 L1.53,0.5 L2.35,3.24 L0,1.6 L-2.35,3.24 L-1.53,0.5 L-3.8,-1.24 L-0.95,-1.31 Z"/>
        <path transform="translate(21,17.5)"   fill="#dc2626" d="M0,-4 L0.95,-1.31 L3.8,-1.24 L1.53,0.5 L2.35,3.24 L0,1.6 L-2.35,3.24 L-1.53,0.5 L-3.8,-1.24 L-0.95,-1.31 Z"/>
      </g>
    </svg>
  )
}

// ─── Casino chip ────────────────────────────────────────────────────────────────
function ChipSingle({ amount, size = 44 }: { amount: number; size?: number }) {
  const r = size / 2
  const { bg, stripe, text } = CHIP_CFG[amount] ?? CHIP_CFG[10]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <ellipse cx={r} cy={r + 2} rx={r - 1} ry={3} fill="rgba(0,0,0,0.35)"/>
      <circle cx={r} cy={r} r={r - 1.5} fill={bg} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <circle cx={r} cy={r} r={r * 0.72} fill="none" stroke={stripe} strokeWidth={r * 0.28} strokeDasharray={`${r * 0.4} ${r * 0.22}`}/>
      <circle cx={r} cy={r} r={r * 0.47} fill={bg} stroke={stripe} strokeWidth="1.5"/>
      <text x={r} y={r} dominantBaseline="middle" textAnchor="middle" fontSize={r * 0.46} fontWeight="900" fill={text} fontFamily="Arial Black, sans-serif">{amount}</text>
    </svg>
  )
}

// Stacked bet chips for felt
function ChipStack({ bet, chipSize = 30 }: { bet: number; chipSize?: number }) {
  const count  = Math.round(bet / 10)
  const offset = Math.round(chipSize * 0.15)
  const h      = chipSize + (count - 1) * offset
  return (
    <div style={{ position: 'relative', width: chipSize, height: h, flexShrink: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', bottom: i * offset, left: 0 }}>
          <ChipSingle amount={bet} size={chipSize}/>
        </div>
      ))}
    </div>
  )
}

// Broken chip icon for game-over modal
function BrokenChipIcon({ size = 80 }: { size?: number }) {
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - 2} fill="#1f2937" stroke="#ef4444" strokeWidth="2"/>
      <circle cx={r} cy={r} r={r * 0.72} fill="none" stroke="#ef4444" strokeWidth={r * 0.14} strokeDasharray={`${r * 0.4} ${r * 0.22}`} opacity="0.7"/>
      <circle cx={r} cy={r} r={r * 0.38} fill="#1f2937" stroke="#ef4444" strokeWidth="1.5"/>
      <line x1={r * 0.55} y1={r * 0.55} x2={r * 1.45} y2={r * 1.45} stroke="#ef4444" strokeWidth={r * 0.12} strokeLinecap="round"/>
      <line x1={r * 1.45} y1={r * 0.55} x2={r * 0.55} y2={r * 1.45} stroke="#ef4444" strokeWidth={r * 0.12} strokeLinecap="round"/>
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
function allTotal(cards: GameCard[]): number { return cards.reduce((s, c) => s + c.value, 0) }

// Break a chip balance into denominations (greedy, largest first, floor to $10)
function makeChange(amount: number): number[] {
  const denoms = [50, 40, 30, 20, 10]
  const result: number[] = []
  let rem = Math.floor(amount / 10) * 10
  for (const d of denoms) {
    while (rem >= d && result.length < 10) { result.push(d); rem -= d }
  }
  return result
}

// ─── Playing card ───────────────────────────────────────────────────────────────
function PlayingCard({ card, stat, reveal }: { card: GameCard; stat: StatType; reveal: boolean }) {
  const showValue = !card.faceDown && reveal

  if (card.faceDown) {
    return (
      <div style={{
        width: 82, height: 124, borderRadius: 8, flexShrink: 0,
        background: '#0a0f1e', border: '2px solid #dc2626',
        boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: card.animIn ? 'translateY(0) rotate(-1deg)' : 'translateY(-120px)',
        opacity: card.animIn ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
        position: 'relative', overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', inset: 0 }} width="82" height="124">
          <line x1="20" y1="0" x2="20" y2="124" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="40" y1="0" x2="40" y2="124" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="60" y1="0" x2="60" y2="124" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="25" x2="82" y2="25" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="50" x2="82" y2="50" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="75" x2="82" y2="75" stroke="#1e2d4a" strokeWidth="1"/>
          <line x1="0" y1="100" x2="82" y2="100" stroke="#1e2d4a" strokeWidth="1"/>
        </svg>
        <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(220,38,38,0.3)', borderRadius: 4 }}/>
        <div style={{ position: 'relative', zIndex: 1 }}><TbMiniLogo size={38}/></div>
        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 1 }}><TbBadge size={11}/></div>
        <div style={{ position: 'absolute', bottom: 6, right: 6, transform: 'rotate(180deg)', zIndex: 1 }}><TbBadge size={11}/></div>
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
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }}>
        <TbMiniLogo size={50}/>
      </div>
      <div style={{ position: 'absolute', top: 4, left: 6, lineHeight: 1, zIndex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</div>
        <div style={{ fontSize: 8, lineHeight: 1 }}>{STAT_ICON[stat]}</div>
      </div>
      <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}><TbBadge size={12}/></div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 58, textAlign: 'center', zIndex: 1, overflow: 'hidden', maxHeight: 72 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#111', lineHeight: 1.25, wordBreak: 'break-word' }}>{card.player}</div>
        <div style={{ fontSize: 8, fontWeight: 700, color: '#374151', lineHeight: 1.25, marginTop: 2, wordBreak: 'break-word' }}>{card.team}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 4, left: 4, transform: 'rotate(180deg)', zIndex: 1 }}><TbBadge size={12}/></div>
      <div style={{ position: 'absolute', bottom: 4, right: 6, transform: 'rotate(180deg)', lineHeight: 1, zIndex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#111' }}>{showValue ? card.value : '?'}</div>
        <div style={{ fontSize: 8, lineHeight: 1 }}>{STAT_ICON[stat]}</div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function Blackjack() {
  const [gameStarted,    setGameStarted]    = useState(false)
  const [seasons,        setSeasons]        = useState<string[]>([])
  const [phase,          setPhase]          = useState<Phase>('idle')
  const [stat,           setStat]           = useState<StatType>('goals')
  const [season,         setSeason]         = useState('')
  const [playerHand,     setPlayerHand]     = useState<GameCard[]>([])
  const [dealerHand,     setDealerHand]     = useState<GameCard[]>([])
  const [result,         setResult]         = useState<Result | null>(null)
  const [reveal,         setReveal]         = useState(false)
  const [chips,          setChips]          = useState(STARTING_CHIPS)
  const [bet,            setBet]            = useState(10)
  const [gameOver,       setGameOver]       = useState(false)
  const [gameWon,        setGameWon]        = useState(false)
  const [username,       setUsername]       = useState('')
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
  const betRef          = useRef(10)
  const chipsRef        = useRef(STARTING_CHIPS)
  const preP1Ref        = useRef<GameCard | null>(null)
  const preP2Ref        = useRef<GameCard | null>(null)
  const preD1Ref        = useRef<GameCard | null>(null)
  const preD2Ref        = useRef<GameCard | null>(null)

  useEffect(() => {
    fetch('/api/blackjack?seasons=1').then(r => r.json()).then(setSeasons)
    const saved = localStorage.getItem('bj_username')
    if (saved) setUsername(saved)
  }, [])

  const saveUsername = useCallback((name: string) => {
    setUsername(name); localStorage.setItem('bj_username', name)
  }, [])

  function resetGame() {
    setGameStarted(false); setPhase('idle'); setResult(null); setReveal(false)
    setBusting(false); setNewDeal(false); setBlackjackFlash(false); setHadBlackjack(false)
    setPendingBust(false); setPendingBlackjack(false); setNextCard(null)
    setPlayerHand([]); setDealerHand([]); setSeason('')
    setChips(STARTING_CHIPS); chipsRef.current = STARTING_CHIPS
    setBet(10); betRef.current = 10
    setGameOver(false); setGameWon(false)
    dealerRef.current = []; playerRef.current = []; deckRef.current = []
  }

  async function startHand() {
    if (seasons.length === 0 || busy) return
    setBusy(true); setResult(null); setReveal(false); setBusting(false)
    setNewDeal(false); setBlackjackFlash(false); setHadBlackjack(false)
    setPendingBust(false); setPendingBlackjack(false); setNextCard(null)
    hadBlackjackRef.current = false
    setPlayerHand([]); setDealerHand([])
    dealerRef.current = []; playerRef.current = []
    preP1Ref.current = null; preP2Ref.current = null
    preD1Ref.current = null; preD2Ref.current = null

    const newStat: StatType = Math.random() < 0.25
      ? 'club_seasons'
      : STATS[Math.floor(Math.random() * STATS.length)]
    setStat(newStat)

    let fetchUrl: string
    if (newStat === 'club_seasons') {
      setSeason('All Time'); fetchUrl = '/api/blackjack?stat=club_seasons'
    } else {
      const s = seasons[Math.floor(Math.random() * seasons.length)]
      setSeason(s); fetchUrl = `/api/blackjack?stat=${newStat}&season=${s}`
    }

    const res = await fetch(fetchUrl)
    const raw: RawCard[] = await res.json()
    if (!Array.isArray(raw) || raw.length < 4) { setBusy(false); return }

    const shuffled = shuffle(raw)
    let p1Idx = 0, p2Idx = -1
    outer:
    for (let i = 0; i < Math.min(shuffled.length, 40); i++)
      for (let j = i + 1; j < Math.min(shuffled.length, 40); j++)
        if (shuffled[i].value + shuffled[j].value <= 21) { p1Idx = i; p2Idx = j; break outer }
    if (p2Idx === -1) { p1Idx = 0; p2Idx = 1 }

    const mk = (c: RawCard, idx: number, fd = false): GameCard =>
      ({ ...c, id: `${idx}-${c.player}`, faceDown: fd, animIn: false })

    const playerSet   = new Set([p1Idx, p2Idx])
    const afterPlayer = shuffled.filter((_, i) => !playerSet.has(i))
    preP1Ref.current = mk(shuffled[p1Idx], 0)
    preP2Ref.current = mk(shuffled[p2Idx], 1)

    let d1Idx = 0, d2Idx = -1
    outerD:
    for (let i = 0; i < Math.min(afterPlayer.length, 40); i++)
      for (let j = i + 1; j < Math.min(afterPlayer.length, 40); j++)
        if (afterPlayer[i].value + afterPlayer[j].value <= 21) { d1Idx = i; d2Idx = j; break outerD }
    if (d2Idx === -1) { d1Idx = 0; d2Idx = 1 }

    const dealerSet = new Set([d1Idx, d2Idx])
    preD1Ref.current = mk(afterPlayer[d1Idx], 2)
    preD2Ref.current = mk(afterPlayer[d2Idx], 3, true)
    deckRef.current  = afterPlayer.filter((_, i) => !dealerSet.has(i)).map((c, i) => mk(c, i + 4))

    const cur = chipsRef.current
    const capped = Math.min(betRef.current, cur)
    const final  = capped >= 10 ? capped : cur
    setBet(final); betRef.current = final

    setBusy(false); setPhase('betting')
  }

  function dealCards() {
    if (phase !== 'betting' || busy) return
    const p1 = preP1Ref.current, p2 = preP2Ref.current
    const d1 = preD1Ref.current, d2 = preD2Ref.current
    if (!p1 || !p2 || !d1 || !d2) return
    setBusy(true)
    // Deduct bet immediately — chips "go on the table" as soon as cards are dealt
    const cb = betRef.current
    setChips(prev => { const next = prev - cb; chipsRef.current = next; return next })
    setNextCard(deckRef.current[0] || null)
    setTimeout(() => { playerRef.current = [{ ...p1, animIn: true }]; setPlayerHand([...playerRef.current]) }, 0)
    setTimeout(() => { dealerRef.current = [{ ...d1, animIn: true }]; setDealerHand([...dealerRef.current]) }, 600)
    setTimeout(() => { playerRef.current = [...playerRef.current, { ...p2, animIn: true }]; setPlayerHand([...playerRef.current]) }, 900)
    setTimeout(() => {
      dealerRef.current = [...dealerRef.current, { ...d2, animIn: true }]
      setDealerHand([...dealerRef.current])
      setBusy(false)
      if (p1.value + p2.value === 21) {
        setHadBlackjack(true); hadBlackjackRef.current = true; setPendingBlackjack(true)
      }
      setPhase('player')
    }, 1350)
  }

  function hit() {
    if (phase !== 'player' || busy || deckRef.current.length === 0) return
    setPendingBlackjack(false)
    const card = deckRef.current[0]; deckRef.current = deckRef.current.slice(1)
    setNextCard(deckRef.current[0] || null)
    const newHand = [...playerRef.current, { ...card, animIn: true }]
    playerRef.current = newHand; setPlayerHand([...newHand])
    const total = allTotal(newHand)
    if (total > 21) setPendingBust(true)
    else if (total === 21) setPendingBlackjack(true)
  }

  function triggerBust() {
    setPhase('dealer'); setBusting(true)
    setTimeout(() => {
      setBusting(false)
      const rev = dealerRef.current.map(c => ({ ...c, faceDown: false }))
      dealerRef.current = rev; setDealerHand([...rev])
      setTimeout(() => playDealer(), 700)
    }, 1600)
  }

  function stand() {
    if (phase !== 'player' || busy) return
    if (pendingBust) { setPendingBust(false); setTimeout(() => triggerBust(), 0); return }
    if (pendingBlackjack) {
      setPendingBlackjack(false); setPhase('dealer'); setBlackjackFlash(true)
      setTimeout(() => {
        setBlackjackFlash(false)
        const rev = dealerRef.current.map(c => ({ ...c, faceDown: false }))
        dealerRef.current = rev; setDealerHand([...rev])
        setTimeout(() => playDealer(), 700)
      }, 1600)
      return
    }
    setPhase('dealer')
    const rev = dealerRef.current.map(c => ({ ...c, faceDown: false }))
    dealerRef.current = rev; setDealerHand([...rev])
    setTimeout(() => playDealer(), 600)
  }

  function playDealer() {
    const cur = dealerRef.current
    if (allTotal(cur) >= 17 || deckRef.current.length === 0) { endHand(cur, playerRef.current); return }
    const card = deckRef.current[0]; deckRef.current = deckRef.current.slice(1)
    const next = [...cur, { ...card, faceDown: false, animIn: true }]
    dealerRef.current = next; setDealerHand([...next])
    setTimeout(playDealer, 1100)
  }

  function endHand(dHand: GameCard[], pHand: GameCard[]) {
    const pT = allTotal(pHand), dT = allTotal(dHand)
    const r: Result = pT > 21 ? 'lose' : dT > 21 || pT > dT ? 'win' : pT < dT ? 'lose' : 'push'
    const rev = dHand.map(c => ({ ...c, faceDown: false }))
    dealerRef.current = rev; setDealerHand([...rev])
    setReveal(true); setResult(r); setPhase('result')
    const cb = betRef.current
    // Bet was already deducted in dealCards(); return chips based on outcome
    const naturalBJ = r === 'win' && hadBlackjackRef.current && pHand.length === 2
    // Win: return original bet + winnings (3:2 for natural BJ)
    // Push: return original bet only
    // Lose: nothing returned (already deducted)
    const returnAmount = r === 'win'
      ? naturalBJ ? cb + Math.floor(cb * 1.5) : cb * 2
      : r === 'push' ? cb : 0
    setChips(prev => {
      const next = prev + returnAmount
      chipsRef.current = next
      if (next >= GOAL_CHIPS) setTimeout(() => setGameWon(true), 900)
      else if (next <= 0)     setTimeout(() => setGameOver(true), 900)
      return next
    })
    setTimeout(() => setNewDeal(true), 400)
  }

  const playerTotal  = allTotal(playerRef.current)
  const dealerBusted = phase === 'result' && allTotal(dealerRef.current) > 21
  const playerBusted = playerTotal > 21
  const chipsColor = chips > STARTING_CHIPS ? '#4ade80' : chips < STARTING_CHIPS ? '#f87171' : '#f59e0b'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 16px 40px', gap: 16 }}>

      <style>{`
        @keyframes bust-in  { 0%{transform:scale(0.3) rotate(-8deg);opacity:0} 60%{transform:scale(1.1) rotate(2deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes bj-in    { 0%{transform:scale(0.3) rotate(8deg);opacity:0}  60%{transform:scale(1.1) rotate(-2deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes fade-bust{ 0%{opacity:0} 15%{opacity:1} 75%{opacity:1} 100%{opacity:0} }
        @keyframes fade-bj  { 0%{opacity:0} 15%{opacity:1} 75%{opacity:1} 100%{opacity:0} }
        @keyframes pulse-deal{ 0%,100%{box-shadow:0 4px 20px rgba(245,158,11,0.4);transform:translate(-50%,-50%) scale(1)} 50%{box-shadow:0 4px 40px rgba(245,158,11,0.9);transform:translate(-50%,-50%) scale(1.05)} }
        @keyframes chip-land{ 0%{transform:translateY(-44px) scale(0.5) rotate(14deg);opacity:0} 58%{transform:translateY(4px) scale(1.1) rotate(-3deg);opacity:1} 78%{transform:translateY(-2px) scale(0.97) rotate(1deg)} 100%{transform:translateY(0) scale(1) rotate(0deg);opacity:1} }
        .bj-overlay { position:fixed; top:0; right:0; bottom:0; left:0; background:rgba(0,0,0,0.88); display:flex; align-items:center; justify-content:center; z-index:1000; }
        @media (min-width:901px) { .bj-overlay { left:180px; } }
      `}</style>

      {/* ── Entry screen ──────────────────────────────────────────────────────── */}
      {!gameStarted && (
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 12, color: '#4ade80', letterSpacing: 4, fontWeight: 700, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 6px', letterSpacing: -1 }}>
            Topbins <span style={{ color: '#f59e0b' }}>Casino</span>
          </h1>
          <p style={{ color: '#8899bb', margin: '0 0 20px', fontSize: 13, lineHeight: 1.6 }}>
            The top 52 players from a random stat & season form the deck.<br/>
            Values are hidden — use your knowledge to decide when to hit or stand.<br/>
            <strong style={{ color: '#f59e0b' }}>Start with ${STARTING_CHIPS} · Reach ${GOAL_CHIPS} to win</strong>
          </p>
          <input
            value={username} onChange={e => saveUsername(e.target.value)}
            placeholder="Enter your name (optional)" maxLength={20}
            style={{ padding: '10px 18px', borderRadius: 20, fontSize: 13, marginBottom: 16, background: '#111827', border: '1px solid #374151', color: 'white', outline: 'none', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => { setChips(STARTING_CHIPS); chipsRef.current = STARTING_CHIPS; setBet(10); betRef.current = 10; setGameOver(false); setGameWon(false); setPhase('idle'); setGameStarted(true) }}
            style={{ width: '100%', padding: '16px', borderRadius: 14, cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#111', fontSize: 17, fontWeight: 800, boxShadow: '0 4px 24px rgba(245,158,11,0.4)' }}
          >
            Start Game · ${STARTING_CHIPS}
          </button>
        </div>
      )}

      {/* ── Game ──────────────────────────────────────────────────────────────── */}
      {gameStarted && (
        <>
          {/* Win overlay */}
          {gameWon && (
            <div className="bj-overlay">
              <div style={{ textAlign: 'center', padding: '40px 32px', maxWidth: 360, background: '#111827', borderRadius: 24, border: '2px solid #f59e0b' }}>
                <div style={{ fontSize: 72, marginBottom: 12 }}>🏆</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#f59e0b', marginBottom: 8 }}>You Won!</div>
                <div style={{ fontSize: 15, color: '#cbd5e1', marginBottom: 24, lineHeight: 1.6 }}>You reached ${chips}.<br/>Goal of ${GOAL_CHIPS} achieved!</div>
                <button onClick={resetGame} style={{ padding: '14px 48px', borderRadius: 50, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#111' }}>Play Again</button>
              </div>
            </div>
          )}

          {/* Game over overlay — broken chip icon instead of skull */}
          {gameOver && (
            <div className="bj-overlay">
              <div style={{ textAlign: 'center', padding: '40px 32px', maxWidth: 360, background: '#111827', borderRadius: 24, border: '2px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <BrokenChipIcon size={80}/>
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>Out of Chips</div>
                <div style={{ fontSize: 15, color: '#cbd5e1', marginBottom: 24, lineHeight: 1.6 }}>
                  The house wins this time.<br/>Better luck next time.
                </div>
                <button onClick={resetGame} style={{ padding: '14px 48px', borderRadius: 50, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#b91c1c)', border: 'none', color: 'white' }}>Play Again</button>
              </div>
            </div>
          )}

          {/* Nav */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 540 }}>
            <button onClick={resetGame} style={{ padding: '5px 12px', borderRadius: 20, background: '#1f2937', border: '1px solid #374151', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>← Quit</button>
            <div style={{ padding: '5px 16px', borderRadius: 20, background: '#1f2937', border: `1px solid ${chipsColor}44`, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🪙</span>
              <span style={{ fontWeight: 800, color: chipsColor }}>${chips}</span>
              <span style={{ color: '#4b5563', fontSize: 11 }}>/ ${GOAL_CHIPS}</span>
            </div>
            <div style={{ flex: 1, minWidth: 80, maxWidth: 140, height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (chips / GOAL_CHIPS) * 100)}%`, background: `linear-gradient(90deg,#f59e0b,${chipsColor})`, borderRadius: 3, transition: 'width 0.5s ease' }}/>
            </div>
          </div>

          {/* Table */}
          <div style={{ width: '100%', maxWidth: 450, background: 'linear-gradient(135deg,#c9a84c 0%,#f0d060 40%,#c9a84c 70%,#a07828 100%)', borderRadius: 150, padding: 7, boxShadow: '0 16px 60px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.08)', position: 'relative' }}>

            {/* Felt */}
            <div style={{ borderRadius: 142, overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 30%,#236b35 0%,#1a5428 60%,#163f20 100%)', padding: '18px 24px', boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.5)', height: 450, display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>

              {/* Bust flash */}
              {busting && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(140,0,0,0.65)', animation: 'fade-bust 1.6s ease-in-out forwards', pointerEvents: 'none', borderRadius: 142 }}>
                  <div style={{ fontSize: 72, fontWeight: 900, color: 'white', textShadow: '0 0 40px #ff4444,0 4px 8px rgba(0,0,0,0.6)', letterSpacing: 6, animation: 'bust-in 0.4s cubic-bezier(.22,.68,0,1.3) forwards' }}>BUST!</div>
                </div>
              )}

              {/* Blackjack flash */}
              {blackjackFlash && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,80,20,0.70)', animation: 'fade-bj 1.6s ease-in-out forwards', pointerEvents: 'none', borderRadius: 142 }}>
                  <div style={{ fontSize: 52, fontWeight: 900, color: '#f59e0b', textShadow: '0 0 40px #fde68a,0 4px 8px rgba(0,0,0,0.6)', letterSpacing: 4, animation: 'bj-in 0.4s cubic-bezier(.22,.68,0,1.3) forwards' }}>BLACKJACK!</div>
                </div>
              )}

              {/* Casino header — top arc of felt */}
              <div style={{ position: 'absolute', top: 9, left: 0, right: 0, zIndex: 2, textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 7.5, fontWeight: 900, color: 'rgba(255,255,255,0.28)', letterSpacing: 3.5, fontFamily: 'Arial Black, sans-serif' }}>♠ TOPBINS CASINO BLACKJACK ♠</div>
              </div>

              {/* Left side logo only */}
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center center', opacity: 0.38, zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <TbMiniLogo size={20}/><div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: 2.5 }}>TOPBINS CASINO</div>
              </div>

              {/* Dealer row */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>DEALER</span>
                  {phase === 'result' && dealerHand.length > 0 && reveal && (
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '1px 9px', borderRadius: 20, background: 'rgba(0,0,0,0.35)', color: dealerBusted ? '#f87171' : 'rgba(255,255,255,0.85)' }}>
                      {dealerBusted ? `BUST ${allTotal(dealerRef.current)}` : allTotal(dealerRef.current)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', height: 128, alignItems: 'flex-start' }}>
                  {dealerHand.map((c, i) => (
                    <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -18, zIndex: i, position: 'relative' }}>
                      <PlayingCard card={c} stat={stat} reveal={reveal}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle spacer — all middle content is absolutely positioned */}
              <div style={{ flex: 1 }}/>

              {/* Player row */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'center', height: 128, alignItems: 'flex-start' }}>
                  {playerHand.map((c, i) => (
                    <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -18, zIndex: i, position: 'relative' }}>
                      <PlayingCard card={c} stat={stat} reveal={reveal}/>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>YOU</span>
                  {playerHand.length > 0 && reveal && (
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '1px 9px', borderRadius: 20, background: 'rgba(0,0,0,0.35)', color: playerBusted ? '#f87171' : playerTotal === 21 ? '#4ade80' : 'rgba(255,255,255,0.85)' }}>
                      {playerBusted ? `BUST ${playerTotal}` : playerTotal === 21 ? '21 🎉' : playerTotal}
                    </span>
                  )}
                </div>
              </div>

              {/* Stat label — absolute, upper-middle of felt */}
              <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 3, textAlign: 'center', pointerEvents: 'none', opacity: phase === 'result' && newDeal ? 0.15 : 1, transition: 'opacity 0.3s', whiteSpace: 'nowrap' }}>
                {season ? (
                  <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 40, padding: '5px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#f59e0b', lineHeight: 1.15, letterSpacing: -0.3 }}>{STAT_ICON[stat]} {STAT_LABEL[stat]}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600, letterSpacing: 1 }}>{season}</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 40, padding: '5px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>TOPBINS CASINO</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>♠  BLACKJACK  ♠</div>
                  </div>
                )}
              </div>

              {/* Bet circle — permanent casino-table betting spot */}
              <div style={{ position: 'absolute', top: '56%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1, width: 92, height: 52, border: '1.5px dashed rgba(255,255,255,0.22)', borderRadius: '50%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(phase === 'idle' || phase === 'betting') && (
                  <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.22)', letterSpacing: 2.5, fontFamily: 'Arial Black, sans-serif' }}>BET</span>
                )}
              </div>

              {/* Bet chip — one chip of the selected denomination lands in the circle */}
              {phase !== 'idle' && phase !== 'betting' && (
                <div style={{ position: 'absolute', top: '56%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 5 }}>
                  <div style={{ animation: phase === 'player' ? 'chip-land 0.55s cubic-bezier(.22,.68,0,1.3) forwards' : 'none' }}>
                    <ChipSingle amount={bet} size={46}/>
                  </div>
                </div>
              )}

              {/* New Hand button — absolute so it never disturbs the layout */}
              {phase === 'result' && newDeal && (
                <button onClick={startHand} style={{ position: 'absolute', top: '49%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 20, padding: '12px 40px', borderRadius: 50, fontSize: 15, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: '3px solid rgba(255,255,255,0.3)', color: '#111', animation: 'pulse-deal 1.2s ease-in-out infinite', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  New Hand
                </button>
              )}

              {/* Bankroll chip stack — actual denominations adding up to balance */}
              {phase !== 'idle' && chips > 0 && (() => {
                const stack = makeChange(chips)
                const chipSz = 22, offset = 4
                return (
                  <div style={{ position: 'absolute', bottom: 72, right: 22, zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ position: 'relative', width: chipSz, height: chipSz + (stack.length - 1) * offset }}>
                      {stack.map((denom, i) => (
                        <div key={i} style={{ position: 'absolute', bottom: i * offset, left: 0 }}>
                          <ChipSingle amount={denom} size={chipSz}/>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: chipsColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>${chips}</div>
                  </div>
                )
              })()}
            </div>

            {/* Next card — right of table */}
            {phase === 'player' && nextCard && (
              <div style={{ position: 'absolute', right: -94, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(129,140,248,0.7)', letterSpacing: 2.5, whiteSpace: 'nowrap' }}>NEXT CARD</div>
                <div style={{ filter: 'drop-shadow(0 0 10px rgba(129,140,248,0.55))' }}>
                  <PlayingCard card={{ ...nextCard, faceDown: false, animIn: true }} stat={stat} reveal={false}/>
                </div>
              </div>
            )}
          </div>

          {/* Action area */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>

            {phase === 'idle' && !busy && (
              <button onClick={startHand} style={{ padding: '13px 52px', borderRadius: 50, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#111', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                New Hand
              </button>
            )}

            {phase === 'betting' && !busy && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8899bb', letterSpacing: 2 }}>PLACE YOUR BET</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  {chips < 10 ? (
                    <div style={{ fontSize: 13, color: '#f87171', fontWeight: 700 }}>All in — ${chips}</div>
                  ) : (
                    CHIP_AMOUNTS.map(amount => {
                      const disabled = amount > chips
                      const selected = bet === amount
                      return (
                        <div key={amount} onClick={() => { if (!disabled) { setBet(amount); betRef.current = amount } }}
                          style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.25 : 1, transform: selected ? 'translateY(-10px) scale(1.18)' : 'translateY(0) scale(1)', transition: 'all 0.2s cubic-bezier(.22,.68,0,1.3)', filter: selected ? 'drop-shadow(0 6px 14px rgba(245,158,11,0.75))' : 'none' }}>
                          <ChipSingle amount={amount} size={52}/>
                        </div>
                      )
                    })
                  )}
                </div>
                <button onClick={dealCards} style={{ padding: '12px 40px', borderRadius: 50, fontSize: 15, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#111', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                  Deal Cards · ${bet}
                </button>
              </div>
            )}

            {phase === 'player' && !busy && !busting && (
              <>
                <button onClick={hit} style={{ padding: '13px 44px', borderRadius: 50, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', border: 'none', color: 'white', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>Hit</button>
                <button onClick={stand} style={{ padding: '13px 44px', borderRadius: 50, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#374151,#1f2937)', border: '2px solid #4b5563', color: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>Stand</button>
              </>
            )}

            {phase === 'dealer' && !busting && (
              <div style={{ fontSize: 14, color: '#8899bb', fontStyle: 'italic' }}>Dealer playing…</div>
            )}

            {phase === 'result' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ padding: '10px 28px', borderRadius: 50, background: result === 'win' ? 'rgba(21,128,61,0.35)' : result === 'lose' ? 'rgba(185,28,28,0.35)' : 'rgba(71,85,105,0.35)', border: `2px solid ${result === 'win' ? '#22c55e' : result === 'lose' ? '#ef4444' : '#64748b'}`, color: result === 'win' ? '#4ade80' : result === 'lose' ? '#f87171' : '#94a3b8', fontSize: 17, fontWeight: 900 }}>
                  {result === 'win' ? '🎉 Win!' : result === 'lose' ? '✕ Lose' : '🤝 Push'}
                </div>
                {(() => {
                  const naturalBJ  = result === 'win' && hadBlackjack && playerHand.length === 2
                  const displayWin = naturalBJ ? Math.floor(bet * 1.5) : bet
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: result === 'win' ? '#4ade80' : result === 'lose' ? '#f87171' : '#94a3b8' }}>
                        {result === 'win' ? `+$${displayWin}` : result === 'lose' ? `-$${bet}` : 'No change'}
                      </div>
                      {naturalBJ && <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', letterSpacing: 2 }}>♠ BLACKJACK · 3:2 ♠</div>}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

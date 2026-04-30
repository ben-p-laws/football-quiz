'use client'

import { useState, useEffect, useRef } from 'react'
import NavBar from './NavBar'

const GROUP_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  'Arsenal':                 { bg: '#EF0107', fg: '#ffffff', label: 'Arsenal' },
  'Chelsea':                 { bg: '#034694', fg: '#ffffff', label: 'Chelsea' },
  'Liverpool':               { bg: '#C8102E', fg: '#ffffff', label: 'Liverpool' },
  'Manchester City':         { bg: '#6CABDD', fg: '#1c2c5b', label: 'Man City' },
  'Manchester United':       { bg: '#DA291C', fg: '#ffffff', label: 'Man Utd' },
  'Tottenham Hotspur':       { bg: '#132257', fg: '#ffffff', label: 'Spurs' },
  'Tottenham':               { bg: '#132257', fg: '#ffffff', label: 'Spurs' },
  'Newcastle United':        { bg: '#241F20', fg: '#ffffff', label: 'Newcastle' },
  'Newcastle':               { bg: '#241F20', fg: '#ffffff', label: 'Newcastle' },
  'Everton':                 { bg: '#003399', fg: '#ffffff', label: 'Everton' },
  'Aston Villa':             { bg: '#670E36', fg: '#95BFE5', label: 'Aston Villa' },
  'West Ham United':         { bg: '#7A263A', fg: '#F0A500', label: 'West Ham' },
  'West Ham':                { bg: '#7A263A', fg: '#F0A500', label: 'West Ham' },
  'Leicester City':          { bg: '#003090', fg: '#FDBE11', label: 'Leicester' },
  'Leicester':               { bg: '#003090', fg: '#FDBE11', label: 'Leicester' },
  'Leeds United':            { bg: '#FFCD00', fg: '#1D428A', label: 'Leeds' },
  'Leeds':                   { bg: '#FFCD00', fg: '#1D428A', label: 'Leeds' },
  'Wolverhampton Wanderers': { bg: '#FDB913', fg: '#231F20', label: 'Wolves' },
  'Wolves':                  { bg: '#FDB913', fg: '#231F20', label: 'Wolves' },
  'Southampton':             { bg: '#D71920', fg: '#ffffff', label: 'Southampton' },
  'Brighton & Hove Albion':  { bg: '#0057B8', fg: '#ffffff', label: 'Brighton' },
  'Brighton':                { bg: '#0057B8', fg: '#ffffff', label: 'Brighton' },
  'Brentford':               { bg: '#E30613', fg: '#ffffff', label: 'Brentford' },
  'Crystal Palace':          { bg: '#1B458F', fg: '#C4122E', label: 'C. Palace' },
  'Fulham':                  { bg: '#CC0000', fg: '#ffffff', label: 'Fulham' },
  'Bournemouth':             { bg: '#DA291C', fg: '#000000', label: 'Bournemouth' },
  'AFC Bournemouth':         { bg: '#DA291C', fg: '#000000', label: 'Bournemouth' },
  'Nottingham Forest':       { bg: '#DD0000', fg: '#ffffff', label: 'Forest' },
  'Nottm Forest':            { bg: '#DD0000', fg: '#ffffff', label: 'Forest' },
  'Burnley':                 { bg: '#6C1D45', fg: '#99D6EA', label: 'Burnley' },
  'Watford':                 { bg: '#FBEE23', fg: '#ED2127', label: 'Watford' },
  'Norwich City':            { bg: '#00A650', fg: '#FFF200', label: 'Norwich' },
  'Norwich':                 { bg: '#00A650', fg: '#FFF200', label: 'Norwich' },
  'Swansea City':            { bg: '#121212', fg: '#ffffff', label: 'Swansea' },
  'Swansea':                 { bg: '#121212', fg: '#ffffff', label: 'Swansea' },
  'Cardiff City':            { bg: '#0070B5', fg: '#ffffff', label: 'Cardiff' },
  'Cardiff':                 { bg: '#0070B5', fg: '#ffffff', label: 'Cardiff' },
  'Sunderland':              { bg: '#EB172B', fg: '#ffffff', label: 'Sunderland' },
  'Stoke City':              { bg: '#E03A3E', fg: '#1B1464', label: 'Stoke' },
  'Stoke':                   { bg: '#E03A3E', fg: '#1B1464', label: 'Stoke' },
  'Bolton Wanderers':        { bg: '#263C7E', fg: '#ffffff', label: 'Bolton' },
  'Bolton':                  { bg: '#263C7E', fg: '#ffffff', label: 'Bolton' },
  'Wigan Athletic':          { bg: '#1D59AF', fg: '#ffffff', label: 'Wigan' },
  'Wigan':                   { bg: '#1D59AF', fg: '#ffffff', label: 'Wigan' },
  'Blackburn Rovers':        { bg: '#009EE0', fg: '#ffffff', label: 'Blackburn' },
  'Blackburn':               { bg: '#009EE0', fg: '#ffffff', label: 'Blackburn' },
  'Queens Park Rangers':     { bg: '#1D5BA4', fg: '#ffffff', label: 'QPR' },
  'QPR':                     { bg: '#1D5BA4', fg: '#ffffff', label: 'QPR' },
  'Reading':                 { bg: '#004494', fg: '#ffffff', label: 'Reading' },
  'Hull City':               { bg: '#F5A12D', fg: '#231F20', label: 'Hull' },
  'Hull':                    { bg: '#F5A12D', fg: '#231F20', label: 'Hull' },
  'Middlesbrough':           { bg: '#D71920', fg: '#ffffff', label: 'Boro' },
  'Derby County':            { bg: '#e2e8f0', fg: '#231F20', label: 'Derby' },
  'Derby':                   { bg: '#e2e8f0', fg: '#231F20', label: 'Derby' },
  'Sheffield United':        { bg: '#EE2737', fg: '#ffffff', label: 'Sheff Utd' },
  'Sheffield Wednesday':     { bg: '#003366', fg: '#ffffff', label: 'Sheff Wed' },
  'Birmingham City':         { bg: '#0000DD', fg: '#ffffff', label: 'Birmingham' },
  'Birmingham':              { bg: '#0000DD', fg: '#ffffff', label: 'Birmingham' },
  'Charlton Athletic':       { bg: '#D4021D', fg: '#ffffff', label: 'Charlton' },
  'Charlton':                { bg: '#D4021D', fg: '#ffffff', label: 'Charlton' },
  'Coventry City':           { bg: '#45BAFF', fg: '#ffffff', label: 'Coventry' },
  'Coventry':                { bg: '#45BAFF', fg: '#ffffff', label: 'Coventry' },
  'Ipswich Town':            { bg: '#0044A9', fg: '#ffffff', label: 'Ipswich' },
  'Ipswich':                 { bg: '#0044A9', fg: '#ffffff', label: 'Ipswich' },
  'Portsmouth':              { bg: '#001489', fg: '#ffffff', label: 'Portsmouth' },
  'Blackpool':               { bg: '#F06520', fg: '#ffffff', label: 'Blackpool' },
  'Wimbledon':               { bg: '#0066CC', fg: '#FFFF00', label: 'Wimbledon' },
  'West Bromwich Albion':    { bg: '#122F67', fg: '#ffffff', label: 'West Brom' },
  'West Brom':               { bg: '#122F67', fg: '#ffffff', label: 'West Brom' },
  'Luton Town':              { bg: '#F47920', fg: '#ffffff', label: 'Luton' },
  'Luton':                   { bg: '#F47920', fg: '#ffffff', label: 'Luton' },
  'Oldham Athletic':         { bg: '#1B4398', fg: '#ffffff', label: 'Oldham' },
  'Oldham':                  { bg: '#1B4398', fg: '#ffffff', label: 'Oldham' },
  'Barnsley':                { bg: '#D71920', fg: '#ffffff', label: 'Barnsley' },
  'Huddersfield Town':       { bg: '#0E63AD', fg: '#ffffff', label: 'Huddersfield' },
  'Huddersfield':            { bg: '#0E63AD', fg: '#ffffff', label: 'Huddersfield' },
  'Bradford City':           { bg: '#800000', fg: '#FFDE00', label: 'Bradford' },
  'Bradford':                { bg: '#800000', fg: '#FFDE00', label: 'Bradford' },
}

const MAX_GUESSES = 5
const TOTAL_ROUNDS = 5
const MAX_SCORE    = MAX_GUESSES * TOTAL_ROUNDS
const LS_USERNAME  = 'topbins_teammates_username'

const SHIRT_PATH = [
  'M 12,32', 'L 2,44', 'L 20,56', 'C 22,55 24,51 24,48',
  'L 24,90', 'L 76,90', 'L 76,48', 'C 76,51 78,55 80,56',
  'L 98,44', 'L 88,32', 'C 80,20 70,16 62,16',
  'A 12,10 0 0 1 38,16', 'C 30,16 20,20 12,32', 'Z',
].join(' ')

function Shirt({ club }: { club?: string }) {
  const s = club ? GROUP_STYLE[club] : null
  return (
    <svg viewBox="0 0 100 100" width="52" height="52" style={{ display: 'block' }}>
      <path d={SHIRT_PATH}
        fill={s ? s.bg : '#111827'} fillOpacity={s ? 0.55 : 1}
        stroke={s ? s.bg : '#2a3d5e'} strokeOpacity={s ? 0.9 : 1}
        strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function GroupPill({ club }: { club: string }) {
  const s = GROUP_STYLE[club]
  return (
    <span style={{
      background: s?.bg ?? '#1e2d4a', color: s?.fg ?? '#8899bb',
      fontSize: 10, fontWeight: 700, borderRadius: 20,
      padding: '3px 8px', display: 'inline-block', whiteSpace: 'nowrap',
    }}>{s?.label ?? club}</span>
  )
}

type Clue = { name: string; sharedGroups: string[]; sharedYears: string[] }

function ClueCard({ clue, revealLevel }: { clue: Clue; revealLevel: number }) {
  return (
    <div style={{
      background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '14px 10px 12px',
    }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {revealLevel >= 1 ? clue.sharedGroups.map(g => <Shirt key={g} club={g} />) : <Shirt />}
      </div>
      {revealLevel >= 1 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {clue.sharedGroups.map(g => <GroupPill key={g} club={g} />)}
        </div>
      )}
      {revealLevel >= 2 && clue.sharedYears.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
          {formatSpells(clue.sharedYears).map(spell => (
            <span key={spell} style={{
              fontSize: 9, color: '#8899bb', background: '#0a0f1e',
              border: '1px solid #2a3d5e', borderRadius: 4, padding: '2px 5px',
            }}>{spell}</span>
          ))}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.3 }}>
        {clue.name}
      </div>
    </div>
  )
}

type Puzzle = { targetEntity: string; targetGroups: string[]; targetPos: string; clues: Clue[] }
type LbEntry = { username: string; score: number }

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('.') + '.'
}

// Groups ["2007-2008","2008-2009","2010-2011"] → ["2007-2009","2010-2011"]
function formatSpells(years: string[]): string[] {
  if (years.length === 0) return []

  const parsed: { start: number; end: number }[] = []
  for (const y of years) {
    // "2007-2008" or "2007/2008"
    const m4 = y.match(/^(\d{4})[-\/](\d{4})$/)
    if (m4) { parsed.push({ start: parseInt(m4[1]), end: parseInt(m4[2]) }); continue }
    // "2007/08"
    const m2 = y.match(/^(\d{4})\/(\d{2})$/)
    if (m2) { const s = parseInt(m2[1]); parsed.push({ start: s, end: s + 1 }); continue }
  }

  if (parsed.length === 0) return years

  parsed.sort((a, b) => a.start - b.start)

  const spells: string[] = []
  let { start, end } = parsed[0]

  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].start === end) {
      end = parsed[i].end   // consecutive — extend spell
    } else {
      spells.push(`${start}-${end}`)
      ;({ start, end } = parsed[i])
    }
  }
  spells.push(`${start}-${end}`)
  return spells
}

const pageOuter: React.CSSProperties = {
  minHeight: '100vh', background: '#0a0f1e',
  fontFamily: "'DM Sans', -apple-system, sans-serif",
}
const pageInner: React.CSSProperties = { padding: '24px 16px 48px', maxWidth: 520, margin: '0 auto' }

export default function TeammatesPageClient() {
  // Game state — all 5 puzzles loaded upfront
  const [puzzles, setPuzzles]       = useState<Puzzle[]>([])
  const [round, setRound]           = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)

  // Per-round guessing state
  const [guess, setGuess]               = useState('')
  const [suggestions, setSuggestions]   = useState<string[]>([])
  const [showSugg, setShowSugg]         = useState(false)
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([])
  const [won, setWon]                   = useState(false)
  const [gaveUp, setGaveUp]             = useState(false)

  // Leaderboard / submission
  const [leaderboard, setLeaderboard] = useState<LbEntry[]>([])
  const [username, setUsername]       = useState('')
  const [submitted, setSubmitted]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const puzzle       = puzzles[round - 1] ?? null
  const revealLevel  = wrongGuesses.length
  const outOfGuesses = !won && wrongGuesses.length >= MAX_GUESSES
  const roundDone    = won || gaveUp || outOfGuesses
  const roundScore   = won ? MAX_GUESSES - wrongGuesses.length : 0

  async function loadGame() {
    setLoading(true)
    setError(false)
    setPuzzles([])
    setRound(1)
    setTotalScore(0)
    setFinalScore(0)
    setGameComplete(false)
    setSubmitted(false)
    resetRound()
    try {
      const res = await fetch('/api/teammates')
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.error || !data.puzzles) throw new Error()
      setPuzzles(data.puzzles)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function resetRound() {
    setGuess('')
    setSuggestions([])
    setWrongGuesses([])
    setWon(false)
    setGaveUp(false)
    setShowSugg(false)
  }

  async function getLb() {
    try {
      const res = await fetch('/api/teammates?leaderboard=true')
      const data = await res.json()
      setLeaderboard(data.leaderboard ?? [])
    } catch { /* silent */ }
  }

  useEffect(() => {
    const saved = localStorage.getItem(LS_USERNAME)
    if (saved) setUsername(saved)
    loadGame()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function goToNextRound() {
    const earned   = won ? MAX_GUESSES - wrongGuesses.length : 0
    const newTotal = totalScore + earned

    if (round >= TOTAL_ROUNDS) {
      setFinalScore(newTotal)
      setTotalScore(newTotal)
      setGameComplete(true)
      getLb()
    } else {
      setTotalScore(newTotal)
      setRound(r => r + 1)
      resetRound()  // instant — no fetch needed
    }
  }

  function startNewGame() {
    loadGame()
  }

  function onGuessChange(val: string) {
    setGuess(val)
    setShowSugg(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teammates?search=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      } catch { setSuggestions([]) }
    }, 250)
  }

  function submitGuess(name: string) {
    if (!puzzle || !name.trim() || roundDone) return
    if (name.trim().toLowerCase() === puzzle.targetEntity.toLowerCase()) {
      setWon(true)
    } else {
      setWrongGuesses(prev => [...prev, name.trim()])
    }
    setGuess('')
    setSuggestions([])
    setShowSugg(false)
  }

  async function submitScore() {
    if (!username.trim() || submitted) return
    setSubmitting(true)
    localStorage.setItem(LS_USERNAME, username.trim())
    try {
      const res = await fetch('/api/teammates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), score: finalScore }),
      })
      const data = await res.json()
      if (data.leaderboard) setLeaderboard(data.leaderboard)
      setSubmitted(true)
    } catch { /* silent */ }
    setSubmitting(false)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...pageOuter, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
        <p style={{ color: '#8899bb', fontSize: 14, margin: 0 }}>Loading game…</p>
        <div style={{ position: 'relative', width: 200, height: 4, background: '#1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: '#f97316', borderRadius: 2, animation: 'slide 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || puzzles.length === 0) {
    return (
      <div style={{ ...pageOuter, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <p style={{ color: '#8899bb', fontSize: 14, margin: 0 }}>Failed to load game.</p>
        <button onClick={loadGame} style={{ background: '#1e2d4a', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          Try again
        </button>
      </div>
    )
  }

  // ── Game Complete ────────────────────────────────────────────────────────
  if (gameComplete) {
    const pct = Math.round((finalScore / MAX_SCORE) * 100)
    return (
      <div style={pageOuter}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>
        <NavBar />
        <div style={pageInner}>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            TopBins · Teammates
          </div>

          {/* Score card */}
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '24px 20px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8899bb', marginBottom: 8 }}>Game Complete — 5 rounds</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: finalScore >= 20 ? '#22c55e' : finalScore >= 12 ? '#fbbf24' : '#f87171', lineHeight: 1 }}>
              {finalScore}
            </div>
            <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>out of {MAX_SCORE} points</div>
            {/* Progress bar */}
            <div style={{ margin: '14px 0 0', height: 6, background: '#0a0f1e', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: finalScore >= 20 ? '#22c55e' : finalScore >= 12 ? '#fbbf24' : '#ef4444', borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {/* Submit score */}
          {!submitted ? (
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8899bb', marginBottom: 10 }}>Save your score</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitScore()}
                  placeholder="Enter username…"
                  maxLength={30}
                  style={{
                    flex: 1, background: '#0a0f1e', border: '1px solid #2a3d5e', borderRadius: 8,
                    padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  onClick={submitScore}
                  disabled={!username.trim() || submitting}
                  style={{
                    background: '#dc2626', border: 'none', borderRadius: 8, padding: '10px 16px',
                    color: 'white', fontSize: 13, fontWeight: 800,
                    cursor: username.trim() && !submitting ? 'pointer' : 'default',
                    opacity: username.trim() && !submitting ? 1 : 0.5,
                  }}
                >
                  {submitting ? '…' : 'Submit'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#22c55e', fontWeight: 700, textAlign: 'center' }}>
              Score saved!
            </div>
          )}

          {/* Play Again */}
          <button
            onClick={startNewGame}
            style={{
              width: '100%', background: '#dc2626', border: 'none', borderRadius: 8,
              padding: '12px', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 24,
            }}
          >
            Play Again
          </button>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Leaderboard — Best Game Score
              </div>
              <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, overflow: 'hidden' }}>
                {leaderboard.map((entry, i) => (
                  <div key={entry.username} style={{
                    display: 'flex', alignItems: 'center', padding: '10px 14px',
                    borderBottom: i < leaderboard.length - 1 ? '1px solid #1e2d4a' : 'none',
                    background: entry.username === username && submitted ? 'rgba(220,38,38,0.06)' : 'transparent',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? ['#fbbf24','#94a3b8','#b45309'][i] : '#4a5568', width: 22 }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: 'white', fontWeight: entry.username === username && submitted ? 800 : 400 }}>
                      {entry.username}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: entry.score >= 20 ? '#22c55e' : entry.score >= 12 ? '#fbbf24' : '#f87171' }}>
                      {entry.score}<span style={{ fontSize: 10, color: '#4a5568', fontWeight: 400 }}>/{MAX_SCORE}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  // ── Active Puzzle ────────────────────────────────────────────────────────
  return (
    <div style={pageOuter}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
      `}</style>
      <NavBar />
      <div style={pageInner}>

        {/* Game header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            TopBins · Teammates
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>
              Who's the mystery player?
            </h1>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{totalScore} pts</div>
              <div style={{ fontSize: 10, color: '#4a5568' }}>Round {round}/{TOTAL_ROUNDS}</div>
            </div>
          </div>
          {/* Round progress dots */}
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < round - 1 ? '#dc2626' : i === round - 1 ? '#f97316' : '#1e2d4a',
              }} />
            ))}
          </div>
        </div>

        {/* Guess tracker for current round */}
        {!roundDone && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {Array.from({ length: MAX_GUESSES }).map((_, i) => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: i < wrongGuesses.length ? '#ef4444' : i === wrongGuesses.length ? '#f97316' : '#1e2d4a',
                  border: i === wrongGuesses.length ? '1px solid #f97316' : 'none',
                }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#4a5568' }}>Guess {wrongGuesses.length + 1} of {MAX_GUESSES}</div>
          </div>
        )}

        {/* Clue grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {puzzle!.clues.map((clue, i) => (
            <ClueCard key={i} clue={clue} revealLevel={revealLevel} />
          ))}
        </div>

        {/* Progressive hints */}
        {revealLevel >= 1 && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '7px 12px', marginBottom: 8, fontSize: 11, color: '#fb923c', textAlign: 'center' }}>
            Clue 1 — Shirts show clubs where they played alongside the mystery player
          </div>
        )}
        {revealLevel >= 2 && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '7px 12px', marginBottom: 8, fontSize: 11, color: '#fb923c', textAlign: 'center' }}>
            Clue 2 — Season labels show when they were teammates
          </div>
        )}
        {revealLevel >= 3 && puzzle!.targetPos && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '7px 14px', marginBottom: 8, fontSize: 12, color: '#fbbf24', textAlign: 'center' }}>
            Clue 3 — Position: <strong>{puzzle!.targetPos}</strong>
          </div>
        )}
        {revealLevel >= 4 && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '7px 14px', marginBottom: 8, fontSize: 12, color: '#fbbf24', textAlign: 'center' }}>
            Clue 4 — Initials: <strong>{getInitials(puzzle!.targetEntity)}</strong>
          </div>
        )}

        {/* Input area */}
        {!roundDone && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                ref={inputRef}
                value={guess}
                onChange={e => onGuessChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitGuess(guess)}
                onFocus={() => setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                placeholder="Type a player name…"
                autoComplete="off"
                style={{
                  width: '100%', background: '#111827', border: '1px solid #1e2d4a',
                  borderRadius: 8, padding: '11px 14px', color: 'white', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {showSugg && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, marginTop: 4, zIndex: 50, overflow: 'hidden' }}>
                  {suggestions.map(s => (
                    <div key={s} onMouseDown={() => submitGuess(s)}
                      style={{ padding: '10px 14px', fontSize: 13, color: 'white', cursor: 'pointer', borderBottom: '1px solid #1e2d4a' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{s}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => submitGuess(guess)} disabled={!guess.trim()}
                style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: 8, padding: '11px', color: 'white', fontSize: 13, fontWeight: 800, cursor: guess.trim() ? 'pointer' : 'default', opacity: guess.trim() ? 1 : 0.5 }}>
                Submit Guess
              </button>
              <button onClick={() => setGaveUp(true)}
                style={{ background: '#1e2d4a', border: 'none', borderRadius: 8, padding: '11px 16px', color: '#8899bb', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Give Up
              </button>
            </div>
          </div>
        )}

        {/* Wrong guesses */}
        {wrongGuesses.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {wrongGuesses.map((g, i) => (
              <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f87171' }}>
                <span style={{ fontWeight: 700 }}>✗</span>{g}
              </div>
            ))}
          </div>
        )}

        {/* Round result panels */}
        {won && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>{puzzle!.targetEntity}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>+{roundScore} pts</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {puzzle!.targetGroups.map(g => <GroupPill key={g} club={g} />)}
            </div>
          </div>
        )}

        {(gaveUp || outOfGuesses) && (
          <div style={{ background: gaveUp ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${gaveUp ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{puzzle!.targetEntity}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: gaveUp ? '#fb923c' : '#f87171' }}>+0 pts</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {puzzle!.targetGroups.map(g => <GroupPill key={g} club={g} />)}
            </div>
          </div>
        )}

        {/* Next round / finish button */}
        {roundDone && (
          <button
            onClick={goToNextRound}
            style={{
              width: '100%', background: '#dc2626', border: 'none', borderRadius: 8,
              padding: '12px', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}
          >
            {round < TOTAL_ROUNDS ? `Next Round (${round + 1}/${TOTAL_ROUNDS}) →` : 'See Final Score →'}
          </button>
        )}

      </div>
    </div>
  )
}

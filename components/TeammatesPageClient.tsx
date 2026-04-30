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

const SHIRT_PATH = [
  'M 12,32', 'L 2,44', 'L 20,56', 'C 22,55 24,51 24,48',
  'L 24,90', 'L 76,90', 'L 76,48', 'C 76,51 78,55 80,56',
  'L 98,44', 'L 88,32', 'C 80,20 70,16 62,16',
  'A 12,10 0 0 1 38,16', 'C 30,16 20,20 12,32', 'Z',
].join(' ')

function Shirt({ club }: { club?: string }) {
  const s = club ? GROUP_STYLE[club] : null
  return (
    <svg viewBox="0 0 100 100" width="56" height="56" style={{ display: 'block' }}>
      <path
        d={SHIRT_PATH}
        fill={s ? s.bg : '#111827'}
        fillOpacity={s ? 0.55 : 1}
        stroke={s ? s.bg : '#2a3d5e'}
        strokeOpacity={s ? 0.9 : 1}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GroupPill({ club }: { club: string }) {
  const s = GROUP_STYLE[club]
  return (
    <span style={{
      background: s?.bg ?? '#1e2d4a',
      color: s?.fg ?? '#8899bb',
      fontSize: 10,
      fontWeight: 700,
      borderRadius: 20,
      padding: '3px 8px',
      display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>
      {s?.label ?? club}
    </span>
  )
}

type Clue = { name: string; sharedGroups: string[] }

function ClueCard({ clue, revealed }: { clue: Clue; revealed: boolean }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1e2d4a',
      borderRadius: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '14px 10px 12px',
    }}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {revealed
          ? clue.sharedGroups.map(g => <Shirt key={g} club={g} />)
          : <Shirt />
        }
      </div>
      {revealed && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {clue.sharedGroups.map(g => <GroupPill key={g} club={g} />)}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.3 }}>
        {clue.name}
      </div>
    </div>
  )
}

type Puzzle = {
  targetEntity: string
  targetGroups: string[]
  clues: Clue[]
}

const pageOuter: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0a0f1e',
  fontFamily: "'DM Sans', -apple-system, sans-serif",
}

const pageInner: React.CSSProperties = { padding: '24px 16px 40px', maxWidth: 520, margin: '0 auto' }

export default function TeammatesPageClient() {
  const [puzzle, setPuzzle]             = useState<Puzzle | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(false)
  const [guess, setGuess]               = useState('')
  const [suggestions, setSuggestions]   = useState<string[]>([])
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([])
  const [groupsRevealed, setGroupsRevealed] = useState(false)
  const [won, setWon]                   = useState(false)
  const [gaveUp, setGaveUp]             = useState(false)
  const [showSugg, setShowSugg]         = useState(false)
  const inputRef                        = useRef<HTMLInputElement>(null)
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadPuzzle(mode: string) {
    setLoading(true)
    setError(false)
    setPuzzle(null)
    setGuess('')
    setSuggestions([])
    setWrongGuesses([])
    setGroupsRevealed(false)
    setWon(false)
    setGaveUp(false)
    setShowSugg(false)
    try {
      const res = await fetch(`/api/teammates?mode=${mode}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPuzzle(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPuzzle('daily') }, [])

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
      } catch {
        setSuggestions([])
      }
    }, 250)
  }

  function submitGuess(name: string) {
    if (!puzzle || !name.trim()) return
    if (name.trim().toLowerCase() === puzzle.targetEntity.toLowerCase()) {
      setWon(true)
    } else {
      setGroupsRevealed(true)
      setWrongGuesses(prev => [...prev, name.trim()])
    }
    setGuess('')
    setSuggestions([])
    setShowSugg(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submitGuess(guess)
  }

  if (loading) {
    return (
      <div style={{ ...pageOuter, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <style>{`@keyframes slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }`}</style>
        <p style={{ color: '#8899bb', fontSize: 14, margin: 0 }}>Loading puzzle...</p>
        <div style={{ position: 'relative', width: 200, height: 4, background: '#1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: '#f97316', borderRadius: 2, animation: 'slide 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    )
  }

  if (error || !puzzle) {
    return (
      <div style={{ ...pageOuter, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <p style={{ color: '#8899bb', fontSize: 14, margin: 0 }}>Failed to load puzzle.</p>
        <button
          onClick={() => loadPuzzle('daily')}
          style={{ background: '#1e2d4a', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div style={pageOuter}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }
      `}</style>
      <NavBar />
      <div style={pageInner}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            TopBins · Teammates
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Who's the mystery player?
          </h1>
          <p style={{ fontSize: 12, color: '#8899bb', margin: 0 }}>
            Four of their PL teammates are shown. Guess the player who played with all of them.
          </p>
        </div>

        {/* 2×2 clue grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {puzzle.clues.map((clue, i) => (
            <ClueCard key={i} clue={clue} revealed={groupsRevealed} />
          ))}
        </div>

        {/* Hint banner after first wrong guess */}
        {groupsRevealed && !won && !gaveUp && (
          <div style={{
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 14,
            fontSize: 11,
            color: '#fb923c',
            textAlign: 'center',
          }}>
            Shirts shown are the clubs where the mystery player played alongside each teammate
          </div>
        )}

        {/* Input area */}
        {!won && !gaveUp && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                ref={inputRef}
                value={guess}
                onChange={e => onGuessChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                placeholder="Type a player name…"
                autoComplete="off"
                style={{
                  width: '100%',
                  background: '#111827',
                  border: '1px solid #1e2d4a',
                  borderRadius: 8,
                  padding: '11px 14px',
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {showSugg && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#111827',
                  border: '1px solid #1e2d4a',
                  borderRadius: 8,
                  marginTop: 4,
                  zIndex: 50,
                  overflow: 'hidden',
                }}>
                  {suggestions.map(s => (
                    <div
                      key={s}
                      onMouseDown={() => submitGuess(s)}
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'white',
                        cursor: 'pointer',
                        borderBottom: '1px solid #1e2d4a',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => submitGuess(guess)}
                disabled={!guess.trim()}
                style={{
                  flex: 1,
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: 8,
                  padding: '11px',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: guess.trim() ? 'pointer' : 'default',
                  opacity: guess.trim() ? 1 : 0.5,
                }}
              >
                Submit Guess
              </button>
              <button
                onClick={() => setGaveUp(true)}
                style={{
                  background: '#1e2d4a',
                  border: 'none',
                  borderRadius: 8,
                  padding: '11px 16px',
                  color: '#8899bb',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Give Up
              </button>
            </div>
          </div>
        )}

        {/* Wrong guesses */}
        {wrongGuesses.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {wrongGuesses.map((g, i) => (
              <div key={i} style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#f87171',
              }}>
                <span style={{ fontWeight: 700 }}>✗</span>
                {g}
              </div>
            ))}
          </div>
        )}

        {/* Gave up panel */}
        {gaveUp && (
          <div style={{
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: 10,
            padding: '16px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              The answer was
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 10 }}>
              {puzzle.targetEntity}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
              {puzzle.targetGroups.map(g => <GroupPill key={g} club={g} />)}
            </div>
          </div>
        )}

        {/* Won panel */}
        {won && (
          <div style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 10,
            padding: '16px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', marginBottom: 6 }}>
              {puzzle.targetEntity}
            </div>
            <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 10 }}>Played for:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: wrongGuesses.length > 0 ? 10 : 0 }}>
              {puzzle.targetGroups.map(g => <GroupPill key={g} club={g} />)}
            </div>
            {wrongGuesses.length > 0 && (
              <div style={{ fontSize: 11, color: '#8899bb' }}>
                {wrongGuesses.length} wrong guess{wrongGuesses.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
        )}

        {/* Play Again */}
        <button
          onClick={() => loadPuzzle('random')}
          style={{
            width: '100%',
            background: '#111827',
            border: '1px solid #1e2d4a',
            borderRadius: 8,
            padding: '11px',
            color: '#8899bb',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2d4a'; (e.currentTarget as HTMLButtonElement).style.color = '#8899bb' }}
        >
          Play Again (random)
        </button>

      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import NavBar from './NavBar'

const ROUND_TYPES = ['letters', 'letters', 'numbers', 'letters', 'letters', 'numbers', 'conundrum'] as const
type RoundType = typeof ROUND_TYPES[number]

const LETTERS_TIME  = 30
const CONUNDRUM_TIME = 30
const LS_USERNAME   = 'topbins_countdown_username'

type NumberPlayer = {
  name: string; seasons: number; goals: number
  clubs: number; assists: number; reds: number
  nationality: string; position: string
}
type ConundrumCandidate = { name: string; surname: string }
type LbEntry = { username: string; score: number; created_at: string }
type LetterResult = { word: string; valid: boolean; score: number; best: string; bestScore: number }
type NumberResult  = { correct: boolean; score: number; player: NumberPlayer }
type ConundrumResult = { correct: boolean; answer: string }

// Letter pools weighted by frequency
const VOWELS     = 'AAAAAAAAAAEEEEEEEEEEEEEEEIIIIIIIIIOOOOOOOOOUUUU'.split('')
const CONSONANTS = 'BBBCCCCDDDDDDFFFFFFGGGGHHHHHJJKKLLLLLLLMMMMMMNNNNNNNNNNPPPPQRRRRRRRRSSSSSSSSSSTTTTTTTTTTTTVVWWXXYYZZ'.split('')

function generateLetters(): string[] {
  const nVow = 3 + Math.floor(Math.random() * 3)
  const v = [...VOWELS].sort(() => Math.random() - 0.5).slice(0, nVow)
  const c = [...CONSONANTS].sort(() => Math.random() - 0.5).slice(0, 10 - nVow)
  return [...v, ...c].sort(() => Math.random() - 0.5)
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '')
}

function canFormWord(word: string, letters: string[]): boolean {
  const avail = [...letters]
  for (const ch of word) {
    const idx = avail.indexOf(ch)
    if (idx === -1) return false
    avail.splice(idx, 1)
  }
  return true
}

function getBestWord(letters: string[], surnames: string[]): string {
  return surnames
    .filter(s => canFormWord(s, letters))
    .sort((a, b) => b.length - a.length)[0] || ''
}

function jumble(word: string): string {
  const chars = word.split('')
  for (let t = 0; t < 50; t++) {
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    if (chars.join('') !== word) return chars.join('')
  }
  return chars.join('')
}

function getRoundLabel(idx: number): string {
  const type = ROUND_TYPES[idx]
  if (type === 'letters') {
    const n = ROUND_TYPES.slice(0, idx + 1).filter(t => t === 'letters').length
    return `Letters Round ${n}`
  }
  if (type === 'numbers') {
    const n = ROUND_TYPES.slice(0, idx + 1).filter(t => t === 'numbers').length
    return `Numbers Round ${n}`
  }
  return 'Final Conundrum'
}

const s = {
  page:  { minHeight: '100vh', background: '#0a0f1e', fontFamily: "'DM Sans', -apple-system, sans-serif", paddingBottom: 60 } as React.CSSProperties,
  card:  { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '16px 20px' } as React.CSSProperties,
  btn:   (color = '#dc2626'): React.CSSProperties => ({ background: color, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }),
  ghost: { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#8899bb', cursor: 'pointer' } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' } as React.CSSProperties,
  input: { background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', fontSize: 15, color: 'white', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
}

export default function FootyCountdown() {
  const [loading, setLoading]                     = useState(true)
  const [surnames, setSurnames]                   = useState<string[]>([])
  const [numberPlayers, setNumberPlayers]         = useState<NumberPlayer[]>([])
  const [conundrumCandidates, setConundrumCandidates] = useState<ConundrumCandidate[]>([])
  const [leaderboard, setLeaderboard]             = useState<LbEntry[]>([])

  const [username, setUsername]     = useState('')
  const [usernameSet, setUsernameSet] = useState(false)

  const [phase, setPhase]           = useState<'lobby' | 'playing' | 'result' | 'game_over'>('lobby')
  const [roundIndex, setRoundIndex] = useState(0)
  const [roundScores, setRoundScores] = useState<number[]>([])

  // Pre-generated per-game data
  const [numbersRoundPlayers, setNumbersRoundPlayers] = useState<[NumberPlayer, NumberPlayer] | null>(null)
  const [conundrumPlayer, setConundrumPlayer]         = useState<ConundrumCandidate | null>(null)
  const [conundrumJumbled, setConundrumJumbled]       = useState('')

  // Letters state
  const [letters, setLetters]         = useState<string[]>([])
  const [letterInput, setLetterInput] = useState('')
  const letterInputRef                = useRef('')
  const [timeLeft, setTimeLeft]       = useState(LETTERS_TIME)
  const [letterResult, setLetterResult] = useState<LetterResult | null>(null)

  // Numbers state
  const [currentPlayer, setCurrentPlayer]   = useState<NumberPlayer | null>(null)
  const [cluesShown, setCluesShown]         = useState<0 | 1 | 2>(0)
  const [numberSearch, setNumberSearch]     = useState('')
  const [selectedGuess, setSelectedGuess]   = useState<NumberPlayer | null>(null)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [numberResult, setNumberResult]     = useState<NumberResult | null>(null)

  // Conundrum state
  const [conundrumInput, setConundrumInput]       = useState('')
  const conundrumInputRef                         = useRef('')
  const [conundrumTimeLeft, setConundrumTimeLeft] = useState(CONUNDRUM_TIME)
  const [conundrumResult, setConundrumResult]     = useState<ConundrumResult | null>(null)

  const [submitted, setSubmitted] = useState(false)
  const hasAutoSubmitted          = useRef(false)

  const roundType: RoundType = ROUND_TYPES[roundIndex] ?? 'letters'

  useEffect(() => {
    fetch('/api/countdown')
      .then(r => r.json())
      .then(d => {
        setSurnames(d.surnames || [])
        setNumberPlayers(d.numberPlayers || [])
        setConundrumCandidates(d.conundrumCandidates || [])
        setLeaderboard(d.leaderboard || [])
        setLoading(false)
      })
    const saved = localStorage.getItem(LS_USERNAME)
    if (saved) { setUsername(saved); setUsernameSet(true) }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (phase !== 'playing') return
    if (roundType === 'letters' && timeLeft > 0) {
      const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(id)
    }
    if (roundType === 'conundrum' && conundrumTimeLeft > 0) {
      const id = setTimeout(() => setConundrumTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(id)
    }
  }, [phase, roundType, timeLeft, conundrumTimeLeft])

  // Time-up auto-submit
  useEffect(() => {
    if (phase !== 'playing') { hasAutoSubmitted.current = false; return }
    if (roundType === 'letters' && timeLeft === 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true
      finishLetters(letterInputRef.current)
    }
    if (roundType === 'conundrum' && conundrumTimeLeft === 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true
      finishConundrum(conundrumInputRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundType, timeLeft, conundrumTimeLeft])

  function handleSetUsername() {
    const t = username.trim()
    if (!t) return
    setUsername(t)
    localStorage.setItem(LS_USERNAME, t)
    setUsernameSet(true)
  }

  function startGame() {
    const shuffled = [...numberPlayers].sort(() => Math.random() - 0.5)
    const np: [NumberPlayer, NumberPlayer] = [shuffled[0] ?? numberPlayers[0], shuffled[1] ?? numberPlayers[1]]
    const cand = conundrumCandidates[Math.floor(Math.random() * conundrumCandidates.length)]

    setNumbersRoundPlayers(np)
    setConundrumPlayer(cand ?? null)
    setConundrumJumbled(cand ? jumble(cand.surname) : '')
    setRoundScores([])
    setSubmitted(false)
    setRoundIndex(0)

    const newLetters = generateLetters()
    setLetters(newLetters)
    setLetterInput('')
    letterInputRef.current = ''
    setLetterResult(null)
    setTimeLeft(LETTERS_TIME)
    hasAutoSubmitted.current = false
    setPhase('playing')
  }

  function startRound(idx: number) {
    const type = ROUND_TYPES[idx]
    hasAutoSubmitted.current = false
    if (type === 'letters') {
      const newLetters = generateLetters()
      setLetters(newLetters)
      setLetterInput('')
      letterInputRef.current = ''
      setLetterResult(null)
      setTimeLeft(LETTERS_TIME)
      setPhase('playing')
    } else if (type === 'numbers') {
      const nIdx = ROUND_TYPES.slice(0, idx + 1).filter(t => t === 'numbers').length - 1
      const player = numbersRoundPlayers?.[nIdx as 0 | 1] ?? numberPlayers[Math.floor(Math.random() * numberPlayers.length)]
      setCurrentPlayer(player)
      setCluesShown(0)
      setNumberSearch('')
      setSelectedGuess(null)
      setNumberResult(null)
      setShowDropdown(false)
      setPhase('playing')
    } else {
      setConundrumInput('')
      conundrumInputRef.current = ''
      setConundrumTimeLeft(CONUNDRUM_TIME)
      setConundrumResult(null)
      setPhase('playing')
    }
  }

  function finishLetters(word: string) {
    const upper = normalize(word)
    const best  = getBestWord(letters, surnames)
    let score = 0, valid = false
    if (upper.length > 0 && canFormWord(upper, letters) && surnames.includes(upper)) {
      score = upper.length
      valid = true
    }
    setLetterResult({ word: upper, valid, score, best, bestScore: best.length })
    setRoundScores(prev => [...prev, score])
    setPhase('result')
  }

  function handleLettersSubmit() {
    if (phase !== 'playing') return
    hasAutoSubmitted.current = true
    finishLetters(letterInputRef.current)
  }

  function handleNumbersSubmit() {
    if (!currentPlayer || !selectedGuess) return
    const correct = normalize(selectedGuess.name) === normalize(currentPlayer.name)
    const pts     = cluesShown === 0 ? 10 : cluesShown === 1 ? 7 : 5
    const score   = correct ? pts : 0
    setNumberResult({ correct, score, player: currentPlayer })
    setRoundScores(prev => [...prev, score])
    setPhase('result')
  }

  function handleNumbersGiveUp() {
    if (!currentPlayer) return
    setNumberResult({ correct: false, score: 0, player: currentPlayer })
    setRoundScores(prev => [...prev, 0])
    setPhase('result')
  }

  function finishConundrum(input: string) {
    if (!conundrumPlayer) return
    const correct = normalize(input) === conundrumPlayer.surname
    const score   = correct ? 10 : 0
    setConundrumResult({ correct, answer: conundrumPlayer.surname })
    setRoundScores(prev => [...prev, score])
    setPhase('result')
  }

  function handleConundrumSubmit() {
    if (phase !== 'playing') return
    hasAutoSubmitted.current = true
    finishConundrum(conundrumInputRef.current)
  }

  function nextRound() {
    const next = roundIndex + 1
    if (next >= ROUND_TYPES.length) {
      const total = roundScores.reduce((a, b) => a + b, 0)
      setPhase('game_over')
      if (username && !submitted) {
        setSubmitted(true)
        fetch('/api/countdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, score: total }),
        }).then(r => r.json()).then(d => setLeaderboard(d.leaderboard || []))
      }
    } else {
      setRoundIndex(next)
      startRound(next)
    }
  }

  const totalScore  = roundScores.reduce((a, b) => a + b, 0)
  const pointsAvail = cluesShown === 0 ? 10 : cluesShown === 1 ? 7 : 5

  const renderHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div>
        <div style={s.label}>{getRoundLabel(roundIndex)}</div>
        <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Round {roundIndex + 1} of {ROUND_TYPES.length}</div>
      </div>
      <div style={{ ...s.card, padding: '8px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{totalScore}</div>
        <div style={{ fontSize: 10, color: '#8899bb', textTransform: 'uppercase' }}>Total pts</div>
      </div>
    </div>
  )

  const renderLeaderboard = () => {
    if (!leaderboard.length) return null
    const top10    = leaderboard.slice(0, 10)
    const userIdx  = leaderboard.findIndex(r => r.username === username)
    const inTop10  = userIdx >= 0 && userIdx < 10
    return (
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12 }}>🏆 Leaderboard</div>
        {top10.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4a' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: i === 0 ? '#f59e0b' : '#4a5568', width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
              <span style={{ fontSize: 13, color: row.username === username ? '#dc2626' : 'white', fontWeight: row.username === username ? 700 : 400 }}>{row.username}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: row.username === username ? '#dc2626' : '#8899bb' }}>{row.score} pts</span>
          </div>
        ))}
        {!inTop10 && userIdx >= 0 && (() => {
          const row = leaderboard[userIdx]
          return (
            <>
              <div style={{ padding: '4px 0', color: '#2a3d5e', fontSize: 11 }}>···</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', background: 'rgba(220,38,38,0.06)', borderRadius: 6 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#dc2626', width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{row.username}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{row.score} pts</span>
              </div>
            </>
          )
        })()}
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ color: '#8899bb' }}>Loading...</p>
      </div>
    </div>
  )

  // ── Username ─────────────────────────────────────────────────────────────
  if (!usernameSet) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={s.label}>TopBins</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '8px 0' }}>Footy Countdown</h1>
          <p style={{ fontSize: 13, color: '#8899bb', margin: 0 }}>Enter your name to track scores on the leaderboard</p>
        </div>
        <div style={{ ...s.card, marginBottom: 12 }}>
          <div style={{ ...s.label, marginBottom: 10 }}>Your name</div>
          <input style={s.input} value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetUsername()}
            placeholder="Enter your name..." autoFocus />
          <p style={{ fontSize: 11, color: '#4a5568', margin: '8px 0 0' }}>Saved across all TopBins games</p>
        </div>
        <button onClick={handleSetUsername} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: '14px' }}>Continue</button>
      </div>
    </div>
  )

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === 'lobby') return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={s.label}>TopBins</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '8px 0 4px' }}>Footy Countdown</h1>
          <p style={{ fontSize: 13, color: '#8899bb' }}>7 rounds · Letters, Numbers & Conundrum · Max 70 pts</p>
        </div>

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.label, marginBottom: 12 }}>How to Play</div>
          {[
            { icon: '🔤', title: 'Letters (×4)', desc: '10 random letters · 30 seconds · Find the longest PL player surname you can make · score = surname length' },
            { icon: '🔢', title: 'Numbers (×2)', desc: 'Guess the mystery player from their 5 stats · 10 pts · Reveal position (7 pts) or nationality (5 pts) for clues' },
            { icon: '🔀', title: 'Conundrum (×1)', desc: 'Unscramble a jumbled PL player surname · 30 seconds · 10 pts' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#8899bb', lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {renderLeaderboard()}

        <button onClick={startGame} style={{ ...s.btn(), width: '100%', fontSize: 16, padding: '16px' }}>
          Start Game →
        </button>
      </div>
    </div>
  )

  // ── Letters playing ───────────────────────────────────────────────────────
  if (phase === 'playing' && roundType === 'letters') {
    const timePct    = (timeLeft / LETTERS_TIME) * 100
    const timerColor = timeLeft <= 5 ? '#dc2626' : timeLeft <= 10 ? '#f59e0b' : '#22c55e'
    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          {renderHeader()}
          <div style={{ ...s.card, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ ...s.label, marginBottom: 16 }}>Your Letters</div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              {letters.map((l, i) => (
                <div key={i} style={{ width: 46, height: 56, background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white' }}>
                  {l}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#8899bb' }}>Time left</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: timerColor }}>{timeLeft}s</span>
              </div>
              <div style={{ background: '#0a0f1e', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ background: timerColor, width: `${timePct}%`, height: '100%', transition: 'width 1s linear, background 0.3s' }} />
              </div>
            </div>

            <input
              style={{ ...s.input, textAlign: 'center', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}
              value={letterInput}
              onChange={e => {
                const v = e.target.value.replace(/[^a-zA-Z]/g, '')
                setLetterInput(v)
                letterInputRef.current = v
              }}
              onKeyDown={e => e.key === 'Enter' && handleLettersSubmit()}
              placeholder="Type surname..."
              maxLength={10}
              autoFocus
            />
            <button onClick={handleLettersSubmit} style={{ ...s.btn(), width: '100%' }}>Submit →</button>
          </div>
          <p style={{ fontSize: 12, color: '#4a5568', textAlign: 'center' }}>
            Find the longest PL player surname using only these letters
          </p>
        </div>
      </div>
    )
  }

  // ── Letters result ────────────────────────────────────────────────────────
  if (phase === 'result' && roundType === 'letters' && letterResult) {
    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          {renderHeader()}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            {letters.map((l, i) => (
              <div key={i} style={{ width: 38, height: 46, background: '#0a0f1e', border: '1px solid #2a3d5e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#4a5568' }}>
                {l}
              </div>
            ))}
          </div>

          <div style={{ ...s.card, textAlign: 'center', marginBottom: 12 }}>
            {letterResult.word ? (
              <>
                <div style={{ fontSize: 11, color: '#8899bb', textTransform: 'uppercase', marginBottom: 6 }}>You answered</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: letterResult.valid ? '#22c55e' : '#ef4444', marginBottom: 6 }}>
                  {letterResult.word}
                </div>
                <div style={{ fontSize: 13, color: letterResult.valid ? '#22c55e' : '#ef4444' }}>
                  {letterResult.valid ? `✓ Valid PL surname — ${letterResult.score} pts` : '✗ Not a valid PL player surname'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 15, color: '#8899bb' }}>No answer — 0 pts</div>
            )}
          </div>

          <div style={{ ...s.card, textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#8899bb', textTransform: 'uppercase', marginBottom: 6 }}>Best possible answer</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{letterResult.best || '—'}</div>
            {letterResult.best && (
              <div style={{ fontSize: 12, color: '#8899bb', marginTop: 2 }}>{letterResult.bestScore} letters · {letterResult.bestScore} pts</div>
            )}
          </div>

          <div style={{ ...s.card, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#8899bb', textTransform: 'uppercase', marginBottom: 4 }}>Points this round</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#dc2626' }}>{letterResult.score}</div>
          </div>

          <button onClick={nextRound} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: '14px' }}>
            {roundIndex + 1 >= ROUND_TYPES.length ? 'See Final Score →' : 'Next Round →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Numbers playing ───────────────────────────────────────────────────────
  if (phase === 'playing' && roundType === 'numbers' && currentPlayer) {
    const filtered = numberPlayers
      .filter(p => p.name.toLowerCase().includes(numberSearch.toLowerCase()))
      .slice(0, 8)

    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          {renderHeader()}

          <div style={{ ...s.card, marginBottom: 12 }}>
            <div style={{ ...s.label, marginBottom: 12 }}>Mystery Player</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'PL Seasons', val: currentPlayer.seasons },
                { label: 'PL Goals',   val: currentPlayer.goals },
                { label: 'PL Clubs',   val: currentPlayer.clubs },
                { label: 'PL Assists', val: currentPlayer.assists },
                { label: 'Red Cards',  val: currentPlayer.reds },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>{val}</div>
                  <div style={{ fontSize: 10, color: '#8899bb', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => cluesShown < 1 && setCluesShown(1)}
                style={{
                  borderRadius: 8, padding: '10px 12px', textAlign: 'center', width: '100%', fontSize: 12, fontWeight: 700, border: 'none',
                  ...(cluesShown >= 1
                    ? { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', cursor: 'default', color: '#dc2626' }
                    : { ...s.ghost, fontSize: 12 })
                }}
              >
                {cluesShown >= 1
                  ? `🏃 ${currentPlayer.position}`
                  : <><span>Reveal Position</span><br /><span style={{ fontWeight: 400, fontSize: 11 }}>10 → 7 pts</span></>
                }
              </button>
              <button
                onClick={() => cluesShown === 1 && setCluesShown(2)}
                disabled={cluesShown < 1}
                style={{
                  borderRadius: 8, padding: '10px 12px', textAlign: 'center', width: '100%', fontSize: 12, fontWeight: 700, border: 'none',
                  ...(cluesShown >= 2
                    ? { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', cursor: 'default', color: '#dc2626' }
                    : cluesShown === 1
                    ? { ...s.ghost, fontSize: 12 }
                    : { ...s.ghost, fontSize: 12, opacity: 0.4, cursor: 'not-allowed' })
                }}
              >
                {cluesShown >= 2
                  ? `🌍 ${currentPlayer.nationality}`
                  : <><span style={{ color: cluesShown >= 1 ? '#8899bb' : '#2a3d5e' }}>Reveal Nationality</span><br /><span style={{ fontWeight: 400, fontSize: 11, color: cluesShown >= 1 ? '#8899bb' : '#2a3d5e' }}>7 → 5 pts</span></>
                }
              </button>
            </div>
          </div>

          <div style={{ ...s.card, textAlign: 'center', marginBottom: 12, padding: '10px 20px' }}>
            <div style={{ fontSize: 11, color: '#8899bb', textTransform: 'uppercase', marginBottom: 2 }}>Playing for</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{pointsAvail}</div>
            <div style={{ fontSize: 11, color: '#8899bb' }}>points</div>
          </div>

          <div style={{ ...s.card, marginBottom: 12 }}>
            <div style={{ ...s.label, marginBottom: 10 }}>Your Guess</div>
            <div style={{ position: 'relative' }}>
              <input
                style={s.input}
                value={numberSearch}
                onChange={e => { setNumberSearch(e.target.value); setSelectedGuess(null); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search for a player..."
                autoFocus
              />
              {showDropdown && numberSearch.length >= 2 && filtered.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, zIndex: 50, marginTop: 4, overflow: 'hidden' }}>
                  {filtered.map((p, i) => (
                    <div key={i}
                      onClick={() => { setSelectedGuess(p); setNumberSearch(p.name); setShowDropdown(false) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #0a0f1e', color: 'white', fontSize: 13, background: selectedGuess?.name === p.name ? 'rgba(220,38,38,0.1)' : undefined }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedGuess && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#8899bb' }}>
                Selected: <span style={{ color: 'white', fontWeight: 700 }}>{selectedGuess.name}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleNumbersSubmit} disabled={!selectedGuess}
              style={{ ...s.btn(), flex: 1, opacity: selectedGuess ? 1 : 0.4 }}>
              Submit Guess →
            </button>
            <button onClick={handleNumbersGiveUp} style={s.ghost}>Give Up</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Numbers result ────────────────────────────────────────────────────────
  if (phase === 'result' && roundType === 'numbers' && numberResult) {
    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          {renderHeader()}

          <div style={{ ...s.card, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{numberResult.correct ? '✅' : '❌'}</div>
            <div style={{ fontSize: 13, color: '#8899bb', marginBottom: 4 }}>The answer was</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 12 }}>{numberResult.player.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
              {[
                { label: 'Seasons', val: numberResult.player.seasons },
                { label: 'Goals',   val: numberResult.player.goals },
                { label: 'Clubs',   val: numberResult.player.clubs },
                { label: 'Assists', val: numberResult.player.assists },
                { label: 'Reds',    val: numberResult.player.reds },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: '#0a0f1e', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{val}</div>
                  <div style={{ fontSize: 10, color: '#8899bb' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#8899bb', textTransform: 'uppercase', marginBottom: 4 }}>Points this round</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: numberResult.correct ? '#22c55e' : '#ef4444' }}>
              {numberResult.score}
            </div>
          </div>

          <button onClick={nextRound} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: '14px' }}>
            {roundIndex + 1 >= ROUND_TYPES.length ? 'See Final Score →' : 'Next Round →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Conundrum playing ─────────────────────────────────────────────────────
  if (phase === 'playing' && roundType === 'conundrum') {
    const timePct    = (conundrumTimeLeft / CONUNDRUM_TIME) * 100
    const timerColor = conundrumTimeLeft <= 5 ? '#dc2626' : conundrumTimeLeft <= 10 ? '#f59e0b' : '#22c55e'
    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          {renderHeader()}

          <div style={{ ...s.card, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ ...s.label, marginBottom: 4 }}>Final Conundrum</div>
            <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 20 }}>Unscramble the jumbled player surname · 10 pts</div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              {conundrumJumbled.split('').map((l, i) => (
                <div key={i} style={{ width: 46, height: 56, background: '#0a0f1e', border: '1px solid #dc2626', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white' }}>
                  {l}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#8899bb' }}>Time left</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: timerColor }}>{conundrumTimeLeft}s</span>
              </div>
              <div style={{ background: '#0a0f1e', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ background: timerColor, width: `${timePct}%`, height: '100%', transition: 'width 1s linear, background 0.3s' }} />
              </div>
            </div>

            <input
              style={{ ...s.input, textAlign: 'center', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}
              value={conundrumInput}
              onChange={e => {
                const v = e.target.value.replace(/[^a-zA-Z]/g, '')
                setConundrumInput(v)
                conundrumInputRef.current = v
              }}
              onKeyDown={e => e.key === 'Enter' && handleConundrumSubmit()}
              placeholder="Type the answer..."
              maxLength={15}
              autoFocus
            />
            <button onClick={handleConundrumSubmit} style={{ ...s.btn(), width: '100%' }}>Submit →</button>
          </div>
          <p style={{ fontSize: 12, color: '#4a5568', textAlign: 'center' }}>It's a PL player's surname — letters are jumbled</p>
        </div>
      </div>
    )
  }

  // ── Conundrum result ──────────────────────────────────────────────────────
  if (phase === 'result' && roundType === 'conundrum' && conundrumResult) {
    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          {renderHeader()}

          <div style={{ ...s.card, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{conundrumResult.correct ? '🎉' : '⏱️'}</div>
            <div style={{ fontSize: 13, color: '#8899bb', marginBottom: 4 }}>
              {conundrumResult.correct ? 'Correct!' : "Time's up!"}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626', marginBottom: 2 }}>{conundrumResult.answer}</div>
            {conundrumPlayer && (
              <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 16 }}>({conundrumPlayer.name})</div>
            )}
            <div style={{ fontSize: 11, color: '#8899bb', textTransform: 'uppercase', marginBottom: 4 }}>Points this round</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: conundrumResult.correct ? '#22c55e' : '#ef4444' }}>
              {conundrumResult.correct ? 10 : 0}
            </div>
          </div>

          <button onClick={nextRound} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: '14px' }}>
            See Final Score →
          </button>
        </div>
      </div>
    )
  }

  // ── Game over ─────────────────────────────────────────────────────────────
  if (phase === 'game_over') {
    return (
      <div style={s.page}>
        <NavBar />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={s.label}>Game Over</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: '#dc2626', margin: '8px 0 4px', lineHeight: 1 }}>{totalScore}</div>
            <div style={{ fontSize: 14, color: '#8899bb' }}>out of 70 points</div>
          </div>

          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ ...s.label, marginBottom: 12 }}>Round Breakdown</div>
            {ROUND_TYPES.map((_, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < ROUND_TYPES.length - 1 ? '1px solid #1e2d4a' : 'none' }}>
                <span style={{ fontSize: 13, color: '#8899bb' }}>{getRoundLabel(idx)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: (roundScores[idx] ?? 0) > 0 ? '#dc2626' : '#4a5568' }}>
                  {roundScores[idx] ?? 0} pts
                </span>
              </div>
            ))}
          </div>

          {renderLeaderboard()}

          <button onClick={() => setPhase('lobby')} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: '14px' }}>
            Play Again →
          </button>
        </div>
      </div>
    )
  }

  return null
}

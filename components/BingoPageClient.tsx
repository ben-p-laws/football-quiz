'use client'

import { useState, useEffect, useRef } from 'react'
import NavBar from './NavBar'

function LoadingAnimation() {
  const [lit, setLit] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

    async function cycle() {
      while (!cancelled) {
        const order = [...Array(9).keys()].sort(() => Math.random() - 0.5)
        setLit([])
        await delay(300)
        for (const sq of order) {
          if (cancelled) return
          setLit(prev => [...prev, sq])
          await delay(180)
        }
        await delay(700)
      }
    }

    cycle()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: 120 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{
            height: 36, borderRadius: 6,
            background: lit.includes(i) ? '#22c55e' : '#111827',
            border: `1px solid ${lit.includes(i) ? '#22c55e' : '#1e2d4a'}`,
            transition: 'background 0.2s ease, border-color 0.2s ease',
          }} />
        ))}
      </div>
      <p style={{ color: '#4a5568', fontSize: 12, margin: 0 }}>Loading...</p>
    </div>
  )
}

type Difficulty = 'beginner' | 'expert'
type Achievement = { position: number; id: string; name: string }
type Player      = { reveal_order: number; id: string; name: string }
type Puzzle      = { achievements: Achievement[]; players: Player[]; playerAchievements: Record<string, string[]> }
type LevelStats  = { bestScore: number; perfects: number }

const STORAGE_KEY_USERNAME = 'footballiq_username'
const STORAGE_KEY_STATS    = 'bingo_level_stats'

const GRID_SIZES: Record<Difficulty, number> = { beginner: 9, expert: 16 }
const GRID_COLS:  Record<Difficulty, number> = { beginner: 3, expert: 4 }
const SKIP_OPTIONS = [1, 0]
const DIFFICULTIES: Difficulty[] = ['beginner', 'expert']
const DIFF_LABELS_FULL: Record<Difficulty, string> = { beginner: 'Beginner', expert: 'Expert' }

function levelKey(d: Difficulty, s: number) { return `${d}-${s}` }
function skipLabel(s: number) { return s === 0 ? 'No skips' : s === 1 ? '1 skip' : `${s} skips` }

function loadAllStats(): Record<string, LevelStats> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_STATS) || '{}') }
  catch { return {} }
}

function saveStat(key: string, score: number, gridSize: number): Record<string, LevelStats> {
  const all = loadAllStats()
  const existing = all[key] || { bestScore: 0, perfects: 0 }
  all[key] = {
    bestScore: Math.max(existing.bestScore, score),
    perfects:  existing.perfects + (score === gridSize ? 1 : 0),
  }
  localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(all))
  return all
}

function generateClientPuzzle(
  allAchievements: Achievement[],
  allPlayers: Player[],
  playerAchievements: Record<string, string[]>,
  gridSize: number,
  maxSkips: number
) {
  const useAll = gridSize >= allAchievements.length
  const achievements = useAll
    ? [...allAchievements]
    : [...allAchievements].sort(() => Math.random() - 0.5).slice(0, gridSize)
  const achIds = new Set(achievements.map(a => a.id))

  const qualifying = allPlayers.filter(p => (playerAchievements[p.id] || []).some(a => achIds.has(a)))
  if (qualifying.length < gridSize + maxSkips) return null

  const players = [...qualifying].sort(() => Math.random() - 0.5).slice(0, gridSize + maxSkips)
    .map((p, i) => ({ ...p, reveal_order: i }))

  return { achievements: achievements.map((a, i) => ({ ...a, position: i })), players }
}

export default function BingoPageClient() {
  const [puzzle, setPuzzle]           = useState<Puzzle | null>(null)
  const [assignments, setAssignments] = useState<Record<number, { playerId: string; playerName: string; correct: boolean } | null>>({})
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [spinning, setSpinning]       = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null)
  const [gameOver, setGameOver]       = useState(false)
  const [score, setScore]             = useState(0)
  const [userName, setUserName]       = useState('')
  const [usernameSet, setUsernameSet] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [difficulty, setDifficulty]   = useState<Difficulty>('beginner')
  const [skips, setSkips]             = useState(1)
  const [skipsLeft, setSkipsLeft]     = useState(1)
  const [submitted, setSubmitted]     = useState(false)
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [allPlayers, setAllPlayers]   = useState<Player[]>([])
  const [allMatrix, setAllMatrix]     = useState<Record<string, string[]>>({})
  const [allStats, setAllStats]       = useState<Record<string, LevelStats>>({})
  const [showLevelPicker, setShowLevelPicker] = useState(true)
  const spinInterval = useRef<any>(null)

  const currentPlayer = puzzle?.players[currentPlayerIdx]
  const gridSize = GRID_SIZES[difficulty]
  const gridCols = GRID_COLS[difficulty]

  useEffect(() => {
    async function loadAndGenerate() {
      const res = await fetch('/api/bingo')
      const { achievements, players, playerAchievements } = await res.json()
      const achs: Achievement[] = achievements.map((a: any, i: number) => ({ ...a, position: i }))
      const pls: Player[]       = players.map((p: any, i: number) => ({ ...p, reveal_order: i }))
      setAllAchievements(achs)
      setAllPlayers(pls)
      setAllMatrix(playerAchievements)
      const generated = generateClientPuzzle(achs, pls, playerAchievements, GRID_SIZES['beginner'], 1)
      if (generated) setPuzzle({ achievements: generated.achievements, players: generated.players, playerAchievements })
    }
    loadAndGenerate()
    const saved = localStorage.getItem(STORAGE_KEY_USERNAME)
    if (saved) { setUserName(saved); setUsernameSet(true) }
    setAllStats(loadAllStats())
    fetch('/api/bingo-leaderboard').then(r => r.json()).then(d => setLeaderboard(d.leaderboard || []))
  }, [])

  function saveUsername() {
    if (!userName.trim()) return
    localStorage.setItem(STORAGE_KEY_USERNAME, userName.trim())
    setUsernameSet(true)
  }

  function switchLevel(newDiff: Difficulty, newSkips: number) {
    if (allAchievements.length === 0) return
    const newGridSize = GRID_SIZES[newDiff]
    const newPuzzle = generateClientPuzzle(allAchievements, allPlayers, allMatrix, newGridSize, newSkips)
    if (!newPuzzle) return
    setDifficulty(newDiff)
    setSkips(newSkips)
    setSkipsLeft(newSkips)
    setPuzzle({ achievements: newPuzzle.achievements, players: newPuzzle.players, playerAchievements: allMatrix })
    setAssignments({})
    setCurrentPlayerIdx(0)
    setGameOver(false)
    setScore(0)
    setSpinning(false)
    setDisplayName('')
    setSelectedSquare(null)
    setSubmitted(false)
    setShowLevelPicker(false)
  }

  async function submitScore(name: string, diff: Difficulty, skipsCount: number, finalScore: number) {
    if (submitted) return
    setSubmitted(true)
    const key = levelKey(diff, skipsCount)
    const newStats = saveStat(key, finalScore, GRID_SIZES[diff])
    setAllStats(newStats)
    if (finalScore === GRID_SIZES[diff]) {
      try {
        const res = await fetch('/api/bingo-leaderboard', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name, level: key }),
        })
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
      } catch {}
    }
  }

  function handleSkip() {
    if (!puzzle || spinning || skipsLeft <= 0 || gameOver) return
    const nextIdx = currentPlayerIdx + 1
    const isExhausted = nextIdx >= puzzle.players.length
    setSkipsLeft(s => s - 1)
    setCurrentPlayerIdx(nextIdx)
    setDisplayName('')
    if (isExhausted) {
      setGameOver(true)
      if (userName) submitScore(userName, difficulty, skips, score)
    } else {
      setTimeout(() => {
        setSpinning(true)
        const allNames = puzzle!.players.map(p => p.name)
        let count = 0
        spinInterval.current = setInterval(() => {
          setDisplayName(allNames[Math.floor(Math.random() * allNames.length)])
          count++
          if (count >= 10) {
            clearInterval(spinInterval.current)
            setDisplayName(puzzle!.players[nextIdx].name)
            setSpinning(false)
          }
        }, 80)
      }, 100)
    }
  }

  function spinAndReveal() {
    if (!puzzle || spinning) return
    setShowLevelPicker(false)
    setSpinning(true)
    setSelectedSquare(null)
    const allNames = puzzle.players.map(p => p.name)
    let count = 0
    spinInterval.current = setInterval(() => {
      setDisplayName(allNames[Math.floor(Math.random() * allNames.length)])
      count++
      if (count >= 10) {
        clearInterval(spinInterval.current)
        setDisplayName(currentPlayer!.name)
        setSpinning(false)
      }
    }, 80)
  }

  function assignToSquare(position: number) {
    if (!puzzle || spinning || !currentPlayer || gameOver) return
    if (assignments[position]) return

    const qualifies = (puzzle.playerAchievements[currentPlayer.id] || []).includes(puzzle.achievements[position].id)
    const newAssignments = { ...assignments, [position]: { playerId: currentPlayer.id, playerName: currentPlayer.name, correct: qualifies } }
    const nextIdx   = currentPlayerIdx + 1
    const allFilled = Object.keys(newAssignments).length === gridSize
    const isExhausted = nextIdx >= puzzle.players.length
    const newScore  = Object.values(newAssignments).filter(a => a?.correct).length

    setAssignments(newAssignments)
    setCurrentPlayerIdx(nextIdx)
    setSelectedSquare(position)
    setDisplayName('')
    setScore(newScore)

    if (allFilled || isExhausted) {
      setGameOver(true)
      if (userName) submitScore(userName, difficulty, skips, newScore)
    } else {
      setTimeout(() => {
        setSpinning(true)
        const allNames = puzzle!.players.map(p => p.name)
        let count = 0
        spinInterval.current = setInterval(() => {
          setDisplayName(allNames[Math.floor(Math.random() * allNames.length)])
          count++
          if (count >= 10) {
            clearInterval(spinInterval.current)
            setDisplayName(puzzle!.players[nextIdx].name)
            setSpinning(false)
          }
        }, 80)
      }, 100)
    }
  }

  // Level 1 (easiest) = beginner+3skips … Level 9 (hardest) = expert+0skips
  type LevelConfig = { num: number; diff: Difficulty; skips: number }
  const ALL_LEVELS: LevelConfig[] = DIFFICULTIES.flatMap((d, di) =>
    SKIP_OPTIONS.map((s, si) => ({ num: di * 3 + si + 1, diff: d, skips: s }))
  )
  const currentLevelNum = ALL_LEVELS.find(l => l.diff === difficulty && l.skips === skips)?.num ?? 1

  function levelRecord(l: LevelConfig) {
    const stats = allStats[levelKey(l.diff, l.skips)]
    if (!stats) return ''
    if (stats.perfects > 0) return `  ·  ⭐ ×${stats.perfects}`
    return `  ·  best ${stats.bestScore}/${GRID_SIZES[l.diff]}`
  }

  function levelOptionLabel(l: LevelConfig) {
    const tag = l.num === 1 ? ' — Easiest' : l.num === ALL_LEVELS.length ? ' — Hardest' : ''
    return `Level ${l.num}${tag}${levelRecord(l)}`
  }

  function levelDropdown() {
    return (
      <select
        value={currentLevelNum}
        onChange={e => {
          const l = ALL_LEVELS.find(x => x.num === Number(e.target.value))
          if (l) switchLevel(l.diff, l.skips)
        }}
        style={{
          width: '100%', background: '#0a0f1e', border: '1px solid #1e2d4a',
          borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600,
          color: 'white', cursor: 'pointer', outline: 'none', appearance: 'none',
          WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234a5568' strokeWidth='2' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
        }}>
        {ALL_LEVELS.map(l => (
          <option key={l.num} value={l.num}>{levelOptionLabel(l)}</option>
        ))}
      </select>
    )
  }

  function renderLeaderboard() {
    if (leaderboard.length === 0) return null
    const top10 = leaderboard.slice(0, 10)
    const userIdx = leaderboard.findIndex((r: any) => r.username === userName)
    const userInTop10 = userIdx >= 0 && userIdx < 10
    const diffTotal = (row: any, diff: Difficulty) =>
      SKIP_OPTIONS.reduce((sum, sk) => sum + (row.levels[levelKey(diff, sk)] || 0), 0)

    const row$ = (row: any, rank: number, highlight: boolean) => {
      const eT = diffTotal(row, 'expert')
      const bT = diffTotal(row, 'beginner')
      return (
        <div key={rank} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 34px 34px 38px', gap: 4, padding: '5px 0', borderBottom: '1px solid #1e2d4a', alignItems: 'center', background: highlight ? 'rgba(220,38,38,0.06)' : 'transparent', borderRadius: highlight ? 6 : 0, paddingLeft: highlight ? 6 : 0, paddingRight: highlight ? 6 : 0 }}>
          <span style={{ fontSize: 11, color: rank === 1 ? '#f59e0b' : highlight ? '#dc2626' : '#4a5568', fontWeight: (rank === 1 || highlight) ? 700 : 400 }}>#{rank}</span>
          <span style={{ fontSize: 13, color: highlight ? '#dc2626' : 'white', fontWeight: highlight ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.username}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: eT > 0 ? '#fbbf24' : '#2a3d5e', textAlign: 'center' }}>{eT || '—'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: bT > 0 ? '#4ade80' : '#2a3d5e', textAlign: 'center' }}>{bT || '—'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: highlight ? '#dc2626' : '#8899bb', textAlign: 'center' }}>{row.total} ⭐</span>
        </div>
      )
    }

    return (
      <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>🏆 Leaderboard — Perfect Games</div>
        <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 34px 34px 38px', gap: 4, marginBottom: 6 }}>
          <div /><div />
          {(['E', 'B', '∑'] as const).map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#4a5568', textAlign: 'center' }}>{h}</div>
          ))}
        </div>
        {top10.map((row: any, i: number) => row$(row, i + 1, row.username === userName))}
        {!userInTop10 && userIdx >= 0 && (
          <>
            <div style={{ padding: '3px 0', color: '#2a3d5e', fontSize: 11 }}>···</div>
            {row$(leaderboard[userIdx], userIdx + 1, true)}
          </>
        )}
      </div>
    )
  }

  const bingoGrid = puzzle && (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '8px', marginBottom: '16px' }}>
      {puzzle.achievements.map(ach => {
        const assigned = assignments[ach.position]
        const isSelected = selectedSquare === ach.position
        let bg     = '#111827'
        let border = '#1e2d4a'
        let cursor = 'default'
        if (assigned) {
          bg     = assigned.correct ? '#0d2818' : '#2a1010'
          border = assigned.correct ? '#22c55e' : '#ef4444'
        } else if (!gameOver && displayName && !spinning) {
          bg = '#1a2535'; border = '#2a3d5e'; cursor = 'pointer'
        }
        if (isSelected) border = assigned?.correct ? '#22c55e' : '#ef4444'
        return (
          <div key={ach.position}
            onClick={() => !assigned && !spinning && displayName && !gameOver && assignToSquare(ach.position)}
            style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '10px 8px', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor, transition: 'all 0.2s' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: assigned ? (assigned.correct ? '#22c55e' : '#ef4444') : '#cbd5e1', lineHeight: 1.3, marginBottom: assigned ? '6px' : 0 }}>
              {ach.name}
            </div>
            {assigned && (
              <div style={{ fontSize: '10px', color: assigned.correct ? '#22c55e' : '#ef444480', marginTop: '2px' }}>
                {assigned.correct ? '✓' : '✗'} {assigned.playerName}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const pageStyle = { background: '#0a0f1e', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

  if (!puzzle) return (
    <div style={pageStyle}>
      <NavBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <LoadingAnimation />
      </div>
    </div>
  )

  if (!usernameSet) return (
    <div style={pageStyle}>
      <NavBar />
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>TopBins</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Footballer Bingo</h1>
          <p style={{ fontSize: 13, color: '#8899bb', margin: 0 }}>Enter your name to track your scores on the leaderboard.</p>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Your name</div>
          <input
            style={{ background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', fontSize: 15, color: 'white', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="Enter your name" value={userName}
            onChange={e => setUserName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveUsername()} autoFocus />
          <p style={{ fontSize: 11, color: '#4a5568', margin: '8px 0 0' }}>Saved across all TopBins games</p>
        </div>
        <button onClick={saveUsername} style={{ background: '#dc2626', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', width: '100%' }}>
          Continue
        </button>
      </div>
    </div>
  )

  const playersLeft  = puzzle.players.length - currentPlayerIdx
  const gameStarted  = currentPlayerIdx > 0 || spinning || !!displayName

  return (
    <div style={pageStyle}>
      <NavBar />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Footballer Bingo
          </h1>
          <p style={{ fontSize: '13px', color: '#8899bb', margin: '0 0 12px' }}>
            Assign each player to an achievement square — can you go perfect?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Level pill — always clickable to toggle level picker */}
            <button
              onClick={() => { if (!gameOver) setShowLevelPicker(v => !v) }}
              style={{ background: showLevelPicker ? '#dc2626' : '#1e2d4a', border: `1px solid ${showLevelPicker ? '#dc2626' : '#2a3d5e'}`, borderRadius: '10px', padding: '8px 16px', textAlign: 'center', cursor: !gameOver ? 'pointer' : 'default', outline: 'none' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#cbd5e1' }}>{DIFF_LABELS_FULL[difficulty]}</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{skipLabel(skips)}</div>
            </button>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{score}/{gridSize}</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{gameOver ? 0 : playersLeft}</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Players left</div>
            </div>
            <button onClick={() => switchLevel(difficulty, skips)}
              style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', cursor: 'pointer' }}>
              Restart
            </button>
          </div>
        </div>

        {/* Level switcher panel — shown whenever pill is toggled, except post game-over */}
        {showLevelPicker && !gameOver && (
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Select difficulty</div>
            {levelDropdown()}
          </div>
        )}

        {/* Reveal card (lobby, above grid) */}
        {!gameStarted && !gameOver && (
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ color: '#8899bb', fontSize: '13px', margin: '0 0 12px' }}>Tap reveal to get your first player!</p>
            <button onClick={spinAndReveal} style={{ background: '#dc2626', border: 'none', borderRadius: '8px', padding: '12px 32px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>
              Reveal player →
            </button>
          </div>
        )}

        {/* Grid (lobby) */}
        {!gameStarted && !gameOver && bingoGrid}

        {/* Leaderboard (lobby) */}
        {!gameStarted && !gameOver && renderLeaderboard()}

        {/* Current player card (in-game) */}
        {!gameOver && gameStarted && (
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64 }}>
              <div style={{ width: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!spinning && displayName && skipsLeft > 0 ? (
                  <button onClick={handleSkip} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'white', cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                    Skip<br /><span style={{ fontSize: 10 }}>({skipsLeft} left)</span>
                  </button>
                ) : !spinning && displayName && skipsLeft === 0 ? (
                  <span style={{ fontSize: 10, color: '#2a3d5e', textAlign: 'center' }}>No skips</span>
                ) : null}
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8899bb', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {spinning ? 'Your player is...' : 'Assign to a square'}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: spinning ? '#dc2626' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName || '···'}
                </div>
              </div>
              <div style={{ width: 72, flexShrink: 0 }} />
            </div>
          </div>
        )}

        {/* Grid (in-game / game over) */}
        {(gameStarted || gameOver) && bingoGrid}

        {/* Tap hint */}
        {!gameOver && displayName && !spinning && currentPlayerIdx < puzzle.players.length && (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#4a5568', margin: 0 }}>Tap a square above to assign {displayName}</p>
          </div>
        )}

        {/* Game over: score + play again */}
        {gameOver && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#8899bb' }}>Final score</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>{score}/{gridSize}</span>
              {score === gridSize && <span style={{ fontSize: 13 }}>🎉</span>}
            </div>
            <button onClick={() => switchLevel(difficulty, skips)} style={{ background: '#dc2626', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
              Play Again →
            </button>
          </div>
        )}

        {/* Leaderboard (game over) */}
        {gameOver && renderLeaderboard()}

      </div>
    </div>
  )
}

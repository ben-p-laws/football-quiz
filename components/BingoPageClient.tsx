'use client'

import { useState, useEffect, useRef } from 'react'
import NavBar from './NavBar'

type Achievement = { position: number; id: string; name: string }
type Player      = { reveal_order: number; id: string; name: string }
type Puzzle      = { achievements: Achievement[]; players: Player[]; playerAchievements: Record<string, string[]> }
type Mode        = 'easy' | 'normal' | 'hard'

const STORAGE_KEY_USERNAME = 'footballiq_username'
const GRID_SIZE = 9
const SKIP_COUNTS: Record<Mode, number> = { easy: 3, normal: 1, hard: 0 }
const MODE_LABELS: Record<Mode, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }

function generateClientPuzzle(
  allAchievements: Achievement[],
  allPlayers: Player[],
  playerAchievements: Record<string, string[]>,
  maxSkips: number
) {
  const achievements = [...allAchievements].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE)
  const achIds = new Set(achievements.map(a => a.id))

  const qualifying = allPlayers.filter(p => (playerAchievements[p.id] || []).some(a => achIds.has(a)))
  if (qualifying.length < GRID_SIZE + maxSkips) return null

  const players = [...qualifying].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE + maxSkips)
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
  const [mode, setMode]               = useState<Mode>('normal')
  const [skipsLeft, setSkipsLeft]     = useState(SKIP_COUNTS['normal'])
  const [submitted, setSubmitted]     = useState(false)
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [allPlayers, setAllPlayers]   = useState<Player[]>([])
  const [allMatrix, setAllMatrix]     = useState<Record<string, string[]>>({})
  const spinInterval = useRef<any>(null)

  const currentPlayer = puzzle?.players[currentPlayerIdx]

  useEffect(() => {
    async function loadAndGenerate() {
      const res = await fetch('/api/bingo')
      const { achievements, players, playerAchievements } = await res.json()

      const achs: Achievement[] = achievements.map((a: any, i: number) => ({ ...a, position: i }))
      const pls: Player[]       = players.map((p: any, i: number) => ({ ...p, reveal_order: i }))

      setAllAchievements(achs)
      setAllPlayers(pls)
      setAllMatrix(playerAchievements)

      const generated = generateClientPuzzle(achs, pls, playerAchievements, SKIP_COUNTS['normal'])
      if (generated) {
        setPuzzle({ achievements: generated.achievements, players: generated.players, playerAchievements })
      }
    }
    loadAndGenerate()
    const saved = localStorage.getItem(STORAGE_KEY_USERNAME)
    if (saved) { setUserName(saved); setUsernameSet(true) }
    fetch('/api/bingo-leaderboard?mode=normal').then(r => r.json()).then(d => setLeaderboard(d.leaderboard || []))
  }, [])

  function saveUsername() {
    if (!userName.trim()) return
    localStorage.setItem(STORAGE_KEY_USERNAME, userName.trim())
    setUsernameSet(true)
  }

  async function changeMode(newMode: Mode) {
    if (currentPlayerIdx > 0 || spinning || displayName) return // lock mode once game started
    setMode(newMode)
    setSkipsLeft(SKIP_COUNTS[newMode])
    const res = await fetch(`/api/bingo-leaderboard?mode=${newMode}`)
    const data = await res.json()
    setLeaderboard(data.leaderboard || [])
    // regenerate puzzle with new skip count
    if (allAchievements.length > 0) {
      const newPuzzle = generateClientPuzzle(
        allAchievements.map((a, i) => ({ ...a, position: i })),
        allPlayers,
        allMatrix,
        SKIP_COUNTS[newMode]
      )
      if (newPuzzle && puzzle) {
        setPuzzle({ ...puzzle, achievements: newPuzzle.achievements, players: newPuzzle.players })
      }
    }
  }

  async function submitScore(name: string, gameMode: Mode) {
    if (submitted) return
    setSubmitted(true)
    try {
      const res = await fetch('/api/bingo-leaderboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, mode: gameMode })
      })
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch {}
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
    const nextIdx  = currentPlayerIdx + 1
    const allFilled = Object.keys(newAssignments).length === GRID_SIZE
    const isExhausted = nextIdx >= puzzle.players.length
    const newScore = Object.values(newAssignments).filter(a => a?.correct).length

    setAssignments(newAssignments)
    setCurrentPlayerIdx(nextIdx)
    setSelectedSquare(position)
    setDisplayName('')
    setScore(newScore)

    if (allFilled || isExhausted) {
      setGameOver(true)
      if (userName && newScore === GRID_SIZE) submitScore(userName, mode)
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

  function regenerate() {
    if (allAchievements.length === 0) return
    const maxSkips = SKIP_COUNTS[mode]
    const newPuzzle = generateClientPuzzle(
      allAchievements.map((a, i) => ({ ...a, position: i })),
      allPlayers,
      allMatrix,
      maxSkips
    )
    if (!newPuzzle || !puzzle) return
    setPuzzle({ ...puzzle, achievements: newPuzzle.achievements, players: newPuzzle.players })
    setAssignments({})
    setCurrentPlayerIdx(0)
    setGameOver(false)
    setScore(0)
    setSpinning(false)
    setDisplayName('')
    setSelectedSquare(null)
    setSkipsLeft(maxSkips)
    setSubmitted(false)
  }

  const s = {
    page: { background: '#0a0f1e', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  }

  const bingoGrid = puzzle && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
      {puzzle.achievements.map(ach => {
        const assigned = assignments[ach.position]
        const isSelected = selectedSquare === ach.position
        let bg      = '#111827'
        let border  = '#1e2d4a'
        let cursor  = 'default'

        if (assigned) {
          bg     = assigned.correct ? '#0d2818' : '#2a1010'
          border = assigned.correct ? '#22c55e' : '#ef4444'
        } else if (!gameOver && displayName && !spinning) {
          bg     = '#1a2535'
          border = '#2a3d5e'
          cursor = 'pointer'
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

  if (!puzzle) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ color: '#8899bb' }}>Loading...</p>
      </div>
    </div>
  )

  if (!usernameSet) return (
    <div style={s.page}>
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

  const playersLeft = puzzle.players.length - currentPlayerIdx
  const gameStarted = currentPlayerIdx > 0 || spinning || !!displayName

  return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Footballer Bingo
          </h1>
          <p style={{ fontSize: '13px', color: '#8899bb', margin: '0 0 12px' }}>
            Assign each player to an achievement square — can you go 9/9?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: '10px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#cbd5e1' }}>{MODE_LABELS[mode]}</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mode</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{score}/9</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{gameOver ? 0 : playersLeft}</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Players left</div>
            </div>
            <button onClick={regenerate}
              style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', cursor: 'pointer' }}>
              Restart
            </button>
            <button onClick={regenerate}
              style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', cursor: 'pointer' }}>
              Change Mode
            </button>
          </div>
        </div>

        {/* Mode selector + grid in lobby */}
        {!gameStarted && !gameOver && (
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Mode</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['easy', 'normal', 'hard'] as Mode[]).map(m => (
                <button key={m} onClick={() => changeMode(m)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: mode === m ? '#dc2626' : '#1e2d4a',
                  color: mode === m ? 'white' : '#8899bb',
                }}>
                  {MODE_LABELS[m]}
                  <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>
                    {SKIP_COUNTS[m] === 0 ? 'No skips' : `${SKIP_COUNTS[m]} skip${SKIP_COUNTS[m] > 1 ? 's' : ''}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reveal card shown in lobby (above grid) */}
        {!gameStarted && !gameOver && (
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ color: '#8899bb', fontSize: '13px', marginBottom: '12px', margin: '0 0 12px' }}>Tap reveal to get your first player!</p>
            <button onClick={spinAndReveal} style={{ background: '#dc2626', border: 'none', borderRadius: '8px', padding: '12px 32px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>
              Reveal player →
            </button>
          </div>
        )}

        {/* Grid shown in lobby (before leaderboard) */}
        {!gameStarted && !gameOver && bingoGrid}

        {/* Leaderboard in lobby */}
        {!gameStarted && !gameOver && leaderboard.length > 0 && (() => {
          const top10 = leaderboard.slice(0, 10)
          const userIdx = leaderboard.findIndex((r: any) => r.username === userName)
          const userInTop10 = userIdx >= 0 && userIdx < 10
          return (
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>🏆 {MODE_LABELS[mode]} — Perfect 9/9s</div>
              {top10.map((row: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4a' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: i === 0 ? '#f59e0b' : '#4a5568', width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
                    <span style={{ fontSize: '13px', color: row.username === userName ? '#dc2626' : 'white', fontWeight: row.username === userName ? 700 : 400 }}>{row.username}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: row.username === userName ? '#dc2626' : '#8899bb' }}>{row.perfect_9s} ⭐</span>
                </div>
              ))}
              {!userInTop10 && userIdx >= 0 && (() => {
                const row = leaderboard[userIdx]
                return (
                  <>
                    <div style={{ padding: '4px 0', color: '#2a3d5e', fontSize: '11px' }}>···</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', background: 'rgba(220,38,38,0.06)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#dc2626', width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                        <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 700 }}>{row.username}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>{row.perfect_9s} ⭐</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )
        })()}

        {/* Current player card — only shown in-game */}
        {!gameOver && gameStarted && (
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64 }}>
                {/* Skip on left — fixed width so card height stays constant */}
                <div style={{ width: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!spinning && displayName && skipsLeft > 0 ? (
                    <button onClick={handleSkip} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'white', cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                      Skip<br /><span style={{ fontSize: 10 }}>({skipsLeft} left)</span>
                    </button>
                  ) : !spinning && displayName && skipsLeft === 0 ? (
                    <span style={{ fontSize: 10, color: '#2a3d5e', textAlign: 'center' }}>No skips</span>
                  ) : null}
                </div>
                {/* Player name centre */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#8899bb', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {spinning ? 'Your player is...' : 'Assign to a square'}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: spinning ? '#dc2626' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName || '···'}
                  </div>
                </div>
                {/* Spacer to balance */}
                <div style={{ width: 72, flexShrink: 0 }} />
              </div>
          </div>
        )}

        {/* Grid shown in-game / game-over (after player card) */}
        {(gameStarted || gameOver) && bingoGrid}

        {/* Tap hint */}
        {!gameOver && displayName && !spinning && currentPlayerIdx < puzzle.players.length && (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#4a5568', margin: 0 }}>
              Tap a square above to assign {displayName}
            </p>
          </div>
        )}

        {/* Game over: score + play again side by side */}
        {gameOver && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#8899bb' }}>Final score</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>{score}/9</span>
              {score === GRID_SIZE && <span style={{ fontSize: 13 }}>🎉</span>}
            </div>
            <button onClick={regenerate} style={{ background: '#dc2626', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
              Play Again →
            </button>
          </div>
        )}

        {gameOver && leaderboard.length > 0 && (() => {
          const top10 = leaderboard.slice(0, 10)
          const userIdx = leaderboard.findIndex((r: any) => r.username === userName)
          const userInTop10 = userIdx >= 0 && userIdx < 10
          return (
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>🏆 {MODE_LABELS[mode]} — Perfect 9/9s</div>
              {top10.map((row: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4a' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: i === 0 ? '#f59e0b' : '#4a5568', width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
                    <span style={{ fontSize: '13px', color: row.username === userName ? '#dc2626' : 'white', fontWeight: row.username === userName ? 700 : 400 }}>{row.username}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: row.username === userName ? '#dc2626' : '#8899bb' }}>{row.perfect_9s} ⭐</span>
                </div>
              ))}
              {!userInTop10 && userIdx >= 0 && (() => {
                const row = leaderboard[userIdx]
                return (
                  <>
                    <div style={{ padding: '4px 0', color: '#2a3d5e', fontSize: '11px' }}>···</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', background: 'rgba(220,38,38,0.06)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#dc2626', width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                        <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 700 }}>{row.username}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>{row.perfect_9s} ⭐</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )
        })()}


      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import NavBar from './NavBar'

type Achievement = { position: number; id: string; name: string }
type Player      = { reveal_order: number; id: string; name: string }
type Puzzle      = { achievements: Achievement[]; players: Player[]; playerAchievements: Record<string, string[]> }

const STORAGE_KEY_USERNAME = 'footballiq_username'
// Number of achievements shown per puzzle (out of all available)
const GRID_SIZE = 9

function generateClientPuzzle(
  allAchievements: Achievement[],
  allPlayers: Player[],
  playerAchievements: Record<string, string[]>
) {
  const achievements = [...allAchievements].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE)
  const achIds = new Set(achievements.map(a => a.id))

  const qualifying = allPlayers.filter(p => (playerAchievements[p.id] || []).some(a => achIds.has(a)))
  if (qualifying.length < GRID_SIZE) return null

  const players = [...qualifying].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE)
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

      const generated = generateClientPuzzle(achs, pls, playerAchievements)
      if (generated) {
        setPuzzle({ achievements: generated.achievements, players: generated.players, playerAchievements })
      }
    }
    loadAndGenerate()
    const saved = localStorage.getItem(STORAGE_KEY_USERNAME)
    if (saved) { setUserName(saved); setUsernameSet(true) }
    fetch('/api/bingo-leaderboard').then(r => r.json()).then(d => setLeaderboard(d.leaderboard || []))
  }, [])

  function saveUsername() {
    if (!userName.trim()) return
    localStorage.setItem(STORAGE_KEY_USERNAME, userName.trim())
    setUsernameSet(true)
  }

  async function submitPerfectGame(name: string) {
    try {
      const res = await fetch('/api/bingo-leaderboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name })
      })
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch {}
  }

  function spinAndReveal() {
    if (!puzzle || spinning) return
    setSpinning(true)
    setSelectedSquare(null)
    const allNames = puzzle.players.map(p => p.name)
    let count = 0
    const total = 20
    spinInterval.current = setInterval(() => {
      setDisplayName(allNames[Math.floor(Math.random() * allNames.length)])
      count++
      if (count >= total) {
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
    const nextIdx = currentPlayerIdx + 1
    const isOver  = nextIdx >= puzzle.players.length
    const newScore = Object.values(newAssignments).filter(a => a?.correct).length

    setAssignments(newAssignments)
    setCurrentPlayerIdx(nextIdx)
    setSelectedSquare(position)
    setDisplayName('')
    setScore(newScore)

    if (isOver) {
      setGameOver(true)
      if (newScore === 9 && userName) submitPerfectGame(userName)
    } else {
      setTimeout(() => {
        setSpinning(true)
        const allNames = puzzle!.players.map(p => p.name)
        let count = 0
        const total = 20
        spinInterval.current = setInterval(() => {
          setDisplayName(allNames[Math.floor(Math.random() * allNames.length)])
          count++
          if (count >= total) {
            clearInterval(spinInterval.current)
            setDisplayName(puzzle!.players[nextIdx].name)
            setSpinning(false)
          }
        }, 80)
      }, 300)
    }
  }

  function regenerate() {
    if (allAchievements.length === 0) return
    const newPuzzle = generateClientPuzzle(
      allAchievements.map((a, i) => ({ ...a, position: i })),
      allPlayers,
      allMatrix
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
  }

  const s = {
    page: { background: '#0a0f1e', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  }

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
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>FootballIQ</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Footballer Bingo</h1>
          <p style={{ fontSize: 13, color: '#8899bb', margin: 0 }}>Enter your name to track your scores on the leaderboard.</p>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Your name</div>
          <input
            style={{ background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', fontSize: 15, color: 'white', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="Enter your name" value={userName}
            onChange={e => setUserName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveUsername()} autoFocus />
          <p style={{ fontSize: 11, color: '#4a5568', margin: '8px 0 0' }}>Saved across all FootballIQ games</p>
        </div>
        <button onClick={saveUsername} style={{ background: '#f97316', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', width: '100%' }}>
          Continue
        </button>
      </div>
    </div>
  )

  const playersLeft = puzzle.players.length - currentPlayerIdx

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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '8px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#f97316' }}>{score}/9</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '10px', padding: '8px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#f97316' }}>{gameOver ? 0 : playersLeft}</div>
              <div style={{ fontSize: '10px', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Players left</div>
            </div>
            <button onClick={regenerate}
              style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', cursor: 'pointer' }}>
              Restart
            </button>
          </div>
        </div>

        {/* Current player card */}
        {!gameOver && (
        <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            {currentPlayerIdx === 0 && !spinning && !displayName ? (
            <>
                <p style={{ color: '#8899bb', fontSize: '13px', marginBottom: '12px' }}>Tap reveal to get your first player!</p>
                <button onClick={spinAndReveal} style={{ background: '#f97316', border: 'none', borderRadius: '8px', padding: '12px 32px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>
                Reveal player →
                </button>
            </>
            ) : (
              <div style={{ minHeight: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {spinning || displayName ? (
                  <>
                    <div style={{ fontSize: '11px', color: '#8899bb', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {spinning ? 'Your player is...' : 'Assign to a square'}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: spinning ? '#f97316' : 'white' }}>{displayName || '...'}</div>
                  </>
                ) : (
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e2d4a' }}>···</div>
                )}
              </div>
            )}
        </div>
        )}

        {/* Bingo grid */}
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

        {/* Next player hint */}
        {!gameOver && displayName && !spinning && currentPlayerIdx < puzzle.players.length && (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px' }}>
              Tap a square above to assign {displayName}
            </p>
          </div>
        )}

        {/* Leaderboard after game */}
        {gameOver && leaderboard.length > 0 && (() => {
          const top10 = leaderboard.slice(0, 10)
          const userIdx = leaderboard.findIndex(r => r.username === userName)
          const userInTop10 = userIdx >= 0 && userIdx < 10
          return (
            <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px 20px', marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>🏆 Perfect 9 Leaderboard</div>
              {top10.map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4a' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: i === 0 ? '#f59e0b' : '#4a5568', width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
                    <span style={{ fontSize: '13px', color: row.username === userName ? '#f97316' : 'white', fontWeight: row.username === userName ? 700 : 400 }}>{row.username}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: row.username === userName ? '#f97316' : '#8899bb' }}>{row.perfect_9s} perfect{row.perfect_9s === 1 ? '' : 's'}</span>
                </div>
              ))}
              {!userInTop10 && userIdx >= 0 && (() => {
                const row = leaderboard[userIdx]
                return (
                  <>
                    <div style={{ padding: '4px 0', color: '#2a3d5e', fontSize: '11px' }}>···</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', background: 'rgba(249,115,22,0.06)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#f97316', width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                        <span style={{ fontSize: '13px', color: '#f97316', fontWeight: 700 }}>{row.username}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f97316' }}>{row.perfect_9s} perfect{row.perfect_9s === 1 ? '' : 's'}</span>
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

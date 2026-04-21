"use client"

import { useEffect, useState, useCallback } from "react"
import NavBar from "./NavBar"

const CATS = [
  { id: "goals",            label: "Most Goals",          unit: "goals",  icon: "⚽", dir: "higher" },
  { id: "assists",          label: "Most Assists",         unit: "assists",icon: "🎯", dir: "higher" },
  { id: "appearances",      label: "Appearances",          unit: "games",  icon: "🎮", dir: "higher" },
  { id: "yellow_cards",     label: "Yellow Cards",         unit: "YC",     icon: "🟨", dir: "higher" },
  { id: "red_cards",        label: "Red Cards",            unit: "RC",     icon: "🟥", dir: "higher" },
  { id: "youngest_scorer",  label: "Youngest Goalscorer",  unit: "age",    icon: "👶", dir: "lower"  },
  { id: "oldest_player",    label: "Oldest Player",        unit: "age",    icon: "👴", dir: "higher" },
  { id: "penalties_scored", label: "Penalties Scored",     unit: "pens",   icon: "🥅", dir: "higher" },
] as const

type CatId = typeof CATS[number]["id"]
const N = CATS.length

type PoolEntry = { pid: string; name: string }
type Assignment = { playerName: string; catId: CatId; rank: number }
type LbEntry = { username: string; score: number; created_at: string }

const LS_USERNAME = "topbins_minimise_username"

function getRankColor(rank: number) {
  if (rank <= 10) return "#22c55e"
  if (rank <= 20) return "#86efac"
  if (rank <= 30) return "#fbbf24"
  if (rank <= 40) return "#f97316"
  return "#ef4444"
}
function getRankBg(rank: number) {
  if (rank <= 10) return "rgba(34,197,94,0.15)"
  if (rank <= 20) return "rgba(134,239,172,0.08)"
  if (rank <= 30) return "rgba(251,191,36,0.1)"
  if (rank <= 40) return "rgba(249,115,22,0.1)"
  return "rgba(239,68,68,0.1)"
}
function getRankLabel(rank: number) {
  if (rank === 1) return "🥇 #1"
  if (rank <= 3) return `🥈 #${rank}`
  if (rank <= 10) return `⭐ #${rank}`
  return `#${rank}`
}

function weightedSample(pool: PoolEntry[], n: number): PoolEntry[] {
  const picked = new Set<string>()
  const result: PoolEntry[] = []
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0 && result.length < n; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    if (!picked.has(arr[i].pid)) {
      picked.add(arr[i].pid)
      result.push(arr[i])
    }
  }
  return result
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0a0f1e",
    color: "white",
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    paddingBottom: 80,
  } as React.CSSProperties,
  card: {
    background: "#111827",
    border: "1px solid #1e2d4a",
    borderRadius: 12,
    padding: "16px 20px",
  } as React.CSSProperties,
  btn: (color = "#f97316"): React.CSSProperties => ({
    background: color,
    border: "none",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    color: "white",
    cursor: "pointer",
  }),
  ghost: {
    background: "transparent",
    border: "1px solid #1e2d4a",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 600,
    color: "#8899bb",
    cursor: "pointer",
  } as React.CSSProperties,
  input: {
    background: "#0a0f1e",
    border: "1px solid #1e2d4a",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 15,
    color: "white",
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
}

export default function MinimiseGame() {
  const [loading, setLoading] = useState(true)
  const [pidRanks, setPidRanks] = useState<Record<string, Record<string, number>>>({})
  const [weightedPool, setWeightedPool] = useState<PoolEntry[]>([])
  const [leaderboard, setLeaderboard] = useState<LbEntry[]>([])
  const [clubs, setClubs] = useState<string[]>([])
  const [selectedClub, setSelectedClub] = useState<string>('')

  const [username, setUsername] = useState("")
  const [usernameInput, setUsernameInput] = useState("")
  const [usernameSet, setUsernameSet] = useState(false)

  const [started, setStarted] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showRulesLobby, setShowRulesLobby] = useState(false)

  const [gamePlayers, setGamePlayers] = useState<PoolEntry[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [assignments, setAssignments] = useState<Partial<Record<CatId, Assignment>>>({})
  const [usedCats, setUsedCats] = useState<CatId[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [totalScore, setTotalScore] = useState(0)

  const [hint, setHint] = useState<{ playerName: string; bestCatLabel: string; bestRank: number } | null>(null)

  const fetchData = useCallback(async (showLoading = false, club = '') => {
    if (showLoading) setLoading(true)
    try {
      const url = club ? `/api/minimise?club=${encodeURIComponent(club)}` : '/api/minimise'
      const res = await fetch(url)
      if (res.ok) {
        const d = await res.json()
        setPidRanks(d.pidRanks)
        setWeightedPool(d.weightedPool)
        setLeaderboard(d.leaderboard)
        if (d.clubs?.length) setClubs(d.clubs)
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(true, '')
    const saved = localStorage.getItem(LS_USERNAME)
    if (saved) { setUsername(saved); setUsernameSet(true) }
    else setShowRulesLobby(true)
  }, [fetchData])

  function handleSetUsername() {
    const u = usernameInput.trim()
    if (!u) return
    localStorage.setItem(LS_USERNAME, u)
    setUsername(u)
    setUsernameSet(true)
  }

  function startGame() {
    const players = weightedSample(weightedPool, N)
    setGamePlayers(players)
    setCurrentIdx(0)
    setAssignments({})
    setUsedCats([])
    setGameOver(false)
    setHint(null)
    setTotalScore(0)
    setStarted(true)
    setShowRules(false)
  }

  function assign(catId: CatId) {
    const player = gamePlayers[currentIdx]
    const rank = pidRanks[player.pid]?.[catId] ?? 100

    const available = CATS.filter(c => !usedCats.includes(c.id)).map(c => c.id)
    let bestRank = rank
    let bestCatId: CatId = catId
    for (const cid of available) {
      const r = pidRanks[player.pid]?.[cid] ?? 100
      if (r < bestRank) { bestRank = r; bestCatId = cid }
    }

    setHint(null)
    if (bestCatId !== catId) {
      const label = CATS.find(c => c.id === bestCatId)!.label
      setHint({ playerName: player.name, bestCatLabel: label, bestRank })
      setTimeout(() => setHint(null), 4000)
    }

    const newAssignments = { ...assignments, [catId]: { playerName: player.name, catId, rank } }
    const newUsedCats = [...usedCats, catId]
    setAssignments(newAssignments)
    setUsedCats(newUsedCats)

    if (currentIdx + 1 >= N) {
      const score = Object.values(newAssignments).reduce((sum, a) => sum + (a?.rank ?? 100), 0)
      setTotalScore(score)
      setGameOver(true)
      fetch("/api/minimise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          score,
          player_slots: Object.entries(newAssignments).map(([cat, a]) => ({
            category: cat, player: a?.playerName, rank: a?.rank,
          })),
        }),
      }).then(() => fetchData())
    } else {
      setCurrentIdx(i => i + 1)
    }
  }

  const currentPlayer = gamePlayers[currentIdx]

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.page}>
      <NavBar />
      <style>{`
        @keyframes progress { from { width: 0% } to { width: 100% } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.12em", textTransform: "uppercase", animation: "pulse 1.5s ease infinite" }}>
          Loading Minimise
        </div>
        <div style={{ width: 200, height: 4, background: "#1e2d4a", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#f97316", borderRadius: 2, animation: "progress 8s ease-out forwards" }} />
        </div>
        <div style={{ fontSize: 12, color: "#4a5568" }}>Crunching Premier League stats...</div>
      </div>
    </div>
  )

  // ── Username entry ────────────────────────────────────────────────────────────
  if (!usernameSet) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>TopBins</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", margin: "0 0 8px" }}>Football Minimise</h1>
          <p style={{ fontSize: 13, color: "#8899bb", margin: 0 }}>Assign 8 players to categories where they rank highest. Lowest total rank wins.</p>
        </div>
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Your name</div>
          <input
            style={s.input}
            placeholder="Enter your name"
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSetUsername()}
            maxLength={20}
            autoFocus
          />
          <p style={{ fontSize: 11, color: "#4a5568", margin: "8px 0 0" }}>Saved for the leaderboard</p>
        </div>
        <button onClick={handleSetUsername} style={{ ...s.btn(), width: "100%", fontSize: 15, padding: "14px" }}>Continue</button>
      </div>
    </div>
  )

  // ── Lobby ────────────────────────────────────────────────────────────────────
  if (!started) return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 20px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>TopBins</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "white", margin: "0 0 6px", letterSpacing: "-0.5px" }}>Football Minimise</h1>
          <p style={{ fontSize: 13, color: "#8899bb", margin: "0 0 2px" }}>
            Playing as <strong style={{ color: "#f97316" }}>{username}</strong> ·{" "}
            <span style={{ color: "#4a5568", cursor: "pointer", textDecoration: "underline" }} onClick={() => setUsernameSet(false)}>change</span>
          </p>
          <p style={{ fontSize: 13, color: "#8899bb", margin: 0 }}>8 players revealed one at a time. Assign each to a category for the lowest total rank.</p>
        </div>

        {clubs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Filter by Club</div>
            <select
              value={selectedClub}
              onChange={e => {
                setSelectedClub(e.target.value)
                fetchData(true, e.target.value)
              }}
              style={{ ...s.input, cursor: "pointer" }}
            >
              <option value="">All Clubs</option>
              {clubs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <button onClick={startGame} style={{ ...s.btn(), width: "100%", fontSize: 15, padding: "14px", marginBottom: 16 }}>
          {selectedClub ? `Start Game — ${selectedClub}` : "Start Game"}
        </button>

        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowRulesLobby(v => !v)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: showRulesLobby ? 10 : 0 }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em" }}>How to play</span>
            <span style={{ fontSize: 10, color: "#4a5568" }}>{showRulesLobby ? "▲" : "▼"}</span>
          </button>
          {showRulesLobby && (
            <div style={{ ...s.card, background: "#0a0f1e" }}>
              <div style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.7 }}>
                Each round a player is revealed. Click the category where they rank highest. You can only use each category once. Lowest total rank wins — perfect score is 8.
              </div>
            </div>
          )}
        </div>

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>The 8 Categories</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CATS.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "white" }}>{c.icon} {c.label}</span>
                <span style={{ fontSize: 11, color: "#4a5568", textAlign: "right", flexShrink: 0 }}>
                  {c.dir === "higher" ? "↑ higher better" : "↓ lower better"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {leaderboard.length > 0 && (() => {
          const top10 = leaderboard.slice(0, 10)
          const userIdx = leaderboard.findIndex(r => r.username === username)
          const userInTop10 = userIdx >= 0 && userIdx < 10
          return (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 12 }}>🏆 Leaderboard</div>
              {top10.map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2d4a" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: i === 0 ? "#f59e0b" : "#4a5568", width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, color: row.username === username ? "#f97316" : "white", fontWeight: row.username === username ? 700 : 400 }}>{row.username}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.username === username ? "#f97316" : "#8899bb" }}>{row.score}</span>
                </div>
              ))}
              {!userInTop10 && userIdx >= 0 && (() => {
                const row = leaderboard[userIdx]
                return (
                  <>
                    <div style={{ padding: "4px 0", color: "#2a3d5e", fontSize: 11 }}>···</div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 4px", background: "rgba(249,115,22,0.06)", borderRadius: 6 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#f97316", width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                        <span style={{ fontSize: 13, color: "#f97316", fontWeight: 700 }}>{row.username}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>{row.score}</span>
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

  // ── Active game + game over (same view) ──────────────────────────────────────
  return (
    <div style={s.page}>
      <NavBar />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px 0" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {gameOver ? "Game Over" : `Player ${currentIdx + 1} of ${N}`}
            </div>
            <div style={{ fontSize: 13, color: "#8899bb" }}>
              {gameOver
                ? <strong style={{ color: "#f97316" }}>Final score: {totalScore} 🏆</strong>
                : <>Score so far: <strong style={{ color: "#f97316" }}>{Object.values(assignments).reduce((s, a) => s + (a?.rank ?? 0), 0)}</strong></>
              }
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowRules(v => !v)} style={{ ...s.ghost, padding: "8px 10px", fontSize: 16 }} title="Rules">❓</button>
            {gameOver && <button onClick={startGame} style={s.btn()}>Play Again</button>}
            <button onClick={startGame} style={s.ghost}>Restart</button>
          </div>
        </div>

        {showRules && (
          <div style={{ ...s.card, marginBottom: 16, background: "#0a0f1e", position: "relative" }}>
            <button onClick={() => setShowRules(false)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#4a5568", cursor: "pointer", fontSize: 16 }}>✕</button>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>How to play</div>
            <div style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.7 }}>
              Each round a player is revealed. Click the category where they rank highest (lowest number = better rank). You can only use each category once. Lowest total rank wins — perfect score is 8.
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 12, marginBottom: 6 }}>Categories</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {CATS.map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, gap: 8 }}>
                  <span style={{ color: "white" }}>{c.icon} {c.label}</span>
                  <span style={{ color: "#4a5568", textAlign: "right", flexShrink: 0 }}>{c.dir === "higher" ? "↑ higher better" : "↓ lower better"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current player / final score card */}
        {gameOver ? (
          <div style={{ ...s.card, marginBottom: 16, textAlign: "center", background: "linear-gradient(135deg, #111827 0%, #0f1f35 100%)", padding: "14px 20px" }}>
            <div style={{ fontSize: 11, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Final Score</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: "#f97316", letterSpacing: "-3px", lineHeight: 1 }}>{totalScore}</div>
            <div style={{ fontSize: 12, color: "#4a5568", marginTop: 6 }}>total rank · lower is better</div>
          </div>
        ) : (
          <div style={{ ...s.card, marginBottom: 16, textAlign: "center", background: "linear-gradient(135deg, #111827 0%, #0f1f35 100%)", padding: "14px 20px" }}>
            <div style={{ fontSize: 11, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Assign this player</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>{currentPlayer?.name ?? "..."}</div>
            <div style={{ fontSize: 12, color: "#4a5568", marginTop: 6 }}>Click a category below to assign</div>
          </div>
        )}

        {/* Hint */}
        {hint && (
          <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
            💡 <span><strong>{hint.playerName}</strong>'s best available was <strong>{hint.bestCatLabel}</strong> (#{hint.bestRank})</span>
          </div>
        )}

        <div style={{ fontSize: 11, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          {gameOver ? "Results" : "Choose a category"}
        </div>

        {/* Category grid — fixed 72px height */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CATS.map(cat => {
            const a = assignments[cat.id]
            const used = !!a
            const rank = a?.rank ?? 0
            const color = getRankColor(rank)

            if (used) {
              return (
                <div key={cat.id} style={{
                  background: getRankBg(rank),
                  border: `1px solid ${color}44`,
                  borderRadius: 12, padding: "10px 12px", height: 72,
                  display: "flex", justifyContent: "space-between", alignItems: "center", overflow: "hidden",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "white", lineHeight: 1.3 }}>{cat.icon} {cat.label}</div>
                    <div style={{ fontSize: 12, color: "#8899bb", marginTop: 3 }}>{a.playerName}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{getRankLabel(rank)}</div>
                  </div>
                </div>
              )
            }

            return (
              <button key={cat.id}
                onClick={() => !gameOver && assign(cat.id)}
                disabled={gameOver}
                style={{
                  background: "#111827",
                  border: "1px solid #1e2d4a",
                  borderRadius: 12, padding: "10px 12px", height: 72,
                  cursor: gameOver ? "default" : "pointer", overflow: "hidden",
                  textAlign: "left", width: "100%",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "border-color 0.15s",
                } as React.CSSProperties}
                onMouseEnter={e => { if (!gameOver) (e.currentTarget as HTMLElement).style.borderColor = "#f97316" }}
                onMouseLeave={e => { if (!gameOver) (e.currentTarget as HTMLElement).style.borderColor = "#1e2d4a" }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: gameOver ? "#2a3d5e" : "white" }}>
                  {cat.icon} {cat.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Post-game leaderboard */}
        {gameOver && leaderboard.length > 0 && (() => {
          const top10 = leaderboard.slice(0, 10)
          const userIdx = leaderboard.findIndex(r => r.username === username)
          const userInTop10 = userIdx >= 0 && userIdx < 10
          return (
            <div style={{ ...s.card, marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 12 }}>🏆 Leaderboard</div>
              {top10.map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2d4a" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: i === 0 ? "#f59e0b" : "#4a5568", width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, color: row.username === username ? "#f97316" : "white", fontWeight: row.username === username ? 700 : 400 }}>
                      {row.username}{row.username === username && totalScore === row.score && <span style={{ color: "#f97316", fontSize: 12 }}> · you</span>}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#f97316" : "white" }}>{row.score}</span>
                </div>
              ))}
              {!userInTop10 && userIdx >= 0 && (() => {
                const row = leaderboard[userIdx]
                return (
                  <>
                    <div style={{ padding: "4px 0", color: "#2a3d5e", fontSize: 11 }}>···</div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 4px", background: "rgba(249,115,22,0.06)", borderRadius: 6 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#f97316", width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                        <span style={{ fontSize: 13, color: "#f97316", fontWeight: 700 }}>{row.username}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>{row.score}</span>
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

"use client"

import { useEffect, useState, useCallback } from "react"

const CATS = [
  { id: "np_goals_per90",      label: "Non-Pen Goals / 90", unit: "G/90",  icon: "⚽", dir: "higher" },
  { id: "assists_per90",       label: "Assists / 90",        unit: "A/90",  icon: "🎯", dir: "higher" },
  { id: "yellow_pct",          label: "Yellow Card %",       unit: "%",     icon: "🟨", dir: "lower"  },
  { id: "red_pct",             label: "Red Card %",          unit: "%",     icon: "🟥", dir: "lower"  },
  { id: "subbed_on_pct",       label: "Subbed On %",         unit: "%",     icon: "🔄", dir: "higher" },
  { id: "total_goals_assists", label: "Goals + Assists",     unit: "G+A",   icon: "📊", dir: "higher" },
  { id: "missed_pens",         label: "Missed Penalties",    unit: "pens",  icon: "😬", dir: "lower"  },
  { id: "games_per_goal",      label: "Games per Goal",      unit: "games", icon: "🧱", dir: "lower"  },
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
  btn: (color = "#E8321A"): React.CSSProperties => ({
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

function Nav({ onRules }: { onRules: () => void }) {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 56, borderBottom: "1px solid #1e2d4a",
    }}>
      <a href="/" style={{ fontWeight: 800, fontSize: 16, textDecoration: "none", color: "white", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ background: "#E8321A", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚽</span>
        Top Bins
      </a>
      <button style={s.ghost} onClick={onRules}>? Rules</button>
    </nav>
  )
}

export default function MinimiseGame() {
  const [loading, setLoading] = useState(true)
  const [pidRanks, setPidRanks] = useState<Record<string, Record<string, number>>>({})
  const [weightedPool, setWeightedPool] = useState<PoolEntry[]>([])
  const [leaderboard, setLeaderboard] = useState<LbEntry[]>([])

  const [username, setUsername] = useState("")
  const [usernameInput, setUsernameInput] = useState("")
  const [usernameSet, setUsernameSet] = useState(false)

  const [started, setStarted] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const [gamePlayers, setGamePlayers] = useState<PoolEntry[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [assignments, setAssignments] = useState<Partial<Record<CatId, Assignment>>>({})
  const [usedCats, setUsedCats] = useState<CatId[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [totalScore, setTotalScore] = useState(0)

  const [hint, setHint] = useState<{ bestCatLabel: string; bestRank: number } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/minimise")
      if (res.ok) {
        const d = await res.json()
        setPidRanks(d.pidRanks)
        setWeightedPool(d.weightedPool)
        setLeaderboard(d.leaderboard)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const saved = localStorage.getItem(LS_USERNAME)
    if (saved) {
      setUsername(saved)
      setUsernameSet(true)
    }
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
  }

  function assign(catId: CatId) {
    const player = gamePlayers[currentIdx]
    const rank = pidRanks[player.pid]?.[catId] ?? 100

    // Find best available rank for this player across all still-available cats
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
      setHint({ bestCatLabel: label, bestRank })
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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.page}>
      <Nav onRules={() => {}} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 20 }}>
        <div style={{ width: 200, height: 4, background: "#1e2d4a", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "55%", background: "#E8321A", borderRadius: 2 }} />
        </div>
        <p style={{ color: "#8899bb", fontSize: 14, margin: 0 }}>Loading game data…</p>
      </div>
    </div>
  )

  // ── Username entry ────────────────────────────────────────────────────────────
  if (!usernameSet) return (
    <div style={s.page}>
      <Nav onRules={() => setShowRules(v => !v)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)", padding: 24 }}>
        <div style={{ ...s.card, width: "100%", maxWidth: 440, padding: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Minimise</h2>
          <p style={{ fontSize: 14, color: "#8899bb", margin: "0 0 28px", lineHeight: 1.6 }}>
            Assign 8 players to 8 stat categories. Score = sum of their ranks. Lowest wins.
          </p>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8899bb", letterSpacing: "0.06em", marginBottom: 8 }}>USERNAME</label>
          <input
            style={s.input}
            placeholder="e.g. FootballFan99"
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSetUsername()}
            maxLength={20}
          />
          <button style={{ ...s.btn(), width: "100%", marginTop: 12, padding: 14, fontSize: 15 }} onClick={handleSetUsername}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Lobby ────────────────────────────────────────────────────────────────────
  if (!started) return (
    <div style={s.page}>
      <Nav onRules={() => setShowRules(v => !v)} />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8899bb", fontWeight: 600, marginBottom: 6 }}>TOP BINS</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Minimise</h1>
          <p style={{ fontSize: 14, color: "#8899bb", margin: 0, lineHeight: 1.6 }}>
            8 players revealed one at a time. Assign each to a category. Score = sum of ranks. Perfect score = 8.
          </p>
        </div>

        {showRules && (
          <div style={{ ...s.card, marginBottom: 24, borderColor: "rgba(232,50,26,0.3)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>How to play</h3>
            <ul style={{ fontSize: 13, color: "#8899bb", lineHeight: 2, paddingLeft: 20, margin: 0 }}>
              <li>8 players are drawn from the eligible pool across all categories</li>
              <li>Each player must be assigned to exactly one category</li>
              <li>Each category can only be used once</li>
              <li>Your score = sum of each player's rank in their assigned category</li>
              <li>Rank 1 = best in that category · Perfect score = 8</li>
              <li>A hint appears after each pick if you missed a better option</li>
            </ul>
          </div>
        )}

        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8899bb", fontWeight: 600, marginBottom: 12 }}>CATEGORIES</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 32 }}>
          {CATS.map(c => (
            <div key={c.id} style={{ ...s.card, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: "#8899bb", marginTop: 2 }}>
                  {c.dir === "higher" ? "↑ higher is better" : "↓ lower is better"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {leaderboard.length > 0 && (
          <>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8899bb", fontWeight: 600, marginBottom: 12 }}>LEADERBOARD</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 32 }}>
              {leaderboard.slice(0, 5).map((e, i) => (
                <div key={i} style={{ ...s.card, display: "flex", alignItems: "center", gap: 16, padding: "10px 16px" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? "#E8321A" : "#8899bb", minWidth: 24 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{e.username}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? "#E8321A" : "white" }}>{e.score}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button style={{ ...s.btn(), width: "100%", padding: "16px", fontSize: 16 }} onClick={startGame}>
          Start game →
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "#8899bb", marginTop: 12 }}>
          Playing as <strong style={{ color: "white" }}>{username}</strong> ·{" "}
          <span
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => { localStorage.removeItem(LS_USERNAME); setUsernameSet(false) }}
          >
            change
          </span>
        </p>
      </div>
    </div>
  )

  // ── Game over ─────────────────────────────────────────────────────────────────
  if (gameOver) return (
    <div style={s.page}>
      <Nav onRules={() => setShowRules(v => !v)} />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ ...s.card, textAlign: "center", marginBottom: 24, borderColor: "rgba(232,50,26,0.4)", padding: 32 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", color: "#8899bb", marginBottom: 8 }}>YOUR SCORE</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#E8321A", lineHeight: 1 }}>{totalScore}</div>
          <div style={{ fontSize: 13, color: "#8899bb", marginTop: 8 }}>out of {N * 100} · lower is better · perfect = {N}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={s.btn()} onClick={startGame}>Play again →</button>
            <button style={s.ghost} onClick={() => setStarted(false)}>← Lobby</button>
          </div>
        </div>

        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8899bb", fontWeight: 600, marginBottom: 12 }}>YOUR ASSIGNMENTS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          {CATS.map(cat => {
            const a = assignments[cat.id]
            const rank = a?.rank ?? 100
            const color = getRankColor(rank)
            return (
              <div key={cat.id} style={{
                ...s.card,
                display: "flex", alignItems: "center", gap: 16,
                background: a ? getRankBg(rank) : "#111827",
                borderColor: a ? `${color}50` : "#1e2d4a",
              }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#8899bb", fontWeight: 600, letterSpacing: "0.04em" }}>{cat.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{a?.playerName ?? "—"}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: a ? color : "#8899bb" }}>{a ? getRankLabel(rank) : "—"}</div>
              </div>
            )
          })}
        </div>

        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8899bb", fontWeight: 600, marginBottom: 12 }}>LEADERBOARD</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {leaderboard.map((e, i) => {
            const isYou = e.username === username && e.score === totalScore
            return (
              <div key={i} style={{
                ...s.card,
                display: "flex", alignItems: "center", gap: 16, padding: "12px 16px",
                background: isYou ? "rgba(232,50,26,0.1)" : "#111827",
                borderColor: isYou ? "rgba(232,50,26,0.4)" : "#1e2d4a",
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? "#E8321A" : "#8899bb", minWidth: 24 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                  {e.username}{isYou && <span style={{ color: "#E8321A", fontSize: 12 }}> · you</span>}
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: i === 0 ? "#E8321A" : "white" }}>{e.score}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── Active game ───────────────────────────────────────────────────────────────
  const currentPlayer = gamePlayers[currentIdx]

  return (
    <div style={s.page}>
      <Nav onRules={() => setShowRules(v => !v)} />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {gamePlayers.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < currentIdx ? "#E8321A" : i === currentIdx ? "#ff6b55" : "#1e2d4a",
            }} />
          ))}
        </div>

        {/* Current player */}
        <div style={{ ...s.card, textAlign: "center", marginBottom: 16, padding: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8899bb", marginBottom: 12 }}>
            PLAYER {currentIdx + 1} OF {N}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>{currentPlayer.name}</div>
        </div>

        {/* Hint */}
        {hint && (
          <div style={{
            background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#fbbf24",
          }}>
            💡 Best option was <strong>{hint.bestCatLabel}</strong> (rank #{hint.bestRank})
          </div>
        )}

        {/* Category picker */}
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8899bb", fontWeight: 600, marginBottom: 12 }}>
          CHOOSE A CATEGORY
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CATS.map(cat => {
            const used = usedCats.includes(cat.id)
            const a = assignments[cat.id]
            const rank = a?.rank ?? 0
            const color = used ? getRankColor(rank) : "#8899bb"

            return (
              <button
                key={cat.id}
                onClick={() => !used && assign(cat.id)}
                style={{
                  background: used ? getRankBg(rank) : "#111827",
                  border: `1px solid ${used ? color + "60" : "#1e2d4a"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  textAlign: "left",
                  cursor: used ? "default" : "pointer",
                  opacity: used ? 0.7 : 1,
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{cat.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: used ? "rgba(255,255,255,0.6)" : "white" }}>
                  {cat.label}
                </div>
                {used && (
                  <>
                    <div style={{ fontSize: 11, color: "#8899bb", marginTop: 2 }}>{a?.playerName}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 4 }}>{getRankLabel(rank)}</div>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

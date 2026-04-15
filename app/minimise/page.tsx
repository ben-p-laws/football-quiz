"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { id: "np_goals_per90", label: "Non-Pen Goals per 90", icon: "⚽" },
  { id: "assists_per90", label: "Assists per 90", icon: "🎯" },
  { id: "yellow_pct", label: "Yellow Card %", icon: "🟨" },
  { id: "red_pct", label: "Red Card %", icon: "🟥" },
  { id: "subbed_on_pct", label: "Subbed On %", icon: "🔄" },
  { id: "total_goals_assists", label: "Total Goals + Assists", icon: "📊" },
  { id: "missed_pens", label: "Missed Penalties", icon: "😬" },
  { id: "games_per_goal", label: "Games per Goal", icon: "🧱" },
];

type Ranking = {
  player_name: string;
  category: string;
  stat_value: number;
  rank: number;
};

type SlotResult = {
  category: string;
  player: string;
  rank: number;
  stat_value: number;
};

type LeaderboardEntry = {
  username: string;
  score: number;
  created_at: string;
};

function getRankColor(rank: number) {
  if (rank <= 10) return "#16a34a";
  if (rank <= 25) return "#22c55e";
  if (rank <= 50) return "#eab308";
  if (rank <= 75) return "#f97316";
  return "#ef4444";
}

function buildWeightedPool(rankings: Ranking[]): string[] {
  // Count how many categories each player appears in
  const catCount: Record<string, number> = {};
  rankings.forEach((r) => {
    catCount[r.player_name] = (catCount[r.player_name] || 0) + 1;
  });
  // Build weighted array — player appears N times where N = category count
  const pool: string[] = [];
  Object.entries(catCount).forEach(([player, count]) => {
    for (let i = 0; i < count; i++) pool.push(player);
  });
  return pool;
}

function weightedSample(pool: string[], n: number): string[] {
  const picked = new Set<string>();
  const result: string[] = [];
  const arr = [...pool];
  // Fisher-Yates on the weighted pool, skip duplicates
  for (let i = arr.length - 1; i > 0 && result.length < n; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
    if (!picked.has(arr[i])) {
      picked.add(arr[i]);
      result.push(arr[i]);
    }
  }
  return result;
}

export default function MinimisePage() {
  const [screen, setScreen] = useState<"username" | "game">("username");
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [usedCategories, setUsedCategories] = useState<string[]>([]);
  const [results, setResults] = useState<SlotResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRankings();
    fetchLeaderboard();
  }, []);

  async function fetchRankings() {
    setLoading(true);
    const { data } = await supabase.from("minimise_rankings").select("*");
    if (data) setRankings(data);
    setLoading(false);
  }

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from("minimise_scores")
      .select("username, score, created_at")
      .order("score", { ascending: true })
      .limit(100);
    if (data) {
      const best: Record<string, LeaderboardEntry> = {};
      data.forEach((row) => {
        if (!best[row.username] || row.score < best[row.username].score) {
          best[row.username] = row;
        }
      });
      setLeaderboard(Object.values(best).sort((a, b) => a.score - b.score).slice(0, 20));
    }
  }

  function dealPlayers(r: Ranking[]) {
    const pool = buildWeightedPool(r);
    return weightedSample(pool, 8);
  }

  function startGame() {
    if (!usernameInput.trim()) return;
    setUsername(usernameInput.trim());
    setPlayers(dealPlayers(rankings));
    setCurrentIndex(0);
    setAssignments({});
    setUsedCategories([]);
    setResults([]);
    setGameComplete(false);
    setScreen("game");
  }

  function restartGame() {
    setPlayers(dealPlayers(rankings));
    setCurrentIndex(0);
    setAssignments({});
    setUsedCategories([]);
    setResults([]);
    setGameComplete(false);
  }

  function assignCategory(categoryId: string) {
    const player = players[currentIndex];
    const newAssignments = { ...assignments, [categoryId]: player };
    const newUsed = [...usedCategories, categoryId];
    setAssignments(newAssignments);
    setUsedCategories(newUsed);

    if (currentIndex + 1 >= 8) {
      const slotResults: SlotResult[] = Object.entries(newAssignments).map(([cat, playerName]) => {
        const ranking = rankings.find((r) => r.player_name === playerName && r.category === cat);
        return {
          category: cat,
          player: playerName,
          rank: ranking ? ranking.rank : 100,
          stat_value: ranking ? ranking.stat_value : 0,
        };
      });
      const score = slotResults.reduce((sum, r) => sum + Math.min(r.rank, 100), 0);
      setResults(slotResults);
      setTotalScore(score);
      setGameComplete(true);
      supabase.from("minimise_scores").insert({ username, score, player_slots: slotResults }).then(() => fetchLeaderboard());
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  const currentPlayer = players[currentIndex];

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.center}><p style={{ color: "rgba(255,255,255,0.4)" }}>Loading...</p></div>
    </div>
  );

  if (screen === "username") return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <a href="/" style={styles.logo}>⚽ Top Bins</a>
      </nav>
      <div style={styles.center}>
        <div style={styles.card}>
          <h1 style={styles.h1}>Minimise</h1>
          <p style={styles.muted}>Assign 8 players to 8 stat categories. Your score = their rank. Lowest wins.</p>
          <div style={{ marginTop: "32px" }}>
            <label style={styles.label}>Your username</label>
            <input
              style={styles.input}
              placeholder="e.g. FootballFan99"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
              maxLength={20}
            />
            <button style={styles.btnPrimary} onClick={startGame}>Start game →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <a href="/" style={styles.logo}>⚽ Top Bins</a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!gameComplete && (
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
              Player {currentIndex + 1} of 8
            </span>
          )}
          <button onClick={restartGame} style={styles.btnRestart}>↺ Restart</button>
        </div>
      </nav>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
          {players.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: "4px", borderRadius: "2px",
              background: i < currentIndex || gameComplete ? "#E8321A" : i === currentIndex ? "#ff6b55" : "rgba(255,255,255,0.1)"
            }} />
          ))}
        </div>

        {/* Top card — player or score */}
        {gameComplete ? (
          <div style={{ ...styles.card, textAlign: "center", marginBottom: "24px", border: "1px solid rgba(232,50,26,0.4)" }}>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: "8px" }}>
              YOUR SCORE
            </div>
            <div style={{ fontSize: "64px", fontWeight: 800, color: "#E8321A", lineHeight: 1 }}>
              {totalScore}
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>
              out of 800 · lower is better
            </div>
            <button
              style={{ ...styles.btnPrimary, marginTop: "20px", marginBottom: 0 }}
              onClick={restartGame}
            >
              Play again →
            </button>
          </div>
        ) : (
          <div style={{ ...styles.card, textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: "12px" }}>
              ASSIGN THIS PLAYER
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em" }}>
              {currentPlayer}
            </div>
          </div>
        )}

        {/* Category grid */}
        {!gameComplete && (
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: "12px" }}>
            CHOOSE A CATEGORY
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "32px" }}>
          {CATEGORIES.map((cat) => {
            const used = usedCategories.includes(cat.id);
            const ranking = used ? rankings.find(r => r.player_name === assignments[cat.id] && r.category === cat.id) : null;
            const rank = ranking ? ranking.rank : 100;
            const color = getRankColor(rank);

            return (
              <button
                key={cat.id}
                onClick={() => !used && !gameComplete && assignCategory(cat.id)}
                style={{
                  background: used ? `${color}18` : "#161b27",
                  border: used ? `1px solid ${color}60` : "1px solid rgba(232,50,26,0.25)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  textAlign: "left",
                  cursor: used || gameComplete ? "default" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "4px" }}>{cat.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: used ? "rgba(255,255,255,0.7)" : "white" }}>
                  {cat.label}
                </div>
                {used && (
                  <>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                      {assignments[cat.id]}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color, marginTop: "4px" }}>
                      {ranking ? `Rank #${rank} · ${ranking.stat_value}` : "Unranked · 100pts"}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Leaderboard — shown once game complete */}
        {gameComplete && (
          <>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: "12px" }}>
              LEADERBOARD
            </div>
            {leaderboard.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center" }}>No scores yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {leaderboard.map((entry, i) => {
                  const isYou = entry.username === username && entry.score === totalScore;
                  return (
                    <div key={`${entry.username}-${i}`} style={{
                      background: isYou ? "rgba(232,50,26,0.1)" : i === 0 ? "rgba(255,255,255,0.04)" : "#161b27",
                      border: isYou ? "1px solid rgba(232,50,26,0.4)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: i === 0 ? "#E8321A" : "rgba(255,255,255,0.3)", minWidth: "28px" }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: "14px" }}>
                        {entry.username} {isYou && <span style={{ color: "#E8321A", fontSize: "12px" }}>· you</span>}
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: i === 0 ? "#E8321A" : "white" }}>
                        {entry.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0f0808", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: "56px", borderBottom: "1px solid rgba(232,50,26,0.2)" },
  logo: { fontWeight: 800, fontSize: "18px", textDecoration: "none", color: "white" },
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)", padding: "24px" },
  card: { background: "#180d0d", border: "1px solid rgba(232,50,26,0.2)", borderRadius: "16px", padding: "32px", width: "100%", boxSizing: "border-box" },
  h1: { fontSize: "28px", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" },
  muted: { fontSize: "14px", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6 },
  label: { display: "block", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px", letterSpacing: "0.05em" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(232,50,26,0.3)", borderRadius: "8px", padding: "12px 14px", color: "white", fontSize: "15px", outline: "none", boxSizing: "border-box", marginBottom: "12px" },
  btnPrimary: { display: "block", width: "100%", background: "#E8321A", color: "white", border: "none", borderRadius: "8px", padding: "13px", fontWeight: 700, fontSize: "15px", cursor: "pointer", marginBottom: "10px" },
  btnRestart: { background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 600 },
};

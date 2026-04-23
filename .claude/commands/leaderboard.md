# Leaderboard Scaffolder

Add a global leaderboard to any TopBins game. Follows the exact pattern from MinimiseGame.tsx — username persistence, score submission, top-10 display with user's position highlighted, shown in both the lobby and after game over.

---

## Step 1 — Gather requirements

Ask for anything not already provided:

1. **Game name** — e.g. "Minimise", "Stat Clash"
2. **Score direction** — `lower is better` (e.g. Minimise ranks) or `higher is better` (e.g. total correct)
3. **Score label** — what the number represents (e.g. "pts", "score", "rank")
4. **Supabase table name** — snake_case, e.g. `minimise_scores`, `stat_clash_scores`
5. **Extra columns** — any JSON payload to store alongside score (e.g. `player_slots`, `round_results`). Use `jsonb` type.
6. **LocalStorage key prefix** — e.g. `topbins_minimise`, `topbins_statclash` (used for username key)
7. **Component file** — e.g. `components/MinimiseGame.tsx`
8. **API route file** — e.g. `app/api/minimise/route.ts`

---

## Step 2 — Supabase table

Provide this SQL for the user to run in Supabase:

```sql
create table [table_name] (
  id bigint generated always as identity primary key,
  username text not null,
  score integer not null,
  [extra_column] jsonb,          -- repeat for each extra column, or omit
  created_at timestamptz default now()
);

-- Index for fast leaderboard queries
create index on [table_name] (score [asc|desc]);  -- asc if lower=better, desc if higher=better
```

Also remind the user to check RLS policies allow anonymous inserts.

---

## Step 3 — API changes

### GET endpoint — fetch leaderboard

Add to the existing GET handler, before the return statement:

```typescript
const { data: lbData } = await getClient()
  .from('[TABLE_NAME]')
  .select('username, score, [extra_column], created_at')
  .order('score', { ascending: [true|false] })  // true if lower=better
  .limit(100)

// Deduplicate to best score per user
const bestScores: Record<string, { score: number; [extra_column]: unknown; created_at: string }> = {}
for (const row of lbData || []) {
  const isBetter = [row.score < bestScores[row.username]?.score | row.score > bestScores[row.username]?.score]
  if (!bestScores[row.username] || isBetter) {
    bestScores[row.username] = { score: row.score, [extra_column]: row.[extra_column], created_at: row.created_at }
  }
}
const leaderboard = Object.entries(bestScores)
  .map(([username, d]) => ({ username, ...d }))
  .sort((a, b) => [a.score - b.score | b.score - a.score])  // asc if lower=better
  .slice(0, 20)
```

Include `leaderboard` in the JSON response:
```typescript
return NextResponse.json({ ..., leaderboard })
```

### POST endpoint — submit score

Add a POST handler (or add to existing):

```typescript
export async function POST(req: Request) {
  try {
    const { username, score, [extra_column] } = await req.json()
    if (!username || score === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await getClient().from('[TABLE_NAME]').insert({ username, score, [extra_column] })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

---

## Step 4 — Component changes

### State

```typescript
const [leaderboard, setLeaderboard] = useState<LbEntry[]>([])
const [username, setUsername]       = useState('')
const [usernameSet, setUsernameSet] = useState(false)
const [submitted, setSubmitted]     = useState(false)
```

Where `LbEntry`:
```typescript
type LbEntry = { username: string; score: number; created_at: string }
```

### Load username from localStorage

```typescript
const LS_USERNAME = '[PREFIX]_username'

useEffect(() => {
  const saved = localStorage.getItem(LS_USERNAME)
  if (saved) { setUsername(saved); setUsernameSet(true) }
}, [])
```

### Populate leaderboard from API response

```typescript
setLeaderboard(data.leaderboard ?? [])
```

### Username entry screen

Show this screen before the lobby if `!usernameSet`:

```tsx
<div style={s.page}>
  <NavBar />
  <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
    <div style={{ ...s.card }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12 }}>Choose a username</div>
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSetUsername()}
        placeholder="Your name..."
        style={s.input}
        autoFocus
      />
      <p style={{ fontSize: 11, color: '#4a5568', margin: '8px 0 0' }}>Saved for the leaderboard</p>
    </div>
    <button onClick={handleSetUsername} style={{ ...s.btn(), width: '100%', fontSize: 15, padding: '14px', marginTop: 12 }}>Continue</button>
  </div>
</div>
```

Where:
```typescript
function handleSetUsername() {
  const trimmed = username.trim()
  if (!trimmed) return
  setUsername(trimmed)
  localStorage.setItem(LS_USERNAME, trimmed)
  setUsernameSet(true)
}
```

### Leaderboard component (reuse in lobby + game over)

```tsx
function LeaderboardPanel({ leaderboard, username }: { leaderboard: LbEntry[]; username: string }) {
  if (!leaderboard.length) return null
  const top10 = leaderboard.slice(0, 10)
  const userIdx = leaderboard.findIndex(r => r.username === username)
  const userInTop10 = userIdx >= 0 && userIdx < 10
  return (
    <div style={s.card}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12 }}>🏆 Leaderboard</div>
      {top10.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4a' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: i === 0 ? '#f59e0b' : '#4a5568', width: 22, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</span>
            <span style={{ fontSize: 13, color: row.username === username ? '#f97316' : 'white', fontWeight: row.username === username ? 700 : 400 }}>{row.username}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: row.username === username ? '#f97316' : '#8899bb' }}>{row.score}</span>
        </div>
      ))}
      {!userInTop10 && userIdx >= 0 && (() => {
        const row = leaderboard[userIdx]
        return (
          <>
            <div style={{ padding: '4px 0', color: '#2a3d5e', fontSize: 11 }}>···</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', background: 'rgba(249,115,22,0.06)', borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#f97316', width: 22, fontWeight: 700 }}>#{userIdx + 1}</span>
                <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{row.username}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>{row.score}</span>
            </div>
          </>
        )
      })()}
    </div>
  )
}
```

### Place in lobby

Add after the scoring guide and before Start Game:
```tsx
<LeaderboardPanel leaderboard={leaderboard} username={username} />
```

### Place in game over screen

Add after the final score and before Play Again:
```tsx
<LeaderboardPanel leaderboard={leaderboard} username={username} />
```

### Submit score on game over

Call this when the game ends (e.g. when `gameOver` becomes true):

```typescript
async function submitScore(score: number, extraPayload?: unknown) {
  if (submitted) return
  setSubmitted(true)
  await fetch('/api/[route-slug]', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, score, [extra_column]: extraPayload }),
  })
  // Re-fetch leaderboard so new score appears immediately
  const data = await fetch('/api/[route-slug]').then(r => r.json())
  setLeaderboard(data.leaderboard ?? [])
}
```

Reset `submitted` to `false` when the user starts a new game.

---

## Step 5 — Verify

1. Confirm the Supabase table exists and RLS allows anonymous insert
2. Confirm `leaderboard` is included in the GET response
3. Confirm `LS_USERNAME` key is unique and doesn't clash with other games on the same domain
4. Confirm `submitScore` is called exactly once per game (guard with `submitted` flag)
5. Confirm leaderboard re-fetches after submission so the user sees their new score immediately
6. Confirm `username` persists across page reloads via localStorage

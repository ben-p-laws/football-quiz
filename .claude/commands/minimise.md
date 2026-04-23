# Minimise Game Scaffolder

Scaffold a complete "Minimise" game for any dataset. The Minimise game works like this:

**Core rules (never change these):**
- N entities (players, athletes, movies, etc.) are revealed one at a time — default N=8
- Each entity must be assigned to exactly one category — categories equal N
- Each category can only be used once
- Every entity in the eligible pool is ranked 1–50 within each category
- Score = sum of all assigned ranks (lower is better; perfect score = N if all rank #1)
- After all assignments, score is submitted to a global leaderboard
- Hint shown after each assignment if the user didn't pick the entity's best available category

---

## Step 1 — Gather requirements

Ask the user for the following. If they've already provided some in their message, use those; ask only for what's missing.

1. **Game name** — e.g. "Premier League", "NFL Draft", "Formula 1", "Box Office"
2. **Entity noun** (singular/plural) — e.g. "player / players", "driver / drivers", "film / films"
3. **Entity identifier** — the unique ID column in the DB (e.g. `player_id`, `driver_id`)
4. **Entity name column** — the display name column (e.g. `player_name`, `title`)
5. **N categories** — list each with:
   - Key (snake_case identifier, e.g. `goals_per_90`)
   - Label (display name, e.g. "Goals per 90")
   - Unit (short label, e.g. "G/90")
   - Direction: `higher` or `lower` (which is better)
   - Eligibility filter (e.g. "min 500 minutes played"), or "none"
   - Icon emoji
6. **Supabase table(s)** — which tables/columns hold the raw data needed to compute each category
7. **Route slug** — URL-safe kebab-case, e.g. `premier-league`, `formula-1`
8. **Leaderboard table name** — snake_case, e.g. `pl_minimise_leaderboard`
9. **App name prefix** — shown in UI above game title, e.g. "CricIQ", "FootballIQ"
10. **LocalStorage key prefix** — e.g. `criciq`, `footiq` (used for username + instructions flags)

---

## Step 2 — Plan the data pipeline

Before writing code, outline:
- Which Supabase tables to query
- What aggregation logic computes each category value
- How eligibility filters apply
- What tiebreak logic (if any) is needed for categories where ties are common

Confirm this with the user before proceeding.

---

## Step 3 — Scaffold the files

Create these four files, exactly following the patterns from the IPL Minimise implementation.

### 3a. API route — `app/api/[route-slug]/route.ts`

Use this exact structure:

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchAll(table: string, columns: string, filterFn?: (q: any) => any) {
  let all: any[] = []
  let offset = 0
  while (true) {
    let q = supabase.from(table).select(columns).range(offset, offset + 999)
    if (filterFn) q = filterFn(q)
    const { data } = await q
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

export async function GET() {
  try {
    // 1. Fetch all raw data rows needed
    // 2. Aggregate per entity (sum/count/avg per entity ID)
    // 3. For each category:
    //    a. Filter by eligibility
    //    b. Sort by value (ascending if lowerIsBetter, else descending)
    //    c. Take top 50, assign rank 1–50
    // 4. Build weighted pool: each top-50 appearance = one entry in array
    // 5. Build pidRanks lookup: { entityId: { catKey: rank } }
    // 6. Fetch leaderboard, deduplicate to best score per username, return top 20

    const categories = { /* catKey: { label, unit, lowerIsBetter } */ }
    const weightedPool: { pid: number; name: string }[] = []
    const pidRanks: Record<number, Record<string, number>> = {}

    const { data: leaderboard } = await supabase
      .from('[LEADERBOARD_TABLE]')
      .select('username, score, player_assignments, created_at')
      .order('score', { ascending: true })
      .limit(20)

    const bestScores: Record<string, { score: number; player_assignments: any; created_at: string }> = {}
    for (const row of leaderboard || []) {
      if (!bestScores[row.username] || row.score < bestScores[row.username].score) {
        bestScores[row.username] = { score: row.score, player_assignments: row.player_assignments, created_at: row.created_at }
      }
    }
    const topLeaderboard = Object.entries(bestScores)
      .map(([username, d]) => ({ username, ...d }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 20)

    return NextResponse.json({ categories, weightedPool, pidRanks, leaderboard: topLeaderboard }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { username, score, player_assignments } = await req.json()
    if (!username || score === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    await supabase.from('[LEADERBOARD_TABLE]').insert({ username, score, player_assignments })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

Fill in the real aggregation logic for each category. Never use `any` where the shape is known.

---

### 3b. React component — `components/[GameName]Minimise.tsx`

Follow the IPLDraft.tsx structure exactly. Key points:

**State:**
```typescript
const [loading, setLoading] = useState(true)
const [categories, setCategories] = useState<Record<CatKey, Category>>({} as any)
const [weightedPool, setWeightedPool] = useState<Entity[]>([])
const [pidRanks, setPidRanks] = useState<Record<number, Record<string, number>>>({})
const [leaderboard, setLeaderboard] = useState<any[]>([])
const [username, setUsername] = useState('')
const [usernameSet, setUsernameSet] = useState(false)
const [started, setStarted] = useState(false)
const [gamePlayers, setGamePlayers] = useState<Entity[]>([])
const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
const [assignments, setAssignments] = useState<Partial<Record<CatKey, Assignment>>>({})
const [gameOver, setGameOver] = useState(false)
const [submitted, setSubmitted] = useState(false)
const [showRules, setShowRules] = useState(false)
const [hint, setHint] = useState<{ entityName: string; bestCat: string; bestRank: number } | null>(null)
```

**Rank colours (use exactly):**
```typescript
function getRankColor(rank: number) {
  if (rank <= 10) return '#22c55e'
  if (rank <= 20) return '#86efac'
  if (rank <= 30) return '#fbbf24'
  if (rank <= 40) return '#f97316'
  return '#ef4444'
}
function getRankBg(rank: number) {
  if (rank <= 10) return 'rgba(34,197,94,0.15)'
  if (rank <= 20) return 'rgba(134,239,172,0.08)'
  if (rank <= 30) return 'rgba(251,191,36,0.1)'
  if (rank <= 40) return 'rgba(249,115,22,0.1)'
  return 'rgba(239,68,68,0.1)'
}
function getRankLabel(rank: number) {
  if (rank === 1) return '🥇 #1'
  if (rank <= 3) return `🥈 #${rank}`
  if (rank <= 10) return `⭐ #${rank}`
  return `#${rank}`
}
```

**Style constants (use exactly):**
```typescript
const s = {
  page: { minHeight: '100vh', background: '#0a0f1e', fontFamily: "'DM Sans', -apple-system, sans-serif", paddingBottom: 80 } as React.CSSProperties,
  card: { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '16px 20px' } as React.CSSProperties,
  btn: (color = '#f97316'): React.CSSProperties => ({ background: color, border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }),
  ghost: { background: 'transparent', border: '1px solid #1e2d4a', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#8899bb', cursor: 'pointer' } as React.CSSProperties,
  input: { background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', fontSize: 15, color: 'white', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
}
```

**LocalStorage keys:** `[prefix]_minimise_username` and `[prefix]_minimise_seen_instructions`

**Screens in order:**
1. Loading (progress bar + pulsing label)
2. Username entry (if no saved username)
3. Pre-game lobby (categories listed, instructions, leaderboard top 5)
4. Game loop (reveal entity → pick category)
5. Game over overlay (final score card + full leaderboard)

**Hint logic:** After each assignment, find the entity's best rank across *remaining unused* categories. If the chosen category isn't best, show a hint for 4 seconds.

**submitScore:** Called automatically when last entity is assigned. POST to API, then re-fetch leaderboard.

---

### 3c. Page file — `app/[route-slug]/page.tsx`

```typescript
import [GameName]Minimise from '@/components/[GameName]Minimise'

export const metadata = { title: '[Game Name] — Minimise' }

export default function Page() {
  return <[GameName]Minimise />
}
```

---

### 3d. Supabase leaderboard table

Provide the user with this SQL to run in Supabase:

```sql
create table [leaderboard_table] (
  id bigint generated always as identity primary key,
  username text not null,
  score integer not null,
  player_assignments jsonb,
  created_at timestamptz default now()
);

create index on [leaderboard_table] (score asc);
```

---

## Step 4 — Wire up navigation

Add the new game to:
- `components/NavBar.tsx` — add a link in the nav list, following existing pattern
- `components/LandingPage.tsx` — add a preview card if appropriate (tags: "Strategy · Leaderboard")

---

## Step 5 — Verify

After writing all files:
1. Check that every `CatKey` in the component matches every key returned by the API
2. Check that `CAT_KEYS.length` equals the number of entities drawn per game (N)
3. Confirm `localStorage` prefix is unique and doesn't clash with other games
4. Remind the user to create the Supabase table and check RLS policies allow insert

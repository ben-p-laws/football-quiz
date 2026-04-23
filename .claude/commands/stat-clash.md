# Stat Clash Game Scaffolder

Scaffold a complete "Stat Clash" game for any dataset. Stat Clash works like this:

**Core rules (never change these):**
- A random stat target is shown each round (e.g. "247 runs")
- Player(s) search for an entity (athlete, film, driver, etc.) whose actual value is closest to the target
- Score = how far off you were, scaled by the category's sensitivity floor (0 = perfect, 20 = max, 30 = entity has no stat)
- Modes: Solo (one player) or Vs Friend (two players alternate; can't pick the same entity)
- Rounds: 5–30, default 10
- Lower score wins

**Scoring formula (never change):**
```
diff = |guess - target|
divisor = max(floor, target × 0.05)
score = min(20, ceil(diff / divisor))
special: if entity has no stat for that category → 30 pts
```

---

## Step 1 — Gather requirements

Ask the user for the following. Use anything already provided; ask only for what's missing.

1. **Game name** — e.g. "Premier League", "Formula 1", "Box Office"
2. **App name prefix** — shown above the game title (e.g. "CricIQ", "FootIQ", "F1IQ")
3. **Entity noun** (singular / plural) — e.g. "player / players", "driver / drivers", "film / films"
4. **Entity identifier column** — unique ID in the DB (e.g. `player_id`, `driver_id`)
5. **Entity name column** — display name column (e.g. `player_name`, `title`)
6. **Categories** — list each with:
   - `id` (snake_case, e.g. `total_goals`)
   - Label (e.g. "Total Goals")
   - Unit (short label shown below the target, e.g. "goals", "km/h", "£M")
   - Floor (min divisor for scoring — higher = more forgiving; use 1 for decimals like SR/avg, 3–10 for counts, 50–200 for large totals)
   - Weight (relative frequency this category appears — use 1 for normal, 0.25 for niche/rare)
   - Eligibility filter (e.g. "min 500 minutes played"), or "none"
7. **Supabase table(s)** — which tables/columns hold the raw data for each category
8. **Route slug** — URL-safe kebab-case, e.g. `premier-league`, `formula-1`
9. **API route path** — e.g. `app/api/[route-slug]/route.ts`
10. **Component name** — PascalCase, e.g. `PLStatClash`, `F1StatClash`
11. **LocalStorage key prefix** — e.g. `pl`, `f1` (used for future persistence if needed)

---

## Step 2 — Plan the data pipeline

Before writing code, outline:
- Which Supabase tables to query
- What aggregation/join logic computes each category value per entity
- How eligibility filters apply (min innings, min laps, etc.)
- Range logic: 10th–90th percentile of eligible entity values → `{ min, max }` for target generation
- How the entity autocomplete list is built (union of all entity IDs across categories)

Confirm this with the user before proceeding.

---

## Step 3 — Scaffold the files

Create exactly three files, following the patterns below precisely.

---

### 3a. API route — `app/api/[route-slug]/route.ts`

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

function buildPlayerList(statMap: Record<number, { name: string; [key: string]: any }>, valueKey: string) {
  return Object.entries(statMap)
    .map(([id, d]) => ({ pid: Number(id), name: d.name, value: d[valueKey] || 0 }))
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value)
}

function getRange(players: { value: number }[]) {
  const vals = players.map(p => p.value).sort((a, b) => a - b)
  const p10 = vals[Math.floor(vals.length * 0.1)]
  const p90 = vals[Math.floor(vals.length * 0.9)]
  return { min: p10, max: p90 }
}

export async function GET() {
  try {
    // 1. Fetch raw data rows
    // 2. Aggregate per entity (sum/count/avg per entity ID)
    // 3. For each category:
    //    a. Apply eligibility filter
    //    b. Compute value per entity
    //    c. getRange() → 10th–90th percentile
    //    d. Build playerMap: { entityId: { name, value } }
    //    e. Push to categories array (weight × 4 times for normal weight=1; once for weight=0.25)
    // 4. Build allEntities: union of all entity IDs across categories

    const categories: {
      id: string
      label: string
      unit: string
      range: { min: number; max: number }
      playerMap: Record<number, { name: string; value: number }>
      floor: number
    }[] = []

    function addCat(
      id: string,
      label: string,
      unit: string,
      players: { pid: number; name: string; value: number }[],
      weight = 1,
      floor = 10
    ) {
      if (players.length < 10) return
      const range = getRange(players)
      if (range.min >= range.max) return
      const playerMap: Record<number, { name: string; value: number }> = {}
      for (const p of players) playerMap[p.pid] = { name: p.name, value: p.value }
      // weight=1 → 4 entries (normal frequency); weight=0.25 → 1 entry (rare)
      const times = Math.max(1, Math.round(weight * 4))
      for (let i = 0; i < times; i++) categories.push({ id, label, unit, range, playerMap, floor })
    }

    // --- YOUR AGGREGATION LOGIC HERE ---
    // Example:
    // const rows = await fetchAll('your_table', 'entity_id,entity_name,stat_value')
    // const totals: Record<number, { name: string; value: number }> = {}
    // for (const r of rows) {
    //   if (!totals[r.entity_id]) totals[r.entity_id] = { name: r.entity_name, value: 0 }
    //   totals[r.entity_id].value += r.stat_value
    // }
    // addCat('total_stat', 'Total Stat', 'units', buildPlayerList(totals, 'value'), 1, 50)

    const allEntities = new Map<number, string>()
    for (const cat of categories) {
      for (const [pid, d] of Object.entries(cat.playerMap)) {
        allEntities.set(Number(pid), d.name)
      }
    }

    return NextResponse.json(
      {
        categories,
        allPlayers: Array.from(allEntities.entries()).map(([pid, name]) => ({ pid, name })),
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } }
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

Fill in the aggregation logic for every category. Never use `any` where the shape is known.

---

### 3b. React component — `components/[ComponentName].tsx`

Follow the IPL StatClash.tsx structure exactly. Key implementation details:

**Interfaces:**
```typescript
interface Entity { pid: number; name: string }
interface Category {
  id: string; label: string; unit: string;
  range: { min: number; max: number };
  playerMap: Record<number, { name: string; value: number }>;
  floor: number;
}
interface Round {
  category: Category; target: number;
  p1: { player: Entity | null; value: number; score: number } | null;
  p2: { player: Entity | null; value: number; score: number } | null;
}
```

**Scoring (copy exactly):**
```typescript
function calcScore(guess: number, target: number, floor: number): number {
  if (guess === 0 && target > 0) return 30
  if (guess === target) return 0
  const diff = Math.abs(guess - target)
  const divisor = Math.max(floor, target * 0.05)
  return Math.min(20, Math.ceil(diff / divisor))
}

function scoreLabel(score: number) {
  if (score === 0) return { text: 'Perfect!', color: '#22c55e' }
  if (score <= 3) return { text: 'Very close!', color: '#86efac' }
  if (score <= 6) return { text: 'Close', color: '#fbbf24' }
  if (score <= 10) return { text: 'Not bad', color: '#f97316' }
  if (score <= 20) return { text: 'Far off', color: '#ef4444' }
  return { text: 'No stat!', color: '#7f1d1d' }
}
```

**Style constants (copy exactly):**
```typescript
const s = {
  page: { minHeight: '100vh', background: '#0a0f1e', fontFamily: "'DM Sans', -apple-system, sans-serif", paddingBottom: 60 } as React.CSSProperties,
  card: { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, padding: '16px 20px' } as React.CSSProperties,
  btn: (color = '#f97316'): React.CSSProperties => ({ background: color, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }),
  ghost: { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#8899bb', cursor: 'pointer' } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase' } as React.CSSProperties,
  input: { background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', fontSize: 15, color: 'white', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
}
```

**State:**
```typescript
const [loading, setLoading] = useState(true)
const [categories, setCategories] = useState<Category[]>([])
const [allPlayers, setAllPlayers] = useState<Entity[]>([])
const [mode, setMode] = useState<'solo' | 'vs'>('solo')
const [numRounds, setNumRounds] = useState(10)
const [p1Name, setP1Name] = useState('')
const [p2Name, setP2Name] = useState('')
const [started, setStarted] = useState(false)
const [rounds, setRounds] = useState<Round[]>([])
const [currentRound, setCurrentRound] = useState(0)
const [turn, setTurn] = useState<1 | 2>(1)
const [roundRevealed, setRoundRevealed] = useState(false)
const [gameOver, setGameOver] = useState(false)
const [search1, setSearch1] = useState('')
const [search2, setSearch2] = useState('')
const [lockedIn, setLockedIn] = useState<{ p1?: Entity; p2?: Entity }>({})
```

**PlayerSearch child component:** Autocomplete input. When `lockedPlayer` is set, shows "Locked in ✓" state instead of input. Excludes the other player's pick in vs mode. Max 8 results. Auto-focuses when it becomes active. Copy the full implementation from StatClash.tsx.

**Screens in order:**
1. Loading — "Loading stats..." centred
2. Pre-game lobby — Mode toggle (🏏 Solo / ⚔️ vs Friend), player name inputs (vs only), rounds slider (5–30), scoring explanation, Start Game button
3. Game loop:
   - Header: round counter + Restart button
   - Score display: solo = large orange total; vs = two score cards with active player highlighted
   - Stat card: category label + giant target number + unit
   - Search input(s): PlayerSearch component(s)
   - Round result card (after lock-in): entity name, actual value, score pts + label
   - Next Round / See Results button
   - Previous rounds history (compact cards)
4. Game over — trophy, winner/score, full round-by-round breakdown, Play Again button

**Key logic:**
- `generateRounds(n)`: pick random category, random target in `[cat.range.min, cat.range.max]`
- `lockIn(player, which)`:
  - Solo or P1: store P1, reveal result (solo) or switch turn to P2 (vs)
  - P2: compute both scores from `lockedIn.p1`, update round, reveal result
- `filterPlayers(search, excludePid?)`: case-insensitive substring, max 8, exclude other player's pid in vs mode
- `getVal(player, cat)`: `cat.playerMap[player.pid]?.value || 0`
- `nextRound()`: advance index or set `gameOver = true`
- Fetch from `/api/[route-slug]` on mount

---

### 3c. Page file — `app/[route-slug]/page.tsx`

```typescript
import [ComponentName] from '@/components/[ComponentName]'

export const metadata = { title: '[Game Name] — Stat Clash' }

export default function Page() {
  return <[ComponentName] />
}
```

---

## Step 4 — Wire up navigation

Add the new game to:
- `components/NavBar.tsx` — add a link following the existing pattern
- `components/LandingPage.tsx` — add a preview card if appropriate (tags: "Solo · Vs Friend")

---

## Step 5 — Verify

After writing all files:
1. Confirm every category `id` in the component matches what the API returns
2. Confirm `calcScore` and `scoreLabel` are copied exactly — no modifications
3. Confirm the API uses `s-maxage=3600, stale-while-revalidate` cache header
4. Confirm PlayerSearch excludes the other player's entity in vs mode
5. Confirm the autocomplete list is the union of all entity IDs across all categories
6. Check that no category has `range.min >= range.max` (would cause broken target generation)

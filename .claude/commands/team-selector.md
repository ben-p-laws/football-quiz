# Team Selector Scaffolder

Add a filterable team/group selector to any game. Works with any dataset — football clubs, NBA teams, international countries, film genres, etc.

---

## Step 1 — Gather requirements

Ask the user for the following. Use anything already provided; ask only for what's missing.

1. **Game component file** — e.g. `components/MinimiseGame.tsx`
2. **API route file** — e.g. `app/api/minimise/route.ts`
3. **Dataset noun** (singular/plural) — e.g. "club / clubs", "team / teams", "country / countries"
4. **Supabase table** — the table that holds the raw data (e.g. `player_seasons`)
5. **Group column** — the column that contains the team/group value (e.g. `teams_played_for`, `club`, `nationality`)
   - Is it a **single value** (one team per row) or **comma-separated list** (multiple teams per row)?
6. **Min seasons / appearances** — minimum number of distinct seasons/years a team must appear to be included in the list (prevents one-off noise). Default: 5
7. **Filter behaviour** — when a team is selected, does it:
   - Re-fetch data from the API filtered to that team? (recommended for large datasets)
   - Filter client-side from already-loaded data? (only for small datasets)
8. **Exclude values** — any known bad values to strip out (e.g. `"2 Teams"`, `"Unknown"`)

---

## Step 2 — Plan

Before writing code, confirm:
- Which column to group by and how it's structured (single vs comma-separated)
- What the `buildGroupList` aggregation looks like
- Whether the filter is server-side (API query param) or client-side

---

## Step 3 — API changes

### Add `buildGroupList` function

```typescript
const MIN_GROUP_SEASONS = 5 // adjust to requirement

function buildGroupList(rows: any[]): string[] {
  const groupSeasons: Record<string, Set<string>> = {}
  for (const row of rows) {
    const yearId = row.year_id as string // or equivalent season/year column
    // For comma-separated column:
    const groups = String(row.[GROUP_COLUMN] || '').split(',').map((t: string) => t.trim()).filter(Boolean)
    // For single-value column, replace above two lines with:
    // const groups = row.[GROUP_COLUMN] ? [String(row.[GROUP_COLUMN]).trim()] : []
    for (const group of groups) {
      if (!groupSeasons[group]) groupSeasons[group] = new Set()
      groupSeasons[group].add(yearId)
    }
  }
  return Object.entries(groupSeasons)
    .filter(([, seasons]) => seasons.size >= MIN_GROUP_SEASONS)
    .map(([name]) => name)
    .sort()
}
```

### Add group filter to fetch function

```typescript
async function fetchEntityData(group?: string) {
  // existing fetch logic...
  // add filter:
  if (group) q = q.ilike('[GROUP_COLUMN]', `%${group}%`)
  // ...
}
```

### Return `groups` in GET response

```typescript
let groups: string[] = []
if (!group) {
  groups = buildGroupList(rows)
}
return NextResponse.json({ ..., groups })
```

---

## Step 4 — Component changes

### Add state

```typescript
const [selectedGroup, setSelectedGroup] = useState('')
const [groups, setGroups] = useState<string[]>([])
```

### Populate `groups` from API response

```typescript
setGroups(data.groups ?? [])
```

### Add selector in lobby (before Start Game button)

```typescript
{groups.length > 0 && (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
      Filter by [Dataset Noun]
    </div>
    <select
      value={selectedGroup}
      onChange={e => {
        setSelectedGroup(e.target.value)
        fetchData(true, e.target.value) // re-fetch with filter
      }}
      style={{ ...s.input, cursor: "pointer" }}
    >
      <option value="">All [Dataset Noun Plural]</option>
      {groups
        .filter(g => ![EXCLUDE_VALUES].includes(g))
        .map(g => <option key={g} value={g}>{g}</option>)}
    </select>
  </div>
)}
```

### Show selection in Start button

```typescript
<button onClick={() => startGame()} style={{ ...s.btn(), width: "100%", fontSize: 15, padding: "14px", marginBottom: 16 }}>
  {selectedGroup ? `Start Game — ${selectedGroup}` : "Start Game"}
</button>
```

### Show active filter in game header (optional)

```typescript
{selectedGroup && (
  <div style={{ fontSize: 11, color: "#f97316", marginTop: 2 }}>
    ⚽ {selectedGroup}
  </div>
)}
```

---

## Step 5 — Verify

1. Confirm `groups` is returned by the API and populated in component state
2. Confirm excluded values (e.g. `"2 Teams"`) are filtered from the dropdown
3. Confirm selecting a group re-fetches data and updates the weighted pool
4. Confirm "All [Noun]" resets back to the full pool
5. Confirm the Start button label reflects the selected group

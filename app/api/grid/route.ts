import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Criteria pool ─────────────────────────────────────────────────────────────
type Criterion = { type: string; ref: string | null; label: string; tooltip: string }

const CRITERIA: Criterion[] = [
  { type: 'team', ref: 'Arsenal',                  label: 'Arsenal',      tooltip: 'Played for Arsenal' },
  { type: 'team', ref: 'Chelsea',                  label: 'Chelsea',      tooltip: 'Played for Chelsea' },
  { type: 'team', ref: 'Liverpool',                label: 'Liverpool',    tooltip: 'Played for Liverpool' },
  { type: 'team', ref: 'Manchester United',        label: 'Man Utd',      tooltip: 'Played for Man Utd' },
  { type: 'team', ref: 'Manchester City',          label: 'Man City',     tooltip: 'Played for Man City' },
  { type: 'team', ref: 'Tottenham Hotspur',        label: 'Spurs',        tooltip: 'Played for Spurs' },
  { type: 'team', ref: 'Newcastle United',         label: 'Newcastle',    tooltip: 'Played for Newcastle' },
  { type: 'team', ref: 'Everton',                  label: 'Everton',      tooltip: 'Played for Everton' },
  { type: 'team', ref: 'Aston Villa',              label: 'Aston Villa',  tooltip: 'Played for Aston Villa' },
  { type: 'team', ref: 'West Ham United',          label: 'West Ham',     tooltip: 'Played for West Ham' },
  { type: 'team', ref: 'Leeds United',             label: 'Leeds Utd',    tooltip: 'Played for Leeds Utd' },
  { type: 'team', ref: 'Blackburn Rovers',         label: 'Blackburn',    tooltip: 'Played for Blackburn' },
  { type: 'team', ref: 'Leicester City',           label: 'Leicester',    tooltip: 'Played for Leicester' },
  { type: 'team', ref: 'Southampton',              label: 'Southampton',  tooltip: 'Played for Southampton' },
  { type: 'team', ref: 'Middlesbrough',            label: 'Middlesbrough', tooltip: 'Played for Middlesbrough' },
  { type: 'team', ref: 'Sunderland',               label: 'Sunderland',   tooltip: 'Played for Sunderland' },
  { type: 'team', ref: 'Bolton Wanderers',         label: 'Bolton',       tooltip: 'Played for Bolton' },
  { type: 'team', ref: 'Fulham',                   label: 'Fulham',       tooltip: 'Played for Fulham' },
  { type: 'team', ref: 'Wolverhampton Wanderers',  label: 'Wolves',       tooltip: 'Played for Wolves' },
  { type: 'team', ref: 'Crystal Palace',           label: 'C. Palace',    tooltip: 'Played for Crystal Palace' },
  { type: 'won_pl',          ref: null, label: 'PL Winner',    tooltip: 'Won the Premier League at least once' },
  { type: 'relegated',       ref: null, label: 'Relegated',    tooltip: 'Was relegated from the Premier League' },
  { type: 'golden_boot',     ref: null, label: 'Golden Boot',  tooltip: 'Won the PL Golden Boot' },
  { type: 'golden_glove',    ref: null, label: 'Golden Glove', tooltip: 'Won the PL Golden Glove (GK)' },
  { type: 'scored_100_goals',ref: null, label: '100+ Goals',   tooltip: 'Scored 100+ PL goals' },
]

// ── Seeded RNG (same pattern as Teammates) ────────────────────────────────────
function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

// ── Team name normalisation (same as populate script) ─────────────────────────
const PLAYER_SEASON_TEAM_NORM: Record<string, string> = {
  'Manchester Utd':  'Manchester United',
  'QPR':             'Queens Park Rangers',
  'Sheffield Weds':  'Sheffield Wednesday',
  'Brighton':        'Brighton & Hove Albion',
  'West Brom':       'West Bromwich Albion',
}
const normPSTeam = (t: string) => PLAYER_SEASON_TEAM_NORM[t] ?? t

// ── Paginated fetch ───────────────────────────────────────────────────────────
async function fetchAll(supabase: any, table: string, columns: string): Promise<any[]> {
  const rows: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase.from(table).select(columns).range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

// ── Player data maps ──────────────────────────────────────────────────────────
type PlayerData = {
  teamSeasons:       Map<string, Map<string, number>>
  playerPLWins:      Map<string, number>
  playerRelegations: Map<string, number>
  playerGoldenBoot:  Map<string, number>
  playerGoldenGlove: Map<string, number>
  playerTotalApps:   Map<string, number>
  playerCareerGoals: Map<string, number>
}

const buildPlayerData = unstable_cache(
  async (): Promise<PlayerData> => {
  const supabase = getClient()
  const [seasons, plTables] = await Promise.all([
    fetchAll(supabase, 'player_seasons', 'name_display,year_id,pos,teams_played_for,goals,gk_clean_sheets,games'),
    fetchAll(supabase, 'pl_season_tables', 'season,team,position,relegated'),
  ])

  const plWinners   = new Map<string, string>()
  const plRelegated = new Map<string, Set<string>>()
  for (const row of plTables) {
    if (row.position === 1) plWinners.set(row.season, row.team)
    if (row.relegated) {
      if (!plRelegated.has(row.season)) plRelegated.set(row.season, new Set())
      plRelegated.get(row.season)!.add(row.team)
    }
  }

  type YearTotal = { goals: number; cleanSheets: number; isGk: boolean }
  const yearPlayerTotals = new Map<string, YearTotal>()
  const teamSeasons       = new Map<string, Map<string, number>>()
  const playerPLWins      = new Map<string, number>()
  const playerRelegations = new Map<string, number>()
  const playerTotalApps   = new Map<string, number>()
  const playerCareerGoals = new Map<string, number>()

  for (const row of seasons) {
    const name  = row.name_display as string
    const year  = row.year_id as string
    const teams = String(row.teams_played_for || '')
      .split(',').map((t: string) => normPSTeam(t.trim())).filter((t: string) => t && t !== '2 Teams')

    const yk   = `${year}|||${name}`
    const prev = yearPlayerTotals.get(yk) ?? { goals: 0, cleanSheets: 0, isGk: false }
    yearPlayerTotals.set(yk, {
      goals:       prev.goals + (Number(row.goals) || 0),
      cleanSheets: prev.cleanSheets + (Number(row.gk_clean_sheets) || 0),
      isGk:        prev.isGk || row.pos === 'GK',
    })

    playerTotalApps.set(name, (playerTotalApps.get(name) ?? 0) + (Number(row.games) || 0))
    playerCareerGoals.set(name, (playerCareerGoals.get(name) ?? 0) + (Number(row.goals) || 0))

    if (!teamSeasons.has(name)) teamSeasons.set(name, new Map())
    for (const team of teams) {
      const cur = teamSeasons.get(name)!
      cur.set(team, (cur.get(team) ?? 0) + 1)
    }

    for (const team of teams) {
      if (plWinners.get(year) === team)          playerPLWins.set(name, (playerPLWins.get(name) ?? 0) + 1)
      if (plRelegated.get(year)?.has(team))       playerRelegations.set(name, (playerRelegations.get(name) ?? 0) + 1)
    }
  }

  // Golden Boot / Glove
  const byYear = new Map<string, Array<{ name: string } & YearTotal>>()
  for (const [key, totals] of yearPlayerTotals) {
    const [year, name] = key.split('|||')
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push({ name, ...totals })
  }

  const playerGoldenBoot  = new Map<string, number>()
  const playerGoldenGlove = new Map<string, number>()
  for (const [, players] of byYear) {
    let maxGoals = 0; for (const p of players) if (p.goals > maxGoals) maxGoals = p.goals
    if (maxGoals > 0) players.filter(p => p.goals === maxGoals).forEach(p => playerGoldenBoot.set(p.name, (playerGoldenBoot.get(p.name) ?? 0) + 1))
    let maxSheets = 0; for (const p of players) if (p.isGk && p.cleanSheets > maxSheets) maxSheets = p.cleanSheets
    if (maxSheets > 0) players.filter(p => p.isGk && p.cleanSheets === maxSheets).forEach(p => playerGoldenGlove.set(p.name, (playerGoldenGlove.get(p.name) ?? 0) + 1))
  }

  return { teamSeasons, playerPLWins, playerRelegations, playerGoldenBoot, playerGoldenGlove, playerTotalApps, playerCareerGoals }
  },
  ['grid-data'],
  { revalidate: 86400 }
)

function getEligiblePlayers(type: string, ref: string | null, data: PlayerData): Map<string, number> {
  const result = new Map<string, number>()
  if (type === 'team') {
    for (const [name, teams] of data.teamSeasons) {
      const s = teams.get(ref!) ?? 0
      if (s > 0) result.set(name, s)
    }
  } else if (type === 'won_pl') {
    for (const [name, wins] of data.playerPLWins) if (wins >= 1) result.set(name, wins)
  } else if (type === 'won_3plus_pl') {
    for (const [name, wins] of data.playerPLWins) if (wins >= 3) result.set(name, wins)
  } else if (type === 'relegated') {
    for (const [name, rel] of data.playerRelegations) if (rel >= 1) result.set(name, rel)
  } else if (type === 'golden_boot') {
    for (const [name, b] of data.playerGoldenBoot) if (b >= 1) result.set(name, b)
  } else if (type === 'golden_glove') {
    for (const [name, g] of data.playerGoldenGlove) if (g >= 1) result.set(name, g)
  } else if (type === 'scored_100_goals') {
    for (const [name, g] of data.playerCareerGoals) if (g >= 100) result.set(name, g)
  }
  return result
}

type CellAnswer = {
  player_name: string
  combined_appearances: number
  score: number
  rank: number
  popularity_score: number
  popularity_rank: number
}

function computeCell(rowP: Map<string, number>, colP: Map<string, number>, totalApps: Map<string, number>): CellAnswer[] {
  const valid: Array<{ name: string; combined: number }> = []
  for (const [name] of rowP) {
    if (colP.has(name)) valid.push({ name, combined: totalApps.get(name) ?? 0 })
  }
  if (valid.length === 0) return []

  const byRarity = [...valid].sort((a, b) => a.combined - b.combined || a.name.localeCompare(b.name))
  const byPop    = [...valid].sort((a, b) => b.combined - a.combined || a.name.localeCompare(b.name))
  const rRankMap = new Map(byRarity.map((v, i) => [v.name, i + 1]))
  const pRankMap = new Map(byPop.map((v, i) => [v.name, i + 1]))

  return valid.map(v => ({
    player_name:          v.name,
    combined_appearances: v.combined,
    rank:                 rRankMap.get(v.name)!,
    score:                Math.min(rRankMap.get(v.name)!, 20),
    popularity_rank:      pRankMap.get(v.name)!,
    popularity_score:     Math.min(pRankMap.get(v.name)!, 20),
  }))
}

// ── Puzzle generation ─────────────────────────────────────────────────────────
type PuzzleResult = {
  rows: Criterion[]
  cols: Criterion[]
  cells: Record<string, CellAnswer[]>
  answerCounts: Record<string, number>
}

function generatePuzzle(dateStr: string, data: PlayerData): PuzzleResult {
  for (let attempt = 0; attempt < 6; attempt++) {
    const seed = Number(dateStr.replace(/-/g, '')) + attempt
    const rng  = seededRng(seed)
    const pool = [...CRITERIA]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const rows = pool.slice(0, 3)
    const cols = pool.slice(3, 6)

    const cells: Record<string, CellAnswer[]> = {}
    let minAnswers = Infinity
    for (let ri = 0; ri < 3; ri++) {
      for (let ci = 0; ci < 3; ci++) {
        const rowP    = getEligiblePlayers(rows[ri].type, rows[ri].ref, data)
        const colP    = getEligiblePlayers(cols[ci].type, cols[ci].ref, data)
        const answers = computeCell(rowP, colP, data.playerTotalApps)
        cells[`${ri}_${ci}`] = answers
        if (answers.length < minAnswers) minAnswers = answers.length
      }
    }

    if (minAnswers >= 5) {
      const answerCounts = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, v.length]))
      return { rows, cols, cells, answerCounts }
    }
  }

  // Fallback: all big-6 teams (always has good intersection counts)
  const fallbackTeams = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester United', 'Manchester City', 'Tottenham Hotspur']
  const rows = fallbackTeams.slice(0, 3).map(t => CRITERIA.find(c => c.ref === t)!)
  const cols = fallbackTeams.slice(3, 6).map(t => CRITERIA.find(c => c.ref === t)!)
  const cells: Record<string, CellAnswer[]> = {}
  for (let ri = 0; ri < 3; ri++) {
    for (let ci = 0; ci < 3; ci++) {
      const rowP = getEligiblePlayers(rows[ri].type, rows[ri].ref, data)
      const colP = getEligiblePlayers(cols[ci].type, cols[ci].ref, data)
      cells[`${ri}_${ci}`] = computeCell(rowP, colP, data.playerTotalApps)
    }
  }
  const answerCounts = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, v.length]))
  return { rows, cols, cells, answerCounts }
}

export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get('date') || getTodayStr()

  try {
    const playerData = await buildPlayerData()
    const { rows, cols, cells, answerCounts } = generatePuzzle(dateStr, playerData)

    return NextResponse.json({
      date: dateStr,
      rows: rows.map(r => ({ label: r.label, tooltip: r.tooltip })),
      cols: cols.map(c => ({ label: c.label, tooltip: c.tooltip })),
      cells,
      answerCounts,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

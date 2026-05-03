import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PLAYER_SEASON_TEAM_NORM: Record<string, string> = {
  'Manchester Utd':  'Manchester United',
  'QPR':             'Queens Park Rangers',
  'Sheffield Weds':  'Sheffield Wednesday',
  'Brighton':        'Brighton & Hove Albion',
  'West Brom':       'West Bromwich Albion',
}
const normPSTeam = (t: string) => PLAYER_SEASON_TEAM_NORM[t] ?? t

type FullData = {
  teamSeasons:          Map<string, Map<string, number>>
  playerTotalApps:      Map<string, number>
  wonPlCounts:          Map<string, number>
  relegated:            Map<string, number>
  goldenBootWinners:    Set<string>
  career100GoalPlayers: Map<string, number>
}

let cachedData: FullData | null = null
let cacheTime = 0
const CACHE_TTL = 3_600_000

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function fetchAll<T>(supabase: any, table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const rows: T[] = []
  let offset = 0
  while (true) {
    let q = supabase.from(table).select(columns)
    if (filter) q = filter(q)
    const { data, error } = await q.range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

async function getData(): Promise<FullData> {
  const now = Date.now()
  if (cachedData && now - cacheTime < CACHE_TTL) return cachedData

  const supabase = getClient()

  // Core team data — only columns we know exist
  const playerRows = await fetchAll<{ name_display: string; teams_played_for: string; games: number }>(
    supabase, 'player_seasons', 'name_display,teams_played_for,games'
  )

  const teamSeasons     = new Map<string, Map<string, number>>()
  const playerTotalApps = new Map<string, number>()

  for (const row of playerRows) {
    const name  = row.name_display
    const games = Number(row.games) || 0
    playerTotalApps.set(name, (playerTotalApps.get(name) ?? 0) + games)

    const teams = String(row.teams_played_for || '')
      .split(',')
      .map(t => normPSTeam(t.trim()))
      .filter(t => t && t !== '2 Teams')

    for (const team of teams) {
      if (!teamSeasons.has(team)) teamSeasons.set(team, new Map())
      const cur = teamSeasons.get(team)!
      cur.set(name, (cur.get(name) ?? 0) + 1)
    }
  }

  // PL-winning franchises with total title counts — used to derive won_pl / won_3plus_pl
  // from teamSeasons directly, no season-level data needed
  const PL_FRANCHISE_WINS: Record<string, number> = {
    'Manchester United': 13,
    'Manchester City':    9,
    'Chelsea':            5,
    'Arsenal':            3,
    'Blackburn Rovers':   1,
    'Leicester City':     1,
    'Liverpool':          1,
  }

  const wonPlCounts          = new Map<string, number>()
  const relegatedCounts      = new Map<string, number>()
  const goldenBootWinners    = new Set<string>()
  const career100GoalPlayers = new Map<string, number>()

  // Build won_pl counts: how many distinct PL-winning franchises each player played for
  for (const [team, players] of teamSeasons) {
    if (PL_FRANCHISE_WINS[team]) {
      for (const [name] of players) {
        wonPlCounts.set(name, (wonPlCounts.get(name) ?? 0) + 1)
      }
    }
  }

  // Career goals — independent fetch, only needs name_display + goals
  try {
    const goalRows = await fetchAll<{ name_display: string; goals: number }>(
      supabase, 'player_seasons', 'name_display,goals'
    )
    const careerGoals = new Map<string, number>()
    for (const row of goalRows) {
      const g = Number(row.goals) || 0
      if (g > 0) careerGoals.set(row.name_display, (careerGoals.get(row.name_display) ?? 0) + g)
    }
    for (const [name, g] of careerGoals) {
      if (g >= 100) career100GoalPlayers.set(name, g)
    }
  } catch { /* goals column unavailable */ }

  // Season-based stats — needs teams_played_for + season + pl_season_tables
  try {
    const [seasonRows, tableRows] = await Promise.all([
      fetchAll<{ name_display: string; teams_played_for: string; goals: number; season: string }>(
        supabase, 'player_seasons', 'name_display,teams_played_for,goals,season'
      ),
      fetchAll<{ team: string; position: number; season: string }>(
        supabase, 'pl_season_tables', 'team,position,season'
      ),
    ])

    const winningKeys = new Set<string>()
    const relegKeys   = new Set<string>()
    for (const r of tableRows) {
      if (r.position === 1)  winningKeys.add(`${r.team}:${r.season}`)
      if (r.position >= 18)  relegKeys.add(`${r.team}:${r.season}`)
    }

    const topScorerPerSeason = new Map<string, { name: string; goals: number }>()

    for (const row of seasonRows) {
      const name   = row.name_display
      const goals  = Number(row.goals) || 0
      const season = row.season ?? ''

      const teams = String(row.teams_played_for || '')
        .split(',')
        .map(t => normPSTeam(t.trim()))
        .filter(t => t && t !== '2 Teams')

      for (const team of teams) {
        if (season) {
          const key = `${team}:${season}`
          if (winningKeys.has(key)) wonPlCounts.set(name,     (wonPlCounts.get(name)     ?? 0) + 1)
          if (relegKeys.has(key))   relegatedCounts.set(name, (relegatedCounts.get(name) ?? 0) + 1)
        }
      }

      if (season && goals > 0) {
        const cur = topScorerPerSeason.get(season)
        if (!cur || goals > cur.goals) topScorerPerSeason.set(season, { name, goals })
      }
    }

    for (const [, { name }] of topScorerPerSeason) goldenBootWinners.add(name)
  } catch { /* season stats unavailable */ }

  cachedData = { teamSeasons, playerTotalApps, wonPlCounts, relegated: relegatedCounts, goldenBootWinners, career100GoalPlayers }
  cacheTime = now
  return cachedData
}

type CellAnswer = {
  player_name: string
  combined_appearances: number
  score: number
  rank: number
  popularity_score: number
  popularity_rank: number
  display_rank: number
}

function computeCell(
  rowPlayers: Map<string, number>,
  colPlayers: Map<string, number>,
  playerTotalApps: Map<string, number>
): CellAnswer[] {
  const valid: Array<{ name: string; combined: number }> = []
  for (const [name] of rowPlayers) {
    if (colPlayers.has(name)) valid.push({ name, combined: playerTotalApps.get(name) ?? 0 })
  }
  if (valid.length === 0) return []

  const byRarity = [...valid].sort((a, b) => a.combined - b.combined || a.name.localeCompare(b.name))
  const rarityRank = new Map<string, number>()
  byRarity.forEach((v, i) => rarityRank.set(v.name, i + 1))

  const byPop = [...valid].sort((a, b) => b.combined - a.combined || a.name.localeCompare(b.name))
  const popRank = new Map<string, number>()
  byPop.forEach((v, i) => popRank.set(v.name, i + 1))

  return valid.map((v, i) => {
    const rRank = rarityRank.get(v.name)!
    const pRank = popRank.get(v.name)!
    return {
      player_name:          v.name,
      combined_appearances: v.combined,
      rank:                 rRank,
      score:                Math.min(rRank, 20),
      popularity_rank:      pRank,
      popularity_score:     Math.min(pRank, 20),
      display_rank:         i + 1,
    }
  })
}

function parseSlot(val: string): { type: string; ref: string } {
  const idx = val.indexOf(':')
  if (idx === -1) return { type: val, ref: '' }
  return { type: val.slice(0, idx), ref: val.slice(idx + 1) }
}

function resolveSlotMap(type: string, ref: string, data: FullData): Map<string, number> {
  switch (type) {
    case 'team':
      return data.teamSeasons.get(ref) ?? new Map()
    case 'won_pl':
      return data.wonPlCounts
    case 'won_3plus_pl':
      return new Map([...data.wonPlCounts].filter(([, n]) => n >= 3))
    case 'relegated':
      return data.relegated
    case 'golden_boot':
      return new Map([...data.goldenBootWinners].map(name => [name, 1]))
    case 'scored_100_goals':
      return data.career100GoalPlayers
    case 'golden_glove':
      return new Map()
    default:
      return new Map()
  }
}

export async function GET(req: NextRequest) {
  const sp      = req.nextUrl.searchParams
  const rawRows = [sp.get('row0') ?? '', sp.get('row1') ?? '', sp.get('row2') ?? '']
  const rawCols = [sp.get('col0') ?? '', sp.get('col1') ?? '', sp.get('col2') ?? '']

  if (rawRows.some(t => !t) || rawCols.some(t => !t)) {
    return NextResponse.json({ error: 'Missing slot params' }, { status: 400 })
  }

  const rows = rawRows.map(parseSlot)
  const cols = rawCols.map(parseSlot)
  const data = await getData()

  const cells: Record<string, CellAnswer[]> = {}
  for (let ri = 0; ri < 3; ri++) {
    for (let ci = 0; ci < 3; ci++) {
      const rowMap = resolveSlotMap(rows[ri].type, rows[ri].ref, data)
      const colMap = resolveSlotMap(cols[ci].type, cols[ci].ref, data)
      cells[`${ri}_${ci}`] = computeCell(rowMap, colMap, data.playerTotalApps)
    }
  }

  return NextResponse.json({ cells })
}

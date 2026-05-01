import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


type PlayerStats = {
  name: string
  games: number
  goals: number
  assists: number
  goals_assists: number
  pens_made: number
  pens_missed: number
  cards_yellow: number
  cards_red: number
  clubs: Set<string>
  maxGoalsInSeason: number
  maxAssistsInSeason: number
  maxGoalsAssistsInSeason: number
  titlesWon: number
  top4Finishes: number
  relegations: number
}

const ACHIEVEMENTS: { id: string; name: string; check: (p: PlayerStats) => boolean }[] = [
  { id: 'goals_100',         name: '100+ Career PL Goals',               check: p => p.goals >= 100 },
  { id: 'assists_50',        name: '50+ Career PL Assists',              check: p => p.assists >= 50 },
  { id: 'ga_150',            name: '150+ Career Goal Contributions',     check: p => p.goals_assists >= 150 },
  { id: 'goals_season_20',   name: '20+ Goals in a Season',              check: p => p.maxGoalsInSeason >= 20 },
  { id: 'assists_season_10', name: '10+ Assists in a Season',            check: p => p.maxAssistsInSeason >= 10 },
  { id: 'ga_season_25',      name: '25+ Goal Contributions in a Season', check: p => p.maxGoalsAssistsInSeason >= 25 },
  { id: 'title_3',           name: 'Won 3+ PL Titles',                   check: p => p.titlesWon >= 3 },
  { id: 'never_title',       name: 'Never Won the PL',                   check: p => p.titlesWon === 0 },
  { id: 'relegated_1',       name: 'Been Relegated',                     check: p => p.relegations >= 1 },
  { id: 'yellows_50',        name: '50+ Career Yellow Cards',            check: p => p.cards_yellow >= 50 },
  { id: 'reds_4',            name: '4+ Career Red Cards',                check: p => p.cards_red >= 4 },
  { id: 'clubs_4',           name: 'Played for 4+ PL Clubs',             check: p => p.clubs.size >= 4 },
  { id: 'pens_missed_3',     name: 'Missed 3+ Penalties',                check: p => p.pens_missed >= 3 },
  { id: 'pens_scored_10',    name: 'Scored 10+ Penalties',               check: p => p.pens_made >= 10 },
  { id: 'apps_400',          name: '400+ PL Appearances',                check: p => p.games >= 400 },
  { id: 'never_sent_off',    name: 'Never Sent Off (100+ apps)',          check: p => p.cards_red === 0 && p.games >= 100 },
]

async function fetchAll(columns: string) {
  let all: any[] = []
  let offset = 0
  while (true) {
    const { data } = await getClient()
      .from('player_seasons')
      .select(columns)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

async function fetchPlTables(): Promise<Map<string, { position: number; relegated: boolean }>> {
  const { data } = await getClient()
    .from('pl_season_tables')
    .select('season,team,position,relegated')
  const map = new Map<string, { position: number; relegated: boolean }>()
  for (const row of data ?? []) {
    map.set(`${row.season}|||${row.team}`, { position: row.position, relegated: row.relegated })
  }
  return map
}

export async function GET() {
  const [rows, plTables] = await Promise.all([
    fetchAll('name_display,games,goals,assists,goals_assists,pens_made,pens_missed,cards_yellow,cards_red,teams_played_for,year_id'),
    fetchPlTables(),
  ])

  const statsMap = new Map<string, PlayerStats>()
  for (const row of rows) {
    const name: string = row.name_display
    if (!statsMap.has(name)) {
      statsMap.set(name, {
        name,
        games: 0, goals: 0, assists: 0, goals_assists: 0,
        pens_made: 0, pens_missed: 0, cards_yellow: 0, cards_red: 0,
        clubs: new Set(),
        maxGoalsInSeason: 0, maxAssistsInSeason: 0, maxGoalsAssistsInSeason: 0,
        titlesWon: 0, top4Finishes: 0, relegations: 0,
      })
    }
    const p = statsMap.get(name)!
    p.games           += row.games ?? 0
    p.goals           += row.goals ?? 0
    p.assists         += row.assists ?? 0
    p.goals_assists   += row.goals_assists ?? 0
    p.pens_made       += row.pens_made ?? 0
    p.pens_missed     += row.pens_missed ?? 0
    p.cards_yellow    += row.cards_yellow ?? 0
    p.cards_red       += row.cards_red ?? 0

    const teams = String(row.teams_played_for ?? '')
      .split(',').map((t: string) => t.trim()).filter((t: string) => t && t !== '2 Teams')

    for (const club of teams) {
      p.clubs.add(club)
    }

    p.maxGoalsInSeason        = Math.max(p.maxGoalsInSeason, row.goals ?? 0)
    p.maxAssistsInSeason      = Math.max(p.maxAssistsInSeason, row.assists ?? 0)
    p.maxGoalsAssistsInSeason = Math.max(p.maxGoalsAssistsInSeason, row.goals_assists ?? 0)

    // League finish stats — credit the player for each team they played for that season
    if (row.year_id && teams.length > 0) {
      let wonTitle = false, top4 = false, relegated = false
      for (const club of teams) {
        const entry = plTables.get(`${row.year_id}|||${club}`)
        if (!entry) continue
        if (entry.position === 1) wonTitle = true
        if (entry.position <= 4) top4 = true
        if (entry.relegated) relegated = true
      }
      if (wonTitle) p.titlesWon++
      if (top4) p.top4Finishes++
      if (relegated) p.relegations++
    }
  }

  const outfield = [...statsMap.values()].filter(p => p.goals > 0 || p.assists > 0)

  const top = (arr: PlayerStats[], key: keyof PlayerStats, n: number) =>
    [...arr].sort((a, b) => (b[key] as number) - (a[key] as number)).slice(0, n)

  const buckets = [
    top(outfield, 'games',         50),  // top 50 appearances
    top(outfield, 'goals',         50),  // top 50 goalscorers
    top(outfield, 'assists',       50),  // top 50 assisters
    outfield.filter(p => p.cards_red > 3),   // all with 4+ red cards
    top(outfield, 'cards_yellow',  30),  // top 30 yellow cards
    outfield.filter(p => p.titlesWon >= 3),  // all with 3+ titles
  ]

  const poolMap = new Map<string, PlayerStats>()
  for (const bucket of buckets) {
    for (const p of bucket) poolMap.set(p.name, p)
  }
  const topPlayers = [...poolMap.values()]

  const playerAchievements: Record<string, string[]> = {}
  for (const player of topPlayers) {
    const qualifying = ACHIEVEMENTS.filter(a => a.check(player)).map(a => a.id)
    if (qualifying.length > 0) playerAchievements[player.name] = qualifying
  }

  const achievements = ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name }))
  const players = topPlayers
    .filter(p => playerAchievements[p.name]?.length > 0)
    .map(p => ({ id: p.name, name: p.name }))

  return NextResponse.json({ achievements, players, playerAchievements }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' }
  })
}

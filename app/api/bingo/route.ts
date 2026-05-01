import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const PLAYER_LIMIT = 100

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
  // Career goals
  { id: 'goals_150',         name: '150+ Career PL Goals',               check: p => p.goals >= 150 },
  { id: 'goals_100',         name: '100+ Career PL Goals',               check: p => p.goals >= 100 },
  { id: 'goals_75',          name: '75+ Career PL Goals',                check: p => p.goals >= 75 },
  { id: 'goals_50',          name: '50+ Career PL Goals',                check: p => p.goals >= 50 },
  { id: 'goals_25',          name: '25+ Career PL Goals',                check: p => p.goals >= 25 },
  // Goals in a season
  { id: 'goals_season_25',   name: '25+ Goals in a Season',              check: p => p.maxGoalsInSeason >= 25 },
  { id: 'goals_season_20',   name: '20+ Goals in a Season',              check: p => p.maxGoalsInSeason >= 20 },
  { id: 'goals_season_15',   name: '15+ Goals in a Season',              check: p => p.maxGoalsInSeason >= 15 },
  { id: 'goals_season_10',   name: '10+ Goals in a Season',              check: p => p.maxGoalsInSeason >= 10 },
  // Career assists
  { id: 'assists_75',        name: '75+ Career PL Assists',              check: p => p.assists >= 75 },
  { id: 'assists_50',        name: '50+ Career PL Assists',              check: p => p.assists >= 50 },
  { id: 'assists_25',        name: '25+ Career PL Assists',              check: p => p.assists >= 25 },
  // Assists in a season
  { id: 'assists_season_15', name: '15+ Assists in a Season',            check: p => p.maxAssistsInSeason >= 15 },
  { id: 'assists_season_10', name: '10+ Assists in a Season',            check: p => p.maxAssistsInSeason >= 10 },
  // Career goal contributions
  { id: 'ga_150',            name: '150+ Career Goal Contributions',     check: p => p.goals_assists >= 150 },
  { id: 'ga_100',            name: '100+ Career Goal Contributions',     check: p => p.goals_assists >= 100 },
  { id: 'ga_50',             name: '50+ Career Goal Contributions',      check: p => p.goals_assists >= 50 },
  // Goal contributions in a season
  { id: 'ga_season_25',      name: '25+ Goal Contributions in a Season', check: p => p.maxGoalsAssistsInSeason >= 25 },
  { id: 'ga_season_20',      name: '20+ Goal Contributions in a Season', check: p => p.maxGoalsAssistsInSeason >= 20 },
  { id: 'ga_season_15',      name: '15+ Goal Contributions in a Season', check: p => p.maxGoalsAssistsInSeason >= 15 },
  // Appearances
  { id: 'apps_400',          name: '400+ PL Appearances',                check: p => p.games >= 400 },
  { id: 'apps_300',          name: '300+ PL Appearances',                check: p => p.games >= 300 },
  { id: 'apps_200',          name: '200+ PL Appearances',                check: p => p.games >= 200 },
  { id: 'apps_100',          name: '100+ PL Appearances',                check: p => p.games >= 100 },
  // Clubs
  { id: 'clubs_5',           name: 'Played for 5+ PL Clubs',             check: p => p.clubs.size >= 5 },
  { id: 'clubs_4',           name: 'Played for 4+ PL Clubs',             check: p => p.clubs.size >= 4 },
  { id: 'clubs_3',           name: 'Played for 3+ PL Clubs',             check: p => p.clubs.size >= 3 },
  { id: 'clubs_2',           name: 'Played for 2+ PL Clubs',             check: p => p.clubs.size >= 2 },
  // Penalties
  { id: 'pens_scored_15',    name: 'Scored 15+ Penalties',               check: p => p.pens_made >= 15 },
  { id: 'pens_scored_10',    name: 'Scored 10+ Penalties',               check: p => p.pens_made >= 10 },
  { id: 'pens_scored_5',     name: 'Scored 5+ Penalties',                check: p => p.pens_made >= 5 },
  { id: 'pens_scored_3',     name: 'Scored 3+ Penalties',                check: p => p.pens_made >= 3 },
  { id: 'pens_missed_3',     name: 'Missed 3+ Penalties',                check: p => p.pens_missed >= 3 },
  { id: 'pens_missed_1',     name: 'Missed a Penalty',                   check: p => p.pens_missed >= 1 },
  // Yellow cards
  { id: 'yellows_75',        name: '75+ Career Yellow Cards',            check: p => p.cards_yellow >= 75 },
  { id: 'yellows_50',        name: '50+ Career Yellow Cards',            check: p => p.cards_yellow >= 50 },
  { id: 'yellows_25',        name: '25+ Career Yellow Cards',            check: p => p.cards_yellow >= 25 },
  // Red cards
  { id: 'never_sent_off',    name: 'Never Sent Off (100+ apps)',          check: p => p.cards_red === 0 && p.games >= 100 },
  { id: 'reds_3',            name: '3+ Career Red Cards',                check: p => p.cards_red >= 3 },
  { id: 'reds_1',            name: 'Received a Red Card',                check: p => p.cards_red >= 1 },
  // Titles
  { id: 'title_1',           name: 'Won a PL Title',                     check: p => p.titlesWon >= 1 },
  { id: 'title_3',           name: 'Won 3+ PL Titles',                   check: p => p.titlesWon >= 3 },
  { id: 'title_5',           name: 'Won 5+ PL Titles',                   check: p => p.titlesWon >= 5 },
  { id: 'never_title',       name: 'Never Won the PL',                   check: p => p.titlesWon === 0 },
  // Relegation
  { id: 'relegated_1',       name: 'Been Relegated',                     check: p => p.relegations >= 1 },
  { id: 'relegated_2',       name: 'Relegated 2+ Times',                 check: p => p.relegations >= 2 },
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

  const topPlayers = [...statsMap.values()]
    .filter(p => p.goals > 0 || p.assists > 0)
    .sort((a, b) => {
      const scoreA = a.games + (a.goals * 4) + (a.assists * 3)
      const scoreB = b.games + (b.goals * 4) + (b.assists * 3)
      return scoreB - scoreA
    })
    .slice(0, PLAYER_LIMIT)

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

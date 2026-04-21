import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// How many top players (by career appearances) to include in the pool
const PLAYER_LIMIT = 100

type PlayerStats = {
  name: string
  games: number
  goals: number
  assists: number
  goals_assists: number
  pens_made: number
  pens_missed: number
  pens_won: number
  cards_yellow: number
  cards_red: number
  tackles_won: number
  interceptions: number
  own_goals: number
  gk_clean_sheets: number
  clubs: Set<string>
  maxGoalsInSeason: number
  maxAssistsInSeason: number
  maxGoalsAssistsInSeason: number
}

const ACHIEVEMENTS: { id: string; name: string; check: (p: PlayerStats) => boolean }[] = [
  { id: 'goals_100',         name: '100+ Career PL Goals',          check: p => p.goals >= 100 },
  { id: 'goals_50',          name: '50+ Career PL Goals',           check: p => p.goals >= 50 },
  { id: 'goals_season_20',   name: '20+ Goals in a Season',         check: p => p.maxGoalsInSeason >= 20 },
  { id: 'assists_50',        name: '50+ Career PL Assists',         check: p => p.assists >= 50 },
  { id: 'assists_season_15', name: '15+ Assists in a Season',       check: p => p.maxAssistsInSeason >= 15 },
  { id: 'ga_150',            name: '150+ Career Goal Contributions', check: p => p.goals_assists >= 150 },
  { id: 'ga_season_25',      name: '25+ Goal Contributions in a Season', check: p => p.maxGoalsAssistsInSeason >= 25 },
  { id: 'apps_300',          name: '300+ PL Appearances',           check: p => p.games >= 300 },
  { id: 'apps_200',          name: '200+ PL Appearances',           check: p => p.games >= 200 },
  { id: 'clubs_4',           name: 'Played for 4+ PL Clubs',        check: p => p.clubs.size >= 4 },
  { id: 'clubs_3',           name: 'Played for 3+ PL Clubs',        check: p => p.clubs.size >= 3 },
  { id: 'never_sent_off',    name: 'Never Sent Off (100+ apps)',     check: p => p.cards_red === 0 && p.games >= 100 },
  { id: 'reds_3',            name: '3+ Career Red Cards',           check: p => p.cards_red >= 3 },
  { id: 'yellows_50',        name: '50+ Career Yellow Cards',       check: p => p.cards_yellow >= 50 },
  { id: 'pens_missed_3',     name: 'Missed 3+ Penalties',           check: p => p.pens_missed >= 3 },
  { id: 'pens_scored_10',    name: 'Scored 10+ Penalties',          check: p => p.pens_made >= 10 },
  { id: 'pens_won_5',        name: 'Won 5+ Penalties',              check: p => p.pens_won >= 5 },
  { id: 'tackles_100',       name: '100+ Career Tackles Won',       check: p => p.tackles_won >= 100 },
  { id: 'interceptions_100', name: '100+ Career Interceptions',     check: p => p.interceptions >= 100 },
  { id: 'clean_sheets_50',   name: '50+ PL Clean Sheets',           check: p => p.gk_clean_sheets >= 50 },
  { id: 'own_goal',          name: 'Scored an Own Goal',            check: p => p.own_goals >= 1 },
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

export async function GET() {
  const rows = await fetchAll(
    'name_display,games,goals,assists,goals_assists,pens_made,pens_missed,pens_won,cards_yellow,cards_red,tackles_won,interceptions,own_goals,gk_clean_sheets,teams_played_for'
  )

  // Aggregate per player
  const statsMap = new Map<string, PlayerStats>()
  for (const row of rows) {
    const name: string = row.name_display
    if (!statsMap.has(name)) {
      statsMap.set(name, {
        name,
        games: 0, goals: 0, assists: 0, goals_assists: 0,
        pens_made: 0, pens_missed: 0, pens_won: 0,
        cards_yellow: 0, cards_red: 0,
        tackles_won: 0, interceptions: 0,
        own_goals: 0, gk_clean_sheets: 0,
        clubs: new Set(),
        maxGoalsInSeason: 0,
        maxAssistsInSeason: 0,
        maxGoalsAssistsInSeason: 0,
      })
    }
    const p = statsMap.get(name)!
    p.games         += row.games ?? 0
    p.goals         += row.goals ?? 0
    p.assists       += row.assists ?? 0
    p.goals_assists += row.goals_assists ?? 0
    p.pens_made     += row.pens_made ?? 0
    p.pens_missed   += row.pens_missed ?? 0
    p.pens_won      += row.pens_won ?? 0
    p.cards_yellow  += row.cards_yellow ?? 0
    p.cards_red     += row.cards_red ?? 0
    p.tackles_won   += row.tackles_won ?? 0
    p.interceptions += row.interceptions ?? 0
    p.own_goals     += row.own_goals ?? 0
    p.gk_clean_sheets += row.gk_clean_sheets ?? 0

    if (row.teams_played_for) {
      for (const club of String(row.teams_played_for).split(',')) {
        const trimmed = club.trim()
        if (trimmed) p.clubs.add(trimmed)
      }
    }

    p.maxGoalsInSeason        = Math.max(p.maxGoalsInSeason, row.goals ?? 0)
    p.maxAssistsInSeason      = Math.max(p.maxAssistsInSeason, row.assists ?? 0)
    p.maxGoalsAssistsInSeason = Math.max(p.maxGoalsAssistsInSeason, row.goals_assists ?? 0)
  }

  // Select top N players by career appearances
  const topPlayers = [...statsMap.values()]
    .sort((a, b) => b.games - a.games)
    .slice(0, PLAYER_LIMIT)

  // Build playerAchievements map
  const playerAchievements: Record<string, string[]> = {}
  for (const player of topPlayers) {
    const qualifying = ACHIEVEMENTS.filter(a => a.check(player)).map(a => a.id)
    if (qualifying.length > 0) {
      playerAchievements[player.name] = qualifying
    }
  }

  const achievements = ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name }))
  const players = topPlayers
    .filter(p => playerAchievements[p.name]?.length > 0)
    .map(p => ({ id: p.name, name: p.name }))

  return NextResponse.json({ achievements, players, playerAchievements }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' }
  })
}

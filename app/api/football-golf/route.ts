import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TEAM_NORM: Record<string, string> = {
  'Manchester Utd':  'Manchester United',
  'QPR':             'Queens Park Rangers',
  'Sheffield Weds':  'Sheffield Wednesday',
  'Brighton':        'Brighton & Hove Albion',
  'West Brom':       'West Bromwich Albion',
}
const normTeam = (t: string) => TEAM_NORM[t] ?? t

function fmtNat(raw: string): string {
  const parts = raw.trim().split(/\s+/)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^[A-Z]{2,4}$/.test(parts[i])) return parts[i]
  }
  return raw
}

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type PlayerData = {
  goals: number
  assists: number
  games: number
  yellow_cards: number
  clean_sheets: number
  nationality: string
  clubGoals: Record<string, number>
  clubAssists: Record<string, number>
  clubGames: Record<string, number>
  clubYellowCards: Record<string, number>
  clubCleanSheets: Record<string, number>
}

const buildCache = unstable_cache(
  async () => {
    const columns = 'name_display,games,goals,assists,gk_clean_sheets,cards_yellow,nationality,teams_played_for'
    const all: any[] = []
    let offset = 0
    while (true) {
      const { data } = await getClient()
        .from('player_seasons')
        .select(columns)
        .range(offset, offset + 999)
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < 1000) break
      offset += 1000
    }

    const players: Record<string, PlayerData> = {}
    const natFreq: Record<string, Record<string, number>> = {}

    for (const row of all) {
      const name = row.name_display as string
      if (!players[name]) {
        players[name] = {
          goals: 0, assists: 0, games: 0, yellow_cards: 0, clean_sheets: 0, nationality: '',
          clubGoals: {}, clubAssists: {}, clubGames: {}, clubYellowCards: {}, clubCleanSheets: {},
        }
        natFreq[name] = {}
      }
      const p = players[name]
      const g = Number(row.games) || 0
      p.goals        += Number(row.goals)           || 0
      p.assists      += Number(row.assists)         || 0
      p.games        += g
      p.yellow_cards += Number(row.cards_yellow)    || 0
      p.clean_sheets += Number(row.gk_clean_sheets) || 0

      if (row.nationality) {
        const nat = fmtNat(row.nationality as string)
        natFreq[name][nat] = (natFreq[name][nat] || 0) + 1
      }

      const teams = String(row.teams_played_for || '')
        .split(',').map((t: string) => normTeam(t.trim())).filter((t: string) => t && t !== '2 Teams')
      if (teams.length === 1) {
        const team = teams[0]
        p.clubGoals[team]       = (p.clubGoals[team]       || 0) + (Number(row.goals)           || 0)
        p.clubAssists[team]     = (p.clubAssists[team]     || 0) + (Number(row.assists)         || 0)
        p.clubGames[team]       = (p.clubGames[team]       || 0) + g
        p.clubYellowCards[team] = (p.clubYellowCards[team] || 0) + (Number(row.cards_yellow)    || 0)
        p.clubCleanSheets[team] = (p.clubCleanSheets[team] || 0) + (Number(row.gk_clean_sheets) || 0)
      }
    }

    for (const [name, freq] of Object.entries(natFreq)) {
      players[name].nationality = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    }

    const playerNames = Object.keys(players).sort()
    return { players, playerNames }
  },
  ['football-golf-data'],
  { revalidate: 86400 }
)

const buildSeasonCache = unstable_cache(
  async (season: string) => {
    const { data } = await getClient()
      .from('player_seasons')
      .select('name_display,goals,assists,cards_yellow')
      .eq('year_id', season)
    const players: Record<string, { goals: number; assists: number; yellow_cards: number }> = {}
    for (const row of (data || [])) {
      const name = row.name_display as string
      if (!players[name]) players[name] = { goals: 0, assists: 0, yellow_cards: 0 }
      players[name].goals        += Number(row.goals)       || 0
      players[name].assists      += Number(row.assists)     || 0
      players[name].yellow_cards += Number(row.cards_yellow) || 0
    }
    return { players }
  },
  ['golf-season'],
  { revalidate: 86400 }
)

// GET ?names=1   → player names only (small, fast — used for autocomplete)
// GET ?data=1    → full stats for all players (used for shot calculation)
// GET ?season=X  → per-player goals/assists/yellow_cards for one season (bad lie questions)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  try {
    const season = searchParams.get('season')
    if (season) {
      return NextResponse.json(await buildSeasonCache(season))
    }
    const { playerNames, players } = await buildCache()
    if (searchParams.get('names') === '1') {
      return NextResponse.json({ playerNames })
    }
    if (searchParams.get('data') === '1') {
      return NextResponse.json({ players })
    }
    const q = (searchParams.get('q') || '').toLowerCase().trim()
    if (!q || q.length < 2) return NextResponse.json({ players: [] })
    const matches = playerNames.filter(n => n.toLowerCase().includes(q)).slice(0, 10)
    return NextResponse.json({ players: matches })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST { players, category, clubFilter?, natFilter? } → { total, breakdown }
export async function POST(req: Request) {
  try {
    const { players: playerNames, category, clubFilter, natFilter } = await req.json()
    const { players } = await buildCache()

    const breakdown: { name: string; value: number }[] = []
    let total = 0

    for (const name of (playerNames as string[])) {
      const p = players[name]
      if (!p) { breakdown.push({ name, value: 0 }); continue }
      if (natFilter && p.nationality !== natFilter) { breakdown.push({ name, value: 0 }); continue }

      let value = 0
      if (clubFilter) {
        if      (category === 'goals')        value = p.clubGoals[clubFilter]       || 0
        else if (category === 'assists')      value = p.clubAssists[clubFilter]     || 0
        else if (category === 'appearances')  value = p.clubGames[clubFilter]       || 0
        else if (category === 'yellow_cards') value = p.clubYellowCards[clubFilter] || 0
        else if (category === 'clean_sheets') value = p.clubCleanSheets[clubFilter] || 0
      } else {
        if      (category === 'goals')        value = p.goals
        else if (category === 'assists')      value = p.assists
        else if (category === 'appearances')  value = p.games
        else if (category === 'yellow_cards') value = p.yellow_cards
        else if (category === 'clean_sheets') value = p.clean_sheets
      }

      breakdown.push({ name, value })
      total += value
    }

    return NextResponse.json({ total, breakdown })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

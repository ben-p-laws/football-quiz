import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MIN_CLUB_SEASONS = 5

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function fetchAll() {
  const cols = 'name_display,games,goals,assists,cards_red,gk_clean_sheets,teams_played_for,year_id'
  let all: any[] = []
  let offset = 0
  while (true) {
    const { data } = await getClient()
      .from('player_seasons')
      .select(cols)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

type Totals = { name: string; games: number; goals: number; assists: number; cards_red: number; clean_sheets: number }

function aggregate(rows: any[]): Record<string, Totals> {
  const map: Record<string, Totals> = {}
  for (const row of rows) {
    const name = row.name_display as string
    if (!map[name]) map[name] = { name, games: 0, goals: 0, assists: 0, cards_red: 0, clean_sheets: 0 }
    map[name].games        += (row.games           as number) || 0
    map[name].goals        += (row.goals           as number) || 0
    map[name].assists      += (row.assists         as number) || 0
    map[name].cards_red    += (row.cards_red       as number) || 0
    map[name].clean_sheets += (row.gk_clean_sheets as number) || 0
  }
  return map
}

function getRange(vals: number[]): { min: number; max: number } {
  const sorted = [...vals].sort((a, b) => a - b)
  const p10 = sorted[Math.floor(sorted.length * 0.1)]
  const p90 = sorted[Math.floor(sorted.length * 0.9)]
  return { min: p10, max: p90 }
}

function buildClubList(rows: any[]): string[] {
  const clubSeasons: Record<string, Set<string>> = {}
  for (const row of rows) {
    const yearId = row.year_id as string
    const teams = String(row.teams_played_for || '').split(',').map((t: string) => t.trim()).filter(Boolean)
    for (const team of teams) {
      if (!clubSeasons[team]) clubSeasons[team] = new Set()
      clubSeasons[team].add(yearId)
    }
  }
  return Object.entries(clubSeasons)
    .filter(([name, seasons]) => seasons.size >= MIN_CLUB_SEASONS && name !== '2 Teams')
    .map(([name]) => name)
    .sort()
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const club = searchParams.get('club') || undefined

    const rows = await fetchAll()

    // Assign each unique player name a stable numeric ID
    const nameToId = new Map<string, number>()
    for (const row of rows) {
      const name = row.name_display as string
      if (!nameToId.has(name)) nameToId.set(name, nameToId.size + 1)
    }

    const career = aggregate(rows)

    // Club-specific aggregation: seasons where teams_played_for exactly contains the club
    const clubTotals: Record<string, Totals> = club
      ? aggregate(
          rows.filter(r =>
            String(r.teams_played_for || '')
              .split(',')
              .map((t: string) => t.trim())
              .some(t => t.toLowerCase() === club.toLowerCase())
          )
        )
      : {}

    type CategoryOut = {
      id: string; label: string; unit: string; weight: number; floor: number
      range: { min: number; max: number }
      playerMap: Record<number, { name: string; value: number }>
    }
    const categories: CategoryOut[] = []

    function addCat(
      id: string, label: string, unit: string,
      totalsMap: Record<string, Totals>, key: keyof Totals,
      floor: number, weight: number
    ) {
      const eligible = Object.values(totalsMap).filter(p => (p[key] as number) > 0)
      if (eligible.length < 10) return
      const vals = eligible.map(p => p[key] as number)
      const range = getRange(vals)
      if (range.min >= range.max) return
      const playerMap: Record<number, { name: string; value: number }> = {}
      for (const p of eligible) {
        playerMap[nameToId.get(p.name)!] = { name: p.name, value: p[key] as number }
      }
      categories.push({ id, label, unit, weight, floor, range, playerMap })
    }

    // Career categories
    addCat('career_goals',        'Career PL Goals',        'goals',       career, 'goals',        5,  1)
    addCat('career_assists',      'Career PL Assists',       'assists',     career, 'assists',      3,  1)
    addCat('career_appearances',  'Career PL Apps',          'apps',        career, 'games',        10, 1)
    addCat('career_clean_sheets', 'Career Clean Sheets',     'clean sheets',career, 'clean_sheets', 3,  1)
    addCat('career_red_cards',    'Career Red Cards',        'red cards',   career, 'cards_red',    1,  0.5)

    // Club-specific categories
    if (club) {
      addCat('club_goals',        `Goals for ${club}`,        'goals',       clubTotals, 'goals',        3, 1)
      addCat('club_assists',      `Assists for ${club}`,      'assists',     clubTotals, 'assists',      2, 1)
      addCat('club_appearances',  `Apps for ${club}`,         'apps',        clubTotals, 'games',        5, 1)
      addCat('club_clean_sheets', `Clean Sheets for ${club}`, 'clean sheets',clubTotals, 'clean_sheets', 2, 1)
    }

    // Union of all players across all categories
    const allEntities = new Map<number, string>()
    for (const cat of categories) {
      for (const [pid, d] of Object.entries(cat.playerMap)) {
        allEntities.set(Number(pid), d.name)
      }
    }

    const clubs = !club ? buildClubList(rows) : []

    return NextResponse.json(
      {
        categories,
        allPlayers: Array.from(allEntities.entries()).map(([pid, name]) => ({ pid, name })),
        clubs,
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } }
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

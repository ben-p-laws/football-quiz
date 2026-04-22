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

type PMEntry = { playerMap: Record<number, { name: string; value: number }>; range: { min: number; max: number } }

function buildPM(
  totals: Record<string, Totals>,
  key: keyof Omit<Totals, 'name'>,
  nameToId: Map<string, number>,
  minVal: number,
  useP90Max = false
): PMEntry | null {
  const eligible = Object.values(totals).filter(p => (p[key] as number) > 0)
  if (eligible.length < 5) return null
  const vals = eligible.map(p => p[key] as number).sort((a, b) => a - b)
  const max = useP90Max
    ? vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.9))]
    : vals[vals.length - 1]
  if (max <= minVal) return null
  const playerMap: Record<number, { name: string; value: number }> = {}
  for (const p of eligible) playerMap[nameToId.get(p.name)!] = { name: p.name, value: p[key] as number }
  return { playerMap, range: { min: minVal, max } }
}

// Single pass: group rows by club AND collect season counts
function groupByClub(rows: any[]) {
  const seasons: Record<string, Set<string>> = {}
  const rowsByClub: Record<string, any[]> = {}
  for (const row of rows) {
    const yearId = row.year_id as string
    const teams = String(row.teams_played_for || '').split(',').map((t: string) => t.trim()).filter(Boolean)
    for (const team of teams) {
      if (!seasons[team]) { seasons[team] = new Set(); rowsByClub[team] = [] }
      seasons[team].add(yearId)
      rowsByClub[team].push(row)
    }
  }
  const clubs = Object.entries(seasons)
    .filter(([name, s]) => s.size >= MIN_CLUB_SEASONS && name !== '2 Teams')
    .map(([name]) => name)
    .sort()
  return { clubs, rowsByClub }
}

export type ClubStatKey = 'goals' | 'assists' | 'games' | 'clean_sheets'
export type ClubData = Record<string, Partial<Record<ClubStatKey, PMEntry>>>

type Category = {
  id: string; label: string; unit: string; weight: number; floor: number
  range: { min: number; max: number }
  playerMap: Record<number, { name: string; value: number }>
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const club = searchParams.get('club') || undefined

    const rows = await fetchAll()

    const nameToId = new Map<string, number>()
    for (const row of rows) {
      const name = row.name_display as string
      if (!nameToId.has(name)) nameToId.set(name, nameToId.size + 1)
    }

    const allEntities = new Map<number, string>()
    function track(pm: Record<number, { name: string; value: number }>) {
      for (const [pid, d] of Object.entries(pm)) allEntities.set(Number(pid), d.name)
    }

    if (club) {
      // Club-selected mode: only stats for this club
      const { rowsByClub } = groupByClub(rows)
      const clubRows = rowsByClub[club] ?? []
      const t = aggregate(clubRows)

      const categories: Category[] = []
      const defs: [string, string, string, keyof Omit<Totals,'name'>, number, number][] = [
        ['club_goals',        `Goals for ${club}`,        'goals',        'goals',        1, 1],
        ['club_assists',      `Assists for ${club}`,      'assists',      'assists',      1, 1],
        ['club_appearances',  `Apps for ${club}`,         'apps',         'games',        5, 1],
        ['club_clean_sheets', `Clean Sheets for ${club}`, 'clean sheets', 'clean_sheets', 1, 1],
      ]
      for (const [id, label, unit, key, minVal, weight] of defs) {
        const pm = buildPM(t, key, nameToId, minVal, true)
        if (pm) { categories.push({ id, label, unit, weight, floor: minVal, ...pm }); track(pm.playerMap) }
      }

      return NextResponse.json(
        { categories, clubData: {}, allPlayers: Array.from(allEntities.entries()).map(([pid, name]) => ({ pid, name })), clubs: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // All-clubs mode: career categories + per-club data
    const career = aggregate(rows)

    const careerDefs: [string, string, string, keyof Omit<Totals,'name'>, number, number][] = [
      ['career_goals',        'Career PL Goals',    'goals',        'goals',        5,  1  ],
      ['career_assists',      'Career PL Assists',  'assists',      'assists',      3,  1  ],
      ['career_appearances',  'Career PL Apps',     'apps',         'games',        10, 1  ],
      ['career_clean_sheets', 'Career Clean Sheets','clean sheets', 'clean_sheets', 5,  1  ],
      ['career_red_cards',    'Career Red Cards',   'red cards',    'cards_red',    1,  0.5],
    ]
    const categories: Category[] = []
    for (const [id, label, unit, key, minVal, weight] of careerDefs) {
      const pm = buildPM(career, key, nameToId, minVal)
      if (pm) { categories.push({ id, label, unit, weight, floor: minVal, ...pm }); track(pm.playerMap) }
    }

    // Per-club data for random club rounds
    const { clubs, rowsByClub } = groupByClub(rows)
    const clubStatDefs: [ClubStatKey, keyof Omit<Totals,'name'>, number][] = [
      ['goals',        'goals',        1],
      ['assists',      'assists',      1],
      ['games',        'games',        5],
      ['clean_sheets', 'clean_sheets', 1],
    ]
    const clubData: ClubData = {}
    for (const c of clubs) {
      const t = aggregate(rowsByClub[c] ?? [])
      const entry: Partial<Record<ClubStatKey, PMEntry>> = {}
      for (const [statKey, totalsKey, minVal] of clubStatDefs) {
        const pm = buildPM(t, totalsKey, nameToId, minVal, true)
        if (pm) { entry[statKey] = pm; track(pm.playerMap) }
      }
      if (Object.keys(entry).length > 0) clubData[c] = entry
    }

    return NextResponse.json(
      {
        categories,
        clubData,
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

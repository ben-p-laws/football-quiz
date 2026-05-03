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

type TeamData = {
  teamSeasons:    Map<string, Map<string, number>>
  playerTotalApps: Map<string, number>
}
// Module-level cache
let cachedData: TeamData | null = null
let cacheTime = 0
const CACHE_TTL = 3_600_000 // 1 hour

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getTeamData(): Promise<TeamData> {
  const now = Date.now()
  if (cachedData && now - cacheTime < CACHE_TTL) return cachedData

  const supabase = getClient()
  let all: Array<{ name_display: string; teams_played_for: string; games: number }> = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('player_seasons')
      .select('name_display,teams_played_for,games')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }

  const teamSeasons    = new Map<string, Map<string, number>>()
  const playerTotalApps = new Map<string, number>()

  for (const row of all) {
    const name = row.name_display
    playerTotalApps.set(name, (playerTotalApps.get(name) ?? 0) + (Number(row.games) || 0))
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

  cachedData = { teamSeasons, playerTotalApps }
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

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const rows = [sp.get('row0') ?? '', sp.get('row1') ?? '', sp.get('row2') ?? '']
  const cols = [sp.get('col0') ?? '', sp.get('col1') ?? '', sp.get('col2') ?? '']

  if (rows.some(t => !t) || cols.some(t => !t)) {
    return NextResponse.json({ error: 'Missing team params' }, { status: 400 })
  }

  const { teamSeasons, playerTotalApps } = await getTeamData()

  const cells: Record<string, CellAnswer[]> = {}
  for (let ri = 0; ri < 3; ri++) {
    for (let ci = 0; ci < 3; ci++) {
      const rowPlayers = teamSeasons.get(rows[ri]) ?? new Map()
      const colPlayers = teamSeasons.get(cols[ci]) ?? new Map()
      cells[`${ri}_${ci}`] = computeCell(rowPlayers, colPlayers, playerTotalApps)
    }
  }

  return NextResponse.json({ cells })
}

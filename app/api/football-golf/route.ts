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

const CONTINENT_MAP: Record<string, string> = {
  // Africa
  ALG:'Africa',ANG:'Africa',BEN:'Africa',BOT:'Africa',BDI:'Africa',CPV:'Africa',
  CMR:'Africa',CTA:'Africa',CHA:'Africa',COM:'Africa',COG:'Africa',COD:'Africa',
  DJI:'Africa',EGY:'Africa',EQG:'Africa',ERI:'Africa',SWZ:'Africa',ETH:'Africa',
  GAB:'Africa',GAM:'Africa',GHA:'Africa',GUI:'Africa',GNB:'Africa',CIV:'Africa',
  KEN:'Africa',LES:'Africa',LIB:'Africa',LBR:'Africa',LBA:'Africa',MAD:'Africa',
  MWI:'Africa',MLI:'Africa',MTN:'Africa',MRI:'Africa',MAR:'Africa',MOZ:'Africa',
  NAM:'Africa',NIG:'Africa',NGA:'Africa',RWA:'Africa',STP:'Africa',SEN:'Africa',
  SLE:'Africa',SOM:'Africa',ZAF:'Africa',SSD:'Africa',SDN:'Africa',TAN:'Africa',
  TGO:'Africa',TOG:'Africa',TUN:'Africa',UGA:'Africa',ZAM:'Africa',ZIM:'Africa',BFA:'Africa',
  // Europe
  ALB:'Europe',AND:'Europe',ARM:'Europe',AUT:'Europe',AZE:'Europe',BLR:'Europe',
  BEL:'Europe',BIH:'Europe',BUL:'Europe',CRO:'Europe',CYP:'Europe',CZE:'Europe',
  DEN:'Europe',ENG:'Europe',EST:'Europe',FRO:'Europe',FIN:'Europe',FRA:'Europe',
  GEO:'Europe',GER:'Europe',GIB:'Europe',GRE:'Europe',HUN:'Europe',ISL:'Europe',
  IRL:'Europe',ISR:'Europe',ITA:'Europe',KVX:'Europe',LVA:'Europe',LIE:'Europe',
  LTU:'Europe',LUX:'Europe',MLT:'Europe',MDA:'Europe',MNE:'Europe',NED:'Europe',
  MKD:'Europe',NIR:'Europe',NOR:'Europe',POL:'Europe',POR:'Europe',ROU:'Europe',
  RUS:'Europe',SMR:'Europe',SCO:'Europe',SRB:'Europe',SVK:'Europe',SVN:'Europe',
  ESP:'Europe',SWE:'Europe',SUI:'Europe',TUR:'Europe',UKR:'Europe',WAL:'Europe',
  // Asia
  AFG:'Asia',BHR:'Asia',BAN:'Asia',BHU:'Asia',CAM:'Asia',CHN:'Asia',TPE:'Asia',
  IND:'Asia',IDN:'Asia',IRN:'Asia',IRQ:'Asia',JPN:'Asia',JOR:'Asia',KAZ:'Asia',
  KUW:'Asia',KGZ:'Asia',LAO:'Asia',LBN:'Asia',MAC:'Asia',MAS:'Asia',MDV:'Asia',
  MNG:'Asia',MYA:'Asia',NEP:'Asia',PRK:'Asia',OMA:'Asia',PAK:'Asia',PSE:'Asia',
  PHI:'Asia',QAT:'Asia',KSA:'Asia',SGP:'Asia',KOR:'Asia',LKA:'Asia',SYR:'Asia',
  TJK:'Asia',THA:'Asia',TLS:'Asia',TKM:'Asia',UAE:'Asia',UZB:'Asia',VIE:'Asia',YEM:'Asia',
  // S. America
  ARG:'S. America',BOL:'S. America',BRA:'S. America',CHI:'S. America',COL:'S. America',
  ECU:'S. America',GUY:'S. America',PAR:'S. America',PER:'S. America',URU:'S. America',
  VEN:'S. America',SUR:'S. America',
  // N. America (incl. Caribbean + Central America)
  USA:'N. America',CAN:'N. America',MEX:'N. America',
  BLZ:'N. America',CRC:'N. America',SLV:'N. America',GUA:'N. America',
  HON:'N. America',NCA:'N. America',PAN:'N. America',
  JAM:'N. America',TRI:'N. America',HAI:'N. America',CUB:'N. America',DOM:'N. America',
  BRB:'N. America',GRN:'N. America',ATG:'N. America',SKN:'N. America',LCA:'N. America',
  VIN:'N. America',CUW:'N. America',ARU:'N. America',BAH:'N. America',DMA:'N. America',PUR:'N. America',
  // Oceania
  AUS:'Oceania',NZL:'Oceania',FIJ:'Oceania',PNG:'Oceania',SOL:'Oceania',
  VAN:'Oceania',SAM:'Oceania',TGA:'Oceania',FSM:'Oceania',PLW:'Oceania',
  MHL:'Oceania',KIR:'Oceania',NRU:'Oceania',TUV:'Oceania',COK:'Oceania',NCL:'Oceania',
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
  goals2010: number
  ga2010: number
  goals2015: number
  ga2015: number
}

const buildCache = unstable_cache(
  async () => {
    const columns = 'name_display,year_id,games,goals,assists,gk_clean_sheets,cards_yellow,nationality,teams_played_for'
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
          goals2010: 0, ga2010: 0, goals2015: 0, ga2015: 0,
        }
        natFreq[name] = {}
      }
      const p = players[name]
      const g = Number(row.games) || 0
      const go = Number(row.goals) || 0
      const a  = Number(row.assists) || 0
      p.goals        += go
      p.assists      += a
      p.games        += g
      p.yellow_cards += Number(row.cards_yellow)    || 0
      p.clean_sheets += Number(row.gk_clean_sheets) || 0

      const yr = String(row.year_id || '')
      if (yr >= '2010-2011') { p.goals2010 += go; p.ga2010 += go + a }
      if (yr >= '2015-2016') { p.goals2015 += go; p.ga2015 += go + a }

      if (row.nationality) {
        const nat = fmtNat(row.nationality as string)
        natFreq[name][nat] = (natFreq[name][nat] || 0) + 1
      }

      const teams = String(row.teams_played_for || '')
        .split(',').map((t: string) => normTeam(t.trim())).filter((t: string) => t && t !== '2 Teams')
      if (teams.length === 1) {
        const team = teams[0]
        p.clubGoals[team]       = (p.clubGoals[team]       || 0) + go
        p.clubAssists[team]     = (p.clubAssists[team]     || 0) + a
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
  ['football-golf-data-v3'],
  { revalidate: 86400 }
)

const ALL_STAT_KEYS = ['goals','assists','goals_assists','appearances','apps_minus_goals',
  'yellow_cards','clean_sheets','goals_2010','ga_2010','goals_2015','ga_2015'] as const
type StatKey = typeof ALL_STAT_KEYS[number]

// stats that support per-club queries
const CLUB_STAT_KEYS: StatKey[] = ['goals','assists','goals_assists','appearances','apps_minus_goals','yellow_cards','clean_sheets']

function pStatValue(p: PlayerData, key: StatKey, cf?: string): number {
  const g  = cf ? (p.clubGames[cf]   || 0) : p.games
  const go = cf ? (p.clubGoals[cf]   || 0) : p.goals
  const a  = cf ? (p.clubAssists[cf] || 0) : p.assists
  if (key==='goals')            return go
  if (key==='assists')          return a
  if (key==='goals_assists')    return go + a
  if (key==='appearances')      return g
  if (key==='apps_minus_goals') return Math.max(0, g - go)
  if (key==='yellow_cards')     return cf ? (p.clubYellowCards[cf] || 0) : p.yellow_cards
  if (key==='clean_sheets')     return cf ? (p.clubCleanSheets[cf] || 0) : p.clean_sheets
  if (key==='goals_2010')       return p.goals2010
  if (key==='ga_2010')          return p.ga2010
  if (key==='goals_2015')       return p.goals2015
  if (key==='ga_2015')          return p.ga2015
  return 0
}

function top3(vals: number[]): number {
  vals.sort((a, b) => b - a)
  return (vals[0] || 0) + (vals[1] || 0) + (vals[2] || 0)
}

const buildMetaCache = unstable_cache(
  async () => {
    const columns = 'name_display,year_id,games,goals,assists,gk_clean_sheets,cards_yellow,nationality,teams_played_for'
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

    const byName: Record<string, PlayerData> = {}
    const natFreq: Record<string, Record<string, number>> = {}
    const clubMap: Record<string, { seasons: Set<string>; apps: number }> = {}
    const natApps: Record<string, number> = {}
    const contApps: Record<string, number> = {}

    for (const row of all) {
      const name = row.name_display as string
      if (!byName[name]) {
        byName[name] = {
          goals: 0, assists: 0, games: 0, yellow_cards: 0, clean_sheets: 0, nationality: '',
          clubGoals: {}, clubAssists: {}, clubGames: {}, clubYellowCards: {}, clubCleanSheets: {},
          goals2010: 0, ga2010: 0, goals2015: 0, ga2015: 0,
        }
        natFreq[name] = {}
      }
      const p = byName[name]
      const g  = Number(row.games)           || 0
      const go = Number(row.goals)           || 0
      const a  = Number(row.assists)         || 0
      p.goals        += go
      p.assists      += a
      p.games        += g
      p.yellow_cards += Number(row.cards_yellow)    || 0
      p.clean_sheets += Number(row.gk_clean_sheets) || 0

      const yr = String(row.year_id || '')
      if (yr >= '2010-2011') { p.goals2010 += go; p.ga2010 += go + a }
      if (yr >= '2015-2016') { p.goals2015 += go; p.ga2015 += go + a }

      if (row.nationality) {
        const nat = fmtNat(row.nationality as string)
        natFreq[name][nat] = (natFreq[name][nat] || 0) + 1
      }

      const teams = String(row.teams_played_for || '')
        .split(',').map((t: string) => normTeam(t.trim())).filter((t: string) => t && t !== '2 Teams')
      if (teams.length === 1) {
        const team = teams[0]
        p.clubGoals[team]       = (p.clubGoals[team]       || 0) + go
        p.clubAssists[team]     = (p.clubAssists[team]     || 0) + a
        p.clubGames[team]       = (p.clubGames[team]       || 0) + g
        p.clubYellowCards[team] = (p.clubYellowCards[team] || 0) + (Number(row.cards_yellow)    || 0)
        p.clubCleanSheets[team] = (p.clubCleanSheets[team] || 0) + (Number(row.gk_clean_sheets) || 0)

        if (!clubMap[team]) clubMap[team] = { seasons: new Set(), apps: 0 }
        if (yr) clubMap[team].seasons.add(yr)
        clubMap[team].apps += g
      }
    }

    // Resolve nationality per player
    for (const [name, freq] of Object.entries(natFreq)) {
      byName[name].nationality = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    }

    // Build natApps and contApps
    for (const p of Object.values(byName)) {
      if (p.nationality) {
        natApps[p.nationality] = (natApps[p.nationality] || 0) + p.games
        const cont = CONTINENT_MAP[p.nationality]
        if (cont) contApps[cont] = (contApps[cont] || 0) + p.games
      }
    }

    // clubs = entries where seasons.size > 3, sorted by apps desc, map to name
    const clubs = Object.entries(clubMap)
      .filter(([, v]) => v.seasons.size > 3)
      .sort((a, b) => b[1].apps - a[1].apps)
      .map(([name]) => name)

    // nations = top 60 by natApps, map to code
    const nations = Object.entries(natApps)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([code]) => code)

    // continents = all continents with any contApps, sorted by contApps desc
    const continents = Object.entries(contApps)
      .sort((a, b) => b[1] - a[1])
      .map(([cont]) => cont)

    const allPlayers = Object.values(byName)

    // Build top3Cache
    const top3Cache: Record<string, number> = {}

    for (const key of ALL_STAT_KEYS) {
      // all-time top3
      top3Cache[`${key}::`] = top3(allPlayers.map(p => pStatValue(p, key)))

      // per nation
      for (const code of nations) {
        const vals = allPlayers.filter(p => p.nationality === code).map(p => pStatValue(p, key))
        top3Cache[`${key}:${code}:`] = top3(vals)
      }

      // per continent
      for (const cont of continents) {
        const vals = allPlayers.filter(p => CONTINENT_MAP[p.nationality] === cont).map(p => pStatValue(p, key))
        top3Cache[`${key}:cont:${cont}`] = top3(vals)
      }

      // per club (only CLUB_STAT_KEYS)
      if ((CLUB_STAT_KEYS as StatKey[]).includes(key)) {
        for (const club of clubs) {
          top3Cache[`${key}::${club}`] = top3(allPlayers.map(p => pStatValue(p, key, club)))
        }

        // per (continent, club)
        for (const cont of continents) {
          for (const club of clubs) {
            const vals = allPlayers
              .filter(p => CONTINENT_MAP[p.nationality] === cont)
              .map(p => pStatValue(p, key, club))
            const val = top3(vals)
            if (val > 0) {
              top3Cache[`${key}:cont:${cont}:${club}`] = val
            }
          }
        }
      }
    }

    // contClubPairs = continent+club pairs where at least one CLUB_STAT_KEYS stat has top3 >= 10
    const contClubPairSet = new Set<string>()
    for (const cont of continents) {
      for (const club of clubs) {
        for (const key of CLUB_STAT_KEYS) {
          const val = top3Cache[`${key}:cont:${cont}:${club}`] ?? 0
          if (val >= 10) {
            contClubPairSet.add(`${cont}|||${club}`)
            break
          }
        }
      }
    }
    const contClubPairs: [string, string][] = Array.from(contClubPairSet).map(s => {
      const [cont, club] = s.split('|||')
      return [cont, club]
    })

    return { clubs, nations, continents, contClubPairs, top3Cache }
  },
  ['football-golf-meta-v9'],
  { revalidate: 86400 }
)

const buildSeasonCache = unstable_cache(
  async (season: string) => {
    const { data } = await getClient()
      .from('player_seasons')
      .select('name_display,games,goals,assists,cards_yellow,gk_clean_sheets')
      .eq('year_id', season)
    const players: Record<string, { goals: number; assists: number; yellow_cards: number; appearances: number; clean_sheets: number }> = {}
    for (const row of (data || [])) {
      const name = row.name_display as string
      if (!players[name]) players[name] = { goals: 0, assists: 0, yellow_cards: 0, appearances: 0, clean_sheets: 0 }
      players[name].goals        += Number(row.goals)           || 0
      players[name].assists      += Number(row.assists)         || 0
      players[name].yellow_cards += Number(row.cards_yellow)    || 0
      players[name].appearances  += Number(row.games)           || 0
      players[name].clean_sheets += Number(row.gk_clean_sheets) || 0
    }
    return { players }
  },
  ['golf-season-v2'],
  { revalidate: 86400 }
)

// GET ?meta=1    → clubs, nations, continents, contClubPairs, top3Cache
const buildSeasonsListCache = unstable_cache(
  async () => {
    const { data } = await getClient()
      .from('player_seasons')
      .select('year_id')
    const seasons = [...new Set((data || []).map((r: any) => String(r.year_id)).filter(Boolean))].sort()
    return { seasons }
  },
  ['golf-seasons-list-v1'],
  { revalidate: 86400 }
)

// GET ?names=1   → player names only (small, fast — used for autocomplete)
// GET ?data=1    → full stats for all players (used for shot calculation)
// GET ?season=X  → per-player goals/assists/yellow_cards for one season (bad lie questions)
// GET ?seasons=1 → list of all distinct season IDs
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  try {
    if (searchParams.get('meta') === '1') {
      return NextResponse.json(await buildMetaCache())
    }
    if (searchParams.get('seasons') === '1') {
      return NextResponse.json(await buildSeasonsListCache())
    }
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

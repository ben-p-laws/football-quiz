import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { CONTINENT_MAP } from '@/lib/continents'

export const dynamic = 'force-dynamic'

const NAME_PARTICLES = new Set(['van','de','der','den','von','du','le','la','di','da','dos','das','del','el','al','bin','binte','y'])
function surnameInitial(fullName: string): string {
  const words = fullName.trim().split(/\s+/)
  let i = words.length - 1
  while (i > 0 && NAME_PARTICLES.has(words[i - 1].toLowerCase())) i--
  return (words[i] ?? '').charAt(0).toUpperCase()
}

const TEAM_NORM: Record<string, string> = {
  'Manchester Utd':  'Manchester United',
  'QPR':             'Queens Park Rangers',
  'Sheffield Weds':  'Sheffield Wednesday',
  'Brighton':        'Brighton & Hove Albion',
  'West Brom':       'West Bromwich Albion',
}
const normTeam = (t: string) => TEAM_NORM[t] ?? t

const NAT_NAME_TO_CODE: Record<string, string> = {
  // Africa
  'Algerian':'ALG','Angolan':'ANG','Beninese':'BEN','Burkinabe':'BFA','Burundian':'BDI',
  'Cameroonian':'CMR','Cape Verdean':'CPV','Congolese':'COG','DR Congo':'COD',
  'Egyptian':'EGY','Equatorial Guinean':'EQG','Ethiopian':'ETH','Gabonese':'GAB',
  'Gambian':'GAM','Ghanaian':'GHA','Guinean':'GUI','Guinea-Bissauan':'GNB',
  'Ivorian':'CIV','Kenyan':'KEN','Liberian':'LBR','Libyan':'LBA','Malagasy':'MAD',
  'Malawian':'MWI','Malian':'MLI','Mauritanian':'MTN','Mauritian':'MRI',
  'Moroccan':'MAR','Mozambican':'MOZ','Namibian':'NAM','Nigerien':'NIG','Nigerian':'NGA',
  'Rwandan':'RWA','Senegalese':'SEN','Sierra Leonean':'SLE','Somali':'SOM',
  'South African':'ZAF','Sudanese':'SDN','Swazi':'SWZ','Tanzanian':'TAN',
  'Togolese':'TGO','Tunisian':'TUN','Ugandan':'UGA','Zambian':'ZAM','Zimbabwean':'ZIM',
  // Europe
  'Albanian':'ALB','Armenian':'ARM','Austrian':'AUT','Azerbaijani':'AZE',
  'Belarusian':'BLR','Belgian':'BEL','Bosnian':'BIH','Bulgarian':'BUL',
  'Croatian':'CRO','Cypriot':'CYP','Czech':'CZE','Danish':'DEN','English':'ENG',
  'Estonian':'EST','Finnish':'FIN','French':'FRA','Georgian':'GEO','German':'GER',
  'Greek':'GRE','Hungarian':'HUN','Icelandic':'ISL','Irish':'IRL','Israeli':'ISR',
  'Italian':'ITA','Kosovar':'KVX','Latvian':'LVA','Lithuanian':'LTU','Luxembourger':'LUX',
  'Maltese':'MLT','Moldovan':'MDA','Montenegrin':'MNE','Dutch':'NED','Macedonian':'MKD',
  'Northern Irish':'NIR','Norwegian':'NOR','Polish':'POL','Portuguese':'POR',
  'Romanian':'ROU','Russian':'RUS','Scottish':'SCO','Serbian':'SRB','Slovak':'SVK',
  'Slovenian':'SVN','Spanish':'ESP','Swedish':'SWE','Swiss':'SUI','Turkish':'TUR',
  'Ukrainian':'UKR','Welsh':'WAL',
  // Asia
  'Afghan':'AFG','Bahraini':'BHR','Bangladeshi':'BAN','Chinese':'CHN','Indian':'IND',
  'Indonesian':'IDN','Iranian':'IRN','Iraqi':'IRQ','Japanese':'JPN','Jordanian':'JOR',
  'Kuwaiti':'KUW','Lebanese':'LBN','Malaysian':'MAS','Mongolian':'MNG','Nepali':'NEP',
  'Omani':'OMA','Pakistani':'PAK','Palestinian':'PSE','Filipino':'PHI','Qatari':'QAT',
  'Saudi Arabian':'KSA','Singaporean':'SGP','South Korean':'KOR','Sri Lankan':'LKA',
  'Syrian':'SYR','Thai':'THA','Emirati':'UAE','Uzbek':'UZB','Vietnamese':'VIE','Yemeni':'YEM',
  // S. America
  'Argentine':'ARG','Bolivian':'BOL','Brazilian':'BRA','Chilean':'CHI','Colombian':'COL',
  'Ecuadorian':'ECU','Guyanese':'GUY','Paraguayan':'PAR','Peruvian':'PER',
  'Uruguayan':'URU','Venezuelan':'VEN','Surinamese':'SUR',
  // N. America
  'American':'USA','Canadian':'CAN','Mexican':'MEX','Costa Rican':'CRC',
  'Jamaican':'JAM','Trinidadian':'TRI','Haitian':'HAI','Cuban':'CUB','Dominican':'DOM',
  'Panamanian':'PAN','Honduran':'HON','Guatemalan':'GUA',
  // Oceania
  'Australian':'AUS','New Zealander':'NZL','Fijian':'FIJ',
}

function fmtNat(raw: string): string {
  const trimmed = raw.trim()
  const parts = trimmed.split(/\s+/)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^[A-Z]{2,4}$/.test(parts[i])) return parts[i]
  }
  return NAT_NAME_TO_CODE[trimmed] ?? raw
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
  goalsSince: Record<number, number>
  gaSince: Record<number, number>
  goalsBefore: Record<number, number>
  gaBefore: Record<number, number>
}

const SINCE_YEARS = [2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018]
const BEFORE_YEARS = [2010,2011,2012,2013,2014,2015,2016,2017,2018,2019]

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
          goalsSince: {}, gaSince: {}, goalsBefore: {}, gaBefore: {},
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
      const startYear = parseInt(yr.slice(0, 4)) || 0
      for (const y of SINCE_YEARS) {
        if (startYear >= y) { p.goalsSince[y] = (p.goalsSince[y]||0) + go; p.gaSince[y] = (p.gaSince[y]||0) + go + a }
      }
      for (const y of BEFORE_YEARS) {
        if (startYear < y) { p.goalsBefore[y] = (p.goalsBefore[y]||0) + go; p.gaBefore[y] = (p.gaBefore[y]||0) + go + a }
      }

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
  ['football-golf-data-v5'],
  { revalidate: 86400 }
)

type SinceYear = 2008|2009|2010|2011|2012|2013|2014|2015|2016|2017|2018
type BeforeYear = 2010|2011|2012|2013|2014|2015|2016|2017|2018|2019
type StatKey = 'goals'|'assists'|'goals_assists'|'appearances'|'apps_minus_goals'|
               'yellow_cards'|'clean_sheets'|
               `goals_since_${SinceYear}`|`ga_since_${SinceYear}`|
               `goals_before_${BeforeYear}`|`ga_before_${BeforeYear}`

const ALL_STAT_KEYS: StatKey[] = [
  'goals','assists','goals_assists','appearances','apps_minus_goals','yellow_cards','clean_sheets',
  ...SINCE_YEARS.flatMap(y => [`goals_since_${y}` as StatKey, `ga_since_${y}` as StatKey]),
  ...BEFORE_YEARS.flatMap(y => [`goals_before_${y}` as StatKey, `ga_before_${y}` as StatKey]),
]

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
  const k = key as string
  const sinceGoalsM = k.match(/^goals_since_(\d+)$/)
  if (sinceGoalsM) return p.goalsSince[parseInt(sinceGoalsM[1])] ?? 0
  const sinceGaM = k.match(/^ga_since_(\d+)$/)
  if (sinceGaM) return p.gaSince[parseInt(sinceGaM[1])] ?? 0
  const beforeGoalsM = k.match(/^goals_before_(\d+)$/)
  if (beforeGoalsM) return p.goalsBefore[parseInt(beforeGoalsM[1])] ?? 0
  const beforeGaM = k.match(/^ga_before_(\d+)$/)
  if (beforeGaM) return p.gaBefore[parseInt(beforeGaM[1])] ?? 0
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
          goalsSince: {}, gaSince: {}, goalsBefore: {}, gaBefore: {},
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
      const startYear = parseInt(yr.slice(0, 4)) || 0
      for (const y of SINCE_YEARS) {
        if (startYear >= y) { p.goalsSince[y] = (p.goalsSince[y]||0) + go; p.gaSince[y] = (p.gaSince[y]||0) + go + a }
      }
      for (const y of BEFORE_YEARS) {
        if (startYear < y) { p.goalsBefore[y] = (p.goalsBefore[y]||0) + go; p.gaBefore[y] = (p.gaBefore[y]||0) + go + a }
      }

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

    const EXCLUDED_CLUBS = new Set([
      'Hull City','Reading','Cardiff City','Huddersfield Town','Oldham Athletic',
      'Bradford City','Luton Town','Swindon Town','Blackpool','Barnsley',
      'Derby County','Wimbledon','Sheffield Wednesday','Charlton Athletic',
    ])

    // clubs = entries where seasons.size > 3 and not excluded, sorted by apps desc
    const clubs = Object.entries(clubMap)
      .filter(([name, v]) => v.seasons.size > 3 && !EXCLUDED_CLUBS.has(name))
      .sort((a, b) => b[1].apps - a[1].apps)
      .map(([name]) => name)

    // nations = top 60 by natApps, map to code
    const nations = Object.entries(natApps)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([code]) => code)

    // continents = all continents with any contApps, sorted by contApps desc (Oceania excluded)
    const continents = Object.entries(contApps)
      .sort((a, b) => b[1] - a[1])
      .map(([cont]) => cont)
      .filter(cont => cont !== 'Oceania')

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

        // per surname initial (only CLUB_STAT_KEYS — letter filter only uses base stats)
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
          const vals = Object.entries(byName)
            .filter(([name]) => surnameInitial(name) === letter)
            .map(([, p]) => pStatValue(p, key))
          const val = top3(vals)
          if (val > 0) top3Cache[`${key}:letter:${letter}`] = val
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

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
      .filter(letter => CLUB_STAT_KEYS.some(key => (top3Cache[`${key}:letter:${letter}`] ?? 0) >= 10))

    return { clubs, nations, continents, contClubPairs, top3Cache, letters }
  },
  ['football-golf-meta-v15'],
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
// GET ?clubstats=1 → all clubs with season counts and total appearances (for admin use)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  try {
    if (searchParams.get('clubstats') === '1') {
      const columns = 'year_id,games,teams_played_for'
      const all: any[] = []
      let offset = 0
      while (true) {
        const { data } = await getClient().from('player_seasons').select(columns).range(offset, offset + 999)
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < 1000) break
        offset += 1000
      }
      const clubMap: Record<string, { seasons: Set<string>; apps: number }> = {}
      for (const row of all) {
        const yr = String(row.year_id || '')
        const teams = String(row.teams_played_for || '').split(',').map((t: string) => normTeam(t.trim())).filter((t: string) => t && t !== '2 Teams')
        if (teams.length === 1) {
          const team = teams[0]
          if (!clubMap[team]) clubMap[team] = { seasons: new Set(), apps: 0 }
          if (yr) clubMap[team].seasons.add(yr)
          clubMap[team].apps += Number(row.games) || 0
        }
      }
      const clubs = Object.entries(clubMap)
        .map(([name, v]) => ({ name, seasons: v.seasons.size, apps: v.apps }))
        .sort((a, b) => b.seasons - a.seasons || b.apps - a.apps)
      return NextResponse.json({ clubs })
    }
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
    const { players: playerNames, category, clubFilter, natFilter, letterFilter } = await req.json()
    const { players } = await buildCache()

    const breakdown: { name: string; value: number }[] = []
    let total = 0

    for (const name of (playerNames as string[])) {
      const p = players[name]
      if (!p) { breakdown.push({ name, value: 0 }); continue }
      if (natFilter && p.nationality !== natFilter) { breakdown.push({ name, value: 0 }); continue }
      if (letterFilter) {
        if (surnameInitial(name) !== letterFilter) { breakdown.push({ name, value: 0 }); continue }
      }

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

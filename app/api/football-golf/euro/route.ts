import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { CONTINENT_MAP } from '@/lib/continents'
import type { CompScope } from '@/lib/golf-logic'

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
  'Atletico':        'Atletico Madrid',
  'Atlético Madrid': 'Atletico Madrid',
  'Borussia Dortmund': 'Borussia Dortmund',
  'B. Munich':       'Bayern Munich',
  'Bayern':          'Bayern Munich',
  'Man City':        'Manchester City',
  'Man Utd':         'Manchester United',
  'Spurs':           'Tottenham Hotspur',
  // Serie A normalisation
  'Milan':           'AC Milan',
  'Inter':           'Inter Milan',
  'Internazionale':  'Inter Milan',
  'AS Roma':         'Roma',
  // Ligue 1
  'PSG':             'Paris Saint-Germain',
  'Paris SG':        'Paris Saint-Germain',
  // La Liga
  'Betis':           'Real Betis',
  'Sociedad':        'Real Sociedad',
}
const normTeam = (t: string) => TEAM_NORM[t] ?? t

// Curated top clubs per top-5 competition shown in euro mode club filter
const TOP_CLUBS_BY_COMP: Record<string, string[]> = {
  'La Liga':    ['Real Madrid','Barcelona','Atletico Madrid','Sevilla','Valencia','Villarreal','Real Sociedad','Real Betis'],
  'Serie A':    ['Juventus','AC Milan','Inter Milan','Napoli','Roma','Lazio','Atalanta','Fiorentina'],
  'Bundesliga': ['Bayern Munich','Borussia Dortmund','RB Leipzig','Bayer Leverkusen','Schalke 04','Wolfsburg'],
  'Ligue 1':    ['Paris Saint-Germain','Lyon','Marseille','Monaco','Lille','Nice','Saint-Etienne'],
}

const NAT_NAME_TO_CODE: Record<string, string> = {
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
  'Afghan':'AFG','Bahraini':'BHR','Bangladeshi':'BAN','Chinese':'CHN','Indian':'IND',
  'Indonesian':'IDN','Iranian':'IRN','Iraqi':'IRQ','Japanese':'JPN','Jordanian':'JOR',
  'Kuwaiti':'KUW','Lebanese':'LBN','Malaysian':'MAS','Mongolian':'MNG','Nepali':'NEP',
  'Omani':'OMA','Pakistani':'PAK','Palestinian':'PSE','Filipino':'PHI','Qatari':'QAT',
  'Saudi Arabian':'KSA','Singaporean':'SGP','South Korean':'KOR','Sri Lankan':'LKA',
  'Syrian':'SYR','Thai':'THA','Emirati':'UAE','Uzbek':'UZB','Vietnamese':'VIE','Yemeni':'YEM',
  'Argentine':'ARG','Bolivian':'BOL','Brazilian':'BRA','Chilean':'CHI','Colombian':'COL',
  'Ecuadorian':'ECU','Guyanese':'GUY','Paraguayan':'PAR','Peruvian':'PER',
  'Uruguayan':'URU','Venezuelan':'VEN','Surinamese':'SUR',
  'American':'USA','Canadian':'CAN','Mexican':'MEX','Costa Rican':'CRC',
  'Jamaican':'JAM','Trinidadian':'TRI','Haitian':'HAI','Cuban':'CUB','Dominican':'DOM',
  'Panamanian':'PAN','Honduran':'HON','Guatemalan':'GUA',
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

const SINCE_YEARS = [2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018]
const BEFORE_YEARS = [2010,2011,2012,2013,2014,2015,2016,2017,2018,2019]

type PlayerData = {
  goals: number; assists: number; games: number; yellow_cards: number; clean_sheets: number; nationality: string
  clubGoals: Record<string, number>; clubAssists: Record<string, number>; clubGames: Record<string, number>
  clubYellowCards: Record<string, number>; clubCleanSheets: Record<string, number>
  clubClGoals: Record<string, number>; clubClAssists: Record<string, number>; clubClGames: Record<string, number>
  clubClYellowCards: Record<string, number>; clubClCleanSheets: Record<string, number>
  // PL-only player totals
  plGoals: number; plAssists: number; plGames: number; plYellowCards: number; plCleanSheets: number
  // CL-only player totals
  clGoals: number; clAssists: number; clGames: number; clYellowCards: number; clCleanSheets: number
  // per top-5 competition totals
  compGoals: Record<string, number>; compAssists: Record<string, number>; compGames: Record<string, number>
  compYellowCards: Record<string, number>; compCleanSheets: Record<string, number>
  goalsSince: Record<number, number>; gaSince: Record<number, number>
  goalsBefore: Record<number, number>; gaBefore: Record<number, number>
}

type StatKey = 'goals'|'assists'|'goals_assists'|'appearances'|'apps_minus_goals'|
               'yellow_cards'|'clean_sheets'|string

const ALL_STAT_KEYS: StatKey[] = [
  'goals','assists','goals_assists','appearances','apps_minus_goals','yellow_cards','clean_sheets',
  ...SINCE_YEARS.flatMap(y => [`goals_since_${y}`, `ga_since_${y}`]),
  ...BEFORE_YEARS.flatMap(y => [`goals_before_${y}`, `ga_before_${y}`]),
]
const CLUB_STAT_KEYS: StatKey[] = ['goals','assists','goals_assists','appearances','apps_minus_goals','yellow_cards','clean_sheets']

async function fetchAllRows(table: string, columns: string): Promise<any[]> {
  const client = getClient()
  const all: any[] = []
  let offset = 0
  while (true) {
    const { data } = await client.from(table).select(columns).range(offset, offset + 999)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

function ensurePlayer(players: Record<string, PlayerData>, name: string): PlayerData {
  if (!name || !players[name]) {
    players[name] = {
      goals: 0, assists: 0, games: 0, yellow_cards: 0, clean_sheets: 0, nationality: '',
      clubGoals: {}, clubAssists: {}, clubGames: {}, clubYellowCards: {}, clubCleanSheets: {},
      clubClGoals: {}, clubClAssists: {}, clubClGames: {}, clubClYellowCards: {}, clubClCleanSheets: {},
      plGoals: 0, plAssists: 0, plGames: 0, plYellowCards: 0, plCleanSheets: 0,
      clGoals: 0, clAssists: 0, clGames: 0, clYellowCards: 0, clCleanSheets: 0,
      compGoals: {}, compAssists: {}, compGames: {}, compYellowCards: {}, compCleanSheets: {},
      goalsSince: {}, gaSince: {}, goalsBefore: {}, gaBefore: {},
    }
  }
  return players[name]
}

function ingestLeagueRows(
  rows: any[],
  players: Record<string, PlayerData>,
  natFreq: Record<string, Record<string, number>>,
  clubSeasons: Record<string, Set<string>>,
  source: 'pl' | undefined,
) {
  for (const row of rows) {
    const name = row.name_display as string
    if (!name) continue
    const p = ensurePlayer(players, name)
    if (!natFreq[name]) natFreq[name] = {}
    const g  = Number(row.games)           || 0
    const go = Number(row.goals)           || 0
    const a  = Number(row.assists)         || 0
    const yc = Number(row.cards_yellow)    || 0
    const cs = Number(row.gk_clean_sheets) || 0
    p.goals        += go
    p.assists      += a
    p.games        += g
    p.yellow_cards += yc
    p.clean_sheets += cs
    if (source === 'pl') {
      p.plGoals += go; p.plAssists += a; p.plGames += g; p.plYellowCards += yc; p.plCleanSheets += cs
    } else {
      const rawComp = (row.comp_name_abbr as string | undefined) ?? ''
      const comp = normaliseComp(rawComp)
      if (!comp) continue  // skip PL rows in top5 table
      p.compGoals[comp]      = (p.compGoals[comp]      || 0) + go
      p.compAssists[comp]    = (p.compAssists[comp]    || 0) + a
      p.compGames[comp]      = (p.compGames[comp]      || 0) + g
      p.compYellowCards[comp]= (p.compYellowCards[comp]|| 0) + yc
      p.compCleanSheets[comp]= (p.compCleanSheets[comp]|| 0) + cs
    }

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
      p.clubYellowCards[team] = (p.clubYellowCards[team] || 0) + yc
      p.clubCleanSheets[team] = (p.clubCleanSheets[team] || 0) + cs
      if (source === 'pl') {
        if (!clubSeasons[team]) clubSeasons[team] = new Set()
        if (yr) clubSeasons[team].add(yr)
      }
    }
  }
}

function ingestClRows(
  rows: any[],
  players: Record<string, PlayerData>,
  natFreq: Record<string, Record<string, number>>,
  clClubSeasons: Record<string, Set<string>>,
) {
  for (const row of rows) {
    const name = row.name_display as string
    if (!name) continue
    // Add to players dict (creates entry if not yet seen from league data)
    const p = ensurePlayer(players, name)
    if (!natFreq[name]) natFreq[name] = {}
    const go = Number(row.goals)           || 0
    const a  = Number(row.assists)         || 0
    const g  = Number(row.games)           || 0
    const yc = Number(row.cards_yellow)    || 0
    const cs = Number(row.gk_clean_sheets) || 0
    p.goals        += go
    p.assists      += a
    p.games        += g
    p.yellow_cards += yc
    p.clean_sheets += cs
    p.clGoals      += go
    p.clAssists    += a
    p.clGames      += g
    p.clYellowCards+= yc
    p.clCleanSheets+= cs

    if (row.nationality) {
      const nat = fmtNat(row.nationality as string)
      natFreq[name][nat] = (natFreq[name][nat] || 0) + 1
    }

    const teams = String(row.teams_played_for || '')
      .split(',').map((t: string) => normTeam(t.trim())).filter((t: string) => t && t !== '2 Teams')
    const yr = String(row.year_id || '')
    if (teams.length === 1) {
      const team = teams[0]
      p.clubClGoals[team]       = (p.clubClGoals[team]       || 0) + go
      p.clubClAssists[team]     = (p.clubClAssists[team]     || 0) + a
      p.clubClGames[team]       = (p.clubClGames[team]       || 0) + g
      p.clubClYellowCards[team] = (p.clubClYellowCards[team] || 0) + yc
      p.clubClCleanSheets[team] = (p.clubClCleanSheets[team] || 0) + cs
      if (!clClubSeasons[team]) clClubSeasons[team] = new Set()
      if (yr) clClubSeasons[team].add(yr)
    }
  }
}

function pStatValue(p: PlayerData, key: StatKey, cf?: string, scope?: CompScope, competition?: string): number {
  let go: number, a: number, g: number, yc: number, cs: number
  if (cf) {
    if (scope === 'cl') {
      go = p.clubClGoals[cf] ?? 0; a = p.clubClAssists[cf] ?? 0; g = p.clubClGames[cf] ?? 0
      yc = p.clubClYellowCards[cf] ?? 0; cs = p.clubClCleanSheets[cf] ?? 0
    } else if (scope === 'both') {
      go = (p.clubGoals[cf] ?? 0) + (p.clubClGoals[cf] ?? 0)
      a  = (p.clubAssists[cf] ?? 0) + (p.clubClAssists[cf] ?? 0)
      g  = (p.clubGames[cf] ?? 0) + (p.clubClGames[cf] ?? 0)
      yc = (p.clubYellowCards[cf] ?? 0) + (p.clubClYellowCards[cf] ?? 0)
      cs = (p.clubCleanSheets[cf] ?? 0) + (p.clubClCleanSheets[cf] ?? 0)
    } else {
      go = p.clubGoals[cf] ?? 0; a = p.clubAssists[cf] ?? 0; g = p.clubGames[cf] ?? 0
      yc = p.clubYellowCards[cf] ?? 0; cs = p.clubCleanSheets[cf] ?? 0
    }
  } else if (competition === 'pl') {
    go = p.plGoals; a = p.plAssists; g = p.plGames; yc = p.plYellowCards; cs = p.plCleanSheets
  } else if (competition === 'cl') {
    go = p.clGoals; a = p.clAssists; g = p.clGames; yc = p.clYellowCards; cs = p.clCleanSheets
  } else if (competition) {
    go = p.compGoals[competition] || 0; a = p.compAssists[competition] || 0; g = p.compGames[competition] || 0
    yc = p.compYellowCards[competition] || 0; cs = p.compCleanSheets[competition] || 0
  } else {
    go = p.goals; a = p.assists; g = p.games; yc = p.yellow_cards; cs = p.clean_sheets
  }
  if (key==='goals')            return go
  if (key==='assists')          return a
  if (key==='goals_assists')    return go + a
  if (key==='appearances')      return g
  if (key==='apps_minus_goals') return Math.max(0, g - go)
  if (key==='yellow_cards')     return yc
  if (key==='clean_sheets')     return cs
  if (!cf) {
    const k = key as string
    const sinceGoalsM = k.match(/^goals_since_(\d+)$/)
    if (sinceGoalsM) return p.goalsSince[parseInt(sinceGoalsM[1])] ?? 0
    const sinceGaM = k.match(/^ga_since_(\d+)$/)
    if (sinceGaM) return p.gaSince[parseInt(sinceGaM[1])] ?? 0
    const beforeGoalsM = k.match(/^goals_before_(\d+)$/)
    if (beforeGoalsM) return p.goalsBefore[parseInt(beforeGoalsM[1])] ?? 0
    const beforeGaM = k.match(/^ga_before_(\d+)$/)
    if (beforeGaM) return p.gaBefore[parseInt(beforeGaM[1])] ?? 0
  }
  return 0
}

function top3(vals: number[]): number {
  vals.sort((a, b) => b - a)
  return (vals[0] || 0) + (vals[1] || 0) + (vals[2] || 0)
}

const COLS = 'name_display,year_id,games,goals,assists,gk_clean_sheets,cards_yellow,nationality,teams_played_for'
const COLS_TOP5 = COLS + ',comp_name_abbr'

const COMP_ABBR_NORM: Record<string, string> = {
  'es La Liga':       'La Liga',
  'de Bundesliga':    'Bundesliga',
  'it Serie A':       'Serie A',
  'fr Ligue 1':       'Ligue 1',
}
function normaliseComp(raw: string): string | null {
  const trimmed = raw.trim()
  // Skip PL rows — those come from player_seasons table
  if (trimmed.startsWith('eng ')) return null
  // Skip multi-competition rows (player moved clubs mid-season)
  if (/\d\s*comps?/i.test(trimmed)) return null
  return COMP_ABBR_NORM[trimmed] ?? trimmed
}

const buildEuroCache = unstable_cache(
  async () => {
    const [plRows, top5Rows, clRows] = await Promise.all([
      fetchAllRows('player_seasons', COLS),
      fetchAllRows('top_5_leagues_player_seasons', COLS_TOP5),
      fetchAllRows('europe_player_seasons', COLS),
    ])

    const players: Record<string, PlayerData> = {}
    const natFreq: Record<string, Record<string, number>> = {}
    const clubSeasons: Record<string, Set<string>> = {}
    const clClubSeasons: Record<string, Set<string>> = {}

    ingestLeagueRows(plRows, players, natFreq, clubSeasons, 'pl')
    ingestLeagueRows(top5Rows, players, natFreq, clubSeasons, undefined)
    ingestClRows(clRows, players, natFreq, clClubSeasons)

    for (const [name, freq] of Object.entries(natFreq)) {
      players[name].nationality = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    }

    const playerNames = Object.keys(players).sort()
    return { players, playerNames, clubSeasons, clClubSeasons }
  },
  ['football-golf-euro-data-v5'],
  { revalidate: 86400 }
)

const buildEuroMetaCache = unstable_cache(
  async () => {
    // Fetch independently — do NOT call buildEuroCache() to avoid nested unstable_cache
    const [plRows, top5Rows, clRows] = await Promise.all([
      fetchAllRows('player_seasons', COLS),
      fetchAllRows('top_5_leagues_player_seasons', COLS_TOP5),
      fetchAllRows('europe_player_seasons', COLS),
    ])
    const players: Record<string, PlayerData> = {}
    const natFreq: Record<string, Record<string, number>> = {}
    const clubSeasons: Record<string, Set<string>> = {}
    const clClubSeasons: Record<string, Set<string>> = {}
    ingestLeagueRows(plRows, players, natFreq, clubSeasons, 'pl')
    ingestLeagueRows(top5Rows, players, natFreq, clubSeasons, undefined)
    ingestClRows(clRows, players, natFreq, clClubSeasons)
    for (const [name, freq] of Object.entries(natFreq)) {
      players[name].nationality = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    }

    // Collect which competitions exist in top5 data (excluding PL)
    const top5CompSet = new Set<string>()
    for (const row of top5Rows) {
      const comp = normaliseComp((row.comp_name_abbr as string | undefined) ?? '')
      if (comp) top5CompSet.add(comp)
    }
    const top5Competitions = Array.from(top5CompSet)
    const ALL_COMPETITIONS = ['pl', 'cl', ...top5Competitions]

    const allPlayers = Object.values(players)
    const natApps: Record<string, number> = {}
    const contApps: Record<string, number> = {}

    for (const p of allPlayers) {
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
      'Southampton','Blackburn Rovers','Middlesbrough','Bolton Wanderers','Burnley',
      'Norwich City','Coventry City','Watford','Wigan Athletic','Swansea City',
      'Birmingham City','Portsmouth','Queens Park Rangers','Sheffield United','Ipswich Town',
    ])

    // PL clubs (from player_seasons table only)
    const clubs = Object.entries(clubSeasons)
      .filter(([name, s]) => s.size > 2 && !EXCLUDED_CLUBS.has(name))
      .sort((a, b) => b[1].size - a[1].size)
      .map(([name]) => name)

    // Build club→competition mapping for top5 clubs
    const clubComp: Record<string, string> = {}
    for (const row of top5Rows) {
      const rawComp = (row.comp_name_abbr as string | undefined) ?? ''
      const comp = normaliseComp(rawComp)
      if (!comp) continue
      const teams = String(row.teams_played_for || '').split(',').map((t: string) => normTeam(t.trim())).filter((t: string) => t && t !== '2 Teams')
      if (teams.length === 1) clubComp[teams[0]] = comp
    }
    // Ensure every curated top5 club has a competition (some never appear as single-team in teams_played_for)
    for (const [comp, clubList] of Object.entries(TOP_CLUBS_BY_COMP)) {
      for (const club of clubList) {
        if (!clubComp[club]) clubComp[club] = comp
      }
    }
    // Add PL clubs so they get the 'pl' competition label in "both" scope
    for (const club of clubs) {
      if (!clubComp[club]) clubComp[club] = 'pl'
    }

    // Euro-mode clubs: PL clubs + curated top clubs per top-5 competition (present in data)
    const top5AllowedClubs = new Set(Object.values(TOP_CLUBS_BY_COMP).flat())
    const euroClubsFinal = [
      ...clubs,
      ...Object.keys(clubComp).filter(c => top5AllowedClubs.has(c)),
    ]

    const clClubs = Object.keys(clClubSeasons)

    const nations = Object.entries(natApps)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([code]) => code)

    const continents = Object.entries(contApps)
      .sort((a, b) => b[1] - a[1])
      .map(([cont]) => cont)
      .filter(cont => cont !== 'Oceania')

    const top3Cache: Record<string, number> = {}
    const clClubSet = new Set(clClubs)

    for (const key of ALL_STAT_KEYS) {
      top3Cache[`${key}::`] = top3(allPlayers.map(p => pStatValue(p, key)))

      for (const code of nations) {
        const vals = allPlayers.filter(p => p.nationality === code).map(p => pStatValue(p, key))
        top3Cache[`${key}:${code}:`] = top3(vals)
      }

      for (const cont of continents) {
        const vals = allPlayers.filter(p => CONTINENT_MAP[p.nationality] === cont).map(p => pStatValue(p, key))
        top3Cache[`${key}:cont:${cont}`] = top3(vals)
      }

      if ((CLUB_STAT_KEYS as StatKey[]).includes(key)) {
        // Competition-specific nat/cont/all cache entries (euro mode only)
        for (const comp of ALL_COMPETITIONS) {
          top3Cache[`${key}::comp:${comp}`] = top3(allPlayers.map(p => pStatValue(p, key, undefined, undefined, comp)))
          for (const code of nations) {
            const val = top3(allPlayers.filter(p => p.nationality === code).map(p => pStatValue(p, key, undefined, undefined, comp)))
            if (val > 0) top3Cache[`${key}:${code}:comp:${comp}`] = val
          }
          for (const cont of continents) {
            const val = top3(allPlayers.filter(p => CONTINENT_MAP[p.nationality] === cont).map(p => pStatValue(p, key, undefined, undefined, comp)))
            if (val > 0) top3Cache[`${key}:cont:${cont}:comp:${comp}`] = val
          }
        }

        for (const club of euroClubsFinal) {
          // league scope
          top3Cache[`${key}::${club}:league`] = top3(allPlayers.map(p => pStatValue(p, key, club, 'league')))
          // cl + both scopes for CL-eligible clubs
          if (clClubSet.has(club)) {
            top3Cache[`${key}::${club}:cl`]   = top3(allPlayers.map(p => pStatValue(p, key, club, 'cl')))
            top3Cache[`${key}::${club}:both`] = top3(allPlayers.map(p => pStatValue(p, key, club, 'both')))
          }
        }

        for (const cont of continents) {
          for (const club of euroClubsFinal) {
            const vals = allPlayers
              .filter(p => CONTINENT_MAP[p.nationality] === cont)
              .map(p => pStatValue(p, key, club, 'league'))
            const val = top3(vals)
            if (val > 0) top3Cache[`${key}:cont:${cont}:${club}`] = val
          }
        }

        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
          const vals = Object.entries(players)
            .filter(([name]) => surnameInitial(name) === letter)
            .map(([, p]) => pStatValue(p, key))
          const val = top3(vals)
          if (val > 0) top3Cache[`${key}:letter:${letter}`] = val
        }
      }
    }

    const contClubPairSet = new Set<string>()
    for (const cont of continents) {
      for (const club of euroClubsFinal) {
        for (const key of CLUB_STAT_KEYS) {
          const val = top3Cache[`${key}:cont:${cont}:${club}`] ?? 0
          if (val >= 10) { contClubPairSet.add(`${cont}|||${club}`); break }
        }
      }
    }
    const contClubPairs: [string, string][] = Array.from(contClubPairSet).map(s => {
      const [cont, club] = s.split('|||')
      return [cont, club]
    })

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
      .filter(letter => CLUB_STAT_KEYS.some(key => (top3Cache[`${key}:letter:${letter}`] ?? 0) >= 10))

    const playerNames = Object.keys(players).sort()
    return { clubs, euroClubs: euroClubsFinal, clubComp, clClubs, nations, continents, contClubPairs, top3Cache, letters, top5Competitions, playerNames }
  },
  ['football-golf-euro-meta-v9'],
  { revalidate: 86400 }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  try {
    if (searchParams.get('meta') === '1') {
      return NextResponse.json(await buildEuroMetaCache())
    }
    const { playerNames, players } = await buildEuroCache()
    if (searchParams.get('names') === '1') {
      return NextResponse.json({ playerNames })
    }
    if (searchParams.get('data') === '1') {
      return NextResponse.json({ players, playerNames })
    }
    return NextResponse.json({ error: 'Unknown query' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[euro route error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

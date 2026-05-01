/**
 * Prints diagnostic stats for the bingo player pool and categories.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/debug-bingo.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Pool bucket sizes
const BUCKET_APPS    = 50
const BUCKET_GOALS   = 50
const BUCKET_ASSISTS = 50
const BUCKET_YELLOWS = 30

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
    const { data } = await supabase.from('player_seasons').select(columns).range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

async function run() {
  console.log('Fetching data...\n')

  const [rows, plTableRows] = await Promise.all([
    fetchAll('name_display,games,goals,assists,goals_assists,pens_made,pens_missed,cards_yellow,cards_red,teams_played_for,year_id'),
    supabase.from('pl_season_tables').select('season,team,position,relegated'),
  ])

  const plTables = new Map<string, { position: number; relegated: boolean }>()
  for (const row of plTableRows.data ?? []) {
    plTables.set(`${row.season}|||${row.team}`, { position: row.position, relegated: row.relegated })
  }
  console.log(`pl_season_tables rows loaded: ${plTableRows.data?.length ?? 0}`)
  if ((plTableRows.data?.length ?? 0) === 0) {
    console.log('  ⚠️  Table is empty — run scripts/populate-pl-tables.ts first\n')
  } else {
    // Show sample seasons and teams from pl_season_tables so we can verify format
    const sampleSeasons = [...new Set((plTableRows.data ?? []).map((r: any) => r.season))].slice(0, 5)
    const sampleTeams = [...new Set((plTableRows.data ?? []).map((r: any) => r.team))].slice(0, 8)
    console.log(`  Sample seasons in pl_season_tables: ${sampleSeasons.join(', ')}`)
    console.log(`  Sample teams  in pl_season_tables: ${sampleTeams.join(', ')}`)
  }

  // Show sample year_id and team values from player_seasons for format comparison
  const allYearIds = [...new Set(rows.map((r: any) => r.year_id).filter(Boolean))].sort()
  const allTeamsInRows = [...new Set(
    rows.flatMap((r: any) => String(r.teams_played_for ?? '').split(',').map((t: string) => t.trim()).filter((t: string) => t && t !== '2 Teams'))
  )].sort()
  console.log(`\nAll year_ids in player_seasons (${allYearIds.length}):`)
  console.log('  ' + allYearIds.join(', '))
  console.log(`\nAll teams in player_seasons (${allTeamsInRows.length}):`)
  console.log('  ' + allTeamsInRows.join('\n  '))

  const TEAM_NORM: Record<string, string> = {
    'Manchester Utd':      'Manchester United',
    'QPR':                 'Queens Park Rangers',
    'Sheffield Weds':      'Sheffield Wednesday',
    'Brighton':            'Brighton & Hove Albion',
  }
  const normTeam = (t: string) => TEAM_NORM[t] ?? t

  // Check which (year_id, team) pairs from player_seasons have NO match in pl_season_tables
  const unmatchedKeys = new Set<string>()
  for (const row of rows) {
    if (!row.year_id) continue
    const teams = String(row.teams_played_for ?? '').split(',').map((t: string) => t.trim()).filter((t: string) => t && t !== '2 Teams')
    for (const team of teams) {
      const key = `${row.year_id}|||${normTeam(team)}`
      if (!plTables.has(key)) unmatchedKeys.add(`${row.year_id}|||${team}`)
    }
  }
  if (unmatchedKeys.size > 0) {
    const samples = [...unmatchedKeys].slice(0, 20).map(k => k.replace('|||', ' / '))
    console.log(`\n⚠️  ${unmatchedKeys.size} (season, team) combos in player_seasons have NO match in pl_season_tables`)
    console.log('  First 20 unmatched:\n  ' + samples.join('\n  '))
  } else {
    console.log('\n✓ All (season, team) pairs match pl_season_tables')
  }

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
    p.games += row.games ?? 0
    p.goals += row.goals ?? 0
    p.assists += row.assists ?? 0
    p.goals_assists += row.goals_assists ?? 0
    p.pens_made += row.pens_made ?? 0
    p.pens_missed += row.pens_missed ?? 0
    p.cards_yellow += row.cards_yellow ?? 0
    p.cards_red += row.cards_red ?? 0

    const teams = String(row.teams_played_for ?? '')
      .split(',').map((t: string) => t.trim()).filter((t: string) => t && t !== '2 Teams')
    for (const club of teams) p.clubs.add(club)

    p.maxGoalsInSeason = Math.max(p.maxGoalsInSeason, row.goals ?? 0)
    p.maxAssistsInSeason = Math.max(p.maxAssistsInSeason, row.assists ?? 0)
    p.maxGoalsAssistsInSeason = Math.max(p.maxGoalsAssistsInSeason, row.goals_assists ?? 0)

    if (row.year_id && teams.length > 0) {
      let wonTitle = false, top4 = false, relegated = false
      for (const club of teams) {
        const entry = plTables.get(`${row.year_id}|||${normTeam(club)}`)
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

  const bucketDefs = [
    { label: `Top ${BUCKET_APPS} appearances`,  players: top(outfield, 'games',        BUCKET_APPS) },
    { label: `Top ${BUCKET_GOALS} goalscorers`, players: top(outfield, 'goals',        BUCKET_GOALS) },
    { label: `Top ${BUCKET_ASSISTS} assisters`, players: top(outfield, 'assists',      BUCKET_ASSISTS) },
    { label: '4+ red cards',                    players: outfield.filter(p => p.cards_red > 3) },
    { label: `Top ${BUCKET_YELLOWS} yellows`,   players: top(outfield, 'cards_yellow', BUCKET_YELLOWS) },
    { label: '3+ titles',                       players: outfield.filter(p => p.titlesWon >= 3) },
  ]

  const poolMap = new Map<string, PlayerStats>()
  for (const { players } of bucketDefs) {
    for (const p of players) poolMap.set(p.name, p)
  }
  const topPlayers = [...poolMap.values()]

  // ── Player pool ────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`PLAYER POOL  (multi-bucket selection)`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`Filter: goals > 0 OR assists > 0 (removes GKs)`)
  for (const { label, players } of bucketDefs) {
    console.log(`  ${label.padEnd(28)} → ${players.length} players`)
  }
  console.log(`\nTotal unique players in pool: ${topPlayers.length}`)
  console.log('\nPlayers (sorted by pool score):')
  topPlayers.forEach((p, i) => {
    const score = p.games + (p.goals * 4) + (p.assists * 3)
    console.log(`  ${String(i + 1).padStart(3)}. ${p.name.padEnd(28)} apps:${String(p.games).padStart(4)}  g:${String(p.goals).padStart(3)}  a:${String(p.assists).padStart(3)}  titles:${p.titlesWon}  rel:${p.relegations}  score:${score}`)
  })

  // ── Category coverage ──────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`CATEGORIES  (${ACHIEVEMENTS.length} total)`)
  console.log(`${'─'.repeat(60)}`)

  const categoryStats = ACHIEVEMENTS.map(ach => {
    const qualifying = topPlayers.filter(p => ach.check(p))
    return { id: ach.id, name: ach.name, count: qualifying.length, players: qualifying.map(p => p.name) }
  }).sort((a, b) => a.count - b.count)

  const TOO_FEW = 5
  const TOO_MANY = topPlayers.length - 5

  for (const cat of categoryStats) {
    const flag = cat.count < TOO_FEW ? ' ⚠️  TOO FEW' : cat.count > TOO_MANY ? ' ⚠️  TOO MANY' : ''
    console.log(`\n  [${String(cat.count).padStart(3)} players]  ${cat.name}${flag}`)
    if (cat.count <= 15) {
      console.log(`             ${cat.players.join(', ')}`)
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log('SUMMARY')
  console.log(`${'─'.repeat(60)}`)
  const tooFew = categoryStats.filter(c => c.count < TOO_FEW)
  const tooMany = categoryStats.filter(c => c.count > TOO_MANY)
  console.log(`Categories with fewer than ${TOO_FEW} players: ${tooFew.length}`)
  tooFew.forEach(c => console.log(`  ⚠️  "${c.name}" → ${c.count} players`))
  console.log(`Categories with more than ${TOO_MANY} players: ${tooMany.length}`)
  tooMany.forEach(c => console.log(`  ⚠️  "${c.name}" → ${c.count} players`))
}

run().catch(err => { console.error(err); process.exit(1) })

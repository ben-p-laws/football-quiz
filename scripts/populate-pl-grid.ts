/**
 * Populate pl_grid_cell_answers for published pl_grid_puzzles.
 *
 * Prerequisites:
 *   1. Run the SQL below in the Supabase dashboard:
 *
 *      -- Daily puzzle config
 *      CREATE TABLE pl_grid_puzzles (
 *        id           uuid primary key default gen_random_uuid(),
 *        puzzle_date  date not null unique,
 *        is_published boolean not null default false,
 *        row1_type    text, row1_ref text,
 *        row2_type    text, row2_ref text,
 *        row3_type    text, row3_ref text,
 *        col1_type    text, col1_ref text,
 *        col2_type    text, col2_ref text,
 *        col3_type    text, col3_ref text
 *      );
 *
 *      -- Pre-computed valid answers per cell
 *      CREATE TABLE pl_grid_cell_answers (
 *        id                   bigint generated always as identity primary key,
 *        puzzle_id            uuid references pl_grid_puzzles(id),
 *        row_index            integer not null,
 *        col_index            integer not null,
 *        player_name          text not null,
 *        combined_appearances integer not null,
 *        score                integer not null,
 *        rank                 integer not null,
 *        popularity_score     integer,
 *        popularity_rank      integer
 *      );
 *      CREATE INDEX ON pl_grid_cell_answers (puzzle_id, row_index, col_index);
 *      CREATE INDEX ON pl_grid_cell_answers (puzzle_id, row_index, col_index, player_name);
 *
 *      -- Leaderboard
 *      CREATE TABLE pl_grid_leaderboard (
 *        id               bigint generated always as identity primary key,
 *        puzzle_id        uuid references pl_grid_puzzles(id),
 *        puzzle_date      date not null,
 *        player_name      text not null,
 *        score            integer not null,
 *        rarity_score     integer,
 *        popularity_score integer,
 *        correct          integer not null,
 *        created_at       timestamptz default now()
 *      );
 *      CREATE INDEX ON pl_grid_leaderboard (puzzle_id, score asc);
 *
 *      -- RLS: allow anon SELECT on all three tables, INSERT on leaderboard
 *      ALTER TABLE pl_grid_puzzles        ENABLE ROW LEVEL SECURITY;
 *      ALTER TABLE pl_grid_cell_answers   ENABLE ROW LEVEL SECURITY;
 *      ALTER TABLE pl_grid_leaderboard    ENABLE ROW LEVEL SECURITY;
 *      CREATE POLICY "anon select puzzles"  ON pl_grid_puzzles        FOR SELECT USING (true);
 *      CREATE POLICY "anon select answers"  ON pl_grid_cell_answers   FOR SELECT USING (true);
 *      CREATE POLICY "anon select lb"       ON pl_grid_leaderboard    FOR SELECT USING (true);
 *      CREATE POLICY "anon insert lb"       ON pl_grid_leaderboard    FOR INSERT WITH CHECK (true);
 *
 *   2. Insert at least one row in pl_grid_puzzles (example):
 *      INSERT INTO pl_grid_puzzles (puzzle_date, is_published,
 *        row1_type, row1_ref,  row2_type, row2_ref,  row3_type, row3_ref,
 *        col1_type, col1_ref,  col2_type, col2_ref,  col3_type, col3_ref)
 *      VALUES ('2026-05-05', true,
 *        'team', 'Arsenal',      'team',       'Liverpool',  'won_pl',  null,
 *        'team', 'Chelsea',      'relegated',  null,         'golden_boot', null);
 *
 *   3. Criterion types: 'team' (row1_ref = team name), 'won_pl', 'won_3plus_pl',
 *      'relegated', 'golden_boot', 'golden_glove'
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/populate-pl-grid.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Normalize abbreviated names in player_seasons.teams_played_for → full canonical names
// (which match both pl_season_tables and the puzzle ref fields)
const PLAYER_SEASON_TEAM_NORM: Record<string, string> = {
  'Manchester Utd':  'Manchester United',
  'QPR':             'Queens Park Rangers',
  'Sheffield Weds':  'Sheffield Wednesday',
  'Brighton':        'Brighton & Hove Albion',
}
const normPSTeam = (t: string) => PLAYER_SEASON_TEAM_NORM[t] ?? t

// Map team names from pl_season_tables → how they appear in player_seasons.teams_played_for
// Adjust if your data uses different spellings.
const SEASON_TABLE_TO_PLAYER_SEASON: Record<string, string> = {
  'Manchester United':        'Manchester United',
  'Manchester City':          'Manchester City',
  'Arsenal':                  'Arsenal',
  'Chelsea':                  'Chelsea',
  'Liverpool':                'Liverpool',
  'Tottenham Hotspur':        'Tottenham Hotspur',
  'Newcastle United':         'Newcastle United',
  'Everton':                  'Everton',
  'Aston Villa':              'Aston Villa',
  'West Ham United':          'West Ham United',
  'Leeds United':             'Leeds United',
  'Blackburn Rovers':         'Blackburn Rovers',
  'Leicester City':           'Leicester City',
  'Crystal Palace':           'Crystal Palace',
  'Southampton':              'Southampton',
  'Middlesbrough':            'Middlesbrough',
  'Wolverhampton Wanderers':  'Wolverhampton Wanderers',
  'Fulham':                   'Fulham',
  'Stoke City':               'Stoke City',
  'Sunderland':               'Sunderland',
  'Swansea City':             'Swansea City',
  'Queens Park Rangers':      'Queens Park Rangers',
  'Norwich City':             'Norwich City',
  'Sheffield Wednesday':      'Sheffield Wednesday',
  'Sheffield United':         'Sheffield United',
  'Coventry City':            'Coventry City',
  'Ipswich Town':             'Ipswich Town',
  'Bolton Wanderers':         'Bolton Wanderers',
  'Nottingham Forest':        'Nottingham Forest',
  'Wimbledon':                'Wimbledon',
  'Charlton Athletic':        'Charlton Athletic',
  'Derby County':             'Derby County',
  'Wigan Athletic':           'Wigan Athletic',
  'Burnley':                  'Burnley',
  'Brighton & Hove Albion':   'Brighton & Hove Albion',
  'Huddersfield Town':        'Huddersfield Town',
  'Watford':                  'Watford',
  'Cardiff City':             'Cardiff City',
  'Hull City':                'Hull City',
  'Reading':                  'Reading',
  'Brentford':                'Brentford',
  'Oldham Athletic':          'Oldham Athletic',
  'Portsmouth':               'Portsmouth',
  'Bradford City':            'Bradford City',
  'Blackpool':                'Blackpool',
  'West Bromwich Albion':     'West Bromwich Albion',
  'Birmingham City':          'Birmingham City',
  'Swindon Town':             'Swindon Town',
}

// ── Paginated fetch helper ──────────────────────────────────────────────────
async function fetchAll<T>(
  table: string,
  columns: string,
  filter?: (q: any) => any
): Promise<T[]> {
  const rows: T[] = []
  let offset = 0
  while (true) {
    let q: any = supabase.from(table).select(columns)
    if (filter) q = filter(q)
    const { data, error } = await q.range(offset, offset + 999)
    if (error) { console.error(`fetchAll ${table}:`, error); break }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

// ── Types ────────────────────────────────────────────────────────────────────
type PlayerSeason = {
  name_display: string
  year_id: string
  pos: string
  teams_played_for: string
  goals: number
  gk_clean_sheets: number
}

type PLSeasonTable = {
  season: string
  team: string
  position: number
  relegated: boolean
}

// ── Build player data maps ───────────────────────────────────────────────────
async function buildPlayerData() {
  console.log('Fetching player_seasons...')
  const seasons = await fetchAll<PlayerSeason>(
    'player_seasons',
    'name_display,year_id,pos,teams_played_for,goals,gk_clean_sheets'
  )
  console.log(`  ${seasons.length} rows`)

  console.log('Fetching pl_season_tables...')
  const plTables = await fetchAll<PLSeasonTable>(
    'pl_season_tables',
    'season,team,position,relegated'
  )
  console.log(`  ${plTables.length} rows`)

  // Build a set of teams that won PL each season + relegated teams
  const plWinners  = new Map<string, string>()   // season → winning team (in pl_season_tables names)
  const plRelegated = new Map<string, Set<string>>() // season → set of relegated teams

  for (const row of plTables) {
    if (row.position === 1) plWinners.set(row.season, row.team)
    if (row.relegated) {
      if (!plRelegated.has(row.season)) plRelegated.set(row.season, new Set())
      plRelegated.get(row.season)!.add(row.team)
    }
  }

  // Invert the name map so we can look up pl_season_tables names from player_season names
  const playerSeasonNameToTableName = new Map<string, string>()
  for (const [tableName, playerName] of Object.entries(SEASON_TABLE_TO_PLAYER_SEASON)) {
    playerSeasonNameToTableName.set(playerName, tableName)
  }

  // Per-year goals/clean-sheets totals (to find Golden Boot/Glove winners)
  // player_seasons may have multiple rows per player-year (different teams), sum them up
  type YearTotal = { goals: number; cleanSheets: number; isGk: boolean }
  const yearPlayerTotals = new Map<string, YearTotal>() // `${year}|||${name}` → totals

  // Player career data
  const teamSeasons       = new Map<string, Map<string, number>>() // player → team → seasons count
  const playerPLWins      = new Map<string, number>()  // player → PL wins count
  const playerRelegations = new Map<string, number>()  // player → relegation count

  for (const row of seasons) {
    const name   = row.name_display
    const year   = row.year_id
    const teams  = String(row.teams_played_for || '')
      .split(',')
      .map(t => normPSTeam(t.trim()))
      .filter(t => t && t !== '2 Teams')

    // Accumulate yearly totals for Golden Boot/Glove
    const yk = `${year}|||${name}`
    const prev = yearPlayerTotals.get(yk) ?? { goals: 0, cleanSheets: 0, isGk: false }
    yearPlayerTotals.set(yk, {
      goals:       prev.goals + ((row.goals as number) || 0),
      cleanSheets: prev.cleanSheets + ((row.gk_clean_sheets as number) || 0),
      isGk:        prev.isGk || (row.pos === 'GK'),
    })

    // Team seasons (team names already normalised via normPSTeam above)
    if (!teamSeasons.has(name)) teamSeasons.set(name, new Map())
    for (const team of teams) {
      const cur = teamSeasons.get(name)!
      cur.set(team, (cur.get(team) ?? 0) + 1)
    }

    // PL wins / relegations — normalised names now match pl_season_tables directly
    for (const team of teams) {
      if (plWinners.get(year) === team) {
        playerPLWins.set(name, (playerPLWins.get(name) ?? 0) + 1)
      }
      if (plRelegated.get(year)?.has(team)) {
        playerRelegations.set(name, (playerRelegations.get(name) ?? 0) + 1)
      }
    }
  }

  // Determine Golden Boot / Glove winners per year
  const goldenBootWinners  = new Map<string, Set<string>>() // year → set of player names
  const goldenGloveWinners = new Map<string, Set<string>>()

  // Group by year
  const byYear = new Map<string, Array<{ name: string } & YearTotal>>()
  for (const [key, totals] of yearPlayerTotals) {
    const [year, name] = key.split('|||')
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push({ name, ...totals })
  }

  for (const [year, players] of byYear) {
    // Golden Boot
    let maxGoals = 0
    for (const p of players) if (p.goals > maxGoals) maxGoals = p.goals
    if (maxGoals > 0) {
      const winners = players.filter(p => p.goals === maxGoals).map(p => p.name)
      goldenBootWinners.set(year, new Set(winners))
    }
    // Golden Glove (GKs only)
    let maxSheets = 0
    for (const p of players) if (p.isGk && p.cleanSheets > maxSheets) maxSheets = p.cleanSheets
    if (maxSheets > 0) {
      const winners = players.filter(p => p.isGk && p.cleanSheets === maxSheets).map(p => p.name)
      goldenGloveWinners.set(year, new Set(winners))
    }
  }

  // Tally Golden Boot / Glove counts per player
  const playerGoldenBoot  = new Map<string, number>()
  const playerGoldenGlove = new Map<string, number>()
  for (const winners of goldenBootWinners.values()) {
    for (const name of winners) playerGoldenBoot.set(name, (playerGoldenBoot.get(name) ?? 0) + 1)
  }
  for (const winners of goldenGloveWinners.values()) {
    for (const name of winners) playerGoldenGlove.set(name, (playerGoldenGlove.get(name) ?? 0) + 1)
  }

  return { teamSeasons, playerPLWins, playerRelegations, playerGoldenBoot, playerGoldenGlove }
}

// ── Get all players satisfying a criterion ───────────────────────────────────
type PlayerData = {
  teamSeasons:       Map<string, Map<string, number>>
  playerPLWins:      Map<string, number>
  playerRelegations: Map<string, number>
  playerGoldenBoot:  Map<string, number>
  playerGoldenGlove: Map<string, number>
}

function getEligiblePlayers(
  type: string,
  ref: string | null,
  data: PlayerData
): Map<string, number> { // player_name → weight
  const result = new Map<string, number>()

  if (type === 'team') {
    for (const [name, teams] of data.teamSeasons) {
      const seasons = teams.get(ref!) ?? 0
      if (seasons > 0) result.set(name, seasons)
    }
  } else if (type === 'won_pl') {
    for (const [name, wins] of data.playerPLWins) {
      if (wins >= 1) result.set(name, wins)
    }
  } else if (type === 'won_3plus_pl') {
    for (const [name, wins] of data.playerPLWins) {
      if (wins >= 3) result.set(name, wins)
    }
  } else if (type === 'relegated') {
    for (const [name, rel] of data.playerRelegations) {
      if (rel >= 1) result.set(name, rel)
    }
  } else if (type === 'golden_boot') {
    for (const [name, boots] of data.playerGoldenBoot) {
      if (boots >= 1) result.set(name, boots)
    }
  } else if (type === 'golden_glove') {
    for (const [name, gloves] of data.playerGoldenGlove) {
      if (gloves >= 1) result.set(name, gloves)
    }
  }

  return result
}

// ── Compute scores for a cell ────────────────────────────────────────────────
type CellAnswer = {
  player_name: string
  combined_appearances: number
  score: number
  rank: number
  popularity_score: number
  popularity_rank: number
}

function computeCell(
  rowPlayers: Map<string, number>,
  colPlayers: Map<string, number>,
): CellAnswer[] {
  // Intersection
  const valid: Array<{ name: string; combined: number }> = []
  for (const [name, rowWeight] of rowPlayers) {
    const colWeight = colPlayers.get(name)
    if (colWeight !== undefined) {
      valid.push({ name, combined: rowWeight + colWeight })
    }
  }

  if (valid.length === 0) return []

  // Rarity: sort ascending by combined_appearances
  const byRarity = [...valid].sort((a, b) => a.combined - b.combined || a.name.localeCompare(b.name))
  const rarityRankMap = new Map<string, number>()
  byRarity.forEach((v, i) => rarityRankMap.set(v.name, i + 1))

  // Popularity: sort descending
  const byPop = [...valid].sort((a, b) => b.combined - a.combined || a.name.localeCompare(b.name))
  const popRankMap = new Map<string, number>()
  byPop.forEach((v, i) => popRankMap.set(v.name, i + 1))

  return valid.map(v => {
    const rRank = rarityRankMap.get(v.name)!
    const pRank = popRankMap.get(v.name)!
    return {
      player_name:          v.name,
      combined_appearances: v.combined,
      rank:                 rRank,
      score:                Math.min(rRank, 20),
      popularity_rank:      pRank,
      popularity_score:     Math.min(pRank, 20),
    }
  })
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Building player data maps...')
  const data = await buildPlayerData()

  console.log('\nFetching published puzzles...')
  const { data: puzzles, error: puzzleError } = await supabase
    .from('pl_grid_puzzles')
    .select('*')
    .eq('is_published', true)

  if (puzzleError) { console.error(puzzleError); process.exit(1) }
  console.log(`  ${(puzzles || []).length} puzzle(s)`)

  for (const puzzle of puzzles || []) {
    console.log(`\nProcessing puzzle ${puzzle.puzzle_date} (${puzzle.id})`)

    // Delete existing answers for this puzzle
    await supabase.from('pl_grid_cell_answers').delete().eq('puzzle_id', puzzle.id)

    const rows = [
      { type: puzzle.row1_type, ref: puzzle.row1_ref },
      { type: puzzle.row2_type, ref: puzzle.row2_ref },
      { type: puzzle.row3_type, ref: puzzle.row3_ref },
    ]
    const cols = [
      { type: puzzle.col1_type, ref: puzzle.col1_ref },
      { type: puzzle.col2_type, ref: puzzle.col2_ref },
      { type: puzzle.col3_type, ref: puzzle.col3_ref },
    ]

    const toInsert: Array<CellAnswer & { puzzle_id: string; row_index: number; col_index: number }> = []

    for (let ri = 0; ri < 3; ri++) {
      for (let ci = 0; ci < 3; ci++) {
        const rowEligible = getEligiblePlayers(rows[ri].type, rows[ri].ref, data)
        const colEligible = getEligiblePlayers(cols[ci].type, cols[ci].ref, data)
        const answers     = computeCell(rowEligible, colEligible)

        console.log(`  [${ri},${ci}] ${rows[ri].type}(${rows[ri].ref ?? '*'}) × ${cols[ci].type}(${cols[ci].ref ?? '*'}) → ${answers.length} answers`)

        for (const a of answers) {
          toInsert.push({ ...a, puzzle_id: puzzle.id, row_index: ri, col_index: ci })
        }
      }
    }

    // Insert in batches of 500
    const BATCH = 500
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH)
      const { error } = await supabase.from('pl_grid_cell_answers').insert(batch)
      if (error) console.error(`  Insert error (batch ${i / BATCH}):`, error)
      else console.log(`  Inserted batch ${Math.floor(i / BATCH) + 1} (${batch.length} rows)`)
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)

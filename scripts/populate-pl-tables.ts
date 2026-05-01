/**
 * One-time script to populate the pl_season_tables table in Supabase.
 *
 * Prerequisites:
 *   1. Run this SQL in Supabase dashboard first:
 *      CREATE TABLE pl_season_tables (
 *        season     TEXT    NOT NULL,
 *        team       TEXT    NOT NULL,
 *        position   INT     NOT NULL,
 *        relegated  BOOLEAN NOT NULL DEFAULT false,
 *        PRIMARY KEY (season, team)
 *      );
 *
 *   2. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local (needed for inserts).
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/populate-pl-tables.ts
 *
 * IMPORTANT: team names must exactly match the teams_played_for values in
 * player_seasons. If something doesn't join up, add an entry to TEAM_NAME_MAP.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ---------------------------------------------------------------------------
// If your DB uses slightly different team names, add mappings here.
// e.g. 'Brighton' -> 'Brighton & Hove Albion'
// ---------------------------------------------------------------------------
const TEAM_NAME_MAP: Record<string, string> = {}

function t(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
}

// ---------------------------------------------------------------------------
// PL season data.
// teamCount: 22 for 1992-95, 20 from 1995-96 onwards.
// relegationSpots: normally 3; 4 in 1994-95 to reduce to 20 teams.
// table: [teamName, finishingPosition]
// Relegated = position > teamCount - relegationSpots
// ---------------------------------------------------------------------------
type Season = {
  season: string
  teamCount: 20 | 22
  relegationSpots?: number  // defaults to 3
  table: [string, number][]
}

const SEASONS: Season[] = [
  {
    season: '1992-93', teamCount: 22,
    table: [
      ['Manchester United', 1], ['Aston Villa', 2], ['Norwich City', 3], ['Blackburn Rovers', 4],
      ['Queens Park Rangers', 5], ['Liverpool', 6], ['Sheffield Wednesday', 7], ['Tottenham Hotspur', 8],
      ['Manchester City', 9], ['Arsenal', 10], ['Chelsea', 11], ['Wimbledon', 12],
      ['Everton', 13], ['Sheffield United', 14], ['Coventry City', 15], ['Ipswich Town', 16],
      ['Leeds United', 17], ['Southampton', 18], ['Oldham Athletic', 19],
      ['Crystal Palace', 20], ['Middlesbrough', 21], ['Nottingham Forest', 22],
    ],
  },
  {
    season: '1993-94', teamCount: 22,
    table: [
      ['Manchester United', 1], ['Blackburn Rovers', 2], ['Newcastle United', 3], ['Arsenal', 4],
      ['Leeds United', 5], ['Wimbledon', 6], ['Sheffield Wednesday', 7], ['Liverpool', 8],
      ['Queens Park Rangers', 9], ['Aston Villa', 10], ['Coventry City', 11], ['Norwich City', 12],
      ['West Ham United', 13], ['Chelsea', 14], ['Tottenham Hotspur', 15], ['Manchester City', 16],
      ['Everton', 17], ['Southampton', 18], ['Ipswich Town', 19],
      ['Sheffield United', 20], ['Oldham Athletic', 21], ['Swindon Town', 22],
    ],
  },
  {
    // 4 relegated to reduce from 22 to 20 teams
    season: '1994-95', teamCount: 22, relegationSpots: 4,
    table: [
      ['Blackburn Rovers', 1], ['Manchester United', 2], ['Nottingham Forest', 3], ['Liverpool', 4],
      ['Leeds United', 5], ['Newcastle United', 6], ['Tottenham Hotspur', 7], ['Queens Park Rangers', 8],
      ['Wimbledon', 9], ['Southampton', 10], ['Chelsea', 11], ['Arsenal', 12],
      ['Sheffield Wednesday', 13], ['West Ham United', 14], ['Everton', 15], ['Coventry City', 16],
      ['Manchester City', 17], ['Aston Villa', 18],
      ['Crystal Palace', 19], ['Norwich City', 20], ['Leicester City', 21], ['Ipswich Town', 22],
    ],
  },
  {
    season: '1995-96', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Newcastle United', 2], ['Liverpool', 3], ['Aston Villa', 4],
      ['Arsenal', 5], ['Everton', 6], ['Blackburn Rovers', 7], ['Tottenham Hotspur', 8],
      ['Nottingham Forest', 9], ['West Ham United', 10], ['Chelsea', 11], ['Middlesbrough', 12],
      ['Leeds United', 13], ['Wimbledon', 14], ['Sheffield Wednesday', 15], ['Coventry City', 16],
      ['Southampton', 17], ['Manchester City', 18], ['Queens Park Rangers', 19], ['Bolton Wanderers', 20],
    ],
  },
  {
    season: '1996-97', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Newcastle United', 2], ['Arsenal', 3], ['Liverpool', 4],
      ['Aston Villa', 5], ['Chelsea', 6], ['Sheffield Wednesday', 7], ['Wimbledon', 8],
      ['Leicester City', 9], ['Tottenham Hotspur', 10], ['Leeds United', 11], ['Derby County', 12],
      ['Blackburn Rovers', 13], ['West Ham United', 14], ['Everton', 15], ['Southampton', 16],
      ['Coventry City', 17], ['Sunderland', 18], ['Middlesbrough', 19], ['Nottingham Forest', 20],
    ],
  },
  {
    season: '1997-98', teamCount: 20,
    table: [
      ['Arsenal', 1], ['Manchester United', 2], ['Liverpool', 3], ['Chelsea', 4],
      ['Leeds United', 5], ['Blackburn Rovers', 6], ['Aston Villa', 7], ['West Ham United', 8],
      ['Derby County', 9], ['Leicester City', 10], ['Coventry City', 11], ['Southampton', 12],
      ['Newcastle United', 13], ['Tottenham Hotspur', 14], ['Wimbledon', 15], ['Sheffield Wednesday', 16],
      ['Everton', 17], ['Bolton Wanderers', 18], ['Barnsley', 19], ['Crystal Palace', 20],
    ],
  },
  {
    season: '1998-99', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Arsenal', 2], ['Chelsea', 3], ['Leeds United', 4],
      ['West Ham United', 5], ['Aston Villa', 6], ['Liverpool', 7], ['Derby County', 8],
      ['Middlesbrough', 9], ['Leicester City', 10], ['Tottenham Hotspur', 11], ['Sheffield Wednesday', 12],
      ['Newcastle United', 13], ['Everton', 14], ['Coventry City', 15], ['Wimbledon', 16],
      ['Southampton', 17], ['Charlton Athletic', 18], ['Blackburn Rovers', 19], ['Nottingham Forest', 20],
    ],
  },
  {
    season: '1999-00', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Arsenal', 2], ['Leeds United', 3], ['Liverpool', 4],
      ['Chelsea', 5], ['Aston Villa', 6], ['Sunderland', 7], ['Leicester City', 8],
      ['West Ham United', 9], ['Tottenham Hotspur', 10], ['Newcastle United', 11], ['Middlesbrough', 12],
      ['Everton', 13], ['Coventry City', 14], ['Southampton', 15], ['Derby County', 16],
      ['Bradford City', 17], ['Wimbledon', 18], ['Sheffield Wednesday', 19], ['Watford', 20],
    ],
  },
  {
    season: '2000-01', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Arsenal', 2], ['Liverpool', 3], ['Leeds United', 4],
      ['Ipswich Town', 5], ['Chelsea', 6], ['Sunderland', 7], ['Aston Villa', 8],
      ['Charlton Athletic', 9], ['Southampton', 10], ['Newcastle United', 11], ['Tottenham Hotspur', 12],
      ['Leicester City', 13], ['Middlesbrough', 14], ['West Ham United', 15], ['Everton', 16],
      ['Derby County', 17], ['Manchester City', 18], ['Coventry City', 19], ['Bradford City', 20],
    ],
  },
  {
    season: '2001-02', teamCount: 20,
    table: [
      ['Arsenal', 1], ['Liverpool', 2], ['Manchester United', 3], ['Newcastle United', 4],
      ['Leeds United', 5], ['Chelsea', 6], ['West Ham United', 7], ['Aston Villa', 8],
      ['Tottenham Hotspur', 9], ['Blackburn Rovers', 10], ['Southampton', 11], ['Middlesbrough', 12],
      ['Fulham', 13], ['Charlton Athletic', 14], ['Everton', 15], ['Bolton Wanderers', 16],
      ['Sunderland', 17], ['Ipswich Town', 18], ['Derby County', 19], ['Leicester City', 20],
    ],
  },
  {
    season: '2002-03', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Arsenal', 2], ['Newcastle United', 3], ['Chelsea', 4],
      ['Liverpool', 5], ['Blackburn Rovers', 6], ['Everton', 7], ['Southampton', 8],
      ['Manchester City', 9], ['Tottenham Hotspur', 10], ['Middlesbrough', 11], ['Charlton Athletic', 12],
      ['Birmingham City', 13], ['Fulham', 14], ['Leeds United', 15], ['Aston Villa', 16],
      ['Bolton Wanderers', 17], ['West Ham United', 18], ['West Bromwich Albion', 19], ['Sunderland', 20],
    ],
  },
  {
    season: '2003-04', teamCount: 20,
    table: [
      ['Arsenal', 1], ['Chelsea', 2], ['Manchester United', 3], ['Liverpool', 4],
      ['Newcastle United', 5], ['Aston Villa', 6], ['Charlton Athletic', 7], ['Bolton Wanderers', 8],
      ['Fulham', 9], ['Birmingham City', 10], ['Middlesbrough', 11], ['Southampton', 12],
      ['Portsmouth', 13], ['Tottenham Hotspur', 14], ['Blackburn Rovers', 15], ['Manchester City', 16],
      ['Everton', 17], ['Leicester City', 18], ['Leeds United', 19], ['Wolverhampton Wanderers', 20],
    ],
  },
  {
    season: '2004-05', teamCount: 20,
    table: [
      ['Chelsea', 1], ['Arsenal', 2], ['Manchester United', 3], ['Everton', 4],
      ['Liverpool', 5], ['Bolton Wanderers', 6], ['Middlesbrough', 7], ['Manchester City', 8],
      ['Tottenham Hotspur', 9], ['Aston Villa', 10], ['Charlton Athletic', 11], ['Birmingham City', 12],
      ['Fulham', 13], ['Newcastle United', 14], ['Blackburn Rovers', 15], ['Portsmouth', 16],
      ['West Bromwich Albion', 17], ['Crystal Palace', 18], ['Norwich City', 19], ['Southampton', 20],
    ],
  },
  {
    season: '2005-06', teamCount: 20,
    table: [
      ['Chelsea', 1], ['Manchester United', 2], ['Liverpool', 3], ['Arsenal', 4],
      ['Tottenham Hotspur', 5], ['Blackburn Rovers', 6], ['Newcastle United', 7], ['Bolton Wanderers', 8],
      ['West Ham United', 9], ['Wigan Athletic', 10], ['Everton', 11], ['Fulham', 12],
      ['Charlton Athletic', 13], ['Middlesbrough', 14], ['Manchester City', 15], ['Aston Villa', 16],
      ['Portsmouth', 17], ['Birmingham City', 18], ['West Bromwich Albion', 19], ['Sunderland', 20],
    ],
  },
  {
    season: '2006-07', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Chelsea', 2], ['Liverpool', 3], ['Arsenal', 4],
      ['Tottenham Hotspur', 5], ['Everton', 6], ['Bolton Wanderers', 7], ['Reading', 8],
      ['Portsmouth', 9], ['Blackburn Rovers', 10], ['Aston Villa', 11], ['Middlesbrough', 12],
      ['Newcastle United', 13], ['Manchester City', 14], ['West Ham United', 15], ['Fulham', 16],
      ['Wigan Athletic', 17], ['Sheffield United', 18], ['Charlton Athletic', 19], ['Watford', 20],
    ],
  },
  {
    season: '2007-08', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Chelsea', 2], ['Arsenal', 3], ['Liverpool', 4],
      ['Everton', 5], ['Aston Villa', 6], ['Blackburn Rovers', 7], ['Portsmouth', 8],
      ['Manchester City', 9], ['West Ham United', 10], ['Tottenham Hotspur', 11], ['Newcastle United', 12],
      ['Middlesbrough', 13], ['Wigan Athletic', 14], ['Sunderland', 15], ['Bolton Wanderers', 16],
      ['Fulham', 17], ['Reading', 18], ['Birmingham City', 19], ['Derby County', 20],
    ],
  },
  {
    season: '2008-09', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Liverpool', 2], ['Chelsea', 3], ['Arsenal', 4],
      ['Everton', 5], ['Aston Villa', 6], ['Fulham', 7], ['Tottenham Hotspur', 8],
      ['West Ham United', 9], ['Manchester City', 10], ['Wigan Athletic', 11], ['Stoke City', 12],
      ['Bolton Wanderers', 13], ['Portsmouth', 14], ['Blackburn Rovers', 15], ['Sunderland', 16],
      ['Hull City', 17], ['Newcastle United', 18], ['Middlesbrough', 19], ['West Bromwich Albion', 20],
    ],
  },
  {
    season: '2009-10', teamCount: 20,
    table: [
      ['Chelsea', 1], ['Manchester United', 2], ['Arsenal', 3], ['Tottenham Hotspur', 4],
      ['Manchester City', 5], ['Aston Villa', 6], ['Liverpool', 7], ['Everton', 8],
      ['Birmingham City', 9], ['Blackburn Rovers', 10], ['Stoke City', 11], ['Fulham', 12],
      ['Sunderland', 13], ['Bolton Wanderers', 14], ['Wolverhampton Wanderers', 15], ['Wigan Athletic', 16],
      ['West Ham United', 17], ['Burnley', 18], ['Hull City', 19], ['Portsmouth', 20],
    ],
  },
  {
    season: '2010-11', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Chelsea', 2], ['Manchester City', 3], ['Arsenal', 4],
      ['Tottenham Hotspur', 5], ['Liverpool', 6], ['Everton', 7], ['Fulham', 8],
      ['Aston Villa', 9], ['Sunderland', 10], ['West Bromwich Albion', 11], ['Newcastle United', 12],
      ['Stoke City', 13], ['Bolton Wanderers', 14], ['Blackburn Rovers', 15], ['Wigan Athletic', 16],
      ['Wolverhampton Wanderers', 17], ['Birmingham City', 18], ['Blackpool', 19], ['West Ham United', 20],
    ],
  },
  {
    season: '2011-12', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Manchester United', 2], ['Arsenal', 3], ['Tottenham Hotspur', 4],
      ['Newcastle United', 5], ['Chelsea', 6], ['Everton', 7], ['Liverpool', 8],
      ['Fulham', 9], ['West Bromwich Albion', 10], ['Swansea City', 11], ['Norwich City', 12],
      ['Sunderland', 13], ['Stoke City', 14], ['Wigan Athletic', 15], ['Aston Villa', 16],
      ['Queens Park Rangers', 17], ['Bolton Wanderers', 18], ['Blackburn Rovers', 19], ['Wolverhampton Wanderers', 20],
    ],
  },
  {
    season: '2012-13', teamCount: 20,
    table: [
      ['Manchester United', 1], ['Manchester City', 2], ['Chelsea', 3], ['Arsenal', 4],
      ['Tottenham Hotspur', 5], ['Everton', 6], ['Liverpool', 7], ['West Bromwich Albion', 8],
      ['Swansea City', 9], ['West Ham United', 10], ['Norwich City', 11], ['Fulham', 12],
      ['Stoke City', 13], ['Southampton', 14], ['Aston Villa', 15], ['Newcastle United', 16],
      ['Sunderland', 17], ['Wigan Athletic', 18], ['Reading', 19], ['Queens Park Rangers', 20],
    ],
  },
  {
    season: '2013-14', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Liverpool', 2], ['Chelsea', 3], ['Arsenal', 4],
      ['Everton', 5], ['Tottenham Hotspur', 6], ['Manchester United', 7], ['Southampton', 8],
      ['Stoke City', 9], ['Newcastle United', 10], ['Crystal Palace', 11], ['Swansea City', 12],
      ['West Ham United', 13], ['Sunderland', 14], ['Aston Villa', 15], ['Hull City', 16],
      ['West Bromwich Albion', 17], ['Norwich City', 18], ['Fulham', 19], ['Cardiff City', 20],
    ],
  },
  {
    season: '2014-15', teamCount: 20,
    table: [
      ['Chelsea', 1], ['Manchester City', 2], ['Arsenal', 3], ['Manchester United', 4],
      ['Tottenham Hotspur', 5], ['Liverpool', 6], ['Southampton', 7], ['Swansea City', 8],
      ['Stoke City', 9], ['Crystal Palace', 10], ['Everton', 11], ['West Ham United', 12],
      ['West Bromwich Albion', 13], ['Leicester City', 14], ['Newcastle United', 15], ['Sunderland', 16],
      ['Aston Villa', 17], ['Hull City', 18], ['Burnley', 19], ['Queens Park Rangers', 20],
    ],
  },
  {
    season: '2015-16', teamCount: 20,
    table: [
      ['Leicester City', 1], ['Arsenal', 2], ['Tottenham Hotspur', 3], ['Manchester City', 4],
      ['Manchester United', 5], ['Southampton', 6], ['West Ham United', 7], ['Liverpool', 8],
      ['Stoke City', 9], ['Chelsea', 10], ['Everton', 11], ['Swansea City', 12],
      ['Watford', 13], ['West Bromwich Albion', 14], ['Crystal Palace', 15], ['Bournemouth', 16],
      ['Sunderland', 17], ['Newcastle United', 18], ['Norwich City', 19], ['Aston Villa', 20],
    ],
  },
  {
    season: '2016-17', teamCount: 20,
    table: [
      ['Chelsea', 1], ['Tottenham Hotspur', 2], ['Manchester City', 3], ['Liverpool', 4],
      ['Arsenal', 5], ['Manchester United', 6], ['Everton', 7], ['Southampton', 8],
      ['Bournemouth', 9], ['West Bromwich Albion', 10], ['West Ham United', 11], ['Leicester City', 12],
      ['Stoke City', 13], ['Crystal Palace', 14], ['Swansea City', 15], ['Burnley', 16],
      ['Watford', 17], ['Hull City', 18], ['Middlesbrough', 19], ['Sunderland', 20],
    ],
  },
  {
    season: '2017-18', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Manchester United', 2], ['Tottenham Hotspur', 3], ['Liverpool', 4],
      ['Chelsea', 5], ['Arsenal', 6], ['Burnley', 7], ['Everton', 8],
      ['Leicester City', 9], ['Newcastle United', 10], ['Crystal Palace', 11], ['Bournemouth', 12],
      ['West Ham United', 13], ['Watford', 14], ['Brighton & Hove Albion', 15], ['Huddersfield Town', 16],
      ['Southampton', 17], ['Swansea City', 18], ['Stoke City', 19], ['West Bromwich Albion', 20],
    ],
  },
  {
    season: '2018-19', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Liverpool', 2], ['Chelsea', 3], ['Tottenham Hotspur', 4],
      ['Arsenal', 5], ['Manchester United', 6], ['Wolverhampton Wanderers', 7], ['Everton', 8],
      ['Leicester City', 9], ['West Ham United', 10], ['Watford', 11], ['Crystal Palace', 12],
      ['Newcastle United', 13], ['Bournemouth', 14], ['Burnley', 15], ['Southampton', 16],
      ['Brighton & Hove Albion', 17], ['Cardiff City', 18], ['Fulham', 19], ['Huddersfield Town', 20],
    ],
  },
  {
    season: '2019-20', teamCount: 20,
    table: [
      ['Liverpool', 1], ['Manchester City', 2], ['Manchester United', 3], ['Chelsea', 4],
      ['Leicester City', 5], ['Tottenham Hotspur', 6], ['Wolverhampton Wanderers', 7], ['Arsenal', 8],
      ['Sheffield United', 9], ['Burnley', 10], ['Southampton', 11], ['Everton', 12],
      ['Newcastle United', 13], ['Crystal Palace', 14], ['Brighton & Hove Albion', 15], ['West Ham United', 16],
      ['Aston Villa', 17], ['Bournemouth', 18], ['Watford', 19], ['Norwich City', 20],
    ],
  },
  {
    season: '2020-21', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Manchester United', 2], ['Liverpool', 3], ['Chelsea', 4],
      ['Leicester City', 5], ['West Ham United', 6], ['Tottenham Hotspur', 7], ['Arsenal', 8],
      ['Leeds United', 9], ['Everton', 10], ['Aston Villa', 11], ['Newcastle United', 12],
      ['Wolverhampton Wanderers', 13], ['Crystal Palace', 14], ['Southampton', 15], ['Brighton & Hove Albion', 16],
      ['Burnley', 17], ['Fulham', 18], ['West Bromwich Albion', 19], ['Sheffield United', 20],
    ],
  },
  {
    season: '2021-22', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Liverpool', 2], ['Chelsea', 3], ['Tottenham Hotspur', 4],
      ['Arsenal', 5], ['Manchester United', 6], ['West Ham United', 7], ['Leicester City', 8],
      ['Brighton & Hove Albion', 9], ['Wolverhampton Wanderers', 10], ['Newcastle United', 11], ['Crystal Palace', 12],
      ['Brentford', 13], ['Aston Villa', 14], ['Southampton', 15], ['Everton', 16],
      ['Leeds United', 17], ['Burnley', 18], ['Watford', 19], ['Norwich City', 20],
    ],
  },
  {
    season: '2022-23', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Arsenal', 2], ['Manchester United', 3], ['Newcastle United', 4],
      ['Liverpool', 5], ['Brighton & Hove Albion', 6], ['Aston Villa', 7], ['Tottenham Hotspur', 8],
      ['Brentford', 9], ['Fulham', 10], ['Crystal Palace', 11], ['Chelsea', 12],
      ['Wolverhampton Wanderers', 13], ['West Ham United', 14], ['Bournemouth', 15], ['Nottingham Forest', 16],
      ['Everton', 17], ['Leicester City', 18], ['Leeds United', 19], ['Southampton', 20],
    ],
  },
  {
    season: '2023-24', teamCount: 20,
    table: [
      ['Manchester City', 1], ['Arsenal', 2], ['Liverpool', 3], ['Aston Villa', 4],
      ['Tottenham Hotspur', 5], ['Chelsea', 6], ['Newcastle United', 7], ['Manchester United', 8],
      ['West Ham United', 9], ['Brighton & Hove Albion', 10], ['Wolverhampton Wanderers', 11], ['Fulham', 12],
      ['Bournemouth', 13], ['Crystal Palace', 14], ['Brentford', 15], ['Everton', 16],
      ['Nottingham Forest', 17], ['Luton Town', 18], ['Burnley', 19], ['Sheffield United', 20],
    ],
  },
]

async function run() {
  const rows: { season: string; team: string; position: number; relegated: boolean }[] = []

  for (const s of SEASONS) {
    const relSpots = s.relegationSpots ?? 3
    const relCutoff = s.teamCount - relSpots  // position > this = relegated

    for (const [rawTeam, position] of s.table) {
      rows.push({
        season: s.season,
        team: t(rawTeam),
        position,
        relegated: position > relCutoff,
      })
    }
  }

  console.log(`Inserting ${rows.length} rows across ${SEASONS.length} seasons...`)

  // Upsert in batches of 200
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const { error } = await supabase
      .from('pl_season_tables')
      .upsert(batch, { onConflict: 'season,team' })
    if (error) {
      console.error('Error inserting batch:', error)
      process.exit(1)
    }
    console.log(`  Inserted rows ${i + 1}–${Math.min(i + 200, rows.length)}`)
  }

  console.log('Done.')

  // Sanity check: show title winners and relegated teams
  console.log('\nTitle winners:')
  SEASONS.forEach(s => {
    const winner = s.table.find(([, p]) => p === 1)
    if (winner) console.log(`  ${s.season}: ${winner[0]}`)
  })

  const relSpots_ = (s: Season) => s.relegationSpots ?? 3
  console.log('\nRelgated teams per season:')
  SEASONS.forEach(s => {
    const cutoff = s.teamCount - relSpots_(s)
    const rel = s.table.filter(([, p]) => p > cutoff).map(([n]) => n)
    console.log(`  ${s.season} (${s.teamCount} teams, ${relSpots_(s)} down): ${rel.join(', ')}`)
  })
}

run().catch(err => { console.error(err); process.exit(1) })

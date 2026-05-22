// Required Supabase table:
// CREATE TABLE blackjack_leaderboard (
//   id bigserial PRIMARY KEY,
//   username text NOT NULL,
//   streak integer NOT NULL,
//   mode text NOT NULL DEFAULT 'easy',
//   created_at timestamptz DEFAULT now()
// );

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const STAT_COLS: Record<string, string> = {
  goals:        'goals',
  assists:      'assists',
  yellow_cards: 'cards_yellow',
  clean_sheets: 'gk_clean_sheets',
}

// ── Run BOTH functions once in the Supabase SQL editor ────────────────────────
//
// 1) Distinct seasons (fixes biased season selection):
// CREATE OR REPLACE FUNCTION get_distinct_seasons()
// RETURNS TABLE(year_id text) LANGUAGE sql STABLE AS $$
//   SELECT DISTINCT year_id::text
//   FROM player_seasons
//   WHERE year_id IS NOT NULL
//   ORDER BY year_id DESC;
// $$;
//
// 2) Club seasons stat (only single-club rows — no commas in teams_played_for):
// CREATE OR REPLACE FUNCTION get_club_seasons()
// RETURNS TABLE(player text, team text, value bigint) LANGUAGE sql STABLE AS $$
//   SELECT name_display::text,
//          TRIM(teams_played_for::text)::text,
//          COUNT(*)::bigint
//   FROM player_seasons
//   WHERE teams_played_for IS NOT NULL
//     AND teams_played_for != ''
//     AND teams_played_for NOT LIKE '%,%'
//   GROUP BY name_display, TRIM(teams_played_for::text)
//   HAVING COUNT(*) >= 2
//   ORDER BY COUNT(*) DESC LIMIT 200;
// $$;
// ─────────────────────────────────────────────────────────────────────────────

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function shuffleArr<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sb = getClient()

  if (searchParams.get('seasons') === '1') {
    // Try RPC first (accurate — no row-limit issues)
    const { data: rpcSeasons, error: rpcSeasonsErr } = await sb.rpc('get_distinct_seasons')
    if (!rpcSeasonsErr && Array.isArray(rpcSeasons) && rpcSeasons.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seasons = (rpcSeasons as any[]).map((r: any) => String(r.year_id || '')).filter(Boolean)
      return NextResponse.json(seasons)
    }
    // Fallback: two parallel fetches (ASC + DESC) to sample both ends of the season range
    const [{ data: asc }, { data: desc }] = await Promise.all([
      sb.from('player_seasons').select('year_id').order('year_id', { ascending: true }).limit(1000),
      sb.from('player_seasons').select('year_id').order('year_id', { ascending: false }).limit(1000),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasons = [...new Set([...(asc || []), ...(desc || [])].map((r: any) => r.year_id as string))]
      .filter(Boolean).sort().reverse()
    return NextResponse.json(seasons)
  }

  if (searchParams.get('leaderboard') === '1') {
    const { data } = await sb
      .from('blackjack_leaderboard')
      .select('username, streak, mode')
      .order('streak', { ascending: false })
      .limit(20)
    return NextResponse.json(data || [])
  }

  const stat   = searchParams.get('stat')
  const season = searchParams.get('season')

  // ── Club seasons stat ────────────────────────────────────────────────────────
  if (stat === 'club_seasons') {
    // Try RPC function first (see SQL comment above)
    const { data: rpcData, error: rpcErr } = await sb.rpc('get_club_seasons')
    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cards = shuffleArr((rpcData as any[]).map((r: any) => ({
        player: String(r.player || ''),
        team:   String(r.team || ''),
        value:  Number(r.value),
      }))).slice(0, 52)
      return NextResponse.json(cards)
    }
    // Fallback: JS aggregation — fetch all rows to count seasons per player+club
    const { data: rawData } = await sb
      .from('player_seasons')
      .select('name_display, teams_played_for')
      .limit(50000)
    const counts: Record<string, { player: string; team: string; value: number }> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (rawData || []) as any[]) {
      const player  = String(row.name_display || '').trim()
      const rawTeam = String(row.teams_played_for || '').trim()
      // Skip rows with multiple clubs (career-list format or mid-season transfers)
      // so count = seasons at that specific club, not total career seasons
      if (!player || !rawTeam || rawTeam.includes(',')) continue
      const key = `${player}|||${rawTeam}`
      if (!counts[key]) counts[key] = { player, team: rawTeam, value: 0 }
      counts[key].value++
    }
    // Take top 200 by season count (mirrors the RPC), then shuffle for randomness
    const cards = shuffleArr(
      Object.values(counts)
        .filter(c => c.value >= 2)
        .sort((a, b) => b.value - a.value)
        .slice(0, 200)
    ).slice(0, 52)
    return NextResponse.json(cards)
  }

  if (!stat || !season || !STAT_COLS[stat]) {
    return NextResponse.json({ error: 'Missing stat or season' }, { status: 400 })
  }

  const col = STAT_COLS[stat]
  const { data, error } = await sb
    .from('player_seasons')
    .select(`name_display, teams_played_for, ${col}`)
    .eq('year_id', season)
    .gt(col, 0)
    .order(col, { ascending: false })
    .limit(52)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards = (data || []).map((row: any) => ({
    player: row.name_display as string,
    team:   ((row.teams_played_for as string) || '').split(',')[0].trim(),
    value:  row[col] as number,
  }))

  return NextResponse.json(cards)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, streak, mode } = body
  if (!username || typeof streak !== 'number') {
    return NextResponse.json({ error: 'Bad input' }, { status: 400 })
  }
  const sb = getClient()
  await sb.from('blackjack_leaderboard').insert({ username, streak, mode })
  const { data } = await sb
    .from('blackjack_leaderboard')
    .select('username, streak, mode')
    .order('streak', { ascending: false })
    .limit(20)
  return NextResponse.json(data || [])
}

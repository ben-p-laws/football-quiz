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

// Supabase function required for club_seasons stat — run once in SQL editor:
// CREATE OR REPLACE FUNCTION get_club_seasons()
// RETURNS TABLE(player text, team text, value bigint) LANGUAGE sql STABLE AS $$
//   SELECT name_display::text,
//          TRIM(SPLIT_PART(teams_played_for::text, ',', 1))::text,
//          COUNT(*)::bigint
//   FROM player_seasons
//   WHERE teams_played_for IS NOT NULL AND teams_played_for != ''
//   GROUP BY name_display, TRIM(SPLIT_PART(teams_played_for::text, ',', 1))
//   HAVING COUNT(*) >= 2
//   ORDER BY COUNT(*) DESC LIMIT 200;
// $$;

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
    const { data } = await sb.from('player_seasons').select('year_id')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasons = [...new Set((data || []).map((r: any) => r.year_id as string))]
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
    // Fallback: JS aggregation from first page of raw data
    const { data: rawData } = await sb
      .from('player_seasons')
      .select('name_display, teams_played_for')
    const counts: Record<string, { player: string; team: string; value: number }> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (rawData || []) as any[]) {
      const player = String(row.name_display || '').trim()
      const team   = String(row.teams_played_for || '').split(',')[0].trim()
      if (!player || !team) continue
      const key = `${player}|||${team}`
      if (!counts[key]) counts[key] = { player, team, value: 0 }
      counts[key].value++
    }
    const cards = shuffleArr(Object.values(counts).filter(c => c.value >= 2)).slice(0, 52)
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

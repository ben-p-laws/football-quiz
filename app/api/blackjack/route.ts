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

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
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

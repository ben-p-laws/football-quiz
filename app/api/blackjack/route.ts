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

type Card = { player: string; team: string; value: number }

// Pick up to targetPerBucket cards from each exact value bucket 2–11.
// Values outside 2–11 are ignored. No overflow filling between buckets.
function bucketSample(items: Card[], targetPerBucket: number): Card[] {
  const buckets: Record<number, Card[]> = {}
  for (let v = 2; v <= 11; v++) buckets[v] = []
  for (const item of items) {
    if (item.value >= 2 && item.value <= 11) buckets[item.value].push(item)
  }

  const selected: Card[] = []
  for (let v = 2; v <= 11; v++) {
    selected.push(...shuffleArr(buckets[v]).slice(0, targetPerBucket))
  }
  return shuffleArr(selected)
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
  // 10 players per value 2–11 = 100-card deck for perfectly even distribution.
  if (stat === 'club_seasons') {
    const { data: rawData } = await sb
      .from('player_seasons')
      .select('name_display, teams_played_for')
      .limit(50000)

    const counts: Record<string, Card> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (rawData || []) as any[]) {
      const player  = String(row.name_display || '').trim()
      const rawTeam = String(row.teams_played_for || '').trim()
      // Skip rows with multiple clubs (career-list or mid-season transfers)
      if (!player || !rawTeam || rawTeam.includes(',')) continue
      const key = `${player}|||${rawTeam}`
      if (!counts[key]) counts[key] = { player, team: rawTeam, value: 0 }
      counts[key].value++
    }

    // Strict 2–11 only. Players with 12+ seasons are excluded.
    const allCards = Object.values(counts).filter(c => c.value >= 2 && c.value <= 11)
    const cards = bucketSample(allCards, 10)
    return NextResponse.json(cards)
  }

  if (!stat || !season || !STAT_COLS[stat]) {
    return NextResponse.json({ error: 'Missing stat or season' }, { status: 400 })
  }

  const col = STAT_COLS[stat]

  // ── Regular stats: ~5 players per value 2–11, fill to 52 from overflow ──────
  const { data, error } = await sb
    .from('player_seasons')
    .select(`name_display, teams_played_for, ${col}`)
    .eq('year_id', season)
    .gte(col, 2)
    .lte(col, 11)
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCards: Card[] = (data || []).map((row: any) => ({
    player: String(row.name_display),
    team:   (String(row.teams_played_for || '')).split(',')[0].trim(),
    value:  Number(row[col]),
  }))

  const cards = bucketSample(allCards, 5)
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

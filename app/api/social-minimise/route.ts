import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Famous PL players — matched case-insensitively against name_display in DB
const FAMOUS_NAMES = [
  'Alan Shearer', 'Thierry Henry', 'Frank Lampard', 'Wayne Rooney',
  'Steven Gerrard', 'Ryan Giggs', 'Paul Scholes', 'Cristiano Ronaldo',
  'Didier Drogba', 'Dennis Bergkamp', 'Robbie Fowler', 'Michael Owen',
  'Patrick Vieira', 'Kevin De Bruyne', 'Mohamed Salah', 'Sergio Aguero',
  'Harry Kane', 'Eden Hazard', 'John Terry', 'Rio Ferdinand',
  'Nemanja Vidic', 'Ashley Cole', 'Luis Suarez', 'Fernando Torres',
  'Sadio Mane', 'David Silva', 'Yaya Toure', "N'Golo Kante",
  'Nicolas Anelka', 'Dwight Yorke', 'Jamie Vardy', 'Robbie Keane',
  'Jimmy Floyd Hasselbaink', 'Emile Heskey', 'Teddy Sheringham',
  'Peter Schmeichel', 'Andrew Cole', 'Les Ferdinand', 'Dion Dublin',
  'Tim Cahill', 'Darren Bent', 'Peter Crouch', 'Michael Essien',
  'Gareth Bale', 'Robin van Persie',
]
const FAMOUS_LOWER = new Map(FAMOUS_NAMES.map(n => [n.toLowerCase(), n]))

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Agg = {
  games: number
  goals: number
  assists: number
  cards_yellow: number
  cards_red: number
  pens_made: number
  min_score_age: number | null
  max_age: number
}

async function buildData() {
  const columns = 'name_display,games,goals,assists,cards_yellow,cards_red,pens_made,age'
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

  const agg: Record<string, Agg> = {}
  for (const row of all) {
    const name = row.name_display as string
    if (!agg[name]) agg[name] = { games: 0, goals: 0, assists: 0, cards_yellow: 0, cards_red: 0, pens_made: 0, min_score_age: null, max_age: 0 }
    const p = agg[name]
    const age   = (row.age   as number) || 0
    const games = (row.games as number) || 0
    const goals = (row.goals as number) || 0
    p.games        += games
    p.goals        += goals
    p.assists      += (row.assists      as number) || 0
    p.cards_yellow += (row.cards_yellow as number) || 0
    p.cards_red    += (row.cards_red    as number) || 0
    p.pens_made    += (row.pens_made    as number) || 0
    if (games > 0 && age > p.max_age) p.max_age = age
    if (goals > 0 && age > 0 && (p.min_score_age === null || age < p.min_score_age)) p.min_score_age = age
  }

  // Build a lookup: lowercase DB name → canonical DB name
  const dbLower = new Map(Object.keys(agg).map(n => [n.toLowerCase(), n]))

  // Resolve which famous names are found in the DB
  const resolvedPlayers: { name: string; dbName: string }[] = []
  for (const [lo, canonical] of FAMOUS_LOWER) {
    const dbName = dbLower.get(lo)
    if (dbName && agg[dbName]) resolvedPlayers.push({ name: canonical, dbName })
  }

  type RankEntry = { rank: number; value: string }
  const rankings: Record<string, Record<string, RankEntry>> = {
    goals: {}, assists: {}, appearances: {}, yellow_cards: {},
    red_cards: {}, youngest_scorer: {}, oldest_player: {}, penalties_scored: {},
  }

  const famousDbNames = new Set(resolvedPlayers.map(p => p.dbName))

  function buildRank(
    catKey: string,
    getValue: (p: Agg) => number | null,
    higherBetter: boolean,
    fmt: (v: number) => string,
  ) {
    const pool = Object.entries(agg)
      .map(([name, p]) => ({ name, val: getValue(p) }))
      .filter((x): x is { name: string; val: number } => x.val !== null && x.val > 0)
    pool.sort((a, b) => higherBetter ? b.val - a.val : a.val - b.val)
    pool.forEach((x, i) => {
      if (famousDbNames.has(x.name)) {
        const canonical = resolvedPlayers.find(p => p.dbName === x.name)!.name
        rankings[catKey][canonical] = { rank: i + 1, value: fmt(x.val) }
      }
    })
  }

  buildRank('goals',           p => p.goals,         true,  v => String(v))
  buildRank('assists',         p => p.assists,        true,  v => String(v))
  buildRank('appearances',     p => p.games,          true,  v => String(v))
  buildRank('yellow_cards',    p => p.cards_yellow,   true,  v => String(v))
  buildRank('red_cards',       p => p.cards_red,      true,  v => String(v))
  buildRank('youngest_scorer', p => p.min_score_age,  false, v => String(v))
  buildRank('oldest_player',   p => p.max_age,        true,  v => String(v))
  buildRank('penalties_scored',p => p.pens_made,      true,  v => String(v))

  // Only return players who have at least one category rank
  const players = resolvedPlayers
    .filter(p => Object.values(rankings).some(cat => cat[p.name] !== undefined))
    .map(p => ({ name: p.name }))

  return { players, rankings }
}

async function fetchLeaderboard() {
  try {
    const { data } = await getClient()
      .from('minimise_scores')
      .select('username, score')
      .order('score', { ascending: true })
      .limit(200)
    const best: Record<string, number> = {}
    for (const r of (data || [])) {
      if (!(r.username in best) || r.score < best[r.username]) best[r.username] = r.score
    }
    return Object.entries(best)
      .map(([username, score]) => ({ username, score }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const [{ players, rankings }, leaderboard] = await Promise.all([buildData(), fetchLeaderboard()])
    return NextResponse.json({ players, rankings, leaderboard }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { username, score } = await req.json()
    if (!username || score === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    await getClient().from('minimise_scores').insert({ username, score, player_slots: [] })
    const leaderboard = await fetchLeaderboard()
    return NextResponse.json({ ok: true, leaderboard })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

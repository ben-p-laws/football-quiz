import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(table: string, columns: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let all: any[] = []
  let offset = 0
  while (true) {
    const { data } = await getClient().from(table).select(columns).range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

type PlayerAgg = {
  games: number
  goals: number
  assists: number
  cards_yellow: number
  cards_red: number
  pens_made: number
  min_score_age: number | null
  max_age: number
}

export async function GET() {
  try {
    const rows = await fetchAll(
      'player_seasons',
      'name_display,games,goals,assists,cards_yellow,cards_red,pens_made,age'
    )

    // Aggregate career totals per player
    const agg: Record<string, PlayerAgg> = {}
    for (const row of rows) {
      const name = row.name_display as string
      if (!agg[name]) {
        agg[name] = { games: 0, goals: 0, assists: 0, cards_yellow: 0, cards_red: 0, pens_made: 0, min_score_age: null, max_age: 0 }
      }
      const p = agg[name]
      const age   = (row.age   as number) || 0
      const games = (row.games as number) || 0
      const goals = (row.goals as number) || 0
      p.games       += games
      p.goals       += goals
      p.assists     += (row.assists     as number) || 0
      p.cards_yellow += (row.cards_yellow as number) || 0
      p.cards_red   += (row.cards_red   as number) || 0
      p.pens_made   += (row.pens_made   as number) || 0
      if (games > 0 && age > p.max_age) p.max_age = age
      if (goals > 0 && age > 0 && (p.min_score_age === null || age < p.min_score_age)) {
        p.min_score_age = age
      }
    }

    const entries = Object.entries(agg)
    const pidRanks: Record<string, Record<string, number>> = {}

    function rankCategory(
      catKey: string,
      getValue: (p: PlayerAgg) => number | null,
      higherBetter: boolean
    ) {
      const pool = entries
        .map(([name, p]) => ({ name, val: getValue(p) }))
        .filter((x): x is { name: string; val: number } => x.val !== null && x.val > 0)
      pool.sort((a, b) => higherBetter ? b.val - a.val : a.val - b.val)
      pool.slice(0, 50).forEach((x, i) => {
        if (!pidRanks[x.name]) pidRanks[x.name] = {}
        pidRanks[x.name][catKey] = i + 1
      })
    }

    rankCategory('goals',            p => p.goals,          true)
    rankCategory('assists',          p => p.assists,         true)
    rankCategory('appearances',      p => p.games,           true)
    rankCategory('yellow_cards',     p => p.cards_yellow,    true)
    rankCategory('red_cards',        p => p.cards_red,       true)
    rankCategory('youngest_scorer',  p => p.min_score_age,   false)
    rankCategory('oldest_player',    p => p.max_age,         true)
    rankCategory('penalties_scored', p => p.pens_made,       true)

    // Weighted pool: one entry per top-50 appearance
    const weightedPool: { pid: string; name: string }[] = []
    for (const [name, ranks] of Object.entries(pidRanks)) {
      for (let i = 0; i < Object.keys(ranks).length; i++) {
        weightedPool.push({ pid: name, name })
      }
    }

    // Leaderboard
    const { data: lbData } = await getClient()
      .from('minimise_scores')
      .select('username, score, player_slots, created_at')
      .order('score', { ascending: true })
      .limit(100)

    const bestScores: Record<string, { score: number; player_slots: unknown; created_at: string }> = {}
    for (const row of lbData || []) {
      if (!bestScores[row.username] || row.score < bestScores[row.username].score) {
        bestScores[row.username] = { score: row.score, player_slots: row.player_slots, created_at: row.created_at }
      }
    }
    const leaderboard = Object.entries(bestScores)
      .map(([username, d]) => ({ username, ...d }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 20)

    return NextResponse.json(
      { weightedPool, pidRanks, leaderboard },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { username, score, player_slots } = await req.json()
    if (!username || score === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await getClient().from('minimise_scores').insert({ username, score, player_slots })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

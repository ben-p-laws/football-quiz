import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function fetchAll(table: string, columns: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let all: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase.from(table).select(columns).range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

export async function GET() {
  try {
    const rows = await fetchAll('minimise_rankings', 'player_name,category,stat_value,rank')

    const pidRanks: Record<string, Record<string, number>> = {}
    for (const row of rows) {
      const name = row.player_name as string
      const cat = row.category as string
      const rank = row.rank as number
      if (!pidRanks[name]) pidRanks[name] = {}
      pidRanks[name][cat] = rank
    }

    const weightedPool: { pid: string; name: string }[] = []
    for (const name of Object.keys(pidRanks)) {
      const catCount = Object.keys(pidRanks[name]).length
      for (let i = 0; i < catCount; i++) {
        weightedPool.push({ pid: name, name })
      }
    }

    const { data: lbData } = await supabase
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
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { username, score, player_slots } = await req.json()
    if (!username || score === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await supabase.from('minimise_scores').insert({ username, score, player_slots })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

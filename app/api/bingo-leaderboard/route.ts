import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function buildLeaderboard() {
  const { data } = await getClient()
    .from('bingo_leaderboard')
    .select('username, score, created_at')
    .order('score', { ascending: false })
    .limit(200)

  const best: Record<string, { score: number; created_at: string }> = {}
  for (const row of data || []) {
    if (!best[row.username] || row.score > best[row.username].score) {
      best[row.username] = { score: row.score, created_at: row.created_at }
    }
  }
  return Object.entries(best)
    .map(([username, d]) => ({ username, score: d.score, created_at: d.created_at }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}

export async function GET() {
  return NextResponse.json({ leaderboard: await buildLeaderboard() })
}

export async function POST(req: Request) {
  const { username, score } = await req.json()
  if (!username || score === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  await getClient().from('bingo_leaderboard').insert({ username, score })
  return NextResponse.json({ leaderboard: await buildLeaderboard() })
}

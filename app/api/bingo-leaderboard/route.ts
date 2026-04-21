import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function buildLeaderboard() {
  const { data } = await supabase.from('bingo_leaderboard').select('username')
  const counts: Record<string, number> = {}
  for (const row of data || []) {
    counts[row.username] = (counts[row.username] || 0) + 1
  }
  return Object.entries(counts)
    .map(([username, perfect_9s]) => ({ username, perfect_9s }))
    .sort((a, b) => b.perfect_9s - a.perfect_9s)
    .slice(0, 50)
}

export async function GET() {
  return NextResponse.json({ leaderboard: await buildLeaderboard() })
}

export async function POST(req: Request) {
  const { username } = await req.json()
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
  await supabase.from('bingo_leaderboard').insert({ username })
  return NextResponse.json({ leaderboard: await buildLeaderboard() })
}

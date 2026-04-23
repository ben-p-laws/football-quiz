import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function buildLeaderboard(mode: string = 'normal') {
  const { data } = await getClient()
    .from('bingo_leaderboard')
    .select('username')
    .eq('mode', mode)

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    counts[row.username] = (counts[row.username] || 0) + 1
  }
  return Object.entries(counts)
    .map(([username, perfect_9s]) => ({ username, perfect_9s }))
    .sort((a, b) => b.perfect_9s - a.perfect_9s)
    .slice(0, 50)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') || 'normal'
  return NextResponse.json({ leaderboard: await buildLeaderboard(mode) })
}

export async function POST(req: Request) {
  const { username, mode = 'normal' } = await req.json()
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
  await getClient().from('bingo_leaderboard').insert({ username, mode })
  return NextResponse.json({ leaderboard: await buildLeaderboard(mode) })
}

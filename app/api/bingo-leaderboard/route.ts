import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Hardest → easiest — used for Olympic-style tiebreaking
const LEVEL_PRIORITY = [
  'expert-0', 'expert-1',
  'beginner-0', 'beginner-1',
]

async function buildLeaderboard() {
  const { data } = await getClient().from('bingo_leaderboard').select('username,mode')

  const userLevels: Record<string, Record<string, number>> = {}
  for (const row of data ?? []) {
    if (!userLevels[row.username]) userLevels[row.username] = {}
    userLevels[row.username][row.mode] = (userLevels[row.username][row.mode] || 0) + 1
  }

  return Object.entries(userLevels)
    .map(([username, levels]) => ({
      username,
      levels,
      total: Object.values(levels).reduce((s, n) => s + n, 0),
    }))
    .sort((a, b) => {
      for (const level of LEVEL_PRIORITY) {
        const diff = (b.levels[level] || 0) - (a.levels[level] || 0)
        if (diff !== 0) return diff
      }
      return 0
    })
    .slice(0, 50)
}

export async function GET() {
  return NextResponse.json({ leaderboard: await buildLeaderboard() })
}

export async function POST(req: Request) {
  const { username, level } = await req.json()
  if (!username || !level) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  await getClient().from('bingo_leaderboard').insert({ username, mode: level })
  return NextResponse.json({ leaderboard: await buildLeaderboard() })
}

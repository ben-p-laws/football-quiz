import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function fetchLeaderboard(holes: number) {
  const { data } = await getClient()
    .from('golf_leaderboard')
    .select('username,holes,strokes,vs_par,created_at')
    .eq('holes', holes)
    .order('vs_par', { ascending: true })
    .order('strokes', { ascending: true })
    .limit(20)
  return data ?? []
}

// GET ?holes=9
export async function GET(req: Request) {
  const holes = Number(new URL(req.url).searchParams.get('holes') ?? 9)
  return NextResponse.json({ leaderboard: await fetchLeaderboard(holes) })
}

// POST { username, holes, strokes, vs_par }
export async function POST(req: Request) {
  const { username, holes, strokes, vs_par } = await req.json()
  if (!username || !holes) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  await getClient().from('golf_leaderboard').insert({ username, holes, strokes, vs_par })
  return NextResponse.json({ leaderboard: await fetchLeaderboard(holes) })
}

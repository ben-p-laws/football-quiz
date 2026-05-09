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
  const { data, error } = await getClient()
    .from('golf_leaderboard')
    .select('username,holes,strokes,vs_par,created_at')
    .eq('holes', holes)
    .order('vs_par', { ascending: true })
    .order('strokes', { ascending: true })
    .limit(20)
  if (error) throw new Error(error.message)
  return data ?? []
}

// GET ?holes=9
export async function GET(req: Request) {
  const holes = Number(new URL(req.url).searchParams.get('holes') ?? 9)
  try {
    return NextResponse.json({ leaderboard: await fetchLeaderboard(holes) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST { username, holes, strokes, vs_par }
export async function POST(req: Request) {
  const { username, holes, strokes, vs_par } = await req.json()
  if (!username || !holes) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  try {
    const { error } = await getClient().from('golf_leaderboard').insert({ username, holes, strokes, vs_par })
    if (error) throw new Error(error.message)
    return NextResponse.json({ leaderboard: await fetchLeaderboard(holes) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

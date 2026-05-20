import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET ?limit=50 → top players by handicap index
// GET ?deviceId=xxx → single player's entry
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get('deviceId')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const db = getClient()

  if (deviceId) {
    const { data: entry } = await db
      .from('golf_handicap')
      .select('username, handicap_index, tier, total_rounds')
      .eq('device_id', deviceId)
      .maybeSingle()
    if (!entry) return NextResponse.json({ entry: null, rank: null })
    // Rank = number of players with higher handicap_index (better) + 1
    const { count } = await db
      .from('golf_handicap')
      .select('*', { count: 'exact', head: true })
      .gt('handicap_index', entry.handicap_index)
    return NextResponse.json({ entry, rank: (count ?? 0) + 1 })
  }

  const { data } = await db
    .from('golf_handicap')
    .select('username, handicap_index, tier, total_rounds')
    .order('handicap_index', { ascending: false })
    .limit(limit)

  return NextResponse.json({ leaderboard: data ?? [] })
}

// POST { deviceId, username, handicapIndex, tier, totalRounds }
export async function POST(req: Request) {
  const { deviceId, username, handicapIndex, tier, totalRounds } = await req.json()
  if (!deviceId || !username) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = getClient()
  const { error } = await db.from('golf_handicap').upsert({
    device_id: deviceId,
    username,
    handicap_index: handicapIndex,
    tier,
    total_rounds: totalRounds,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'device_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET() {
  const { data } = await getClient()
    .from('roulette_leaderboard')
    .select('name, score, created_at')
    .order('score', { ascending: false })
    .limit(10)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const { name, score } = await req.json()
  if (!name || typeof score !== 'number') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  const { error } = await getClient()
    .from('roulette_leaderboard')
    .insert({ name: String(name).slice(0, 20), score })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = await getClient()
    .from('roulette_leaderboard')
    .select('name, score')
    .order('score', { ascending: false })
    .limit(10)
  return NextResponse.json(data ?? [])
}

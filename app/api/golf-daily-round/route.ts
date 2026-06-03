import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function seededRng(seed: number) {
  let s = seed
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function dateToSeed(date: string): number {
  return parseInt(date.replace(/-/g, ''), 10)
}

function getDailyRoundParams(date: string) {
  const rng = seededRng(dateToSeed(date))
  const course = rng() < 0.5 ? 'pebble-beach' : 'augusta'
  const allHoles = Array.from({ length: 18 }, (_, i) => i + 1)
  for (let i = allHoles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[allHoles[i], allHoles[j]] = [allHoles[j], allHoles[i]]
  }
  const holeNumbers = allHoles.slice(0, 3).sort((a, b) => a - b)
  return { course, holeNumbers }
}

// GET ?date=YYYY-MM-DD[&clubCode=XXX] → { course, holeNumbers, leaderboard }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const clubCode = searchParams.get('clubCode')
  const { course, holeNumbers } = getDailyRoundParams(date)
  const db = getClient()

  let clubDeviceIds: string[] | null = null
  if (clubCode) {
    const { data: club } = await db.from('golf_clubs').select('id').eq('code', clubCode).maybeSingle()
    if (club) {
      const { data: members } = await db.from('golf_club_members').select('device_id').eq('club_id', club.id)
      clubDeviceIds = (members ?? []).map((m: { device_id: string }) => m.device_id)
    }
  }

  let q = db
    .from('golf_daily_round_entries')
    .select('player_name, total_strokes, score_to_par')
    .eq('date', date)
    .order('total_strokes', { ascending: true })
  if (clubDeviceIds !== null) q = q.in('device_id', clubDeviceIds)
  const { data: entries } = await q

  return NextResponse.json({ date, course, holeNumbers, leaderboard: entries ?? [] })
}

// POST { date, playerName, deviceId, totalStrokes, scoreToPar }
export async function POST(req: Request) {
  const { date, playerName, deviceId, totalStrokes, scoreToPar } = await req.json()
  if (!date || !playerName || !deviceId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = getClient()

  const { data: existing } = await db
    .from('golf_daily_round_entries')
    .select('id')
    .eq('date', date)
    .eq('device_id', deviceId)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already played today' }, { status: 409 })

  const { error } = await db.from('golf_daily_round_entries').insert({
    date,
    player_name: playerName,
    device_id: deviceId,
    total_strokes: totalStrokes,
    score_to_par: scoreToPar,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: entries } = await db
    .from('golf_daily_round_entries')
    .select('player_name, total_strokes, score_to_par')
    .eq('date', date)
    .order('total_strokes', { ascending: true })

  return NextResponse.json({ leaderboard: entries ?? [] })
}

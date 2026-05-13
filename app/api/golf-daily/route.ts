import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Seeded PRNG (mulberry32)
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

// Curated daily challenge categories — all have large top-3 pools for 120–170yd holes
const DAILY_CATEGORIES = [
  { key: 'goals',         stat: 'Goals',              filter: 'all' },
  { key: 'assists',       stat: 'Assists',             filter: 'all' },
  { key: 'goals_assists', stat: 'Goals + Assists',     filter: 'all' },
  { key: 'appearances',   stat: 'Appearances',         filter: 'all' },
  { key: 'goals',         stat: 'Goals',               filter: 'nat', code: 'ENG', label: 'English' },
  { key: 'goals',         stat: 'Goals',               filter: 'nat', code: 'FRA', label: 'French' },
  { key: 'goals',         stat: 'Goals',               filter: 'nat', code: 'ESP', label: 'Spanish' },
  { key: 'goals',         stat: 'Goals',               filter: 'nat', code: 'NED', label: 'Dutch' },
  { key: 'goals',         stat: 'Goals',               filter: 'nat', code: 'ARG', label: 'Argentine' },
  { key: 'assists',       stat: 'Assists',             filter: 'nat', code: 'ENG', label: 'English' },
  { key: 'assists',       stat: 'Assists',             filter: 'nat', code: 'FRA', label: 'French' },
  { key: 'goals_assists', stat: 'Goals + Assists',     filter: 'nat', code: 'ENG', label: 'English' },
  { key: 'appearances',   stat: 'Appearances',         filter: 'nat', code: 'ENG', label: 'English' },
  { key: 'goals',         stat: 'Goals',               filter: 'club', name: 'Manchester United' },
  { key: 'goals',         stat: 'Goals',               filter: 'club', name: 'Arsenal' },
  { key: 'goals',         stat: 'Goals',               filter: 'club', name: 'Chelsea' },
  { key: 'goals',         stat: 'Goals',               filter: 'club', name: 'Liverpool' },
  { key: 'goals',         stat: 'Goals',               filter: 'club', name: 'Manchester City' },
  { key: 'assists',       stat: 'Assists',             filter: 'club', name: 'Manchester United' },
  { key: 'assists',       stat: 'Assists',             filter: 'club', name: 'Arsenal' },
  { key: 'goals_2010',    stat: 'Goals (since 10/11)', filter: 'all' },
  { key: 'ga_2010',       stat: 'Goals + Assists (since 10/11)', filter: 'all' },
] as const

type DailyCategorySpec = typeof DAILY_CATEGORIES[number]

function buildCategory(spec: DailyCategorySpec) {
  let label = ''
  const nat = (spec as {code?:string;label?:string}).label
  const club = (spec as {name?:string}).name
  if (spec.filter === 'all')  label = `All-time PL ${spec.stat}`
  if (spec.filter === 'nat')  label = `${nat} PL ${spec.stat}`
  if (spec.filter === 'club') label = `PL ${spec.stat} for ${club}`

  return {
    key: spec.key,
    label,
    statLabel: spec.stat,
    ...(spec.filter === 'nat'  ? { natFilter: (spec as {code:string}).code } : {}),
    ...(spec.filter === 'club' ? { clubFilter: club } : {}),
  }
}

function getDailyParams(date: string) {
  const rng = seededRng(dateToSeed(date))
  const distance = Math.round(120 + rng() * 50)   // 120–170
  const idx = Math.floor(rng() * DAILY_CATEGORIES.length)
  const category = buildCategory(DAILY_CATEGORIES[idx])
  return { distance, category }
}

// GET ?date=YYYY-MM-DD → { distance, category, leaderboard }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const { distance, category } = getDailyParams(date)
  const db = getClient()

  const { data: entries } = await db
    .from('golf_daily_entries')
    .select('player_name, distance_from_pin, is_oob')
    .eq('date', date)
    .order('distance_from_pin', { ascending: true, nullsFirst: false })

  const onGreen = (entries ?? []).filter(e => !e.is_oob)
  const oob     = (entries ?? []).filter(e =>  e.is_oob)
  const leaderboard = [...onGreen, ...oob]

  return NextResponse.json({ date, distance, category, leaderboard })
}

// POST { date, playerName, deviceId, distanceFromPin, isOob }
export async function POST(req: Request) {
  const { date, playerName, deviceId, distanceFromPin, isOob } = await req.json()
  if (!date || !playerName || !deviceId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = getClient()

  // Device-based dedup — same device can't submit twice for same date
  const { data: existing } = await db
    .from('golf_daily_entries')
    .select('id')
    .eq('date', date)
    .eq('device_id', deviceId)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already played today' }, { status: 409 })

  const { error } = await db.from('golf_daily_entries').insert({
    date,
    player_name: playerName,
    device_id: deviceId,
    distance_from_pin: isOob ? null : distanceFromPin,
    is_oob: isOob ?? false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: entries } = await db
    .from('golf_daily_entries')
    .select('player_name, distance_from_pin, is_oob')
    .eq('date', date)
    .order('distance_from_pin', { ascending: true, nullsFirst: false })

  const onGreen = (entries ?? []).filter(e => !e.is_oob)
  const oob     = (entries ?? []).filter(e =>  e.is_oob)
  return NextResponse.json({ leaderboard: [...onGreen, ...oob] })
}

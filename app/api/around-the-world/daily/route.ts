import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildCache } from '../route'
import type { ATWPlayer } from '../route'
import { ROUTES, STAT_KEYS, type StatKey } from '@/data/atw-routes'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function mulberry32(seed: number) {
  let s = seed
  return function () {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function statVal(p: ATWPlayer, s: StatKey): number {
  if (s === 'goals')        return p.goals
  if (s === 'goalsAssists') return p.goals + p.assists
  if (s === 'games')        return p.games
  if (s === 'yellowCards')  return p.yellowCards
  return 0
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateToSeed(date: string): number {
  return parseInt(date.replace(/-/g, ''), 10)
}

async function getDailyConfig(date: string) {
  const rand = mulberry32(dateToSeed(date))
  const { players } = await buildCache()

  const playersByNat: Record<string, ATWPlayer[]> = {}
  for (const p of players) {
    if (!playersByNat[p.nat]) playersByNat[p.nat] = []
    playersByNat[p.nat].push(p)
  }

  const valid = ROUTES.filter(r =>
    r.countries.every(c => (playersByNat[c]?.length ?? 0) > 0)
  )
  if (!valid.length) throw new Error('No valid routes')

  const route = valid[Math.floor(rand() * valid.length)]
  const stat  = STAT_KEYS[Math.floor(rand() * STAT_KEYS.length)]
  const modes = ['easy', 'medium', 'hard'] as const
  const mode  = modes[Math.floor(rand() * modes.length)]

  const mp = route.countries.reduce((sum, code) => {
    const ps = playersByNat[code] ?? []
    return sum + (ps.length ? Math.max(...ps.map(p => statVal(p, stat))) : 0)
  }, 0)
  const target = Math.max(route.countries.length, Math.floor(mp * (0.38 + rand() * 0.30)))

  return { routeId: route.id, stat, mode, target }
}

async function fetchLeaderboard(date: string) {
  const { data } = await getClient()
    .from('atw_daily_scores')
    .select('player_name, score, target, pct, won, mode')
    .eq('date', date)
    .order('won', { ascending: false })
    .order('pct', { ascending: false })
    .limit(50)
  return data ?? []
}

export async function GET() {
  try {
    const date = todayUTC()
    const [config, leaderboard] = await Promise.all([
      getDailyConfig(date),
      fetchLeaderboard(date),
    ])
    return NextResponse.json({ date, ...config, leaderboard })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { date, player_name, score, target, pct, won, mode } = body
    if (!date || !player_name?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await getClient()
      .from('atw_daily_scores')
      .insert({ date, player_name: player_name.trim(), score, target, pct, won, mode })

    const leaderboard = await fetchLeaderboard(date)
    return NextResponse.json({ success: true, leaderboard })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

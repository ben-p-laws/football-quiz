import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildCache } from '../route'
import type { ATWPlayer } from '../route'
import { type StatKey } from '@/data/atw-routes'

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

function dateToSeed(date: string): number {
  // offset from chain daily seed so results differ
  return parseInt(date.replace(/-/g, ''), 10) + 77777
}

const NAT_NORM: Record<string, string> = { RSA: 'ZAF' }
function normNat(nat: string) { return NAT_NORM[nat] ?? nat }

function statVal(p: ATWPlayer, s: StatKey): number {
  if (s === 'goals')        return p.goals
  if (s === 'goalsAssists') return p.goals + p.assists
  if (s === 'games')        return p.games
  if (s === 'yellowCards')  return p.yellowCards
  return 0
}

const CONTINENTS = ['europe', 'africa', 's_america'] as const
type Continent = typeof CONTINENTS[number]

const CNT_STATS: StatKey[] = ['goals', 'goalsAssists', 'games']

const CNT_RANGE: Record<Continent, [number, number]> = {
  europe:    [5, 20],
  africa:    [5, 13],
  s_america: [5,  9],
}

const CNT_POOL: Record<Continent, string[]> = {
  europe:    ['ENG','IRL','FRA','ESP','POR','GER','NED','BEL','DEN','SWE','NOR','ITA','SUI','AUT','CZE','GRE','TUR','SRB','CRO','BUL','POL','SVK','FIN','HUN','ROU','UKR','ALB','MNE','MKD','SVN','BIH','RUS','BLR','LTU','LVA','EST','MDA','ISL'],
  africa:    ['MAR','ALG','TUN','EGY','LBA','SEN','GUI','CIV','GHA','TGO','BEN','NGA','CMR','GAB','COD','COG','ZIM','ZAF','ZAM','ANG','MOZ','MLI','MTN','BFA','SLE','LBR','GAM','GNB','EQG','RWA','SDN','SSD','ETH','KEN','TAN','UGA','NAM','BOT','CHA','NIG','SOM','MWI','ERI','MAD','LES','SWZ','DJI'],
  s_america: ['ARG','BRA','URU','COL','VEN','CHI','ECU','PER','BOL','PAR','GUY','SUR'],
}

async function getDailyConfig(date: string) {
  const rand = mulberry32(dateToSeed(date))
  const { players } = await buildCache()

  const playersByNat: Record<string, ATWPlayer[]> = {}
  for (const p of players) {
    const nat = normNat(p.nat)
    if (!playersByNat[nat]) playersByNat[nat] = []
    playersByNat[nat].push(p)
  }

  const continent = CONTINENTS[Math.floor(rand() * CONTINENTS.length)]
  const stat      = CNT_STATS[Math.floor(rand() * CNT_STATS.length)]
  const [minN, maxN] = CNT_RANGE[continent]
  const nNeeded   = minN + Math.floor(rand() * (maxN - minN + 1))

  const withPlayers = CNT_POOL[continent].filter(code =>
    (playersByNat[code] ?? []).some(p => statVal(p, stat) > 0)
  )
  const perCountryBest = withPlayers
    .map(code => Math.max(0, ...(playersByNat[code] ?? []).filter(p => statVal(p, stat) > 0).map(p => statVal(p, stat))))
    .sort((a, b) => b - a)
  const maxP   = perCountryBest.slice(0, nNeeded).reduce((a, b) => a + b, 0)
  const target = Math.max(nNeeded, Math.floor(maxP * (0.40 + rand() * 0.25)))

  return { continent, stat, nNeeded, target }
}

async function fetchLeaderboard(date: string) {
  const { data } = await getClient()
    .from('atw_cnt_daily_scores')
    .select('player_name, score, target, pct, won, continent')
    .eq('date', date)
    .order('won', { ascending: false })
    .order('pct', { ascending: false })
    .limit(50)
  return data ?? []
}

export async function GET() {
  try {
    const date = new Date().toISOString().slice(0, 10)
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
    const { date, player_name, score, target, pct, won, continent } = body
    if (!date || !player_name?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await getClient()
      .from('atw_cnt_daily_scores')
      .insert({ date, player_name: player_name.trim(), score, target, pct, won, continent })
    const leaderboard = await fetchLeaderboard(date)
    return NextResponse.json({ success: true, leaderboard })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

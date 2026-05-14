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
  return parseInt(date.replace(/-/g, ''), 10) + 99999
}

const NAT_NORM: Record<string, string> = { RSA: 'ZAF', TOG: 'TGO' }
function normNat(nat: string) { return NAT_NORM[nat] ?? nat }

function statVal(p: ATWPlayer, s: StatKey): number {
  if (s === 'goals')        return p.goals
  if (s === 'goalsAssists') return p.goals + p.assists
  if (s === 'games')        return p.games
  if (s === 'yellowCards')  return p.yellowCards
  return 0
}

type MineCategory =
  | { kind: 'statThreshold'; stat: StatKey; threshold: number }
  | { kind: 'playedFor';     team: string }
  | { kind: 'scoredFor';     team: string }

function categoryMatches(p: ATWPlayer, cat: MineCategory): boolean {
  if (cat.kind === 'statThreshold') return statVal(p, cat.stat) >= cat.threshold
  if (cat.kind === 'playedFor')     return p.teams.includes(cat.team)
  if (cat.kind === 'scoredFor')     return (p.teamGoals[cat.team] ?? 0) >= 1
  return false
}

const MINE_STATS: StatKey[] = ['goals', 'goalsAssists', 'games', 'yellowCards']
const MINE_THRESHOLDS: Record<StatKey, number[]> = {
  goals:        [5, 10, 15, 20, 30, 50, 75, 100, 150],
  goalsAssists: [10, 20, 30, 50, 75, 100, 150, 200],
  games:        [50, 100, 150, 200, 250, 300],
  yellowCards:  [5, 10, 20, 30, 50],
}
const MINE_TEAMS = [
  'Arsenal','Chelsea','Liverpool','Manchester City','Manchester Utd',
  'Tottenham','Everton','Aston Villa','Newcastle','West Ham',
  'Leicester','Southampton','Leeds','Wolves','Crystal Palace',
  'Fulham','Sunderland','Middlesbrough','Blackburn','Bolton',
  'Burnley','Sheffield Utd','Stoke','Swansea','West Brom',
  'Watford','Brighton','Bournemouth','Norwich','Wigan',
  'Ipswich','Charlton','Portsmouth','Derby','Reading',
]

const CONTINENTS = ['europe', 'africa', 's_america'] as const
type Continent = typeof CONTINENTS[number]

const CONTINENT_POOL: Record<Continent, string[]> = {
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
  const pool = CONTINENT_POOL[continent]

  const valid: Array<{ category: MineCategory; nTargets: number }> = []

  for (const s of MINE_STATS) {
    for (const t of MINE_THRESHOLDS[s]) {
      const cat: MineCategory = { kind: 'statThreshold', stat: s, threshold: t }
      const count = pool.filter(code => (playersByNat[code] ?? []).some(p => categoryMatches(p, cat))).length
      if (count >= 4) valid.push({ category: cat, nTargets: count })
    }
  }
  for (const team of MINE_TEAMS) {
    const playedCat: MineCategory = { kind: 'playedFor', team }
    const scoredCat: MineCategory = { kind: 'scoredFor', team }
    const playedCount = pool.filter(code => (playersByNat[code] ?? []).some(p => categoryMatches(p, playedCat))).length
    if (playedCount >= 4) valid.push({ category: playedCat, nTargets: playedCount })
    const scoredCount = pool.filter(code => (playersByNat[code] ?? []).some(p => categoryMatches(p, scoredCat))).length
    if (scoredCount >= 4) valid.push({ category: scoredCat, nTargets: scoredCount })
  }

  if (!valid.length) throw new Error('No valid minefield config')
  const { category, nTargets } = valid[Math.floor(rand() * valid.length)]
  return { continent, category, nTargets }
}

async function fetchLeaderboard(date: string) {
  const { data } = await getClient()
    .from('atw_mine_daily_scores')
    .select('player_name, lives_lost, won, continent')
    .eq('date', date)
    .order('won', { ascending: false })
    .order('lives_lost', { ascending: true })
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
    const { date, player_name, lives_lost, won, continent } = body
    if (!date || !player_name?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await getClient()
      .from('atw_mine_daily_scores')
      .insert({ date, player_name: player_name.trim(), lives_lost, won, continent })
    const leaderboard = await fetchLeaderboard(date)
    return NextResponse.json({ success: true, leaderboard })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

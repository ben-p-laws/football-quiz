import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildCache } from '../route'
import type { ATWPlayer } from '../route'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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

const NAT_NORM: Record<string,string> = { RSA:'ZAF', TOG:'TGO' }
function normNat(nat: string) { return NAT_NORM[nat] ?? nat }

const CONTINENT_POOL: Record<string,string[]> = {
  europe:    ['ENG','IRL','FRA','ESP','POR','GER','NED','BEL','DEN','SWE','NOR','ITA','SUI','AUT','CZE','GRE','TUR','SRB','CRO','BUL','POL','SVK','FIN','HUN','ROU','UKR','ALB','MNE','MKD','SVN','BIH','RUS','BLR','LTU','LVA','EST','MDA','ISL'],
  africa:    ['MAR','ALG','TUN','EGY','LBA','SEN','GUI','CIV','GHA','TGO','BEN','NGA','CMR','GAB','COD','COG','ZIM','ZAF','ZAM','ANG','MOZ','MLI','MTN','BFA','SLE','LBR','GAM','GNB','EQG','RWA','SDN','SSD','ETH','KEN','TAN','UGA','NAM','BOT','CHA','NIG','SOM','MWI','ERI','MAD','LES','SWZ','DJI'],
  s_america: ['ARG','BRA','URU','COL','VEN','CHI','ECU','PER','BOL','PAR','GUY','SUR'],
  n_america: ['USA','CAN','MEX','GUA','HON','SLV','NCA','CRC','PAN'],
  asia:      ['JPN','KOR','CHN','IRN','IRQ','LBN','ISR','JOR','KSA','UAE'],
}

const RANK_STAT_POOL: { spec: string; label: string }[] = [
  { spec:'goals',        label:'PL Goals' },
  { spec:'goalsAssists', label:'PL Goals + Assists' },
  { spec:'games',        label:'PL Appearances' },
  { spec:'assists',      label:'PL Assists' },
  { spec:'yellowCards',  label:'Yellow Cards' },
  { spec:'goals_Arsenal',         label:'Goals for Arsenal' },
  { spec:'goals_Chelsea',         label:'Goals for Chelsea' },
  { spec:'goals_Liverpool',       label:'Goals for Liverpool' },
  { spec:'goals_Manchester City', label:'Goals for Man City' },
  { spec:'goals_Manchester Utd',  label:'Goals for Man Utd' },
]

function rankStatVal(p: ATWPlayer, spec: string): number {
  if (spec==='goals') return p.goals
  if (spec==='goalsAssists') return p.goals+p.assists
  if (spec==='games') return p.games
  if (spec==='assists') return p.assists
  if (spec==='yellowCards') return p.yellowCards
  if (spec==='redCards') return p.redCards ?? 0
  if (spec.startsWith('goals_')) return p.teamGoals[spec.slice(6)] ?? 0
  if (spec.startsWith('games_')) return p.teamGames?.[spec.slice(6)] ?? 0
  return 0
}

async function getDailyConfig(date: string) {
  const seed = parseInt(date.replace(/-/g,''),10) + 444444
  const rand = mulberry32(seed)
  const { players } = await buildCache()
  const playersByNat: Record<string,ATWPlayer[]> = {}
  for (const p of players) { const nat=normNat(p.nat); if(!playersByNat[nat])playersByNat[nat]=[]; playersByNat[nat].push(p) }

  const continentKeys = Object.keys(CONTINENT_POOL)
  for (let attempt = 0; attempt < 50; attempt++) {
    const continent = continentKeys[Math.floor(rand() * continentKeys.length)]
    const statEntry = RANK_STAT_POOL[Math.floor(rand() * RANK_STAT_POOL.length)]
    const pool = CONTINENT_POOL[continent]
    const totals = pool
      .map(code => ({ code, total: (playersByNat[code]??[]).reduce((s,p)=>s+rankStatVal(p,statEntry.spec),0) }))
      .filter(x=>x.total>0).sort((a,b)=>b.total-a.total)
    if (totals.length < 5) continue
    const targets = totals.slice(0, Math.min(10, totals.length))
    const mode = rand() < 0.5 ? 'easy' : 'hard'
    return { continent, statSpec: statEntry.spec, statLabel: statEntry.label, targets, mode }
  }
  throw new Error('Could not generate ranking daily')
}

async function fetchLeaderboard(date: string) {
  const { data } = await getClient().from('atw_rank_daily_scores').select('player_name,score,max_score').eq('date',date).order('score',{ascending:false}).limit(50)
  return data ?? []
}

export async function GET() {
  try {
    const date = new Date().toISOString().slice(0,10)
    const [config, leaderboard] = await Promise.all([getDailyConfig(date), fetchLeaderboard(date)])
    return NextResponse.json({ date, ...config, leaderboard })
  } catch(e) { return NextResponse.json({error:String(e)},{status:500}) }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { date, player_name, score, max_score, continent, stat_spec } = body
    if (!date||!player_name?.trim()) return NextResponse.json({error:'Missing fields'},{status:400})
    await getClient().from('atw_rank_daily_scores').insert({ date, player_name:player_name.trim(), score, max_score, continent, stat_spec })
    const leaderboard = await fetchLeaderboard(date)
    return NextResponse.json({ success:true, leaderboard })
  } catch(e) { return NextResponse.json({error:String(e)},{status:500}) }
}

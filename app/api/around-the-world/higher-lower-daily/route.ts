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

function seededShuffle<T>(arr: T[], rand: ()=>number): T[] {
  const a = [...arr]
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]] }
  return a
}

const NAT_NORM: Record<string,string> = { RSA:'ZAF', TOG:'TGO' }
function normNat(nat: string) { return NAT_NORM[nat] ?? nat }

const CONTINENT_POOL: Record<string,string[]> = {
  europe:    ['ENG','IRL','FRA','ESP','POR','GER','NED','BEL','DEN','SWE','NOR','ITA','SUI','AUT','CZE','GRE','TUR','SRB','CRO','BUL','POL','SVK','FIN','HUN','ROU','UKR','ALB','MNE','MKD','SVN','BIH','RUS'],
  africa:    ['MAR','ALG','TUN','EGY','SEN','GUI','CIV','GHA','NGA','CMR','ZAF','MLI','MTN','BFA'],
  s_america: ['ARG','BRA','URU','COL','VEN','CHI','ECU','PER','BOL','PAR'],
  n_america: ['USA','CAN','MEX','GUA','HON','SLV','NCA','CRC','PAN'],
  asia:      ['JPN','KOR','CHN','IRN','IRQ','LBN','ISR','JOR','KSA','UAE'],
}

const HL_STAT_POOL: { spec: string; label: string }[] = [
  { spec:'goals',        label:'PL Goals' },
  { spec:'goalsAssists', label:'PL Goals + Assists' },
  { spec:'games',        label:'PL Appearances' },
  { spec:'assists',      label:'PL Assists' },
  { spec:'yellowCards',  label:'Yellow Cards' },
  { spec:'goals_Arsenal',         label:'Goals for Arsenal' },
  { spec:'goals_Liverpool',       label:'Goals for Liverpool' },
  { spec:'goals_Manchester Utd',  label:'Goals for Man Utd' },
]

function hlStatVal(p: ATWPlayer, spec: string): number {
  if (spec==='goals') return p.goals
  if (spec==='goalsAssists') return p.goals+p.assists
  if (spec==='games') return p.games
  if (spec==='assists') return p.assists
  if (spec==='yellowCards') return p.yellowCards
  if (spec.startsWith('goals_')) return p.teamGoals[spec.slice(6)] ?? 0
  return 0
}

async function getDailyConfig(date: string) {
  const seed = parseInt(date.replace(/-/g,''),10) + 555555
  const rand = mulberry32(seed)
  const { players } = await buildCache()
  const playersByNat: Record<string,ATWPlayer[]> = {}
  for (const p of players) { const nat=normNat(p.nat); if(!playersByNat[nat])playersByNat[nat]=[]; playersByNat[nat].push(p) }

  const continentKeys = Object.keys(CONTINENT_POOL)
  for (let attempt=0;attempt<50;attempt++) {
    const continent = continentKeys[Math.floor(rand()*continentKeys.length)]
    const statEntry = HL_STAT_POOL[Math.floor(rand()*HL_STAT_POOL.length)]
    const pool = CONTINENT_POOL[continent]
    const qualifying = pool
      .map(code=>({code,total:(playersByNat[code]??[]).reduce((s,p)=>s+hlStatVal(p,statEntry.spec),0)}))
      .filter(x=>x.total>0)
    if (qualifying.length<3) continue
    const sequence = seededShuffle(qualifying, rand)
    const mode = rand()<0.5?'easy':'hard'
    return { continent, statSpec:statEntry.spec, statLabel:statEntry.label, sequence, mode }
  }
  throw new Error('Could not generate HL daily')
}

async function fetchLeaderboard(date: string) {
  const { data } = await getClient().from('atw_hl_daily_scores').select('player_name,streak').eq('date',date).order('streak',{ascending:false}).limit(50)
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
    const { date, player_name, streak, continent, stat_spec } = body
    if (!date||!player_name?.trim()) return NextResponse.json({error:'Missing fields'},{status:400})
    await getClient().from('atw_hl_daily_scores').insert({ date, player_name:player_name.trim(), streak, continent, stat_spec })
    const leaderboard = await fetchLeaderboard(date)
    return NextResponse.json({ success:true, leaderboard })
  } catch(e) { return NextResponse.json({error:String(e)},{status:500}) }
}

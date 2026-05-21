import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Replicated constants from football-golf route / FootballGolf.tsx ───────────

const CLUB_THRESHOLD: Record<string, number> = { driver: 250, iron: 150, wedge: 50, putter: 10 }

function getClub(dist: number): string {
  if (dist > 250) return 'driver'
  if (dist > 150) return 'iron'
  if (dist > 50)  return 'wedge'
  return 'putter'
}

type FilterSpec =
  | { k: 'all' }
  | { k: 'nat'; code: string }
  | { k: 'club'; name: string }
  | { k: 'cont'; name: string }
  | { k: 'cc'; continent: string; club: string }

function cacheKey(stat: string, f: FilterSpec): string {
  if (f.k === 'all')   return `${stat}::`
  if (f.k === 'nat')   return `${stat}:${f.code}:`
  if (f.k === 'club')  return `${stat}::${f.name}`
  if (f.k === 'cont')  return `${stat}:cont:${f.name}`
  return `${stat}:cont:${f.continent}:${f.club}`
}

function filterLabel(f: FilterSpec): string {
  if (f.k === 'all')  return 'all'
  if (f.k === 'nat')  return `nat:${f.code}`
  if (f.k === 'club') return `club:${f.name}`
  if (f.k === 'cont') return `cont:${f.name}`
  return `cc:${f.continent}×${f.club}`
}

const BASE_STATS = ['goals', 'assists', 'goals_assists', 'appearances', 'apps_minus_goals', 'yellow_cards', 'clean_sheets']
const SINCE_YEARS = [2010, 2015, 2020]
const BEFORE_YEARS = [2000, 2005, 2010]
const SINCE_KEYS = SINCE_YEARS.flatMap(y => [`goals_since_${y}`, `ga_since_${y}`])
const BEFORE_KEYS = BEFORE_YEARS.flatMap(y => [`goals_before_${y}`, `ga_before_${y}`])
const ALL_STATS = [...BASE_STATS, ...SINCE_KEYS, ...BEFORE_KEYS]
const CLUB_STATS = ['goals', 'assists', 'goals_assists', 'appearances', 'apps_minus_goals', 'yellow_cards', 'clean_sheets']

function simulate(
  distance: number,
  n: number,
  clubs: string[],
  nations: string[],
  continents: string[],
  contClubPairs: [string, string][],
  top3Cache: Record<string, number>,
): Record<string, number> {
  const club = getClub(distance)
  const threshold = CLUB_THRESHOLD[club]

  const allFilters: FilterSpec[] = [
    { k: 'all' },
    ...nations.map(c => ({ k: 'nat' as const, code: c })),
    ...clubs.map(c => ({ k: 'club' as const, name: c })),
    ...continents.map(c => ({ k: 'cont' as const, name: c })),
    ...contClubPairs.map(([cont, cl]) => ({ k: 'cc' as const, continent: cont, club: cl })),
  ]

  const isLong = distance > 150
  const basePool = isLong
    ? ['goals', 'assists', 'goals_assists', 'appearances', 'apps_minus_goals']
    : BASE_STATS
  const temporalPool = [...SINCE_KEYS, ...BEFORE_KEYS]

  const freq: Record<string, number> = {}

  for (let i = 0; i < n; i++) {
    let picked = false
    for (let attempt = 0; attempt < 120; attempt++) {
      const useTemporal = Math.random() < 0.4
      const pool = useTemporal ? temporalPool : basePool
      const stat = pool[Math.floor(Math.random() * pool.length)]
      const isClubStat = CLUB_STATS.includes(stat)

      const valid = allFilters.filter(f => {
        if (!isClubStat && (f.k === 'club' || f.k === 'cc')) return false
        const sum = top3Cache[cacheKey(stat, f)] ?? 0
        return sum >= threshold
      })

      if (valid.length === 0) continue

      const weighted = valid.flatMap(f => {
        if (f.k === 'all')  return Array(2).fill(f)
        if (f.k === 'cont') return Array(2).fill(f)
        return [f]
      })

      const f = weighted[Math.floor(Math.random() * weighted.length)]
      const key = filterLabel(f)
      freq[key] = (freq[key] ?? 0) + 1
      picked = true
      break
    }
    if (!picked) {
      freq['__fallback__'] = (freq['__fallback__'] ?? 0) + 1
    }
  }

  return freq
}

// GET ?n=100000&distances=20,50,80,140,220,270
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const n = Math.min(parseInt(searchParams.get('n') ?? '100000'), 1000000)
  const distances = (searchParams.get('distances') ?? '20,50,80,140,220,270')
    .split(',').map(Number).filter(d => !isNaN(d))

  // Fetch meta from the existing endpoint
  const baseUrl = new URL(req.url).origin
  const meta = await fetch(`${baseUrl}/api/football-golf?meta=1`).then(r => r.json())
  const { clubs, nations, continents, contClubPairs, top3Cache } = meta

  const results: Record<number, Record<string, number>> = {}
  for (const dist of distances) {
    results[dist] = simulate(dist, n, clubs, nations, continents, contClubPairs, top3Cache)
  }

  return NextResponse.json({ n, distances, results })
}

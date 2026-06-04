import { NextResponse } from 'next/server'
import { type FilterSpec, type FilterKind, CLUB_THRESHOLD, cacheKeyFor } from '@/lib/golf-logic'

export const dynamic = 'force-dynamic'

function getClub(dist: number): string {
  if (dist > 250) return 'driver'
  if (dist > 150) return 'iron'
  if (dist > 50)  return 'wedge'
  return 'putter'
}

function filterLabel(f: FilterSpec): string {
  if (f.k === 'all')    return 'all'
  if (f.k === 'nat')    return `nat:${f.code}`
  if (f.k === 'club')   return `club:${f.name}`
  if (f.k === 'cont')   return `cont:${f.name}`
  if (f.k === 'letter') return `letter:${f.letter}`
  return `cc:${f.continent}×${f.club}`
}

const BASE_STATS = ['goals', 'assists', 'goals_assists', 'appearances', 'apps_minus_goals', 'yellow_cards', 'clean_sheets']
const SINCE_YEARS = [2010, 2015, 2020]
const BEFORE_YEARS = [2000, 2005, 2010]
const SINCE_KEYS = SINCE_YEARS.flatMap(y => [`goals_since_${y}`, `ga_since_${y}`])
const BEFORE_KEYS = BEFORE_YEARS.flatMap(y => [`goals_before_${y}`, `ga_before_${y}`])
const CLUB_STATS = ['goals', 'assists', 'goals_assists', 'appearances', 'apps_minus_goals', 'yellow_cards', 'clean_sheets']

function getTypeProbs(club: string): Record<FilterKind, number> {
  if (club === 'driver') return { nat:20, club:20, cc:23, cont:19, all:5, letter:13 }
  if (club === 'iron')   return { nat:22, club:22, cc:21, cont:17, all:5, letter:13 }
  return                        { nat:23, club:23, cc:21, cont:15, all:3, letter:15 }
}

function sampleKind(probs: Record<FilterKind, number>): FilterKind {
  const types: FilterKind[] = ['nat','club','cc','cont','all','letter']
  const total = types.reduce((s, t) => s + probs[t], 0)
  let r = Math.random() * total
  for (const t of types) { r -= probs[t]; if (r <= 0) return t }
  return 'nat'
}

function simulate(
  distance: number,
  n: number,
  clubs: string[],
  nations: string[],
  continents: string[],
  contClubPairs: [string, string][],
  letters: string[],
  top3Cache: Record<string, number>,
): Record<string, number> {
  const club = getClub(distance)
  const threshold = CLUB_THRESHOLD[club as keyof typeof CLUB_THRESHOLD]
  const probs = getTypeProbs(club)

  const filtersByKind: Record<FilterKind, FilterSpec[]> = {
    all:    [{ k: 'all' }],
    nat:    nations.map(c => ({ k: 'nat' as const, code: c })),
    club:   clubs.map(c => ({ k: 'club' as const, name: c })),
    cont:   continents.map(c => ({ k: 'cont' as const, name: c })),
    cc:     contClubPairs.map(([cont, cl]) => ({ k: 'cc' as const, continent: cont, club: cl })),
    letter: letters.map(l => ({ k: 'letter' as const, letter: l })),
  }

  const isLong = distance > 150
  const basePool = isLong
    ? ['goals', 'assists', 'goals_assists', 'appearances', 'apps_minus_goals']
    : BASE_STATS
  const temporalPool = [...SINCE_KEYS, ...BEFORE_KEYS]

  const freq: Record<string, number> = {}

  for (let i = 0; i < n; i++) {
    let picked = false
    for (let attempt = 0; attempt < 120; attempt++) {
      const kind = sampleKind(probs)
      // Letter filters use base stats only (no temporal)
      const canUseTemporal = kind !== 'club' && kind !== 'cc' && kind !== 'letter'
      const useTemporal = canUseTemporal && Math.random() < 0.4
      const pool = useTemporal ? temporalPool : basePool
      const stat = pool[Math.floor(Math.random() * pool.length)]
      const isClubStat = CLUB_STATS.includes(stat)

      const valid = filtersByKind[kind].filter(f => {
        if (!isClubStat && (f.k === 'club' || f.k === 'cc')) return false
        if (f.k === 'letter' && !isClubStat) return false
        const sum = top3Cache[cacheKeyFor(stat, f)] ?? 0
        return sum >= threshold
      })

      if (valid.length === 0) continue

      const f = valid[Math.floor(Math.random() * valid.length)]
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
  const { clubs, nations, continents, contClubPairs, top3Cache, letters = [] } = meta

  const results: Record<number, Record<string, number>> = {}
  for (const dist of distances) {
    results[dist] = simulate(dist, n, clubs, nations, continents, contClubPairs, letters, top3Cache)
  }

  return NextResponse.json({ n, distances, results })
}

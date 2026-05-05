import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function fetchAll() {
  const cols = 'name_display,games,goals,assists,cards_red,teams_played_for,year_id,nationality,pos'
  let all: any[] = []
  let offset = 0
  while (true) {
    const { data } = await getClient()
      .from('player_seasons')
      .select(cols)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

async function fetchLeaderboard() {
  const { data } = await getClient()
    .from('countdown_scores')
    .select('username, score, created_at')
    .order('score', { ascending: false })
    .limit(200)

  const best: Record<string, { score: number; created_at: string }> = {}
  for (const row of data || []) {
    if (!best[row.username] || row.score > best[row.username].score) {
      best[row.username] = { score: row.score, created_at: row.created_at }
    }
  }
  return Object.entries(best)
    .map(([username, d]) => ({ username, score: d.score, created_at: d.created_at }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}

export type NumberPlayer = {
  name: string; seasons: number; appearances: number; goals: number
  clubs: number; assists: number; reds: number
  nationality: string; seasonRange: string; clubList: string
}

export type SurnameEntry = { surname: string; fullName: string }

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '')
}

// Pick the most-frequent value for a field across season rows
function mostFrequent(freq: Record<string, number>): string {
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
}

const getCountdownData = unstable_cache(
  async () => {
    const rows = await fetchAll()

    type Agg = {
      goals: number; assists: number; reds: number; appearances: number
      seasons: Set<string>; clubs: Set<string>
      yearClubs: { yearId: string; clubs: string[] }[]
      natFreq: Record<string, number>
    }
    const map: Record<string, Agg> = {}

    for (const row of rows) {
      const name = row.name_display as string
      if (!map[name]) {
        map[name] = { goals: 0, assists: 0, reds: 0, appearances: 0, seasons: new Set(), clubs: new Set(), yearClubs: [], natFreq: {} }
      }
      const p = map[name]
      p.goals       += (row.goals     as number) || 0
      p.assists     += (row.assists   as number) || 0
      p.reds        += (row.cards_red as number) || 0
      p.appearances += (row.games     as number) || 0
      if (row.year_id) p.seasons.add(row.year_id as string)
      if (row.nationality) p.natFreq[row.nationality] = (p.natFreq[row.nationality] || 0) + 1
      const rowClubs = String(row.teams_played_for || '').split(',').map((t: string) => t.trim()).filter((t: string) => t && t !== '2 Teams')
      for (const club of rowClubs) p.clubs.add(club)
      if (row.year_id && rowClubs.length > 0) {
        p.yearClubs.push({ yearId: row.year_id as string, clubs: rowClubs })
      }
    }

    // Surnames for letters rounds — keep the player with most seasons when surnames clash
    const surnameMap: Record<string, { surname: string; fullName: string; seasons: number }> = {}
    for (const [name, p] of Object.entries(map)) {
      const surname = normalize(name.split(' ').pop()!)
      if (surname.length >= 3) {
        const existing = surnameMap[surname]
        if (!existing || p.seasons.size > existing.seasons) {
          surnameMap[surname] = { surname, fullName: name, seasons: p.seasons.size }
        }
      }
    }
    const surnameEntries: SurnameEntry[] = Object.values(surnameMap).map(({ surname, fullName }) => ({ surname, fullName }))

    // Players for numbers rounds (3+ seasons, 10+ goal contributions)
    const numberPlayers: NumberPlayer[] = Object.entries(map)
      .filter(([, p]) => p.seasons.size >= 3 && (p.goals + p.assists) >= 10)
      .map(([name, p]) => {
        // Build club list in chronological order (deduplicated, first appearance wins)
        const sortedYears = [...p.seasons].sort()
        const firstSeason = sortedYears[0] || ''
        const lastSeason  = sortedYears[sortedYears.length - 1] || ''
        const seasonRange = firstSeason === lastSeason ? firstSeason : `${firstSeason} – ${lastSeason}`

        const seen = new Set<string>()
        const orderedClubs: string[] = []
        for (const { clubs } of p.yearClubs.sort((a, b) => a.yearId.localeCompare(b.yearId))) {
          for (const club of clubs) {
            if (!seen.has(club)) { seen.add(club); orderedClubs.push(club) }
          }
        }
        return {
          name,
          seasons:     p.seasons.size,
          appearances: p.appearances,
          goals:       p.goals,
          clubs:       p.clubs.size,
          assists:     p.assists,
          reds:        p.reds,
          nationality: mostFrequent(p.natFreq),
          seasonRange,
          clubList:    orderedClubs.join(', '),
        }
      })

    // Conundrum candidates: 5+ seasons, surname 6–10 letters
    const conundrumCandidates = Object.entries(map)
      .filter(([, p]) => p.seasons.size >= 5)
      .map(([name]) => ({ name, surname: normalize(name.split(' ').pop()!) }))
      .filter(({ surname }) => surname.length >= 6 && surname.length <= 10)

    return { surnameEntries, numberPlayers, conundrumCandidates }
  },
  ['countdown-data'],
  { revalidate: 86400 }
)

export async function GET() {
  try {
    const { surnameEntries, numberPlayers, conundrumCandidates } = await getCountdownData()
    const leaderboard = await fetchLeaderboard()
    return NextResponse.json(
      { surnameEntries, numberPlayers, conundrumCandidates, leaderboard },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { username, score } = await req.json()
    if (!username || score === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await getClient().from('countdown_scores').insert({ username, score })
    const leaderboard = await fetchLeaderboard()
    return NextResponse.json({ ok: true, leaderboard })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

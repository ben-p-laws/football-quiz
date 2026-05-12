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

function fmtNat(raw: string): string {
  const parts = raw.trim().split(/\s+/)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^[A-Z]{2,4}$/.test(parts[i])) return parts[i]
  }
  return raw
}

export type ATWPlayer = {
  name:        string
  nat:         string // FIFA 3-char code e.g. 'FRA'
  goals:       number
  assists:     number
  games:       number
  yellowCards: number
}

export const buildCache = unstable_cache(
  async () => {
    const all: any[] = []
    let offset = 0
    while (true) {
      const { data } = await getClient()
        .from('player_seasons')
        .select('name_display,games,goals,assists,cards_yellow,nationality')
        .range(offset, offset + 999)
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < 1000) break
      offset += 1000
    }

    const byName: Record<string, {
      goals: number; assists: number; games: number; yellowCards: number
      natFreq: Record<string, number>
    }> = {}

    for (const row of all) {
      const name = row.name_display as string
      if (!byName[name]) byName[name] = { goals: 0, assists: 0, games: 0, yellowCards: 0, natFreq: {} }
      const p = byName[name]
      p.goals       += Number(row.goals)        || 0
      p.assists     += Number(row.assists)       || 0
      p.games       += Number(row.games)         || 0
      p.yellowCards += Number(row.cards_yellow)  || 0
      if (row.nationality) {
        const nat = fmtNat(row.nationality as string)
        p.natFreq[nat] = (p.natFreq[nat] || 0) + 1
      }
    }

    const players: ATWPlayer[] = []
    for (const [name, p] of Object.entries(byName)) {
      const nat = Object.entries(p.natFreq).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (nat && p.games > 0) {
        players.push({ name, nat, goals: p.goals, assists: p.assists, games: p.games, yellowCards: p.yellowCards })
      }
    }

    return { players }
  },
  ['atw-players-v1'],
  { revalidate: 86400 }
)

export async function GET() {
  try {
    return NextResponse.json(await buildCache())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

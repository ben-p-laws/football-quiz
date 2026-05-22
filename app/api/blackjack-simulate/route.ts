import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Mirrors the selection logic in components/Blackjack.tsx startHand()
const STATS = ['goals', 'assists', 'yellow_cards', 'clean_sheets'] as const

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const n = Math.min(parseInt(searchParams.get('n') ?? '10000'), 2000000)

  const baseUrl = new URL(req.url).origin
  const seasons: string[] = await fetch(`${baseUrl}/api/blackjack?seasons=1`).then(r => r.json())

  const statFreq: Record<string, number> = {}
  const seasonFreq: Record<string, number> = {}

  for (let i = 0; i < n; i++) {
    const stat = Math.random() < 0.25
      ? 'club_seasons'
      : STATS[Math.floor(Math.random() * STATS.length)]

    statFreq[stat] = (statFreq[stat] ?? 0) + 1

    if (stat !== 'club_seasons' && seasons.length > 0) {
      const season = seasons[Math.floor(Math.random() * seasons.length)]
      seasonFreq[season] = (seasonFreq[season] ?? 0) + 1
    }
  }

  return NextResponse.json({ n, seasonCount: seasons.length, statFreq, seasonFreq })
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0
    return s / 0x100000000
  }
}

async function fetchAll() {
  const supabase = getClient()
  const rows: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('player_seasons')
      .select('name_display,teams_played_for,year_id')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

export async function GET(req: Request) {
  const supabase = getClient()
  const { searchParams } = new URL(req.url)

  // Autocomplete search
  const search = searchParams.get('search')
  if (search && search.length >= 2) {
    const { data } = await supabase
      .from('player_seasons')
      .select('name_display')
      .ilike('name_display', `%${search}%`)
      .limit(50)
    const names = [...new Set((data || []).map((r: any) => r.name_display as string))]
      .sort()
      .slice(0, 8)
    return NextResponse.json({ suggestions: names })
  }

  const mode = searchParams.get('mode') || 'daily'

  try {
    const rows = await fetchAll()

    // Build session → players map and player → clubs map
    const sessionPlayers: Record<string, Set<string>> = {}
    const playerClubs: Record<string, Set<string>> = {}

    for (const row of rows) {
      const name = row.name_display as string
      const yearId = row.year_id as string
      const clubs = String(row.teams_played_for || '')
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t && t !== '2 Teams')

      if (!playerClubs[name]) playerClubs[name] = new Set()

      for (const club of clubs) {
        playerClubs[name].add(club)
        const key = `${yearId}|||${club}`
        if (!sessionPlayers[key]) sessionPlayers[key] = new Set()
        sessionPlayers[key].add(name)
      }
    }

    // Eligible targets: 3+ distinct clubs
    const eligible = Object.keys(playerClubs).filter(name => playerClubs[name].size >= 3)
    if (eligible.length === 0) {
      return NextResponse.json({ error: 'No eligible players' }, { status: 500 })
    }

    let seed: number
    if (mode === 'daily') {
      const now = new Date()
      seed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate()
    } else {
      seed = Date.now() & 0x7fffffff
    }
    const rng = seededRng(seed)

    const targetName = eligible[Math.floor(rng() * eligible.length)]
    const targetGroups = [...playerClubs[targetName]].sort()

    // Find all players who shared a (year_id, club) session with the target
    const connCount: Record<string, number> = {}
    const connClubs: Record<string, Set<string>> = {}

    for (const row of rows) {
      if (row.name_display !== targetName) continue
      const yearId = row.year_id as string
      const clubs = String(row.teams_played_for || '')
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t && t !== '2 Teams')

      for (const club of clubs) {
        const key = `${yearId}|||${club}`
        for (const peerName of sessionPlayers[key] || []) {
          if (peerName === targetName) continue
          connCount[peerName] = (connCount[peerName] || 0) + 1
          if (!connClubs[peerName]) connClubs[peerName] = new Set()
          connClubs[peerName].add(club)
        }
      }
    }

    type Conn = { name: string; count: number; sharedGroups: string[] }
    const connections: Conn[] = Object.entries(connCount)
      .map(([name, count]) => ({ name, count, sharedGroups: [...connClubs[name]] }))
      .sort((a, b) => b.count - a.count)

    if (connections.length < 4) {
      return NextResponse.json({ error: 'Not enough connections for puzzle' }, { status: 500 })
    }

    // One clue per target group where possible, from the top-15 most frequent sharers
    const clues: Conn[] = []
    const usedNames = new Set<string>()

    for (const group of targetGroups) {
      if (clues.length >= 4) break
      const pool = connections
        .filter(c => !usedNames.has(c.name) && c.sharedGroups.includes(group))
        .slice(0, 15)
      if (!pool.length) continue
      const pick = pool[Math.floor(rng() * pool.length)]
      clues.push(pick)
      usedNames.add(pick.name)
    }

    // Fill remaining slots from any connection
    const remaining = connections.filter(c => !usedNames.has(c.name))
    while (clues.length < 4 && remaining.length > 0) {
      const idx = Math.floor(rng() * Math.min(remaining.length, 15))
      const [pick] = remaining.splice(idx, 1)
      clues.push(pick)
    }

    // Shuffle
    for (let i = clues.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[clues[i], clues[j]] = [clues[j], clues[i]]
    }

    return NextResponse.json({
      targetEntity: targetName,
      targetGroups,
      clues: clues.map(c => ({ name: c.name, sharedGroups: c.sharedGroups })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

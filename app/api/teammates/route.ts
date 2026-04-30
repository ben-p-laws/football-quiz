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
      .select('name_display,teams_played_for,year_id,pos')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

// Build the session/club maps once — reused for all 5 puzzles
function prepareData(rows: any[]) {
  const sessionPlayers: Record<string, Set<string>> = {}
  const playerClubs: Record<string, Set<string>> = {}
  const playerPos: Record<string, Record<string, number>> = {}

  for (const row of rows) {
    const name = row.name_display as string
    const yearId = row.year_id as string
    const pos = row.pos as string
    const clubs = String(row.teams_played_for || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t && t !== '2 Teams')

    if (!playerClubs[name]) playerClubs[name] = new Set()
    if (!playerPos[name])   playerPos[name]   = {}
    if (pos) playerPos[name][pos] = (playerPos[name][pos] || 0) + 1

    for (const club of clubs) {
      playerClubs[name].add(club)
      const key = `${yearId}|||${club}`
      if (!sessionPlayers[key]) sessionPlayers[key] = new Set()
      sessionPlayers[key].add(name)
    }
  }

  const eligible = Object.keys(playerClubs).filter(name => playerClubs[name].size >= 3)
  return { sessionPlayers, playerClubs, playerPos, eligible }
}

type Puzzle = {
  targetEntity: string
  targetGroups: string[]
  targetPos: string
  clues: { name: string; sharedGroups: string[]; sharedYears: string[] }[]
}

function pickPuzzle(
  rows: any[],
  sessionPlayers: Record<string, Set<string>>,
  playerClubs: Record<string, Set<string>>,
  playerPos: Record<string, Record<string, number>>,
  eligible: string[],
  rng: () => number,
  usedTargets: Set<string>
): Puzzle | null {
  const pool = eligible.filter(n => !usedTargets.has(n))
  if (pool.length === 0) return null

  const targetName = pool[Math.floor(rng() * pool.length)]
  const targetGroups = [...playerClubs[targetName]].sort()

  const posFreq = playerPos[targetName] ?? {}
  const targetPos = Object.entries(posFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

  const connCount: Record<string, number> = {}
  const connClubs: Record<string, Set<string>> = {}
  const connYears: Record<string, Set<string>> = {}

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
        if (!connYears[peerName]) connYears[peerName] = new Set()
        connYears[peerName].add(yearId)
      }
    }
  }

  type Conn = { name: string; count: number; sharedGroups: string[]; sharedYears: string[] }
  const connections: Conn[] = Object.entries(connCount)
    .map(([name, count]) => ({
      name, count,
      sharedGroups: [...connClubs[name]],
      sharedYears: [...connYears[name]].sort(),
    }))
    .sort((a, b) => b.count - a.count)

  if (connections.length < 4) return null

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

  const remaining = connections.filter(c => !usedNames.has(c.name))
  while (clues.length < 4 && remaining.length > 0) {
    const idx = Math.floor(rng() * Math.min(remaining.length, 15))
    const [pick] = remaining.splice(idx, 1)
    clues.push(pick)
  }

  if (clues.length < 4) return null

  for (let i = clues.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[clues[i], clues[j]] = [clues[j], clues[i]]
  }

  return {
    targetEntity: targetName,
    targetGroups,
    targetPos,
    clues: clues.map(c => ({ name: c.name, sharedGroups: c.sharedGroups, sharedYears: c.sharedYears })),
  }
}

async function fetchLeaderboard() {
  const supabase = getClient()
  const { data } = await supabase
    .from('teammates_scores')
    .select('username, score, created_at')
    .order('score', { ascending: false })
    .limit(200)

  const best: Record<string, { score: number }> = {}
  for (const row of data || []) {
    if (!best[row.username] || row.score > best[row.username].score) {
      best[row.username] = { score: row.score }
    }
  }
  return Object.entries(best)
    .map(([username, d]) => ({ username, score: d.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}

export async function GET(req: Request) {
  const supabase = getClient()
  const { searchParams } = new URL(req.url)

  // Autocomplete
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

  // Leaderboard only
  if (searchParams.get('leaderboard') === 'true') {
    const leaderboard = await fetchLeaderboard()
    return NextResponse.json({ leaderboard })
  }

  // Generate all 5 puzzles in one go — fetch rows once, reuse for every puzzle
  try {
    const rows = await fetchAll()
    const { sessionPlayers, playerClubs, playerPos, eligible } = prepareData(rows)

    const masterSeed = Date.now() & 0x7fffffff
    const rng = seededRng(masterSeed)
    const puzzles: Puzzle[] = []
    const usedTargets = new Set<string>()

    for (let i = 0; i < 5; i++) {
      let puzzle: Puzzle | null = null
      for (let attempt = 0; attempt < 20; attempt++) {
        puzzle = pickPuzzle(rows, sessionPlayers, playerClubs, playerPos, eligible, rng, usedTargets)
        if (puzzle) break
      }
      if (!puzzle) return NextResponse.json({ error: 'Failed to generate puzzle' }, { status: 500 })
      puzzles.push(puzzle)
      usedTargets.add(puzzle.targetEntity)
    }

    return NextResponse.json({ puzzles })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getClient()
    const { username, score } = await req.json()
    if (!username || score === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await supabase.from('teammates_scores').insert({ username, score })
    const leaderboard = await fetchLeaderboard()
    return NextResponse.json({ ok: true, leaderboard })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

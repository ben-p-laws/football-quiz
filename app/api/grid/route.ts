import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Per-date cache — same 1-hour pattern as all other API routes
const cache = new Map<string, { data: any; time: number }>()
const CACHE_TTL = 3_600_000

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || getTodayStr()

  const cached = cache.get(date)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const supabase = getClient()

    // Fetch available dates and today's puzzle in parallel
    const [datesRes, puzzleRes] = await Promise.all([
      supabase
        .from('pl_grid_puzzles')
        .select('puzzle_date')
        .eq('is_published', true)
        .order('puzzle_date', { ascending: false }),
      supabase
        .from('pl_grid_puzzles')
        .select('*')
        .eq('puzzle_date', date)
        .eq('is_published', true)
        .single(),
    ])

    const availableDates = (datesRes.data || []).map((r: any) => r.puzzle_date as string)
    const pd = puzzleRes.data ?? null

    let answerCounts: Record<string, number> = {}
    if (pd) {
      const { data: counts } = await supabase
        .from('pl_grid_cell_answers')
        .select('row_index, col_index')
        .eq('puzzle_id', pd.id)

      for (const row of counts || []) {
        const key = `${row.row_index}_${row.col_index}`
        answerCounts[key] = (answerCounts[key] ?? 0) + 1
      }
    }

    const data = { availableDates, puzzle: pd, answerCounts }
    cache.set(date, { data, time: Date.now() })
    return NextResponse.json(data)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_BINS = ['bin_0_5','bin_5_10','bin_10_20','bin_20_40','bin_40_60','bin_60_plus'] as const
type Bin = typeof VALID_BINS[number]

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function pctToBin(pct: number): Bin {
  if (pct <= 5)  return 'bin_0_5'
  if (pct <= 10) return 'bin_5_10'
  if (pct <= 20) return 'bin_10_20'
  if (pct <= 40) return 'bin_20_40'
  if (pct <= 60) return 'bin_40_60'
  return 'bin_60_plus'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const sb = getClient()
  const { data, error } = await sb
    .from('circle_daily_stats')
    .select('*')
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? null)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { date, puzzleId, pct } = body as { date: string; puzzleId: number; pct: number }

  if (!date || puzzleId === undefined || pct === undefined)
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const bin = pctToBin(pct)
  const sb = getClient()

  // Try insert first, fall back to increment
  const { error: insertErr } = await sb
    .from('circle_daily_stats')
    .insert({ date, puzzle_id: puzzleId, [bin]: 1 })

  if (insertErr) {
    // Row already exists — increment
    const { data: row } = await sb
      .from('circle_daily_stats')
      .select(bin)
      .eq('date', date)
      .single()

    const current = (row as Record<string, number> | null)?.[bin] ?? 0
    await sb
      .from('circle_daily_stats')
      .update({ [bin]: current + 1 })
      .eq('date', date)
  }

  return NextResponse.json({ ok: true })
}

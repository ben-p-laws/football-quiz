import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// GET ?deviceId=XXX          → clubs user is in
// GET ?code=XXX              → club info + basic members
// GET ?code=XXX&lobby=1      → club lobby: members enriched with handicap stats
// GET ?rankings=1            → all clubs ranked by avg handicap
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get('deviceId')
  const code = searchParams.get('code')
  const lobby = searchParams.get('lobby') === '1'
  const rankings = searchParams.get('rankings') === '1'
  const db = getClient()

  if (rankings) {
    const { data: allClubs } = await db.from('golf_clubs').select('id, name, code')
    const { data: allMembers } = await db.from('golf_club_members').select('club_id, device_id')
    const allDeviceIds = [...new Set((allMembers ?? []).map((m: { device_id: string }) => m.device_id))]
    const { data: allHandicaps } = allDeviceIds.length > 0
      ? await db.from('golf_handicap').select('device_id, handicap_index').in('device_id', allDeviceIds)
      : { data: [] }

    type HcpEntry = { device_id: string; handicap_index: number }
    type RankEntry = { name: string; code: string; avg_handicap: number; member_count: number }
    const ranked: RankEntry[] = ((allClubs ?? []).map((club: { id: string; name: string; code: string }) => {
      const memberIds = (allMembers ?? [])
        .filter((m: { club_id: string }) => m.club_id === club.id)
        .map((m: { device_id: string }) => m.device_id)
      const hcps = (allHandicaps ?? [] as HcpEntry[]).filter((h: HcpEntry) => memberIds.includes(h.device_id))
      if (hcps.length === 0) return null
      const avg = hcps.reduce((s: number, h: HcpEntry) => s + h.handicap_index, 0) / hcps.length
      return { name: club.name, code: club.code, avg_handicap: Math.round(avg * 10) / 10, member_count: memberIds.length }
    }).filter((x: RankEntry | null): x is RankEntry => x !== null)).sort((a: RankEntry, b: RankEntry) => b.avg_handicap - a.avg_handicap)

    return NextResponse.json({ rankings: ranked })
  }

  if (deviceId) {
    const { data: memberships } = await db
      .from('golf_club_members')
      .select('club_id')
      .eq('device_id', deviceId)
    const clubIds = (memberships ?? []).map((m: { club_id: string }) => m.club_id)
    if (clubIds.length === 0) return NextResponse.json({ clubs: [] })
    const { data: clubs } = await db
      .from('golf_clubs')
      .select('id, name, code')
      .in('id', clubIds)
      .order('name')
    return NextResponse.json({ clubs: clubs ?? [] })
  }

  if (code) {
    const { data: club } = await db
      .from('golf_clubs')
      .select('id, name, code, created_by')
      .eq('code', code.toUpperCase())
      .maybeSingle()
    if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

    const { data: members } = await db
      .from('golf_club_members')
      .select('device_id, username, joined_at')
      .eq('club_id', club.id)
      .order('joined_at', { ascending: true })

    if (!lobby) return NextResponse.json({ club, members: members ?? [] })

    // Lobby: enrich with handicap data
    const deviceIds = (members ?? []).map((m: { device_id: string }) => m.device_id)
    const { data: handicaps } = deviceIds.length > 0
      ? await db.from('golf_handicap')
          .select('device_id, username, handicap_index, tier, total_rounds, streak, rounds')
          .in('device_id', deviceIds)
      : { data: [] }

    type HcpRow = { device_id: string; username: string; handicap_index: number; tier: string; total_rounds: number; streak: number; rounds: { strokes: number; par: number }[] | null }
    const hcpMap = new Map((handicaps ?? []).map((h: HcpRow) => [h.device_id, h]))

    const enriched = (members ?? []).map((m: { device_id: string; username: string; joined_at: string }) => {
      const h = hcpMap.get(m.device_id) as HcpRow | undefined
      const bestScore = h?.rounds?.length
        ? Math.min(...h.rounds.map((r: { strokes: number; par: number }) => r.strokes - r.par))
        : null
      return {
        device_id: m.device_id,
        username: h?.username ?? m.username,
        handicap_index: h?.handicap_index ?? null,
        tier: h?.tier ?? null,
        total_rounds: h?.total_rounds ?? 0,
        streak: h?.streak ?? 0,
        best_score: bestScore,
      }
    }).sort((a: { handicap_index: number | null }, b: { handicap_index: number | null }) => {
      if (a.handicap_index === null) return 1
      if (b.handicap_index === null) return -1
      return b.handicap_index - a.handicap_index
    })

    type EnrichedMember = { device_id: string; username: string; handicap_index: number | null; tier: string | null; total_rounds: number; streak: number; best_score: number | null }
    const withHandicap = (enriched as EnrichedMember[]).filter(m => m.handicap_index !== null) as (EnrichedMember & { handicap_index: number })[]
    const avgHandicap = withHandicap.length > 0
      ? Math.round(withHandicap.reduce((s, m) => s + m.handicap_index, 0) / withHandicap.length * 10) / 10
      : null

    return NextResponse.json({ club: { ...club, avg_handicap: avgHandicap }, members: enriched })
  }

  return NextResponse.json({ error: 'Missing deviceId or code' }, { status: 400 })
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = getClient()

  if (body.action === 'create') {
    const { name, deviceId, username } = body
    if (!name?.trim() || !deviceId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    let code = genCode()
    for (let i = 0; i < 5; i++) {
      const { data } = await db.from('golf_clubs').select('id').eq('code', code).maybeSingle()
      if (!data) break
      code = genCode()
    }
    const { data: club, error } = await db
      .from('golf_clubs')
      .insert({ name: name.trim(), code, created_by: deviceId })
      .select('id, name, code')
      .single()
    if (error || !club) return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 })
    await db.from('golf_club_members').insert({ club_id: club.id, device_id: deviceId, username: username ?? '' })
    return NextResponse.json({ club })
  }

  if (body.action === 'join') {
    const { code, deviceId, username } = body
    if (!code || !deviceId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const { data: club } = await db
      .from('golf_clubs')
      .select('id, name, code')
      .eq('code', code.toUpperCase())
      .maybeSingle()
    if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    await db.from('golf_club_members').upsert(
      { club_id: club.id, device_id: deviceId, username: username ?? '' },
      { onConflict: 'club_id,device_id', ignoreDuplicates: true }
    )
    return NextResponse.json({ club })
  }

  if (body.action === 'leave') {
    const { clubId, deviceId } = body
    if (!clubId || !deviceId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    await db.from('golf_club_members').delete().eq('club_id', clubId).eq('device_id', deviceId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

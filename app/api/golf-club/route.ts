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

// GET ?deviceId=XXX → clubs user is in
// GET ?code=XXX     → club info + members
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get('deviceId')
  const code = searchParams.get('code')
  const db = getClient()

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
    return NextResponse.json({ club, members: members ?? [] })
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

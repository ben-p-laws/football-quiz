import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function genRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// GET ?roomId=XXX           → full room record
// GET ?roomId=XXX&holeIdx=N → all shots for that hole
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })
  const db = getClient()

  const holeParam = searchParams.get('holeIdx')
  if (holeParam !== null) {
    const { data } = await db
      .from('golf_h2h_shots')
      .select('*')
      .eq('room_id', roomId)
      .eq('hole_idx', parseInt(holeParam))
    return NextResponse.json({ shots: data || [] })
  }

  const { data: room } = await db.from('golf_h2h_rooms').select('*').eq('id', roomId).single()
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  return NextResponse.json({ room })
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = getClient()

  // ── Create room ──────────────────────────────────────────────────────────────
  if (body.action === 'create') {
    const { hostId, hostName, config, holes, teeCategories } = body
    let id = genRoomId()
    for (let i = 0; i < 5; i++) {
      const { data } = await db.from('golf_h2h_rooms').select('id').eq('id', id).single()
      if (!data) break
      id = genRoomId()
    }
    const { error } = await db.from('golf_h2h_rooms').insert({
      id, host_id: hostId, host_name: hostName,
      config, holes, tee_categories: teeCategories, status: 'waiting',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ roomId: id })
  }

  // ── Join room ─────────────────────────────────────────────────────────────────
  if (body.action === 'join') {
    const { roomId, guestId, guestName } = body
    const { data: room } = await db.from('golf_h2h_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.status !== 'waiting') return NextResponse.json({ error: 'Game already started' }, { status: 400 })
    if (room.guest_id && room.guest_id !== guestId) return NextResponse.json({ error: 'Room is full' }, { status: 400 })
    await db.from('golf_h2h_rooms').update({ guest_id: guestId, guest_name: guestName }).eq('id', roomId)
    return NextResponse.json({ room: { ...room, guest_id: guestId, guest_name: guestName } })
  }

  // ── Start game ────────────────────────────────────────────────────────────────
  if (body.action === 'start') {
    const { roomId } = body
    await db.from('golf_h2h_rooms').update({ status: 'playing' }).eq('id', roomId)
    return NextResponse.json({ ok: true })
  }

  // ── Submit shot ───────────────────────────────────────────────────────────────
  if (body.action === 'shot') {
    const { roomId, playerId, holeIdx, shotIdx, remainingAfter, pastPin, holedOut, holeStrokes } = body

    await db.from('golf_h2h_shots').upsert({
      room_id: roomId,
      hole_idx: holeIdx,
      shot_idx: shotIdx,
      player_id: playerId,
      remaining_after: remainingAfter,
      past_pin: pastPin ?? false,
      holed_out: holedOut ?? false,
      hole_strokes: holedOut ? (holeStrokes ?? null) : null,
    }, { onConflict: 'room_id,hole_idx,shot_idx,player_id' })

    const { data: room } = await db.from('golf_h2h_rooms').select('host_id,guest_id').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    const oppId = playerId === room.host_id ? room.guest_id : room.host_id

    const { data: oppShot } = await db.from('golf_h2h_shots')
      .select('*')
      .eq('room_id', roomId).eq('hole_idx', holeIdx).eq('shot_idx', shotIdx).eq('player_id', oppId)
      .maybeSingle()

    return NextResponse.json({ bothReady: !!oppShot, opponentShot: oppShot || null })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

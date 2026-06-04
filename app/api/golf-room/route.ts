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
    const { roomId, guestId: rawGuestId, guestName } = body
    const { data: room } = await db.from('golf_h2h_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.status !== 'waiting') return NextResponse.json({ error: 'Game already started' }, { status: 400 })

    const guestId = rawGuestId === room.host_id
      ? Array.from({ length: 10 }, () => Math.random().toString(36)[2]).join('') + '_g'
      : rawGuestId

    const gameMode = room.config?.gameMode
    const is2v2 = gameMode === 'h2h-scramble' || gameMode === 'h2h-alt'

    if (is2v2) {
      // Check if already assigned to a slot
      if (room.host_partner_id === guestId || room.host_partner_id === rawGuestId)
        return NextResponse.json({ room: { ...room, mySlot: 'host_partner', myId: room.host_partner_id } })
      if (room.guest_id === guestId || room.guest_id === rawGuestId)
        return NextResponse.json({ room: { ...room, mySlot: 'guest', myId: room.guest_id } })
      if (room.guest_partner_id === guestId || room.guest_partner_id === rawGuestId)
        return NextResponse.json({ room: { ...room, mySlot: 'guest_partner', myId: room.guest_partner_id } })

      // Add to pending if not already there
      const pending = (room.pending_players ?? []) as { id: string; name: string }[]
      const alreadyIn = pending.some(p => p.id === guestId || p.id === rawGuestId)
      if (!alreadyIn) {
        const filled = [room.host_partner_id, room.guest_id, room.guest_partner_id].filter(Boolean).length
        if (pending.length + filled >= 3) return NextResponse.json({ error: 'Room is full' }, { status: 400 })
        await db.from('golf_h2h_rooms').update({
          pending_players: [...pending, { id: guestId, name: guestName ?? '' }]
        }).eq('id', roomId)
      }
      return NextResponse.json({ room: { ...room, mySlot: null, myId: guestId } })
    }

    // 1v1 join
    if (room.guest_id && room.guest_id !== guestId && room.guest_id !== rawGuestId)
      return NextResponse.json({ error: 'Room is full' }, { status: 400 })
    await db.from('golf_h2h_rooms').update({ guest_id: guestId, guest_name: guestName }).eq('id', roomId)
    return NextResponse.json({ room: { ...room, guest_id: guestId, guest_name: guestName } })
  }

  // ── Assign player to team slot (2v2 only, host action) ───────────────────────
  if (body.action === 'assign') {
    const { roomId, hostId, playerId, slot } = body
    // slot: 'host_partner' | 'guest' | 'guest_partner'
    const { data: room } = await db.from('golf_h2h_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.host_id !== hostId) return NextResponse.json({ error: 'Not host' }, { status: 403 })
    if (room[`${slot}_id`]) return NextResponse.json({ error: 'Slot taken' }, { status: 400 })

    const pending = (room.pending_players ?? []) as { id: string; name: string }[]
    const player = pending.find(p => p.id === playerId)
    if (!player) return NextResponse.json({ error: 'Player not in lobby' }, { status: 404 })

    await db.from('golf_h2h_rooms').update({
      pending_players: pending.filter(p => p.id !== playerId),
      [`${slot}_id`]: player.id,
      [`${slot}_name`]: player.name,
    }).eq('id', roomId)

    return NextResponse.json({ ok: true })
  }

  // ── Start game ────────────────────────────────────────────────────────────────
  if (body.action === 'start') {
    const { roomId } = body
    const { data: room } = await db.from('golf_h2h_rooms')
      .select('config, host_partner_id, guest_id, guest_partner_id')
      .eq('id', roomId).single()
    const gameMode = room?.config?.gameMode
    const is2v2 = gameMode === 'h2h-scramble' || gameMode === 'h2h-alt'
    if (is2v2 && (!room?.host_partner_id || !room?.guest_id || !room?.guest_partner_id))
      return NextResponse.json({ error: 'All 4 players must be assigned before starting' }, { status: 400 })
    await db.from('golf_h2h_rooms').update({ status: 'playing' }).eq('id', roomId)
    return NextResponse.json({ ok: true })
  }

  // ── Submit shot ───────────────────────────────────────────────────────────────
  if (body.action === 'shot') {
    const { roomId, playerId, holeIdx, shotIdx, remainingAfter, pastPin, holedOut, holeStrokes, isGimme, playerNames, questionLabel } = body

    await db.from('golf_h2h_shots').upsert({
      room_id: roomId,
      hole_idx: holeIdx,
      shot_idx: shotIdx,
      player_id: playerId,
      remaining_after: remainingAfter,
      past_pin: pastPin ?? false,
      holed_out: holedOut ?? false,
      hole_strokes: holedOut ? (holeStrokes ?? null) : null,
      is_gimme: holedOut ? (isGimme ?? false) : false,
    }, { onConflict: 'room_id,hole_idx,shot_idx,player_id' })

    const extras: Record<string, unknown> = {}
    if (playerNames) extras.player_names = playerNames
    if (questionLabel) extras.question_label = questionLabel
    if (Object.keys(extras).length > 0) {
      void db.from('golf_h2h_shots').update(extras)
        .eq('room_id', roomId).eq('hole_idx', holeIdx).eq('shot_idx', shotIdx).eq('player_id', playerId)
        .then(() => {}, () => {})
    }

    const { data: room } = await db.from('golf_h2h_rooms')
      .select('host_id, host_partner_id, guest_id, guest_partner_id')
      .eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    const is4Player = !!room.host_partner_id

    if (is4Player) {
      const amHostTeam = playerId === room.host_id || playerId === room.host_partner_id
      const myTeammateId = amHostTeam
        ? (playerId === room.host_id ? room.host_partner_id : room.host_id)
        : (playerId === room.guest_id ? room.guest_partner_id : room.guest_id)
      const oppTeamPlayerIds = (amHostTeam
        ? [room.guest_id, room.guest_partner_id]
        : [room.host_id, room.host_partner_id]).filter(Boolean) as string[]

      const { data: allShots } = await db.from('golf_h2h_shots')
        .select('*')
        .eq('room_id', roomId).eq('hole_idx', holeIdx).eq('shot_idx', shotIdx)

      const shotsMap = new Map(((allShots ?? []) as any[]).map(s => [s.player_id, s]))
      const myTeammateShot = myTeammateId ? (shotsMap.get(myTeammateId) ?? null) : null
      const oppTeamShots = oppTeamPlayerIds.map(id => shotsMap.get(id) ?? null)
      const allFourReady = (allShots?.length ?? 0) >= 4

      return NextResponse.json({
        bothReady: !!myTeammateShot,
        opponentShot: myTeammateShot,
        is4Player: true,
        allFourReady,
        oppTeamShots,
      })
    }

    // 1v1 logic
    const oppId = playerId === room.host_id ? room.guest_id : room.host_id
    if (!oppId || oppId === playerId) return NextResponse.json({ bothReady: false, opponentShot: null })

    const { data: oppShot } = await db.from('golf_h2h_shots')
      .select('*')
      .eq('room_id', roomId).eq('hole_idx', holeIdx).eq('shot_idx', shotIdx).eq('player_id', oppId)
      .maybeSingle()

    return NextResponse.json({ bothReady: !!oppShot, opponentShot: oppShot || null })
  }

  // ── Question preview ──────────────────────────────────────────────────────────
  if (body.action === 'previewQuestion') {
    const { roomId, playerId, questionLabel } = body
    const { data: room } = await db.from('golf_h2h_rooms').select('config').eq('id', roomId).single()
    const newConfig = { ...(room?.config || {}), [`currentQ_${playerId}`]: questionLabel }
    await db.from('golf_h2h_rooms').update({ config: newConfig }).eq('id', roomId)
    return NextResponse.json({ ok: true })
  }

  // ── Sudden death ─────────────────────────────────────────────────────────────
  if (body.action === 'startSD') {
    const { roomId, sdHole, sdCategory } = body
    const { data: room } = await db.from('golf_h2h_rooms').select('config').eq('id', roomId).single()
    const newConfig = { ...(room?.config || {}), sdHole, sdCategory }
    await db.from('golf_h2h_rooms').update({ config: newConfig }).eq('id', roomId)
    return NextResponse.json({ ok: true })
  }

  // ── Rematch ───────────────────────────────────────────────────────────────────
  if (body.action === 'rematch') {
    const { roomId, holes, teeCategories } = body
    await db.from('golf_h2h_shots').delete().eq('room_id', roomId)
    await db.from('golf_h2h_rooms').update({ holes, tee_categories: teeCategories, status: 'playing', config: {} }).eq('id', roomId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

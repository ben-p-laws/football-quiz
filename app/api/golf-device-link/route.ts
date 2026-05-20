import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// POST { action: 'generate', deviceId } → { code }
// POST { action: 'claim',    code, newDeviceId } → { primaryDeviceId }
export async function POST(req: Request) {
  const body = await req.json()
  const db = getClient()

  if (body.action === 'generate') {
    const { deviceId } = body
    if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })

    const code = randomCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Clean up expired codes for this device first
    await db.from('golf_device_links').delete().eq('device_id', deviceId)

    const { error } = await db.from('golf_device_links').insert({ code, device_id: deviceId, expires_at: expiresAt })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ code })
  }

  if (body.action === 'claim') {
    const { code, newDeviceId } = body
    if (!code || !newDeviceId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: link } = await db
      .from('golf_device_links')
      .select('device_id, expires_at')
      .eq('code', code.toUpperCase())
      .maybeSingle()

    if (!link) return NextResponse.json({ error: 'Code not found' }, { status: 404 })
    if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'Code expired' }, { status: 410 })

    // Delete used code
    await db.from('golf_device_links').delete().eq('code', code.toUpperCase())

    return NextResponse.json({ primaryDeviceId: link.device_id })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

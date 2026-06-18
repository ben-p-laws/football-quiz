'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

type Row = { id: string; device_id: string; name: string; best_score: number; updated_at: string }

const LS_DEVICE_ID = 'fpl_draft_device_id'

export default function LeaderboardPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [deviceId] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(LS_DEVICE_ID) ?? '') : ''
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('fpl_draft_leaderboard')
        .select('id, device_id, name, best_score, updated_at')
        .order('best_score', { ascending: false })
        .limit(50)
      if (!cancelled) {
        if (error) console.error(error)
        setRows((data as Row[] | null) ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <NavBar />
      <div style={{
        minHeight: 'calc(100dvh - 56px)',
        background: '#0a0f1e',
        color: 'white',
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 18px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                FPL Draft 11
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '2px 0 0', letterSpacing: '-0.5px' }}>
                Leaderboard
              </h1>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => router.push('/fpl-draft')}
              style={{
                background: '#dc2626',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 800,
                color: 'white',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Play
            </button>
          </div>

          <div style={{
            background: '#111827',
            border: '1px solid #1e2d4a',
            borderRadius: 14,
            padding: 14,
          }}>
            {loading && (
              <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>Loading…</div>
            )}
            {!loading && rows.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>
                No scores yet — be the first.
              </div>
            )}
            {!loading && rows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map((row, i) => {
                  const isYou = row.device_id === deviceId
                  return (
                    <div key={row.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: isYou ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isYou ? 'rgba(220,38,38,0.4)' : '#1e2d4a'}`,
                      borderRadius: 10,
                    }}>
                      <div style={{
                        width: 36,
                        fontSize: 12,
                        fontWeight: 900,
                        color: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#cd7c2f' : '#4a5568',
                        flexShrink: 0,
                      }}>
                        #{i + 1}
                      </div>
                      <div style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {row.name}{isYou && (
                          <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 800, marginLeft: 6, letterSpacing: '0.1em' }}>YOU</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: 'white',
                        minWidth: 50,
                        textAlign: 'right',
                      }}>
                        {row.best_score}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

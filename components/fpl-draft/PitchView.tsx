'use client'
import React from 'react'
import type { FplPlayer } from './PlayerCard'

export type PitchSlot = {
  position: FplPlayer['position']
  player: FplPlayer | null
  revealed?: boolean
}

type Pos = FplPlayer['position']

const POS_COLOR: Record<Pos, string> = {
  GKP: '#facc15',
  DEF: '#22c55e',
  MID: '#38bdf8',
  FWD: '#dc2626',
}
const POS_RGB: Record<Pos, string> = {
  GKP: '250,204,21',
  DEF: '34,197,94',
  MID: '56,189,248',
  FWD: '220,38,38',
}

const FORMATIONS = [
  [1,3,4,3],[1,3,5,2],[1,4,4,2],[1,4,5,1],[1,4,3,3],[1,5,4,1],[1,5,3,2],
] as const

function maxSlotsPerPos(slots: PitchSlot[]): Record<Pos, number> {
  const filled: Record<Pos, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 }
  for (const s of slots) if (s.player) filled[s.position]++

  const viable = FORMATIONS.filter(([g, d, m, f]) =>
    filled.GKP <= g && filled.DEF <= d && filled.MID <= m && filled.FWD <= f
  )

  if (viable.length === 0) {
    return { GKP: Math.max(filled.GKP, 1), DEF: Math.max(filled.DEF, 3), MID: Math.max(filled.MID, 4), FWD: Math.max(filled.FWD, 2) }
  }

  return {
    GKP: Math.max(...viable.map(f => f[0])),
    DEF: Math.max(...viable.map(f => f[1])),
    MID: Math.max(...viable.map(f => f[2])),
    FWD: Math.max(...viable.map(f => f[3])),
  }
}

export default function PitchView({
  slots,
  totalScore,
  showTotal = false,
  vertical = false,
}: {
  slots: PitchSlot[]
  totalScore?: number
  showTotal?: boolean
  vertical?: boolean
}) {
  const maxSlots = maxSlotsPerPos(slots)
  const byPos: Record<Pos, PitchSlot[]> = { GKP: [], DEF: [], MID: [], FWD: [] }
  for (const s of slots) byPos[s.position].push(s)

  // ── Vertical mode (end screen) ───────────────────────────────────────────
  if (vertical) {
    const ROW_H = 90
    const PAD_V = 14
    const height = 4 * ROW_H + PAD_V * 2
    const rows: Pos[] = ['FWD', 'MID', 'DEF', 'GKP']

    return (
      <div style={{
        position: 'relative',
        borderRadius: 12,
        border: '1px solid #1e2d4a',
        overflow: 'hidden',
        height,
        width: '100%',
      }}>
        <svg
          viewBox={`0 0 300 ${height}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="pitchGradV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e3c1c" />
              <stop offset="100%" stopColor="#0a2f15" />
            </linearGradient>
          </defs>
          <rect width="300" height={height} fill="url(#pitchGradV)" />
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x="0" y={i * (height / 5)} width="300" height={height / 10} fill="rgba(255,255,255,0.018)" />
          ))}
          <rect x="3" y="3" width="294" height={height - 6} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
          <line x1="3" y1={height / 2} x2="297" y2={height / 2} stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
          <circle cx="150" cy={height / 2} r="20" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
          <circle cx="150" cy={height / 2} r="1.5" fill="rgba(255,255,255,0.25)" />
          {/* Top penalty box (FWD side) */}
          <rect x="75" y="3" width="150" height="52" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
          <rect x="112" y="3" width="76" height="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          {/* Bottom penalty box (GKP side) */}
          <rect x="75" y={height - 55} width="150" height="52" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
          <rect x="112" y={height - 23} width="76" height="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        </svg>

        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: `${PAD_V}px 6px`,
        }}>
          {rows.map(pos => {
            const color = POS_COLOR[pos]
            const rgb = POS_RGB[pos]
            const count = maxSlots[pos]
            const display = Array.from({ length: count }, (_, i) => byPos[pos][i] ?? null)
            // slot width: narrower when more players
            const slotW = count >= 5 ? 52 : count >= 4 ? 60 : 68

            return (
              <div key={pos} style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: count >= 5 ? 4 : 8,
              }}>
                {display.map((slot, si) => {
                  const filled = !!slot?.player
                  const surname = slot?.player?.name.split(' ').slice(-1)[0] ?? ''
                  return (
                    <div key={si} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      width: slotW,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: filled ? `rgba(${rgb},0.25)` : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${filled ? color : 'rgba(255,255,255,0.18)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 7, fontWeight: 900,
                        color: filled ? color : 'rgba(255,255,255,0.3)',
                        boxShadow: filled ? `0 0 7px rgba(${rgb},0.4)` : 'none',
                        flexShrink: 0,
                      }}>
                        {pos[0]}
                      </div>
                      <div style={{
                        fontSize: count >= 5 ? 8 : 9,
                        fontWeight: filled ? 700 : 400,
                        color: filled ? 'white' : 'rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        lineHeight: 1.2,
                      }}>
                        {filled ? surname : pos}
                      </div>
                      {slot?.revealed && slot.player && (
                        <div style={{ fontSize: 10, fontWeight: 900, color, lineHeight: 1 }}>
                          {slot.player.fpl_points}
                        </div>
                      )}
                      {filled && !slot?.revealed && (
                        <div style={{ fontSize: 10, lineHeight: 1, color: 'transparent' }}>0</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Horizontal mode (in-game strip) ─────────────────────────────────────
  const columns = (['GKP','DEF','MID','FWD'] as Pos[]).map(pos => {
    const filled = byPos[pos]
    const total = maxSlots[pos]
    const display: (PitchSlot | null)[] = []
    for (let i = 0; i < total; i++) {
      display.push(filled[i] ?? null)
    }
    return { pos, display }
  })

  const maxRows = Math.max(...columns.map(c => c.display.length))
  const ROW_H = 26
  const PAD_V = 10
  const height = maxRows * ROW_H + PAD_V * 2

  return (
    <div style={{
      position: 'relative',
      borderRadius: 12,
      border: '1px solid #1e2d4a',
      overflow: 'hidden',
      height,
    }}>
      <svg
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e3c1c" />
            <stop offset="100%" stopColor="#0a2f15" />
          </linearGradient>
        </defs>
        <rect width="400" height="100" fill="url(#pitchGrad)" />
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={i * 80} y="0" width="40" height="100" fill="rgba(255,255,255,0.018)" />
        ))}
        <rect x="3" y="3" width="394" height="94" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
        <line x1="200" y1="3" x2="200" y2="97" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <circle cx="200" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <circle cx="200" cy="50" r="1" fill="rgba(255,255,255,0.25)" />
        <rect x="3" y="26" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <rect x="3" y="37" width="9" height="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        <rect x="375" y="26" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <rect x="388" y="37" width="9" height="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      </svg>

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        height: '100%',
        padding: `${PAD_V}px 4px`,
        gap: 0,
        alignItems: 'center',
      }}>
        {columns.map(({ pos, display }, ci) => (
          <div key={pos} style={{
            flex: pos === 'MID' ? 1.4 : pos === 'DEF' ? 1.2 : 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: display.length > 4 ? 2 : 4,
            padding: '0 4px',
            borderRight: ci < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            minWidth: 0,
          }}>
            {display.map((slot, si) => {
              const filled = !!slot?.player
              const color = POS_COLOR[pos]
              const rgb = POS_RGB[pos]
              const surname = slot?.player?.name.split(' ').slice(-1)[0] ?? ''
              return (
                <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  <div style={{
                    width: 16, height: 16, flexShrink: 0,
                    borderRadius: '50%',
                    background: filled ? `rgba(${rgb},0.25)` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${filled ? color : 'rgba(255,255,255,0.18)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 6, fontWeight: 900,
                    color: filled ? color : 'rgba(255,255,255,0.3)',
                    boxShadow: filled ? `0 0 5px rgba(${rgb},0.35)` : 'none',
                  }}>
                    {pos[0]}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 9,
                      fontWeight: filled ? 700 : 400,
                      color: filled ? 'white' : 'rgba(255,255,255,0.2)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                    }}>
                      {filled ? surname : pos}
                    </div>
                    {slot?.revealed && slot.player && (
                      <div style={{ fontSize: 8, fontWeight: 900, color, lineHeight: 1 }}>
                        {slot.player.fpl_points}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {showTotal && typeof totalScore === 'number' && (
        <div style={{
          position: 'absolute',
          bottom: 5, right: 8,
          zIndex: 2,
          fontSize: 11,
          fontWeight: 900,
          color: 'white',
          opacity: 0.7,
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 4,
          padding: '2px 6px',
        }}>
          {totalScore} pts
        </div>
      )}
    </div>
  )
}

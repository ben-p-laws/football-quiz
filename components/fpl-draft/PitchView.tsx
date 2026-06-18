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

// How many slots to display for each position given current picks.
// = max count in any formation that's still reachable.
function maxSlotsPerPos(slots: PitchSlot[]): Record<Pos, number> {
  const filled: Record<Pos, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 }
  for (const s of slots) if (s.player) filled[s.position]++
  const total = slots.filter(s => s.player).length

  const viable = FORMATIONS.filter(([g, d, m, f]) =>
    filled.GKP <= g && filled.DEF <= d && filled.MID <= m && filled.FWD <= f
  )

  if (viable.length === 0) {
    // Fallback: show whatever is filled
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
}: {
  slots: PitchSlot[]
  totalScore?: number
  showTotal?: boolean
}) {
  const maxSlots = maxSlotsPerPos(slots)

  const byPos: Record<Pos, PitchSlot[]> = { GKP: [], DEF: [], MID: [], FWD: [] }
  for (const s of slots) byPos[s.position].push(s)

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
      {/* Pitch background */}
      <svg
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Grass gradient stripes */}
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e3c1c" />
            <stop offset="100%" stopColor="#0a2f15" />
          </linearGradient>
        </defs>
        <rect width="400" height="100" fill="url(#pitchGrad)" />
        {/* Grass stripes */}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={i * 80} y="0" width="40" height="100" fill="rgba(255,255,255,0.018)" />
        ))}
        {/* Outer border */}
        <rect x="3" y="3" width="394" height="94" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
        {/* Halfway line */}
        <line x1="200" y1="3" x2="200" y2="97" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        {/* Centre circle */}
        <circle cx="200" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <circle cx="200" cy="50" r="1" fill="rgba(255,255,255,0.25)" />
        {/* Left penalty box */}
        <rect x="3" y="26" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <rect x="3" y="37" width="9" height="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        {/* Right penalty box */}
        <rect x="375" y="26" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <rect x="388" y="37" width="9" height="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      </svg>

      {/* Columns: GKP | DEF | MID | FWD */}
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

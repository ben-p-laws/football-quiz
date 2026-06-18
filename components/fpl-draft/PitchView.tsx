'use client'
import React from 'react'
import type { FplPlayer } from './PlayerCard'

export type PitchSlot = {
  position: FplPlayer['position']
  player: FplPlayer | null
  revealed?: boolean
}

const POS_COLOR: Record<FplPlayer['position'], string> = {
  GKP: '#facc15',
  DEF: '#22c55e',
  MID: '#38bdf8',
  FWD: '#dc2626',
}

const POS_RGB: Record<FplPlayer['position'], string> = {
  GKP: '250,204,21',
  DEF: '34,197,94',
  MID: '56,189,248',
  FWD: '220,38,38',
}

/**
 * Lay out slots vertically: GKP on the goal line, then DEF row, MID row, FWD row.
 * `slots` is grouped by position in order GKP, DEF, MID, FWD.
 */
function buildRows(slots: PitchSlot[]) {
  const byPos: Record<FplPlayer['position'], PitchSlot[]> = { GKP: [], DEF: [], MID: [], FWD: [] }
  for (const s of slots) byPos[s.position].push(s)
  // y positions as % of pitch height (0 = top goal, 100 = bottom goal). Player attacks downward.
  const yMap: Record<FplPlayer['position'], number> = {
    GKP: 10,
    DEF: 32,
    MID: 55,
    FWD: 80,
  }
  return (['GKP', 'DEF', 'MID', 'FWD'] as const).map(pos => ({
    position: pos,
    y: yMap[pos],
    slots: byPos[pos],
  }))
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
  const rows = buildRows(slots)

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '0.72 / 1',
      background: 'linear-gradient(180deg, #0e3c1c 0%, #0a2f15 100%)',
      borderRadius: 14,
      border: '1px solid #1e2d4a',
      overflow: 'hidden',
    }}>
      {/* Pitch markings */}
      <svg viewBox="0 0 100 140" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Outer pitch */}
        <rect x="3" y="3" width="94" height="134" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
        {/* Halfway line */}
        <line x1="3" y1="70" x2="97" y2="70" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        {/* Centre circle */}
        <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4" />
        <circle cx="50" cy="70" r="0.7" fill="rgba(255,255,255,0.3)" />
        {/* Top box (defending) */}
        <rect x="25" y="3" width="50" height="16" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4" />
        <rect x="37" y="3" width="26" height="6" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4" />
        {/* Bottom box (attacking) */}
        <rect x="25" y="121" width="50" height="16" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4" />
        <rect x="37" y="131" width="26" height="6" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4" />
        {/* Stripes */}
        {Array.from({ length: 7 }, (_, i) => (
          <rect
            key={i}
            x="3"
            y={3 + i * 19.14}
            width="94"
            height="9.57"
            fill="rgba(255,255,255,0.018)"
          />
        ))}
      </svg>

      {/* Slot layout */}
      {rows.map(row => {
        const count = row.slots.length
        return row.slots.map((slot, idx) => {
          const xPct = count === 0 ? 50 : ((idx + 1) / (count + 1)) * 100
          const color = POS_COLOR[slot.position]
          const rgb = POS_RGB[slot.position]
          const filled = !!slot.player
          const revealed = slot.revealed
          return (
            <div
              key={`${row.position}-${idx}`}
              style={{
                position: 'absolute',
                left: `${xPct}%`,
                top: `${row.y}%`,
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                width: '22%',
                maxWidth: 110,
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                margin: '0 auto 4px',
                borderRadius: '50%',
                background: filled ? `rgba(${rgb},0.25)` : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${filled ? color : 'rgba(255,255,255,0.35)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 900,
                color: filled ? color : 'rgba(255,255,255,0.7)',
                boxShadow: filled ? `0 0 12px rgba(${rgb},0.35)` : 'none',
              }}>
                {slot.position}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 800,
                color: filled ? 'white' : 'rgba(255,255,255,0.55)',
                lineHeight: 1.15,
                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {slot.player
                  ? slot.player.name.split(' ').slice(-1)[0]
                  : '—'}
              </div>
              {slot.player && (
                <div style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.55)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                  marginTop: 1,
                }}>
                  {slot.player.team} {slot.player.season.slice(2)}
                </div>
              )}
              {revealed && slot.player && (
                <div style={{
                  marginTop: 3,
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'white',
                  background: `rgba(${rgb},0.3)`,
                  border: `1px solid ${color}`,
                  borderRadius: 6,
                  padding: '1px 6px',
                }}>
                  {slot.player.fpl_points}
                </div>
              )}
            </div>
          )
        })
      })}

      {showTotal && typeof totalScore === 'number' && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 10,
          padding: '6px 16px',
          fontSize: 18,
          fontWeight: 900,
          color: 'white',
          letterSpacing: '-0.5px',
        }}>
          {totalScore} pts
        </div>
      )}
    </div>
  )
}

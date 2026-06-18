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

function buildColumns(slots: PitchSlot[]) {
  const byPos: Record<FplPlayer['position'], PitchSlot[]> = { GKP: [], DEF: [], MID: [], FWD: [] }
  for (const s of slots) byPos[s.position].push(s)
  return (['GKP', 'DEF', 'MID', 'FWD'] as const).map(pos => ({
    position: pos,
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
  const columns = buildColumns(slots)
  // max slots in any column determines row height
  const maxRows = Math.max(...columns.map(c => c.slots.length), 1)
  const ROW_H = 28
  const PADDING = 10
  const height = maxRows * ROW_H + PADDING * 2

  return (
    <div style={{
      background: '#0e1f2e',
      border: '1px solid #1e2d4a',
      borderRadius: 12,
      padding: `${PADDING}px 8px`,
      display: 'flex',
      alignItems: 'stretch',
      gap: 0,
      minHeight: height,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle vertical dividers between columns */}
      {columns.map((col, ci) => {
        const color = POS_COLOR[col.position]
        const rgb = POS_RGB[col.position]
        const isEmpty = col.slots.length === 0

        return (
          <div key={col.position} style={{
            flex: 1,
            borderRight: ci < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 4,
            padding: '0 6px',
            minWidth: 0,
          }}>
            {isEmpty ? (
              /* Empty column placeholder */
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.3 }}>
                <div style={{
                  width: 18, height: 18, flexShrink: 0,
                  borderRadius: '50%',
                  border: `1.5px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7, fontWeight: 900, color,
                }}>
                  {col.position}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {col.position}
                </div>
              </div>
            ) : (
              col.slots.map((slot, si) => {
                const filled = !!slot.player
                const surname = slot.player?.name.split(' ').slice(-1)[0] ?? '—'
                return (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    {/* Circle */}
                    <div style={{
                      width: 18, height: 18, flexShrink: 0,
                      borderRadius: '50%',
                      background: filled ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${filled ? color : 'rgba(255,255,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, fontWeight: 900,
                      color: filled ? color : 'rgba(255,255,255,0.35)',
                      boxShadow: filled ? `0 0 6px rgba(${rgb},0.3)` : 'none',
                    }}>
                      {col.position[0]}
                    </div>
                    {/* Name + score */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 10,
                        fontWeight: filled ? 700 : 400,
                        color: filled ? 'white' : 'rgba(255,255,255,0.25)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                      }}>
                        {surname}
                      </div>
                      {slot.revealed && slot.player && (
                        <div style={{
                          fontSize: 9,
                          fontWeight: 900,
                          color,
                          lineHeight: 1,
                          marginTop: 1,
                        }}>
                          {slot.player.fpl_points} pts
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )
      })}

      {showTotal && typeof totalScore === 'number' && (
        <div style={{
          position: 'absolute',
          bottom: 6,
          right: 10,
          fontSize: 13,
          fontWeight: 900,
          color: 'white',
          opacity: 0.7,
        }}>
          {totalScore} pts
        </div>
      )}
    </div>
  )
}

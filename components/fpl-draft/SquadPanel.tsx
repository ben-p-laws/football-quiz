'use client'
import React, { useMemo, useState } from 'react'
import PlayerCard, { type FplPlayer } from './PlayerCard'

type Position = FplPlayer['position']

export default function SquadPanel({
  team,
  season,
  squad,
  pickedIds,
  allowedPositions,
  revealed = false,
  onPick,
}: {
  team: string
  season: string
  squad: FplPlayer[]
  pickedIds: Set<string>
  allowedPositions: Record<Position, boolean>
  revealed?: boolean
  onPick: (player: FplPlayer) => void
}) {
  const [filter, setFilter] = useState<Position | 'ALL'>('ALL')

  const ordered = useMemo(() => {
    const order: Position[] = ['GKP', 'DEF', 'MID', 'FWD']
    return [...squad].sort((a, b) => {
      const da = order.indexOf(a.position) - order.indexOf(b.position)
      if (da !== 0) return da
      return b.fpl_points - a.fpl_points
    })
  }, [squad])

  const filtered = filter === 'ALL'
    ? ordered
    : ordered.filter(p => p.position === filter)

  const filterChip = (label: string, value: Position | 'ALL') => {
    const active = filter === value
    return (
      <button
        key={value}
        onClick={() => setFilter(value)}
        style={{
          background: active ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${active ? 'rgba(220,38,38,0.5)' : '#1e2d4a'}`,
          color: active ? '#dc2626' : '#8899bb',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 800,
          cursor: 'pointer',
          letterSpacing: '0.05em',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{
      background: '#0a0f1e',
      border: '1px solid #1e2d4a',
      borderRadius: 14,
      padding: '16px 16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{team}</div>
        <div style={{ fontSize: 13, color: '#8899bb', fontWeight: 600 }}>{season}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filterChip('All', 'ALL')}
        {(['GKP', 'DEF', 'MID', 'FWD'] as Position[]).map(p => filterChip(p, p))}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflowY: 'auto',
        maxHeight: 'min(520px, 60vh)',
        paddingRight: 4,
      }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: '#4a5568', textAlign: 'center', padding: '20px 0' }}>
            No players in this position.
          </div>
        )}
        {filtered.map(p => {
          const alreadyPicked = pickedIds.has(p.id)
          const blocked = !allowedPositions[p.position]
          const disabled = alreadyPicked || blocked
          const reason = alreadyPicked
            ? 'Already picked'
            : blocked
            ? `Formation would be invalid if you pick another ${p.position}`
            : undefined
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PlayerCard
                  player={p}
                  disabled={disabled}
                  reason={reason}
                  onPick={onPick}
                />
              </div>
              {revealed && (
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: 'white',
                  minWidth: 40,
                  textAlign: 'right',
                }}>
                  {p.fpl_points}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

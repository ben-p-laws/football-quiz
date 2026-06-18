'use client'
import React from 'react'

export type FplPlayer = {
  id: string
  name: string
  team: string
  season: string
  position: 'GKP' | 'DEF' | 'MID' | 'FWD'
  fpl_points: number
}

const POS_COLOR: Record<FplPlayer['position'], string> = {
  GKP: '#facc15',
  DEF: '#22c55e',
  MID: '#38bdf8',
  FWD: '#dc2626',
}

export default function PlayerCard({
  player,
  disabled = false,
  reason,
  onPick,
}: {
  player: FplPlayer
  disabled?: boolean
  reason?: string
  onPick: (player: FplPlayer) => void
}) {
  const color = POS_COLOR[player.position]
  return (
    <button
      onClick={() => !disabled && onPick(player)}
      disabled={disabled}
      title={disabled ? reason : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: disabled ? 'rgba(255,255,255,0.02)' : '#111827',
        border: `1px solid ${disabled ? '#1e2d4a' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '9px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        textAlign: 'left',
        width: '100%',
        fontFamily: 'inherit',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{
        width: 32,
        height: 20,
        borderRadius: 4,
        background: `rgba(${color === '#facc15' ? '250,204,21' : color === '#22c55e' ? '34,197,94' : color === '#38bdf8' ? '56,189,248' : '220,38,38'},0.15)`,
        border: `1px solid ${color}`,
        color,
        fontSize: 9,
        fontWeight: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        letterSpacing: '0.05em',
      }}>
        {player.position}
      </div>
      <div style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 700,
        color: disabled ? 'rgba(255,255,255,0.4)' : 'white',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {player.name}
      </div>
    </button>
  )
}

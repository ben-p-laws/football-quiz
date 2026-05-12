import { ImageResponse } from 'next/og'

export const alt  = 'TopBins — Premier League knowledge games'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const OTHER_GAMES = ['Bingo', 'Tenable', 'Stat Clash', 'Grid', 'Teammates', 'Countdown']

const CARD_SIZE = 390

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#0a0f1e', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

        {/* Top red bar */}
        <div style={{ height: 5, background: '#dc2626', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 40px 14px' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </div>
          <div style={{ display: 'flex', width: 1, height: 24, background: '#1e2d4a', margin: '0 18px' }} />
          <div style={{ display: 'flex', fontSize: 16, color: '#4a5568', fontWeight: 500 }}>
            Premier League knowledge games
          </div>
        </div>

        {/* Cards — centred */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>

          {/* ── Football Golf ── */}
          <div style={{ width: CARD_SIZE, height: CARD_SIZE, display: 'flex', flexDirection: 'column', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px 8px', borderBottom: '1px solid #1e2d4a' }}>
              <div style={{ display: 'flex', fontSize: 17, fontWeight: 900, color: 'white', marginBottom: 2 }}>Football Golf</div>
              <div style={{ display: 'flex', fontSize: 11, color: '#8899bb' }}>Pick up to 3 players to set the distance</div>
            </div>
            {/* Body: text + hole graphic */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              {/* Left text */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6, padding: '10px 10px 10px 14px' }}>
                <div style={{ display: 'flex', background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 7, padding: '6px 10px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', fontSize: 13, fontWeight: 900, color: 'white' }}>Par 3</div>
                  <div style={{ display: 'flex', fontSize: 13, color: '#4a5568', margin: '0 5px' }}>·</div>
                  <div style={{ display: 'flex', fontSize: 13, color: '#8899bb' }}>217 yds</div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: '#1e2d4a', borderRadius: 6, padding: '5px 8px' }}>
                    <div style={{ display: 'flex', fontSize: 8, color: '#6b7fa3', marginBottom: 1 }}>STAT</div>
                    <div style={{ display: 'flex', fontSize: 12, fontWeight: 800, color: 'white' }}>Goals</div>
                  </div>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: '#1e2d4a', borderRadius: 6, padding: '5px 8px' }}>
                    <div style={{ display: 'flex', fontSize: 8, color: '#6b7fa3', marginBottom: 1 }}>FILTER</div>
                    <div style={{ display: 'flex', fontSize: 12, fontWeight: 600, color: 'white' }}>Dutch</div>
                  </div>
                </div>
                {[
                  { name: 'Van Nistelrooy', done: true },
                  { name: 'Dirk Kuyt', done: true },
                  { name: 'Pick a player…', done: false },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', background: p.done ? 'rgba(34,197,94,0.10)' : '#0a0f1e', border: `1px solid ${p.done ? 'rgba(34,197,94,0.4)' : '#1e2d4a'}`, borderRadius: 6, padding: '7px 10px', gap: 7 }}>
                    <div style={{ display: 'flex', width: 7, height: 7, borderRadius: 4, background: p.done ? '#22c55e' : '#1e2d4a', flexShrink: 0 }} />
                    <div style={{ display: 'flex', fontSize: 12, fontWeight: p.done ? 700 : 400, color: p.done ? '#22c55e' : '#4a5568' }}>{p.name}</div>
                  </div>
                ))}
              </div>
              {/* Golf hole graphic */}
              <div style={{ display: 'flex', width: 96, flexShrink: 0, background: '#0a1f0a' }}>
                <svg viewBox="0 0 55 120" style={{ width: '100%', height: '100%' }}>
                  <rect x="0" y="0" width="55" height="120" fill="#0a1f0a" />
                  <path d="M 27,110 C 24,75 32,45 28,12" stroke="#2d6a2d" strokeWidth="20" fill="none" strokeLinecap="butt" />
                  <path d="M 27,110 C 24,75 32,45 28,12" stroke="#1e5220" strokeWidth="14" fill="none" strokeLinecap="butt" />
                  <ellipse cx="28" cy="38" rx="9" ry="5" fill="#1d4ed8" opacity="0.9" />
                  <ellipse cx="28" cy="38" rx="6" ry="3" fill="none" stroke="#3b82f6" strokeWidth="0.8" opacity="0.6" />
                  <ellipse cx="37" cy="72" rx="6" ry="3" fill="#c8a96e" opacity="0.9" />
                  <circle cx="28" cy="13" r="10" fill="#16a34a" />
                  <circle cx="28" cy="13" r="7" fill="#22c55e" opacity="0.6" />
                  <circle cx="28" cy="13" r="2" fill="#0a0f1e" />
                  <rect x="27.4" y="3" width="0.8" height="10" fill="rgba(255,255,255,0.75)" />
                  <polygon points="28,3 34,6 28,9" fill="#dc2626" />
                  <ellipse cx="27" cy="111" rx="2.2" ry="0.7" fill="rgba(0,0,0,0.4)" />
                  <circle cx="27" cy="109" r="2.5" fill="white" />
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', background: '#dc2626', padding: '9px 14px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', fontSize: 12, fontWeight: 800, color: 'white' }}>Play Football Golf →</span>
            </div>
          </div>

          {/* ── Minimise ── */}
          <div style={{ width: CARD_SIZE, height: CARD_SIZE, display: 'flex', flexDirection: 'column', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px 8px', borderBottom: '1px solid #1e2d4a' }}>
              <div style={{ display: 'flex', fontSize: 17, fontWeight: 900, color: 'white', marginBottom: 2 }}>Minimise</div>
              <div style={{ display: 'flex', fontSize: 11, color: '#8899bb' }}>Assign each player to their best PL stat category</div>
            </div>
            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '10px 14px 10px', gap: 7, minHeight: 0 }}>
              {/* Assign prompt */}
              <div style={{ display: 'flex', background: '#0a0f1e', border: '1px solid #2d3f5e', borderRadius: 7, padding: '6px 10px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', fontSize: 11, color: '#4a5568' }}>Assign this player</div>
                <div style={{ display: 'flex', fontSize: 14, fontWeight: 800, color: 'white' }}>Erling Haaland</div>
              </div>
              {/* 2×3 grid via nested flex rows */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 5 }}>
                {[
                  [
                    { icon: '⚽', label: 'Most Goals', player: null, rank: null, color: '' },
                    { icon: '🅰️', label: 'Most Assists', player: 'Fabregas', rank: '#3', color: 'green' },
                    { icon: '📊', label: 'Appearances', player: 'Milner', rank: '#1', color: 'green' },
                  ],
                  [
                    { icon: '⚡', label: 'Pens Scored', player: null, rank: null, color: '' },
                    { icon: '👴', label: 'Oldest Player', player: null, rank: null, color: '' },
                    { icon: '🟡', label: 'Yellow Cards', player: 'Cattermole', rank: '#12', color: 'yellow' },
                  ],
                ].map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', flex: 1, gap: 5 }}>
                    {row.map((cell, ci) => {
                      const bg = cell.color === 'green' ? 'rgba(34,197,94,0.12)' : cell.color === 'yellow' ? 'rgba(251,191,36,0.1)' : '#0a0f1e'
                      const border = cell.color === 'green' ? 'rgba(34,197,94,0.35)' : cell.color === 'yellow' ? 'rgba(251,191,36,0.35)' : '#1e2d4a'
                      const rankColor = cell.color === 'green' ? '#22c55e' : '#fbbf24'
                      return (
                        <div key={ci} style={{ display: 'flex', flex: 1, flexDirection: 'column', background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 7px', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', fontSize: 10, fontWeight: 600, color: cell.player ? 'white' : '#8899bb' }}>{cell.icon} {cell.label}</div>
                          {cell.player && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                              <div style={{ display: 'flex', fontSize: 10, color: '#8899bb' }}>{cell.player}</div>
                              <div style={{ display: 'flex', fontSize: 14, fontWeight: 800, color: rankColor }}>{cell.rank}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', background: '#dc2626', padding: '9px 14px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', fontSize: 12, fontWeight: 800, color: 'white' }}>Play Minimise →</span>
            </div>
          </div>

        </div>

        {/* Other games */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 40px 16px' }}>
          <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, color: '#2a3d5e', marginRight: 6 }}>MORE GAMES</div>
          {OTHER_GAMES.map((name, i) => (
            <div key={i} style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d4a', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#6b7fa3' }}>
              {name}
            </div>
          ))}
          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ display: 'flex', fontSize: 13, color: '#2a3d5e', fontWeight: 600 }}>topbinsfooty.com</div>
        </div>

      </div>
    ),
    { ...size }
  )
}

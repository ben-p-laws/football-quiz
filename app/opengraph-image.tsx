import { ImageResponse } from 'next/og'

export const alt  = 'TopBins — Premier League knowledge games'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const OTHER_GAMES = ['Bingo', 'Tenable', 'Stat Clash', 'Grid', 'Teammates', 'Countdown']

// ATW demo route chips
const ATW_CHAIN = [
  { label: 'Portugal', state: 'done'    },
  { label: 'Spain',    state: 'done'    },
  { label: 'France',   state: 'current' },
  { label: 'Germany',  state: 'next'    },
  { label: 'Poland',   state: 'next'    },
]

function arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', color: '#2a3d5e', fontSize: 18, fontWeight: 700, margin: '0 4px' }}>›</div>
  )
}

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#0a0f1e', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

        {/* Top red bar */}
        <div style={{ height: 5, background: '#dc2626', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 40px 14px' }}>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </div>
          <div style={{ display: 'flex', width: 1, height: 28, background: '#1e2d4a', marginLeft: 4 }} />
          <div style={{ display: 'flex', fontSize: 18, color: '#4a5568', fontWeight: 500 }}>
            Premier League knowledge games
          </div>
        </div>

        {/* Two cards */}
        <div style={{ display: 'flex', gap: 20, padding: '0 40px', flex: 1 }}>

          {/* ── Football Golf card ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 16px 10px' }}>
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 3 }}>Football Golf</div>
              <div style={{ display: 'flex', fontSize: 13, color: '#8899bb' }}>Pick up to 3 players to set the distance</div>
            </div>
            {/* Card body */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px 14px', gap: 8, flex: 1 }}>
              {/* Par info */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ display: 'flex', fontSize: 16, fontWeight: 900, color: 'white' }}>Par 3</div>
                <div style={{ display: 'flex', fontSize: 16, color: '#4a5568', margin: '0 8px' }}>·</div>
                <div style={{ display: 'flex', fontSize: 16, color: '#8899bb' }}>217 yds to pin</div>
              </div>
              {/* Stat + Filter chips */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: '#1e2d4a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}>
                  <div style={{ display: 'flex', fontSize: 10, color: '#6b7fa3', marginBottom: 2 }}>STAT</div>
                  <div style={{ display: 'flex', fontSize: 14, fontWeight: 800, color: 'white' }}>Goals</div>
                </div>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: '#1e2d4a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}>
                  <div style={{ display: 'flex', fontSize: 10, color: '#6b7fa3', marginBottom: 2 }}>FILTER</div>
                  <div style={{ display: 'flex', fontSize: 14, fontWeight: 600, color: 'white' }}>Dutch players</div>
                </div>
              </div>
              {/* Player slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { name: 'Ruud Van Nistelrooy', locked: true },
                  { name: 'Dirk Kuyt', locked: true },
                  { name: 'Pick a player', locked: false },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', background: p.locked ? 'rgba(34,197,94,0.10)' : '#0a0f1e', border: `1px solid ${p.locked ? 'rgba(34,197,94,0.4)' : '#1e2d4a'}`, borderRadius: 7, padding: '8px 12px' }}>
                    {p.locked && <div style={{ display: 'flex', fontSize: 14, color: '#22c55e', marginRight: 8 }}>✓</div>}
                    <div style={{ display: 'flex', fontSize: 14, fontWeight: p.locked ? 700 : 400, color: p.locked ? '#22c55e' : '#4a5568' }}>{p.name}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* CTA */}
            <div style={{ display: 'flex', background: '#dc2626', padding: '12px 16px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', fontSize: 14, fontWeight: 800, color: 'white' }}>Play Football Golf →</span>
            </div>
          </div>

          {/* ── Around the World card ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 16px 10px' }}>
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 3 }}>Around the World in 80 Goals</div>
              <div style={{ display: 'flex', fontSize: 13, color: '#8899bb' }}>Chain neighbouring countries · name a PL player from each</div>
            </div>
            {/* Card body */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px 14px', gap: 10, flex: 1 }}>
              {/* Stat + Target */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', fontSize: 10, color: '#4a6fa0', marginBottom: 3 }}>STAT</div>
                  <div style={{ display: 'flex', fontSize: 15, fontWeight: 900, color: 'white' }}>PL Goals</div>
                </div>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', fontSize: 10, color: '#a07830', marginBottom: 3 }}>TARGET</div>
                  <div style={{ display: 'flex', fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>250</div>
                </div>
              </div>
              {/* Route chain */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', fontSize: 11, color: '#4a5568' }}>ROUTE</div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
                  {ATW_CHAIN.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        display: 'flex', padding: '7px 14px', borderRadius: 7, fontSize: 14, fontWeight: 700,
                        background: c.state === 'done' ? 'rgba(34,197,94,0.15)' : c.state === 'current' ? 'rgba(245,158,11,0.18)' : 'rgba(59,130,246,0.12)',
                        border: `1px solid ${c.state === 'done' ? 'rgba(34,197,94,0.45)' : c.state === 'current' ? 'rgba(245,158,11,0.45)' : 'rgba(59,130,246,0.30)'}`,
                        color: c.state === 'done' ? '#22c55e' : c.state === 'current' ? '#f59e0b' : '#5b8fd4',
                      }}>
                        {c.state === 'done' && <span style={{ display: 'flex', marginRight: 5 }}>✓</span>}
                        {c.label}
                      </div>
                      {i < ATW_CHAIN.length - 1 && arrow()}
                    </div>
                  ))}
                </div>
              </div>
              {/* Score progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ display: 'flex', fontSize: 13, color: '#8899bb' }}>Score so far:</div>
                <div style={{ display: 'flex', fontSize: 20, fontWeight: 900, color: '#22c55e' }}>182</div>
                <div style={{ display: 'flex', fontSize: 13, color: '#4a5568' }}>/ 250 target</div>
              </div>
            </div>
            {/* CTA */}
            <div style={{ display: 'flex', background: '#dc2626', padding: '12px 16px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', fontSize: 14, fontWeight: 800, color: 'white' }}>Play Around the World →</span>
            </div>
          </div>

        </div>

        {/* Other games row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 40px 16px' }}>
          <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, color: '#2a3d5e', marginRight: 4 }}>MORE GAMES</div>
          {OTHER_GAMES.map((name, i) => (
            <div key={i} style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d4a', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#6b7fa3' }}>
              {name}
            </div>
          ))}
          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ display: 'flex', fontSize: 13, color: '#1e2d4a', fontWeight: 600 }}>topbinsfooty.com</div>
        </div>

      </div>
    ),
    { ...size }
  )
}

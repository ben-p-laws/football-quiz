import { ImageResponse } from 'next/og'

export const alt  = 'TopBins — Premier League knowledge games'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const OTHER_GAMES = ['Bingo', 'Tenable', 'Stat Clash', 'Grid', 'Teammates', 'Countdown']

// Rough simplified country polygons, viewBox 0 0 320 220
// Label positions as % of viewBox for overlay
const COUNTRIES = [
  { points: '18,82 36,72 44,88 46,140 38,155 22,148 16,118', fill: 'rgba(34,197,94,0.35)', stroke: '#22c55e', label: 'POR', lx: 9.4, ly: 53.6 },
  { points: '36,62 138,55 148,82 144,155 100,168 50,160 44,136 38,90', fill: 'rgba(34,197,94,0.35)', stroke: '#22c55e', label: 'ESP', lx: 28.8, ly: 52.3 },
  { points: '112,40 172,34 198,62 196,130 170,142 128,136 108,100', fill: 'rgba(245,158,11,0.32)', stroke: '#f59e0b', label: 'FRA', lx: 48.4, ly: 41.8 },
  { points: '175,22 238,20 242,42 238,122 204,128 175,118 170,72', fill: 'rgba(59,130,246,0.25)', stroke: '#5b8fd4', label: 'GER', lx: 64.7, ly: 33.6 },
  { points: '222,16 296,18 300,48 294,108 230,112 218,75', fill: 'rgba(59,130,246,0.25)', stroke: '#5b8fd4', label: 'POL', lx: 80.6, ly: 29.5 },
]

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#0a0f1e', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

        {/* Top red bar */}
        <div style={{ height: 5, background: '#dc2626', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 40px 12px' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </div>
          <div style={{ display: 'flex', width: 1, height: 24, background: '#1e2d4a', margin: '0 18px' }} />
          <div style={{ display: 'flex', fontSize: 16, color: '#4a5568', fontWeight: 500 }}>
            Premier League knowledge games
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', gap: 18, padding: '0 40px', flex: 1, minHeight: 0 }}>

          {/* ── Football Golf ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px 8px' }}>
              <div style={{ display: 'flex', fontSize: 18, fontWeight: 900, color: 'white', marginBottom: 2 }}>Football Golf</div>
              <div style={{ display: 'flex', fontSize: 11, color: '#8899bb' }}>Pick up to 3 players to set the distance · 3 to 18 holes</div>
            </div>
            <div style={{ display: 'flex', flex: 1, gap: 0, padding: '0 0 0 14px', minHeight: 0 }}>
              {/* Left text */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 7, paddingBottom: 12, paddingRight: 10 }}>
                <div style={{ display: 'flex', background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 7, padding: '6px 10px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', fontSize: 14, fontWeight: 900, color: 'white' }}>Par 3</div>
                  <div style={{ display: 'flex', fontSize: 14, color: '#4a5568', margin: '0 6px' }}>·</div>
                  <div style={{ display: 'flex', fontSize: 14, color: '#8899bb' }}>217 yds to pin</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: '#1e2d4a', borderRadius: 7, padding: '5px 8px' }}>
                    <div style={{ display: 'flex', fontSize: 9, color: '#6b7fa3', marginBottom: 2 }}>STAT</div>
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: 'white' }}>Goals</div>
                  </div>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: '#1e2d4a', borderRadius: 7, padding: '5px 8px' }}>
                    <div style={{ display: 'flex', fontSize: 9, color: '#6b7fa3', marginBottom: 2 }}>FILTER</div>
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: 600, color: 'white' }}>Dutch</div>
                  </div>
                </div>
                {[
                  { name: 'Van Nistelrooy', done: true },
                  { name: 'Dirk Kuyt', done: true },
                  { name: 'Pick a player…', done: false },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', background: p.done ? 'rgba(34,197,94,0.10)' : '#0a0f1e', border: `1px solid ${p.done ? 'rgba(34,197,94,0.4)' : '#1e2d4a'}`, borderRadius: 6, padding: '7px 10px', gap: 8 }}>
                    <div style={{ display: 'flex', width: 8, height: 8, borderRadius: 4, background: p.done ? '#22c55e' : '#1e2d4a', flexShrink: 0 }} />
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: p.done ? 700 : 400, color: p.done ? '#22c55e' : '#4a5568' }}>{p.name}</div>
                  </div>
                ))}
              </div>
              {/* Golf hole */}
              <div style={{ display: 'flex', width: 110, background: '#0a1f0a', flexShrink: 0 }}>
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
            <div style={{ display: 'flex', background: '#dc2626', padding: '10px 14px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: 'white' }}>Play Football Golf</span>
            </div>
          </div>

          {/* ── Around the World ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px 8px' }}>
              <div style={{ display: 'flex', fontSize: 18, fontWeight: 900, color: 'white', marginBottom: 2 }}>Around the World in 80 Goals</div>
              <div style={{ display: 'flex', fontSize: 11, color: '#8899bb' }}>Chain neighbouring countries · name a PL player from each one</div>
            </div>
            <div style={{ display: 'flex', flex: 1, gap: 0, padding: '0 0 0 14px', minHeight: 0 }}>
              {/* Left */}
              <div style={{ display: 'flex', flexDirection: 'column', width: 152, flexShrink: 0, gap: 7, paddingBottom: 12, paddingRight: 10 }}>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '8px 10px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', fontSize: 9, color: '#4a6fa0', marginBottom: 4 }}>STAT</div>
                  <div style={{ display: 'flex', fontSize: 16, fontWeight: 900, color: 'white' }}>PL Goals</div>
                </div>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 8, padding: '8px 10px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', fontSize: 9, color: '#a07830', marginBottom: 4 }}>TARGET</div>
                  <div style={{ display: 'flex', fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>250</div>
                </div>
                <div style={{ display: 'flex', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: 8, padding: '8px 10px', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', fontSize: 11, color: '#8899bb' }}>Score</div>
                  <div style={{ display: 'flex', fontSize: 22, fontWeight: 900, color: '#22c55e' }}>182</div>
                </div>
              </div>
              {/* Map — SVG shapes + HTML labels overlaid */}
              <div style={{ display: 'flex', flex: 1, background: '#04101f', overflow: 'hidden', position: 'relative' }}>
                <svg viewBox="0 0 320 220" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <rect x="0" y="0" width="320" height="220" fill="#04101f" />
                  {COUNTRIES.map((c, i) => (
                    <polygon key={i} points={c.points} fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                  ))}
                </svg>
                {/* Country labels */}
                {COUNTRIES.map((c, i) => (
                  <div key={i} style={{ position: 'absolute', left: `${c.lx}%`, top: `${c.ly}%`, display: 'flex', background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 800, color: c.stroke }}>
                    {c.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', background: '#dc2626', padding: '10px 14px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: 'white' }}>Play Around the World</span>
            </div>
          </div>

        </div>

        {/* Other games */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 40px 14px' }}>
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

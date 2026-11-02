import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Population Circle — Daily Geography Puzzle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ background: '#0a0f1e', width: 1200, height: 630, display: 'flex', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Map panel — left 55% */}
      <div style={{ width: 660, height: 630, position: 'relative', display: 'flex' }}>

        {/* Ocean fill already the bg colour */}

        {/* Simplified North America landmass */}
        <svg width="660" height="630" viewBox="0 0 660 630" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Land mass */}
          <path d="M80,60 L200,40 L320,55 L400,80 L440,140 L460,220 L440,310 L390,390 L340,450 L300,510 L260,560 L200,580 L160,560 L130,500 L100,430 L70,360 L50,280 L40,200 L55,130 Z" fill="#1a2e1a" />
          {/* Mexico / Central lower */}
          <path d="M300,510 L340,450 L370,470 L360,520 L330,560 L300,555 Z" fill="#1a2e1a" />
          {/* Canada upper */}
          <path d="M80,60 L200,40 L320,55 L330,20 L250,10 L150,20 L90,40 Z" fill="#1a2e1a" />
          {/* Great Lakes suggestion */}
          <ellipse cx="340" cy="200" rx="18" ry="10" fill="#0a0f1e" opacity="0.7" />
          <ellipse cx="310" cy="190" rx="12" ry="7" fill="#0a0f1e" opacity="0.7" />

          {/* Red circle over US East Coast */}
          <circle cx="390" cy="270" r="140" fill="rgba(220,38,38,0.12)" stroke="#dc2626" strokeWidth="3" />

          {/* Grid lines */}
          <line x1="0" y1="105" x2="660" y2="105" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="0" y1="210" x2="660" y2="210" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="0" y1="315" x2="660" y2="315" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="0" y1="420" x2="660" y2="420" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="0" y1="525" x2="660" y2="525" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="110" y1="0" x2="110" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="220" y1="0" x2="220" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="330" y1="0" x2="330" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="440" y1="0" x2="440" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
          <line x1="550" y1="0" x2="550" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.6" />
        </svg>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 630, background: '#1e2d4a', display: 'flex' }} />

      {/* Text panel — right 45% */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 52px', gap: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 18, display: 'flex' }}>
          🌍 TopBins Geography
        </div>
        <div style={{ fontSize: 54, fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 16, display: 'flex' }}>
          Population Circle
        </div>
        <div style={{ fontSize: 20, color: '#8899bb', lineHeight: 1.4, marginBottom: 36, display: 'flex' }}>
          Estimate the population inside the circle
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '10px 20px', fontSize: 16, fontWeight: 700, color: 'white', display: 'flex' }}>
            Daily puzzle
          </div>
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 20px', fontSize: 16, fontWeight: 700, color: '#8899bb', display: 'flex' }}>
            Free play
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 40, fontSize: 15, color: '#2a3d5e', display: 'flex' }}>
          topbinsfooty.com/geo/circle
        </div>
      </div>
    </div>,
    size
  )
}

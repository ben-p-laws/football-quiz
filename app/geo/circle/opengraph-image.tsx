import { ImageResponse } from 'next/og'
import paths from '@/lib/geo/og-map-paths.json'

export const runtime = 'edge'
export const alt = 'Population Circle — Daily Geography Puzzle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const W = 700, H = 630

// City positions (lon, lat)
const CITIES = [
  { name: 'New York',      lon: -74.0, lat: 40.7, bold: true },
  { name: 'Boston',        lon: -71.1, lat: 42.4, bold: false },
  { name: 'Washington',    lon: -77.0, lat: 38.9, bold: false },
  { name: 'Miami',         lon: -80.2, lat: 25.8, bold: false },
  { name: 'Chicago',       lon: -87.6, lat: 41.8, bold: false },
  { name: 'Los Angeles',   lon: -118.2,lat: 34.1, bold: false },
  { name: 'Toronto',       lon: -79.4, lat: 43.7, bold: false },
]

// Projection matching the one used to generate og-map-paths.json
// geoEquirectangular fitted to lon -130→-60, lat 22→56 in a 700×630 box
// These cx/cy values were computed to place the circle over the NYC–DC area
const CIRCLE_X = 462
const CIRCLE_Y = 290

export default function Image() {
  const p = paths as Record<string, string>

  return new ImageResponse(
    <div style={{ background: '#0c1520', width: 1200, height: 630, display: 'flex', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* MAP PANEL */}
      <div style={{ width: W, height: H, position: 'relative', display: 'flex', flexShrink: 0 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
          {/* Canada */}
          <path d={p['124']} fill="#152030" stroke="#2a4060" strokeWidth="1" />
          {/* Mexico */}
          <path d={p['484']} fill="#152030" stroke="#2a4060" strokeWidth="1" />
          {/* Caribbean */}
          <path d={p['192']} fill="#152030" stroke="#2a4060" strokeWidth="0.8" />
          <path d={p['332']} fill="#152030" stroke="#2a4060" strokeWidth="0.8" />
          <path d={p['388']} fill="#152030" stroke="#2a4060" strokeWidth="0.8" />
          {/* USA — slightly brighter to stand out */}
          <path d={p['840']} fill="#1e3a5c" stroke="#3a6090" strokeWidth="1.5" />
          {/* East Coast circle */}
          <circle cx={CIRCLE_X} cy={CIRCLE_Y} r={130} fill="rgba(220,38,38,0.1)" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="10 5" />
          {/* City dots */}
          {CITIES.map(c => {
            // Re-project using same equirectangular transform
            // We'll position dots via HTML divs instead (see below)
            return null
          })}
        </svg>

        {/* Country / ocean labels */}
        <div style={{ position: 'absolute', left: 260, top: 215, color: 'rgba(255,255,255,0.28)', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex' }}>United States</div>
        <div style={{ position: 'absolute', left: 270, top:  60, color: 'rgba(255,255,255,0.2)',  fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',  textTransform: 'uppercase', display: 'flex' }}>Canada</div>
        <div style={{ position: 'absolute', left: 230, top: 490, color: 'rgba(255,255,255,0.2)',  fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',  textTransform: 'uppercase', display: 'flex' }}>Mexico</div>
        <div style={{ position: 'absolute', left: 620, top: 250, color: 'rgba(255,255,255,0.14)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',  textTransform: 'uppercase', display: 'flex' }}>Atlantic</div>
        <div style={{ position: 'absolute', left:  18, top: 280, color: 'rgba(255,255,255,0.14)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',  textTransform: 'uppercase', display: 'flex' }}>Pacific</div>
      </div>

      {/* DIVIDER */}
      <div style={{ width: 1, height: H, background: '#1e2d4a', flexShrink: 0, display: 'flex' }} />

      {/* TEXT PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, display: 'flex' }}>
          🌍 TopBins Geography
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 14, display: 'flex' }}>
          Population Circle
        </div>
        <div style={{ fontSize: 18, color: '#8899bb', lineHeight: 1.5, marginBottom: 30, display: 'flex' }}>
          Estimate the population inside the circle. One daily puzzle + free play.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 700, color: 'white', display: 'flex' }}>Daily puzzle</div>
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 700, color: '#8899bb', display: 'flex' }}>Free play</div>
        </div>
        <div style={{ marginTop: 32, fontSize: 13, color: '#2a3d5e', display: 'flex' }}>topbinsfooty.com/geo/circle</div>
      </div>
    </div>,
    size
  )
}

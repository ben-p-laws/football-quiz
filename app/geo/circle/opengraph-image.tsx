import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Population Circle — Daily Geography Puzzle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Simple equirectangular projection for the map panel (660x630)
// Lon range -128° to -65°, Lat range 24° to 51°
function pt(lon: number, lat: number): string {
  const x = ((lon + 128) / 63) * 590 + 35
  const y = ((51 - lat) / 27) * 540 + 45
  return `${x.toFixed(0)},${y.toFixed(0)}`
}

// Continental US outline (clockwise, simplified)
const usPath = [
  pt(-124.2, 48.5),  // NW Washington
  pt(-123.0, 49.0),  // WA-Canada
  pt(-116.0, 49.0),  // N Idaho/Montana
  pt(-104.0, 49.0),  // N Wyoming/Dakota
  pt(-97.0,  49.0),  // N Minnesota
  pt(-95.0,  49.0),
  pt(-90.0,  48.0),  // Wisconsin top
  pt(-84.5,  46.0),  // Upper Michigan / Lake Superior south
  pt(-83.0,  42.0),  // Lake Erie west (Ohio)
  pt(-79.0,  43.0),  // Lake Ontario / Niagara
  pt(-76.0,  44.5),  // Upper NY state
  pt(-71.0,  45.0),  // Vermont/Maine border
  pt(-67.0,  47.0),  // NE Maine
  pt(-67.5,  44.5),  // Maine coast
  pt(-70.0,  42.0),  // Cape Cod / Boston
  pt(-74.0,  40.5),  // NYC / NJ
  pt(-75.5,  38.0),  // Delaware / Chesapeake
  pt(-76.0,  35.0),  // NC outer banks
  pt(-80.5,  32.0),  // SC coast
  pt(-81.0,  30.5),  // Georgia / FL border
  pt(-81.5,  29.0),  // North Florida east coast
  pt(-80.0,  25.5),  // SE Florida
  pt(-80.2,  24.5),  // Florida tip
  pt(-81.8,  24.5),  // Florida tip west
  pt(-82.5,  27.0),  // SW Florida
  pt(-85.0,  29.5),  // FL panhandle
  pt(-88.0,  30.0),  // Alabama/MS coast
  pt(-89.5,  29.0),  // Louisiana bayou
  pt(-93.5,  29.5),  // Louisiana/TX border
  pt(-97.0,  26.0),  // S Texas coast
  pt(-97.5,  25.8),  // Brownsville TX
  pt(-99.0,  27.5),  // S Texas
  pt(-104.5, 29.0),  // Big Bend TX
  pt(-106.5, 31.5),  // El Paso TX
  pt(-111.0, 31.3),  // SW Arizona
  pt(-117.2, 32.5),  // San Diego CA
  pt(-118.5, 34.0),  // LA area
  pt(-120.5, 35.5),  // Central CA coast
  pt(-122.5, 37.5),  // San Francisco
  pt(-124.2, 40.5),  // N California
  pt(-124.5, 43.5),  // Oregon coast
  pt(-124.5, 46.5),  // WA coast
  pt(-124.2, 48.5),  // back to start
].join(' ')

export default function Image() {
  return new ImageResponse(
    <div style={{ background: '#0a0f1e', width: 1200, height: 630, display: 'flex', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Map panel — left 58% */}
      <div style={{ width: 700, height: 630, position: 'relative', display: 'flex' }}>
        <svg width="700" height="630" viewBox="0 0 700 630" style={{ position: 'absolute', top: 0, left: 0 }}>

          {/* Grid lines */}
          <line x1="0" y1="126" x2="700" y2="126" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="0" y1="252" x2="700" y2="252" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="0" y1="378" x2="700" y2="378" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="0" y1="504" x2="700" y2="504" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="116" y1="0" x2="116" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="232" y1="0" x2="232" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="350" y1="0" x2="350" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="466" y1="0" x2="466" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />
          <line x1="582" y1="0" x2="582" y2="630" stroke="#1e2d4a" strokeWidth="1" opacity="0.7" />

          {/* US landmass */}
          <polygon points={usPath} fill="#1c301c" stroke="#253d25" strokeWidth="1.5" />

          {/* Great Lakes (dark cutouts) */}
          <ellipse cx="350" cy="188" rx="22" ry="13" fill="#0a0f1e" opacity="0.9" />
          <ellipse cx="385" cy="197" rx="14" ry="18" fill="#0a0f1e" opacity="0.9" />
          <ellipse cx="415" cy="195" rx="22" ry="10" fill="#0a0f1e" opacity="0.9" />
          <ellipse cx="450" cy="196" rx="14" ry="8"  fill="#0a0f1e" opacity="0.9" />

          {/* Red circle over US East Coast (NYC → DC area) */}
          <circle cx="490" cy="265" r="130" fill="rgba(220,38,38,0.13)" stroke="#dc2626" strokeWidth="3" strokeDasharray="8 4" />

        </svg>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 630, background: '#1e2d4a', flexShrink: 0, display: 'flex' }} />

      {/* Text panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 50px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 18, display: 'flex' }}>
          🌍 TopBins Geography
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 14, display: 'flex' }}>
          Population Circle
        </div>
        <div style={{ fontSize: 19, color: '#8899bb', lineHeight: 1.4, marginBottom: 32, display: 'flex' }}>
          Estimate the population inside the circle. One daily puzzle + free play.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '10px 20px', fontSize: 16, fontWeight: 700, color: 'white', display: 'flex' }}>
            Daily puzzle
          </div>
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 20px', fontSize: 16, fontWeight: 700, color: '#8899bb', display: 'flex' }}>
            Free play
          </div>
        </div>
        <div style={{ marginTop: 36, fontSize: 14, color: '#2a3d5e', display: 'flex' }}>
          topbinsfooty.com/geo/circle
        </div>
      </div>
    </div>,
    size
  )
}

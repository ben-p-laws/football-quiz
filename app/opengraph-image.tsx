import { ImageResponse } from 'next/og'

export const alt  = 'TopBins — Premier League knowledge games'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const GAMES = ['Football Golf', 'Around the World', 'Stat Clash', 'Minimise', 'Bingo', 'Grid', 'Tenable']

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {/* Top red bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#dc2626', display: 'flex' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, background: '#111827', borderRadius: 18, border: '2px solid #1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
            ⚽
          </div>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ display: 'flex', fontSize: 30, color: '#8899bb', marginBottom: 52, letterSpacing: '-0.5px' }}>
          Premier League knowledge games
        </div>

        {/* Game pills row 1 */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
          {GAMES.slice(0, 4).map(name => (
            <div key={name} style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2d4a', borderRadius: 24, padding: '10px 24px', fontSize: 20, fontWeight: 700, color: '#c0cde0' }}>
              {name}
            </div>
          ))}
        </div>

        {/* Game pills row 2 */}
        <div style={{ display: 'flex', gap: 14 }}>
          {GAMES.slice(4).map(name => (
            <div key={name} style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2d4a', borderRadius: 24, padding: '10px 24px', fontSize: 20, fontWeight: 700, color: '#c0cde0' }}>
              {name}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, fontSize: 20, color: '#2a3d5e', fontWeight: 600 }}>
          topbinsfooty.com
        </div>
      </div>
    ),
    { ...size }
  )
}

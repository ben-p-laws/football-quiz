import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Population Circle — Daily Geography Puzzle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#0a0f1e',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid lines */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: 0.15 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ height: 1, background: '#1e2d4a', width: '100%' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', opacity: 0.15 }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{ width: 1, background: '#1e2d4a', height: '100%' }} />
        ))}
      </div>

      {/* Large faint background circle */}
      <div style={{
        position: 'absolute',
        width: 700,
        height: 700,
        borderRadius: '50%',
        border: '2px solid rgba(220,38,38,0.12)',
        background: 'rgba(220,38,38,0.04)',
        top: -100,
        right: -150,
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        border: '1.5px solid rgba(220,38,38,0.18)',
        top: 15,
        right: 50,
      }} />

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, zIndex: 1 }}>
        <div style={{ fontSize: 80, marginBottom: 12 }}>🌍</div>
        <div style={{ fontSize: 68, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 10 }}>
          Population Circle
        </div>
        <div style={{ fontSize: 26, color: '#8899bb', marginBottom: 28, fontWeight: 500 }}>
          Estimate the population inside the circle
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '8px 20px', fontSize: 18, fontWeight: 700, color: 'white' }}>
            Daily puzzle
          </div>
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, padding: '8px 20px', fontSize: 18, fontWeight: 700, color: '#8899bb' }}>
            Free play
          </div>
        </div>
      </div>

      {/* Bottom brand */}
      <div style={{ position: 'absolute', bottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#4a5568' }}>
          Top<span style={{ color: '#dc2626' }}>Bins</span> · topbinsfooty.com
        </div>
      </div>
    </div>,
    size
  )
}

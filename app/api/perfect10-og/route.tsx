import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', gap: 0 }}>

        {/* TopBins wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.5px' }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </div>
        </div>

        {/* Big title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <div style={{ fontSize: 140, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-6px' }}>
            Perfect
          </div>
          <div style={{ fontSize: 140, fontWeight: 900, color: '#dc2626', lineHeight: 1, letterSpacing: '-6px' }}>
            10
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', width: 80, height: 3, background: '#dc2626', borderRadius: 2, margin: '36px 0' }} />

        {/* Description */}
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.5px' }}>
          Can you draft the perfect player?
        </div>

      </div>
    ),
    { width: 1200, height: 630 }
  )
}

import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0a0f1e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* TopBins wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.5px' }}>Top</div>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: '#dc2626', letterSpacing: '-0.5px' }}>Bins</div>
        </div>

        {/* Big title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 130, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-6px' }}>FPL Draft</div>
          <div style={{ display: 'flex', fontSize: 130, fontWeight: 900, color: '#dc2626', lineHeight: 1, letterSpacing: '-6px' }}>11</div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', width: 80, height: 3, background: '#dc2626', borderRadius: 2, margin: '32px 0' }} />

        {/* Description */}
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.5px', textAlign: 'center', maxWidth: 900 }}>
          One squad, one pick per round.
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.5px', textAlign: 'center', maxWidth: 900, marginTop: 6 }}>
          Build the ultimate XI.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

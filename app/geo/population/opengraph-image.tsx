import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Population Guesser — TopBins Geography'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ background: '#0a0f1e', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: 0.15 }}>
        {[...Array(8)].map((_, i) => <div key={i} style={{ height: 1, background: '#1e2d4a', width: '100%' }} />)}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', opacity: 0.15 }}>
        {[...Array(12)].map((_, i) => <div key={i} style={{ width: 1, background: '#1e2d4a', height: '100%' }} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
        <div style={{ fontSize: 80, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 68, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 10 }}>Population Guesser</div>
        <div style={{ fontSize: 26, color: '#8899bb', marginBottom: 28 }}>Find the mystery city from population clues</div>
        <div style={{ background: '#dc2626', borderRadius: 8, padding: '8px 24px', fontSize: 18, fontWeight: 700, color: 'white' }}>Play now</div>
      </div>
      <div style={{ position: 'absolute', bottom: 28, fontSize: 18, fontWeight: 800, color: '#4a5568', display: 'flex' }}>
        Top<span style={{ color: '#dc2626' }}>Bins</span>&nbsp;· topbinsfooty.com
      </div>
    </div>,
    size
  )
}

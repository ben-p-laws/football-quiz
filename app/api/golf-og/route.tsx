import { ImageResponse } from 'next/og'

export async function GET(req: Request) {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const holeUrl = `${proto}://${host}/holes/augusta/hole_12.png`

  // Fetch and convert to ArrayBuffer — satori handles this natively
  const holeData = await fetch(holeUrl).then(r => r.arrayBuffer())

  const picks = [
    { name: 'K. De Bruyne', done: true },
    { name: 'David Silva',  done: true },
    { name: 'Pick a player…', done: false },
  ]

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#0a0f1e', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

        {/* NavBar */}
        <div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 24px', borderBottom: '1px solid #1e2d4a', background: '#0d1426', gap: 12 }}>
          <div style={{ display: 'flex', fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </div>
          <div style={{ display: 'flex', width: 1, height: 14, background: '#1e2d4a' }} />
          <div style={{ display: 'flex', fontSize: 13, color: '#4a5568', fontWeight: 600 }}>Football Golf</div>
          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ display: 'flex', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 7, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#4a5568' }}>Hole 12 · Augusta National</div>
        </div>

        {/* Game content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Left — compact like game UI */}
          <div style={{ display: 'flex', flexDirection: 'column', width: 640, padding: '16px 20px', gap: 10 }}>

            {/* Distance */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, color: 'white', lineHeight: 1 }}>224</div>
              <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#4a5568', marginBottom: 4 }}>yds to pin</div>
            </div>

            {/* Question */}
            <div style={{ display: 'flex', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 16px', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ display: 'flex', background: '#1e2d4a', borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 800, color: '#8899bb' }}>Assists</div>
                <div style={{ display: 'flex', background: '#1e2d4a', borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 800, color: '#8899bb' }}>Man City</div>
              </div>
              <div style={{ display: 'flex', fontSize: 16, fontWeight: 800, color: 'white' }}>PL assists by Man City players</div>
            </div>

            {/* Picks */}
            {picks.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                background: p.done ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${p.done ? 'rgba(34,197,94,0.35)' : '#1a2540'}`,
                borderRadius: 9, padding: '12px 16px', gap: 10,
              }}>
                <div style={{ display: 'flex', width: 8, height: 8, borderRadius: 4, background: p.done ? '#22c55e' : '#1e2d4a', flexShrink: 0 }} />
                <div style={{ display: 'flex', fontSize: 16, fontWeight: p.done ? 700 : 400, color: p.done ? 'white' : '#2a3d5e' }}>{p.name}</div>
              </div>
            ))}

            {/* Shot button */}
            <div style={{ display: 'flex', background: '#dc2626', borderRadius: 10, padding: '13px 0', justifyContent: 'center', marginTop: 2 }}>
              <span style={{ display: 'flex', fontSize: 16, fontWeight: 900, color: 'white' }}>Take Shot →</span>
            </div>
          </div>

          {/* Right — hole image, wider */}
          <div style={{ display: 'flex', flex: 1, borderLeft: '1px solid #1e2d4a', background: '#0d1117', alignItems: 'center', justifyContent: 'center' }}>
            <img src={holeData as unknown as string} width={275} height={525} style={{ objectFit: 'contain' }} alt="" />
          </div>

        </div>

      </div>
    ),
    { width: 1200, height: 630 }
  )
}

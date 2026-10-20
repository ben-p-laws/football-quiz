'use client'

import { useRouter } from 'next/navigation'

export default function GeoPage() {
  const router = useRouter()

  const s = {
    page: { background: '#0a0f1e', minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" } as React.CSSProperties,
    inner: { maxWidth: 560, margin: '0 auto', padding: '0 20px' } as React.CSSProperties,
    header: { padding: '20px 0 16px', borderBottom: '1px solid #1e2d4a' } as React.CSSProperties,
    h1: { fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 4px', letterSpacing: '-0.5px' } as React.CSSProperties,
    sub: { fontSize: 12, color: '#4a5568', margin: 0 } as React.CSSProperties,
    card: { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s', marginTop: 16 } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>

      <div style={s.inner}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <a href="/" style={{ color: '#4a5568', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</a>
            <h1 style={s.h1}>Geography Games</h1>
          </div>
          <p style={s.sub}>Test your knowledge of the world</p>
        </div>

        {/* Population Guesser card */}
        <div
          style={s.card}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
          onClick={() => router.push('/geo/population')}
        >
          <div style={{ padding: '16px 18px 14px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 3 }}>Population Guesser</div>
            <div style={{ fontSize: 12, color: '#8899bb', marginBottom: 12 }}>
              Find the city with the closest population to the target
            </div>

            {/* Preview */}
            <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Target city</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>Madrid</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>3,305,000</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { city: 'Buenos Aires', country: 'Argentina', pop: '2,890,151', rank: 2, pct: '-12.5%', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)' },
                { city: 'Rome',         country: 'Italy',     pop: '2,756,000', rank: 4, pct: '-16.6%', color: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.4)'  },
                { city: 'Detroit',      country: 'USA',       pop: '670,031',   rank: 98, pct: '-79.7%', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.35)' },
              ].map(r => (
                <div key={r.city} style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: r.color, textTransform: 'uppercase' }}>rank</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: r.color }}>#{r.rank}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{r.city}</div>
                    <div style={{ fontSize: 10, color: '#8899bb' }}>{r.country}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{r.pop}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.pct}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#dc2626', padding: '11px 18px', textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>Play Population Guesser →</span>
          </div>
        </div>

        {/* Population Challenge card */}
        <div
          style={s.card}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
          onClick={() => router.push('/geo/challenge')}
        >
          <div style={{ padding: '16px 18px 14px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 3 }}>Population Challenge</div>
            <div style={{ fontSize: 12, color: '#8899bb', marginBottom: 12 }}>
              10 rounds, one guess each — lowest total rank wins
            </div>

            {/* Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {/* Progress bar preview */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#8899bb' }}>Round 4 / 10</span>
                  <span style={{ fontSize: 10, color: '#4a5568' }}>Score: <span style={{ color: 'white' }}>312</span></span>
                </div>
                <div style={{ height: 3, background: '#1e2d4a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '30%', background: '#dc2626', borderRadius: 4 }} />
                </div>
              </div>
              {[
                { round: 1, target: 'Berlin', guess: 'Munich', rank: 3, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
                { round: 2, target: 'Lagos',  guess: 'Cairo',  rank: 18, color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)' },
                { round: 3, target: 'Denver', guess: 'Oslo',   rank: 142, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
              ].map(r => (
                <div key={r.round} style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 7, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#4a5568', width: 18 }}>R{r.round}</span>
                  <span style={{ fontSize: 11, color: '#8899bb', flex: 1 }}>{r.target}</span>
                  <span style={{ fontSize: 11, color: 'white' }}>→ {r.guess}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: r.color }}>#{r.rank}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#dc2626', padding: '11px 18px', textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>Play Challenge →</span>
          </div>
        </div>

        {/* Coming soon */}
        <div style={{ ...s.card, cursor: 'default', opacity: 0.5 }}>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#8899bb' }}>More coming soon</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>Borders quiz, capital cities, area guesser…</div>
            </div>
            <span style={{ fontSize: 24 }}>🔒</span>
          </div>
        </div>
      </div>
    </div>
  )
}

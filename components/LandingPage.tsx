'use client'

import { useRouter } from 'next/navigation'
import NavBar from './NavBar'

export default function LandingPage() {
  const router = useRouter()

  const s = {
    page: { background: '#0a0f1e', minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" } as React.CSSProperties,
    header: { borderBottom: '1px solid #1e2d4a', padding: '16px 20px 14px', maxWidth: 1100, margin: '0 auto' } as React.CSSProperties,
    h1: { fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', margin: '0 0 4px' } as React.CSSProperties,
    sub: { fontSize: 12, color: '#4a5568', margin: 0 } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: '16px 20px', maxWidth: 1100, margin: '0 auto' } as React.CSSProperties,
    card: { background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'border-color 0.15s' } as React.CSSProperties,
    cardHead: { padding: '12px 14px 10px' } as React.CSSProperties,
    cardTitle: { fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 2 } as React.CSSProperties,
    cardDesc: { fontSize: 11, color: '#8899bb' } as React.CSSProperties,
    tag: { display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.12)', padding: '2px 8px', borderRadius: 20, marginTop: 6 } as React.CSSProperties,
    preview: { padding: '0 12px 10px', flex: 1 } as React.CSSProperties,
    cta:    { background: '#dc2626', padding: '11px 14px', textAlign: 'center' as const, cursor: 'pointer' } as React.CSSProperties,
    ctaSm:  { background: '#dc2626', padding: '8px 14px',  textAlign: 'center' as const, cursor: 'pointer' } as React.CSSProperties,
    ctaText: { fontSize: 13, fontWeight: 800, color: 'white' } as React.CSSProperties,
  }

  function TBar({ pct, name, val, found }: { pct: number; name?: string; val: string; found?: boolean }) {
    return (
      <div style={{ height: 28, background: '#0a0f1e', borderRadius: 6, border: `1px solid ${found ? 'rgba(34,197,94,0.4)' : '#1e2d4a'}`, display: 'flex', alignItems: 'center', padding: '0 10px', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', marginBottom: 3 }}>
        {found && <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: 'rgba(34,197,94,0.15)', borderRight: '1px solid rgba(34,197,94,0.5)' }} />}
        <span style={{ fontSize: 11, fontWeight: found ? 700 : 400, color: found ? '#22c55e' : '#8899bb', position: 'relative' }}>{found ? name : '?'}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: found ? '#22c55e' : '#4a5568', position: 'relative' }}>{val}</span>
      </div>
    )
  }

  function BCell({ label, player, state }: { label: string; player?: string; state: 'green' | 'red' | 'none' }) {
    const bg = state === 'green' ? 'rgba(34,197,94,0.12)' : state === 'red' ? 'rgba(239,68,68,0.12)' : '#0a0f1e'
    const border = state === 'green' ? 'rgba(34,197,94,0.4)' : state === 'red' ? 'rgba(239,68,68,0.35)' : '#1e2d4a'
    const playerColor = state === 'green' ? '#22c55e' : '#ef4444'
    return (
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '5px 7px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center' as const }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: state !== 'none' ? 'white' : '#8899bb', lineHeight: 1.2 }}>{label}</div>
        {player && <div style={{ fontSize: 9, fontWeight: 700, color: playerColor, lineHeight: 1.25 }}>{player}</div>}
      </div>
    )
  }

  const SHIRT_PATH = [
    'M 12,32', 'L 2,44', 'L 20,56', 'C 22,55 24,51 24,48',
    'L 24,90', 'L 76,90', 'L 76,48', 'C 76,51 78,55 80,56',
    'L 98,44', 'L 88,32', 'C 80,20 70,16 62,16',
    'A 12,10 0 0 1 38,16', 'C 30,16 20,20 12,32', 'Z',
  ].join(' ')

  function TShirt({ bg, label, revealed }: { bg: string; label: string; revealed: boolean }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <svg viewBox="0 0 100 100" width="42" height="42" style={{ display: 'block' }}>
          <path d={SHIRT_PATH}
            fill={revealed ? bg : '#111827'} fillOpacity={revealed ? 0.6 : 1}
            stroke={revealed ? bg : '#2a3d5e'} strokeOpacity={revealed ? 0.9 : 1}
            strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 9, fontWeight: 700, color: revealed ? '#cbd5e1' : '#4a5568', whiteSpace: 'nowrap' }}>{revealed ? label : '?'}</span>
      </div>
    )
  }

  function MCat({ icon, label, player, rank, color }: { icon: string; label: string; player?: string; rank?: string; color?: string }) {
    const assigned = !!player
    const bg = color === 'green' ? 'rgba(34,197,94,0.12)' : color === 'yellow' ? 'rgba(251,191,36,0.1)' : '#0a0f1e'
    const border = color === 'green' ? 'rgba(34,197,94,0.35)' : color === 'yellow' ? 'rgba(251,191,36,0.35)' : '#1e2d4a'
    const rankColor = color === 'green' ? '#22c55e' : color === 'yellow' ? '#fbbf24' : '#2a3d5e'
    return (
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '5px 7px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: assigned ? 'white' : '#8899bb', lineHeight: 1.2 }}>{icon} {label}</div>
        {assigned && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#8899bb' }}>{player}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: rankColor }}>{rank}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        @media (max-width: 700px) {
          .game-grid { grid-template-columns: 1fr !important; }
          .small-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-header { padding: 14px 16px 12px !important; }
          .landing-wrap { padding: 12px 16px !important; }
        }
        @media (min-width: 701px) and (max-width: 900px) {
          .small-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      <NavBar />

      <div className="landing-header" style={s.header}>
        <h1 style={s.h1}>Test your football knowledge</h1>
        <p style={s.sub}>Premier League knowledge games · new content added regularly</p>
      </div>

      <div className="game-grid" style={s.grid}>

        {/* ---- MINIMISE ---- */}
        <div style={s.card}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
          onClick={() => router.push('/minimise')}>
          <div style={s.cardHead}>
            <div style={s.cardTitle}>Minimise</div>
            <div style={s.cardDesc}>Assign each player to their best PL stat category</div>
          </div>
          <div style={{ ...s.preview, display: 'flex', flexDirection: 'column' as const }}>
            <div style={{ background: '#0a0f1e', border: '1px solid #2d3f5e', borderRadius: 6, padding: '5px 10px', marginBottom: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 1 }}>Assign this player</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>Erling Haaland</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: 3, flex: 1 }}>
              <MCat icon="⚽" label="Most Goals" />
              <MCat icon="🅰️" label="Most Assists" player="Fàbregas" rank="#3" color="green" />
              <MCat icon="📊" label="Appearances" player="Milner" rank="#1" color="green" />
              <MCat icon="⚡" label="Pens Scored" />
              <MCat icon="👴" label="Oldest Player" />
              <MCat icon="🟡" label="Yellow Cards" player="Cattermole" rank="#12" color="yellow" />
            </div>
          </div>
          <div style={s.cta}><span style={s.ctaText}>Play Minimise →</span></div>
        </div>

        {/* ---- BINGO ---- */}
        <div style={s.card}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
          onClick={() => router.push('/bingo')}>
          <div style={s.cardHead}>
            <div style={s.cardTitle}>Bingo</div>
            <div style={s.cardDesc}>Fill the achievement grid · easy, intermediate and hard modes</div>
          </div>
          <div style={{ ...s.preview, display: 'flex', flexDirection: 'column' as const }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridAutoRows: '1fr', gap: 4, flex: 1 }}>
              <BCell label="100+ PL Goals"     player="M. Salah"        state="green" />
              <BCell label="3+ PL Titles"                               state="none" />
              <BCell label="Never won PL"      player="T. Henry"        state="red" />
              <BCell label="4+ PL Clubs"                                state="none" />
              <BCell label="Missed 3+ Pens"    player="C. Ronaldo"      state="green" />
              <BCell label="400+ PL Apps"                               state="none" />
              <BCell label="20+ Goals Season"  player="H. Kane"         state="green" />
              <BCell label="50+ Yellow Cards"                           state="none" />
              <BCell label="50+ PL Assists"    player="F. Lampard"      state="green" />
            </div>
          </div>
          <div style={s.cta}><span style={s.ctaText}>Play Bingo →</span></div>
        </div>

        {/* ---- STAT CLASH ---- */}
        <div style={s.card}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
          onClick={() => router.push('/stat-clash')}>
          <div style={s.cardHead}>
            <div style={s.cardTitle}>Stat Clash</div>
            <div style={s.cardDesc}>Find the player closest to a random PL stat target</div>
          </div>
          <div style={{ ...s.preview, display: 'flex', flexDirection: 'column' as const }}>
            <div style={{ background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 6, padding: '8px 10px', textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.1 }}>150</div>
              <div style={{ fontSize: 10, color: '#8899bb' }}>career PL goals</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, flex: 1 }}>
              {[
                { name: 'T. Henry', stat: '175', color: '#22c55e', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
                { name: 'Gerrard', stat: '120', color: '#ef4444', border: 'rgba(239,68,68,0.35)', bg: 'rgba(239,68,68,0.08)' },
                { name: 'Your pick?', stat: '···', color: '#8899bb', border: '#4a5568', bg: '#0a0f1e' },
              ].map((p, i) => (
                <div key={i} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 6, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: p.color, textAlign: 'center' }}>{p.name}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: p.color, lineHeight: 1 }}>{p.stat}</span>
                  {i < 2 && <span style={{ fontSize: 9, color: p.color, opacity: 0.7 }}>goals</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={s.cta}><span style={s.ctaText}>Play Stat Clash →</span></div>
        </div>

      </div>

      {/* ---- OTHER GAMES ---- */}
      <div style={{ maxWidth: 1100, margin: '4px auto 0', padding: '0 20px 48px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 12 }}>More Games</div>
        <div className="small-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>

          {/* ---- TENABLE ---- */}
          <div style={s.card}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
            onClick={() => router.push('/tenables')}>
            <div style={{ padding: '10px 12px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 2 }}>Tenable</div>
              <div style={{ fontSize: 10, color: '#8899bb' }}>build your own top 10 quiz</div>
            </div>
            <div style={{ padding: '0 10px 10px', flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
              {[
                { n: 1, name: 'R. Giggs',      val: '162', pct: 100, found: true  },
                { n: 2, name: 'K. De Bruyne',  val: '111', pct: 69,  found: true  },
                { n: 3, name: '?',             val: '103', pct: 0,   found: false },
              ].map(r => (
                <div key={r.n} style={{ display: 'flex', alignItems: 'stretch', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 9, color: '#2a3d5e', width: 10, display: 'flex', alignItems: 'center' }}>{r.n}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const }}>
                    <div style={{ flex: 1, background: '#0a0f1e', borderRadius: 6, border: `1px solid ${r.found ? 'rgba(34,197,94,0.4)' : '#1e2d4a'}`, display: 'flex', alignItems: 'center', padding: '0 10px', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', marginBottom: 3 }}>
                      {r.found && <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${r.pct}%`, background: 'rgba(34,197,94,0.15)', borderRight: '1px solid rgba(34,197,94,0.5)' }} />}
                      <span style={{ fontSize: 11, fontWeight: r.found ? 700 : 400, color: r.found ? '#22c55e' : '#8899bb', position: 'relative' }}>{r.found ? r.name : '?'}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: r.found ? '#22c55e' : '#4a5568', position: 'relative' }}>{r.val}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={s.ctaSm}><span style={s.ctaText}>Play Tenable →</span></div>
          </div>

          {/* ---- GRID ---- */}
          {(() => {
            const cols = ['Man Utd', 'Chelsea', 'City']
            const rows = ['Arsenal', 'Liverpool', 'Spurs']
            const cells: Array<{ color: string } | null> = [
              { color: '#22c55e' }, null, { color: '#dc2626' },
              null, { color: '#ef4444' }, null,
              { color: '#22c55e' }, null, { color: '#fbbf24' },
            ]
            return (
              <div style={s.card}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
                onClick={() => router.push('/grid')}>
                <div style={{ padding: '10px 12px 8px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 2 }}>Grid</div>
                  <div style={{ fontSize: 10, color: '#8899bb' }}>Find a PL player for each row × column</div>
                </div>
                <div style={{ padding: '0 10px 8px', flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr', gap: 2 }}>
                    <div />
                    {cols.map(c => <div key={c} style={{ fontSize: 7, fontWeight: 700, color: '#f97316', textAlign: 'center' as const, paddingBottom: 2 }}>{c}</div>)}
                    {rows.map((row, ri) => (
                      <>
                        <div key={`r${ri}`} style={{ fontSize: 7, fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3 }}>{row}</div>
                        {cells.slice(ri * 3, ri * 3 + 3).map((cell, ci) => (
                          <div key={ci} style={{
                            background: cell ? `${cell.color}22` : '#0a0f1e',
                            border: `1px solid ${cell ? `${cell.color}55` : '#1e2d4a'}`,
                            borderRadius: 4, minHeight: 26,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {cell && <span style={{ fontSize: 12, lineHeight: 1 }}>👤</span>}
                          </div>
                        ))}
                      </>
                    ))}
                  </div>
                </div>
                <div style={s.ctaSm}><span style={s.ctaText}>Play Grid →</span></div>
              </div>
            )
          })()}

          {/* ---- TEAMMATES ---- */}
          <div style={s.card}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
            onClick={() => router.push('/teammates')}>
            <div style={{ padding: '10px 12px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 2 }}>Teammates</div>
              <div style={{ fontSize: 10, color: '#8899bb' }}>Find the player from their PL teammates</div>
            </div>
            <div style={{ padding: '0 10px 10px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <TShirt bg="#C8102E" label="Gerrard"   revealed={true} />
                <TShirt bg="#6CABDD" label="De Bruyne" revealed={true} />
                <TShirt bg="#034694" label="Lampard"   revealed={true} />
              </div>
            </div>
            <div style={s.ctaSm}><span style={s.ctaText}>Play Teammates →</span></div>
          </div>

          {/* ---- COUNTDOWN ---- */}
          <div style={s.card}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e2d4a'}
            onClick={() => router.push('/countdown')}>
            <div style={{ padding: '10px 12px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 2 }}>Footy Countdown</div>
              <div style={{ fontSize: 10, color: '#8899bb' }}>Letters, numbers & conundrum · 7 rounds</div>
            </div>
            <div style={{ padding: '0 10px 10px', flex: 1 }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Final Conundrum</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {['L','G','R','I','N','E','S','T'].map((l, i) => (
                  <div key={i} style={{ width: 18, height: 22, background: '#0a0f1e', border: '1px solid #dc2626', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' }}>{l}</div>
                ))}
              </div>
              <div style={{ background: '#0a0f1e', border: '1px solid #1e2d4a', borderRadius: 4, padding: '4px 8px', fontSize: 11, color: '#4a5568', textAlign: 'center' as const }}>Unscramble the PL surname →</div>
            </div>
            <div style={s.ctaSm}><span style={s.ctaText}>Play Countdown →</span></div>
          </div>

          {/* ---- COMING SOON x1 ---- */}
          {[1].map(n => (
            <div key={n} style={{ ...s.card, cursor: 'default', opacity: 0.6 }}>
              <div style={{ padding: '10px 12px 8px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#8899bb', marginBottom: 2 }}>Coming Soon</div>
                <div style={{ fontSize: 10, color: '#8899bb' }}>New game in development</div>
              </div>
              <div style={{ padding: '0 10px 10px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 90 }}>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.65 }}>🔒</div>
                  <div style={{ fontSize: 10, color: '#8899bb' }}>Stay tuned</div>
                </div>
              </div>
              <div style={{ background: '#111827', padding: '8px', textAlign: 'center' as const, borderTop: '1px solid #1e2d4a' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8899bb' }}>Coming Soon</span>
              </div>
            </div>
          ))}

        </div>
      </div>

    </div>
  )
}

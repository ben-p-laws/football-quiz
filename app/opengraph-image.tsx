import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'TopBins: Football Golf and 14 more free Premier League games'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Satori has no oklch, so the landing-page tokens are approximated in hex
const LIME = '#d6f135'
const ORANGE = '#f26a2a'
const PAPER = '#0a0f1e'

const dataUrl = async (p: string) =>
  `data:image/png;base64,${(await readFile(join(process.cwd(), 'public', p))).toString('base64')}`

export default async function Image() {
  const [inter600, inter800, hole, ...courses] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Inter-600.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Inter-800.ttf')),
    dataUrl('holes/augusta/hole_12.png'),
    dataUrl('course-logos/augusta.png'),
    dataUrl('course-logos/pebble-beach.png'),
    dataUrl('course-logos/wii-golf.png'),
  ])
  const courseLabels = ['Augusta', 'Pebble Beach', 'Wii Golf']

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', background: PAPER, fontFamily: 'Inter', padding: '26px 36px 36px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ display: 'flex', fontSize: 19, fontWeight: 600, color: '#8a93a8' }}>topbinsfooty.com · 15 free games</div>
        </div>

        {/* Hero card */}
        <div style={{
          position: 'relative', display: 'flex', flex: 1, borderRadius: 30, overflow: 'hidden',
          border: '1.5px solid rgba(120,200,140,0.22)',
          backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(47,138,74,0.6), rgba(47,138,74,0) 60%), linear-gradient(160deg, #0d3a2a, #071a27)',
        }}>

          {/* Hole art, tilted like the landing page */}
          <img src={hole} width={250} height={550} alt="" style={{ position: 'absolute', right: 40, top: -38, transform: 'rotate(-18deg)' }} />

          {/* Copy */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '32px 44px', width: 580 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 800, letterSpacing: 1.6, color: LIME, background: 'rgba(214,241,53,0.12)', border: '1.5px solid rgba(214,241,53,0.3)', borderRadius: 100, padding: '6px 15px', marginBottom: 20 }}>
              <div style={{ display: 'flex', width: 9, height: 9, borderRadius: 9, background: LIME }} />
              TRENDING GAME
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 104, fontWeight: 800, letterSpacing: -4.5, lineHeight: 0.88, color: 'white', marginBottom: 20 }}>
              <span>Football</span><span>Golf</span>
            </div>
            <div style={{ display: 'flex', fontSize: 21, fontWeight: 600, lineHeight: 1.4, color: 'rgba(214,232,222,0.82)', marginBottom: 20 }}>
              Golf, played with football stats. Pick up to three players per shot, challenge your friends.
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {courses.map((src, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 600, color: 'white', background: 'rgba(0,0,0,0.28)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '5px 14px 5px 5px' }}>
                  <img src={src} width={28} height={28} alt="" style={{ borderRadius: 28, background: 'white' }} />
                  {courseLabels[i]}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: PAPER, background: LIME, borderRadius: 100, padding: '14px 30px' }}>Tee off →</div>
          </div>

          {/* Gameplay preview card (same real numbers as the landing page) */}
          <div style={{
            position: 'absolute', left: 590, top: 70, width: 330, display: 'flex', flexDirection: 'column',
            padding: '20px 20px 18px', borderRadius: 18, background: 'rgba(14,30,42,0.86)',
            border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 50px rgba(0,0,0,0.45)', transform: 'rotate(-3deg)',
          }}>
            <div style={{ display: 'flex', fontSize: 13, fontWeight: 800, letterSpacing: 1.2, color: '#8fa0b4', marginBottom: 8 }}>HOLE 12 · PAR 3 · 155 YDS</div>
            <div style={{ display: 'flex', fontSize: 21, fontWeight: 800, lineHeight: 1.2, color: 'white', marginBottom: 14 }}>Premier League goals by Spanish players</div>
            {[['Fernando Torres', '85'], ['David Silva', '60']].map(([n, g]) => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 17, fontWeight: 600, color: 'white', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                <span>{n}</span><span style={{ color: LIME, fontWeight: 800 }}>{g}</span>
              </div>
            ))}
            <div style={{ display: 'flex', fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.3)', border: '1.5px dashed rgba(255,255,255,0.14)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>Player 3 (optional)</div>
            <div style={{ display: 'flex', height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', marginBottom: 10 }}>
              <div style={{ display: 'flex', width: '94%', height: 6, borderRadius: 6, backgroundImage: `linear-gradient(90deg, ${ORANGE}, ${LIME})` }} />
            </div>
            <div style={{ display: 'flex', fontSize: 16, fontWeight: 600, color: 'white' }}>
              145 yds ·&nbsp;<span style={{ color: '#4ade80' }}>on the green</span>
            </div>
          </div>

        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: inter600, weight: 600, style: 'normal' },
        { name: 'Inter', data: inter800, weight: 800, style: 'normal' },
      ],
    },
  )
}

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Population Circle — Daily Geography Puzzle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Equirectangular projection onto the 700×630 map panel
// Lon -130°→-60°, Lat 23°→56°
function px(lon: number) { return Math.round((lon + 130) / 70 * 660 + 20) }
function py(lat: number) { return Math.round((56 - lat) / 33 * 590 + 20) }
function pt(lon: number, lat: number) { return `${px(lon)},${py(lat)}` }

// Continental US outline (clockwise)
const US = [
  pt(-124.5,49), pt(-116,49), pt(-104,49), pt(-97,49), pt(-95,49),
  pt(-91,46),    pt(-84.5,46),
  pt(-83,42),    pt(-79,43),   pt(-76,44.5),
  pt(-67,47),    pt(-67.5,44.5), pt(-70,42),
  pt(-74,40.7),  pt(-75.5,38),   pt(-76,35),    pt(-80.5,32),
  pt(-81,30.5),  pt(-81.5,29),   pt(-80,25.5),
  pt(-80.2,24.5),pt(-81.8,24.5), pt(-82.5,27),
  pt(-85,29.5),  pt(-88,30),     pt(-89.5,29),
  pt(-93.5,29.5),pt(-97,26),     pt(-97.5,25.8),
  pt(-99,27.5),  pt(-104.5,29),  pt(-106.5,31.5),
  pt(-111,31.3), pt(-117.2,32.5),pt(-118.5,34),
  pt(-120.5,35.5),pt(-122.5,37.5),pt(-124.2,40.5),
  pt(-124.5,43.5),pt(-124.5,46.5),pt(-124.5,49),
].join(' ')

// Key western state border lines (straight-line states)
const stateBorders = [
  // North-south lines
  [['-104,49','-104,37'],  'MT/ND–CO border'],
  [['-111,42','-111,31.3'],'ID/WY–AZ border'],
  [['-120,42','-120,38.5'],'OR/CA interior'],
  // East-west lines
  [['-104,41','-111,41'],  'WY top'],
  [['-104,37','-109,37'],  'CO/NM bottom'],
  [['-109,37','-109,31.3'],'NM/AZ border'],
]

export default function Image() {
  // East Coast circle: centred on the NYC–DC corridor
  const circX = px(-75)
  const circY = py(39)

  return new ImageResponse(
    <div style={{ background: '#080d18', width: 1200, height: 630, display: 'flex', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* ── MAP PANEL (left 700px) ── */}
      <div style={{ width: 700, height: 630, position: 'relative', display: 'flex', flexShrink: 0 }}>
        <svg width="700" height="630" viewBox="0 0 700 630" style={{ position: 'absolute', inset: 0 }}>

          {/* Lat/lon grid */}
          {[30,35,40,45,50,55].map(lat => (
            <line key={lat} x1="0" y1={py(lat)} x2="700" y2={py(lat)} stroke="#1a2a3e" strokeWidth="1" />
          ))}
          {[-120,-110,-100,-90,-80,-70].map(lon => (
            <line key={lon} x1={px(lon)} y1="0" x2={px(lon)} y2="630" stroke="#1a2a3e" strokeWidth="1" />
          ))}

          {/* Canada (fill above 49th parallel) */}
          <polygon
            points={`20,20 690,20 690,${py(44)} ${pt(-67,47)} ${pt(-76,44.5)} ${pt(-79,43)} ${pt(-84.5,46)} ${pt(-91,46)} ${pt(-95,49)} ${pt(-104,49)} ${pt(-116,49)} ${pt(-124.5,49)} 20,${py(49)}`}
            fill="#0f1c2e" stroke="#1e3050" strokeWidth="1"
          />

          {/* Mexico (fill below the border) */}
          <polygon
            points={`${pt(-117.2,32.5)} ${pt(-111,31.3)} ${pt(-106.5,31.5)} ${pt(-104.5,29)} ${pt(-99,27.5)} ${pt(-97.5,25.8)} ${pt(-97,26)} ${pt(-93.5,29.5)} 20,630 690,630`}
            fill="#0f1c2e" stroke="#1e3050" strokeWidth="1"
          />

          {/* United States landmass */}
          <polygon points={US} fill="#1a2d48" stroke="#2e5080" strokeWidth="1.5" />

          {/* Western state lines */}
          <line x1={px(-104)} y1={py(49)} x2={px(-104)} y2={py(37)}  stroke="#2e5080" strokeWidth="0.8" />
          <line x1={px(-111)} y1={py(42)} x2={px(-111)} y2={py(31.3)} stroke="#2e5080" strokeWidth="0.8" />
          <line x1={px(-109)} y1={py(37)} x2={px(-109)} y2={py(31.3)} stroke="#2e5080" strokeWidth="0.8" />
          <line x1={px(-104)} y1={py(41)} x2={px(-111)} y2={py(41)}   stroke="#2e5080" strokeWidth="0.8" />
          <line x1={px(-104)} y1={py(37)} x2={px(-109)} y2={py(37)}   stroke="#2e5080" strokeWidth="0.8" />
          <line x1={px(-120)} y1={py(42)} x2={px(-120)} y2={py(38.5)} stroke="#2e5080" strokeWidth="0.8" />

          {/* Great Lakes (ocean cut-outs) */}
          <ellipse cx={px(-87)} cy={py(47.5)} rx="18" ry="10" fill="#080d18" />
          <ellipse cx={px(-86)} cy={py(44)}   rx="10" ry="20" fill="#080d18" />
          <ellipse cx={px(-82)} cy={py(43)}   rx="22" ry="8"  fill="#080d18" />
          <ellipse cx={px(-77)} cy={py(43.5)} rx="14" ry="7"  fill="#080d18" />

          {/* East Coast red circle (dashed) */}
          <circle cx={circX} cy={circY} r="130" fill="rgba(220,38,38,0.1)" stroke="#dc2626" strokeWidth="3" strokeDasharray="10 5" />

          {/* City dots */}
          <circle cx={px(-74)}   cy={py(40.7)} r="5" fill="white" />
          <circle cx={px(-71)}   cy={py(42.3)} r="4" fill="white" />
          <circle cx={px(-77)}   cy={py(38.9)} r="4" fill="white" />
          <circle cx={px(-80.2)} cy={py(25.8)} r="4" fill="white" />
          <circle cx={px(-87.6)} cy={py(41.8)} r="4" fill="white" />
          <circle cx={px(-118.2)}cy={py(34)}   r="4" fill="white" />
          <circle cx={px(-122.4)}cy={py(37.7)} r="4" fill="white" />

        </svg>

        {/* Text labels — positioned over map */}
        {/* Country labels */}
        <div style={{ position: 'absolute', left: px(-98)-40, top: py(38)-10, color: 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex' }}>
          United States
        </div>
        <div style={{ position: 'absolute', left: px(-96)-28, top: py(52)-10, color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex' }}>
          Canada
        </div>
        <div style={{ position: 'absolute', left: px(-104)-24, top: py(28)-10, color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex' }}>
          Mexico
        </div>
        <div style={{ position: 'absolute', left: px(-60)-36, top: py(37)-10, color: 'rgba(255,255,255,0.18)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex' }}>
          Atlantic
        </div>
        <div style={{ position: 'absolute', left: 22, top: py(38)-10, color: 'rgba(255,255,255,0.18)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex' }}>
          Pacific
        </div>

        {/* City labels */}
        <div style={{ position: 'absolute', left: px(-74)+8,   top: py(40.7)-8,  color: 'white', fontSize: 11, fontWeight: 700, display: 'flex' }}>New York</div>
        <div style={{ position: 'absolute', left: px(-71)+7,   top: py(42.3)-8,  color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 600, display: 'flex' }}>Boston</div>
        <div style={{ position: 'absolute', left: px(-77)+7,   top: py(38.9)-8,  color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 600, display: 'flex' }}>Washington</div>
        <div style={{ position: 'absolute', left: px(-80.2)+7, top: py(25.8)-8,  color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, display: 'flex' }}>Miami</div>
        <div style={{ position: 'absolute', left: px(-87.6)+7, top: py(41.8)-8,  color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, display: 'flex' }}>Chicago</div>
        <div style={{ position: 'absolute', left: px(-118.2)+7,top: py(34)-8,    color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, display: 'flex' }}>Los Angeles</div>
        <div style={{ position: 'absolute', left: px(-122.4)+7,top: py(37.7)-8,  color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, display: 'flex' }}>San Francisco</div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 630, background: '#1e2d4a', flexShrink: 0, display: 'flex' }} />

      {/* ── TEXT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, display: 'flex' }}>
          🌍 TopBins Geography
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 14, display: 'flex' }}>
          Population Circle
        </div>
        <div style={{ fontSize: 18, color: '#8899bb', lineHeight: 1.5, marginBottom: 30, display: 'flex' }}>
          Estimate the population inside the circle. One daily puzzle + free play.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 700, color: 'white', display: 'flex' }}>
            Daily puzzle
          </div>
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 700, color: '#8899bb', display: 'flex' }}>
            Free play
          </div>
        </div>
        <div style={{ marginTop: 32, fontSize: 13, color: '#2a3d5e', display: 'flex' }}>
          topbinsfooty.com/geo/circle
        </div>
      </div>
    </div>,
    size
  )
}

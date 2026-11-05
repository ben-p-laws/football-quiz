import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Population Circle — Daily Geography Puzzle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Map panel dimensions and projection
const W = 700, H = 630
const LON0 = -130, LON1 = -60, LAT0 = 56, LAT1 = 22

function mx(lon: number) { return ((lon - LON0) / (LON1 - LON0)) * W }
function my(lat: number) { return ((LAT0 - lat) / (LAT0 - LAT1)) * H }

// Minimal TopoJSON → SVG paths
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function topoToPaths(topo: any, ids: Set<number>): { id: number; d: string }[] {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform

  function decodeArc(i: number): [number, number][] {
    const raw: [number, number][] = topo.arcs[i < 0 ? ~i : i]
    let ax = 0, ay = 0
    const pts = raw.map(([dx, dy]: [number, number]) => {
      ax += dx; ay += dy
      return [ax * sx + tx, ay * sy + ty] as [number, number]
    })
    return i < 0 ? pts.reverse() : pts
  }

  function ringToD(indices: number[]): string {
    const coords = indices.flatMap(decodeArc)
    return 'M' + coords.map(([lon, lat]) => `${mx(lon).toFixed(1)} ${my(lat).toFixed(1)}`).join('L') + 'Z'
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return topo.objects.countries.geometries
    .filter((g: any) => ids.has(Number(g.id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((g: any) => {
      let d = ''
      if (g.type === 'Polygon') {
        d = g.arcs.map(ringToD).join(' ')
      } else if (g.type === 'MultiPolygon') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        d = g.arcs.flatMap((rings: any[]) => rings.map(ringToD)).join(' ')
      }
      return { id: Number(g.id), d }
    })
    .filter((x: { d: string }) => x.d.length > 0)
}

export default async function Image() {
  // Use 110m (smaller, faster) — good enough at OG image size
  const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  const topo = await res.json()

  // ISO numeric IDs: 840=USA, 124=Canada, 484=Mexico, 192=Cuba, 332=Haiti, 388=Jamaica
  const paths = topoToPaths(topo, new Set([840, 124, 484, 192, 332, 388]))

  const usaPath    = paths.find(p => p.id === 840)?.d ?? ''
  const canadaPath = paths.find(p => p.id === 124)?.d ?? ''
  const mexicoPath = paths.find(p => p.id === 484)?.d ?? ''
  const restPaths  = paths.filter(p => ![840, 124, 484].includes(p.id)).map(p => p.d).join(' ')

  // East Coast circle centred NYC–DC corridor
  const cx = mx(-75), cy = my(39)

  // City positions
  const cities = [
    { name: 'New York',       lon: -74.0, lat: 40.7 },
    { name: 'Boston',         lon: -71.1, lat: 42.4 },
    { name: 'Washington DC',  lon: -77.0, lat: 38.9 },
    { name: 'Miami',          lon: -80.2, lat: 25.8 },
    { name: 'Chicago',        lon: -87.6, lat: 41.8 },
    { name: 'Los Angeles',    lon: -118.2,lat: 34.1 },
    { name: 'Toronto',        lon: -79.4, lat: 43.7 },
  ]

  return new ImageResponse(
    <div style={{ background: '#0c1520', width: 1200, height: 630, display: 'flex', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* MAP PANEL */}
      <div style={{ width: W, height: H, position: 'relative', display: 'flex', flexShrink: 0 }}>
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Canada */}
          {canadaPath && <path d={canadaPath} fill="#16253a" stroke="#2a4a6e" strokeWidth="1" />}
          {/* Mexico + Caribbean */}
          {mexicoPath && <path d={mexicoPath} fill="#16253a" stroke="#2a4a6e" strokeWidth="1" />}
          {restPaths   && <path d={restPaths}  fill="#16253a" stroke="#2a4a6e" strokeWidth="0.8" />}
          {/* USA */}
          {usaPath && <path d={usaPath} fill="#1e3a5c" stroke="#3a6090" strokeWidth="1.5" />}

          {/* East Coast circle */}
          <circle cx={cx} cy={cy} r={130} fill="rgba(220,38,38,0.1)" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="10 5" />

          {/* City dots */}
          {cities.map(c => (
            <circle key={c.name} cx={mx(c.lon)} cy={my(c.lat)} r={c.name === 'New York' ? 5 : 3.5} fill="white" />
          ))}
        </svg>

        {/* City labels (HTML for font rendering) */}
        {cities.map(c => (
          <div
            key={c.name}
            style={{
              position: 'absolute',
              left: mx(c.lon) + 8,
              top: my(c.lat) - 8,
              color: c.name === 'New York' ? 'white' : 'rgba(255,255,255,0.75)',
              fontSize: c.name === 'New York' ? 12 : 10,
              fontWeight: 700,
              display: 'flex',
              pointerEvents: 'none',
            }}
          >
            {c.name}
          </div>
        ))}

        {/* Country labels */}
        <div style={{ position: 'absolute', left: mx(-98) - 55, top: my(38) - 10, color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex' }}>United States</div>
        <div style={{ position: 'absolute', left: mx(-96) - 30, top: my(55) - 10, color: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex' }}>Canada</div>
        <div style={{ position: 'absolute', left: mx(-104) - 22, top: my(27) - 10, color: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex' }}>Mexico</div>
        <div style={{ position: 'absolute', left: mx(-62) - 30, top: my(37) - 10, color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex' }}>Atlantic</div>
      </div>

      {/* DIVIDER */}
      <div style={{ width: 1, height: H, background: '#1e2d4a', flexShrink: 0, display: 'flex' }} />

      {/* TEXT PANEL */}
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
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 700, color: 'white', display: 'flex' }}>Daily puzzle</div>
          <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 700, color: '#8899bb', display: 'flex' }}>Free play</div>
        </div>
        <div style={{ marginTop: 32, fontSize: 13, color: '#2a3d5e', display: 'flex' }}>topbinsfooty.com/geo/circle</div>
      </div>
    </div>,
    size
  )
}

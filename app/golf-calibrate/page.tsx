'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Pt = { x: number; y: number }
type FracPt = [number, number] // [xFrac, yFrac] 0-1

type HazardCalib = { start: number; end: number } // yards from tee

type HoleCalib = {
  tee: FracPt | null
  green: FracPt | null
  waypoints: FracPt[]
  hazards: HazardCalib[]
  bunkers: HazardCalib[]
}

const EMPTY_CALIB = (): HoleCalib => ({ tee: null, green: null, waypoints: [], hazards: [], bunkers: [] })

// ── Saved positions per course ────────────────────────────────────────────────

const SAVED_POSITIONS_PEBBLE: Record<number, { teeFrac: FracPt; greenFrac: FracPt; waypointFracs?: FracPt[] }> = {
  1:  {teeFrac:[0.76,0.839],  greenFrac:[0.541,0.169], waypointFracs:[[0.272,0.466]]},
  2:  {teeFrac:[0.605,0.841], greenFrac:[0.459,0.148], waypointFracs:[[0.518,0.529],[0.537,0.352]]},
  3:  {teeFrac:[0.258,0.808], greenFrac:[0.327,0.192], waypointFracs:[[0.765,0.552],[0.432,0.311]]},
  4:  {teeFrac:[0.546,0.797], greenFrac:[0.523,0.189], waypointFracs:[[0.518,0.417],[0.521,0.271]]},
  5:  {teeFrac:[0.416,0.809], greenFrac:[0.525,0.259], waypointFracs:[[0.393,0.518],[0.452,0.328]]},
  6:  {teeFrac:[0.603,0.854], greenFrac:[0.489,0.108], waypointFracs:[[0.502,0.495],[0.42,0.241]]},
  7:  {teeFrac:[0.511,0.693], greenFrac:[0.552,0.339], waypointFracs:[[0.539,0.525],[0.557,0.421]]},
  8:  {teeFrac:[0.698,0.81],  greenFrac:[0.539,0.196], waypointFracs:[[0.457,0.467],[0.484,0.245]]},
  9:  {teeFrac:[0.525,0.787], greenFrac:[0.539,0.201], waypointFracs:[[0.425,0.491],[0.502,0.341]]},
 10:  {teeFrac:[0.552,0.856], greenFrac:[0.598,0.172], waypointFracs:[[0.461,0.461],[0.525,0.258]]},
 11:  {teeFrac:[0.461,0.834], greenFrac:[0.571,0.176], waypointFracs:[[0.484,0.379],[0.548,0.196]]},
 12:  {teeFrac:[0.507,0.79],  greenFrac:[0.521,0.211], waypointFracs:[[0.511,0.37],[0.511,0.293]]},
 13:  {teeFrac:[0.548,0.893], greenFrac:[0.47,0.161],  waypointFracs:[[0.484,0.437],[0.457,0.273]]},
 14:  {teeFrac:[0.621,0.797], greenFrac:[0.676,0.195], waypointFracs:[[0.347,0.457],[0.534,0.28]]},
 15:  {teeFrac:[0.461,0.816], greenFrac:[0.516,0.149], waypointFracs:[[0.507,0.445],[0.502,0.207]]},
 16:  {teeFrac:[0.735,0.806], greenFrac:[0.648,0.182], waypointFracs:[[0.521,0.475],[0.584,0.304]]},
 17:  {teeFrac:[0.589,0.844], greenFrac:[0.434,0.285], waypointFracs:[[0.525,0.567],[0.47,0.39]]},
 18:  {teeFrac:[0.299,0.829], greenFrac:[0.377,0.157], waypointFracs:[[0.724,0.573],[0.614,0.266]]},
}

const SAVED_POSITIONS_AUGUSTA: Record<number, { teeFrac: FracPt; greenFrac: FracPt; waypointFracs?: FracPt[] }> = {
   1: {teeFrac:[0.482,0.902], greenFrac:[0.575,0.144], waypointFracs:[[0.43,0.445],[0.466,0.311]]},
   2: {teeFrac:[0.215,0.924], greenFrac:[0.449,0.107], waypointFracs:[[0.961,0.324]]},
   3: {teeFrac:[0.562,0.917], greenFrac:[0.635,0.122], waypointFracs:[[0.506,0.296]]},
   4: {teeFrac:[0.506,0.847], greenFrac:[0.523,0.168]},
   5: {teeFrac:[0.426,0.895], greenFrac:[0.358,0.132], waypointFracs:[[0.705,0.414]]},
   6: {teeFrac:[0.484,0.87],  greenFrac:[0.448,0.178]},
   7: {teeFrac:[0.479,0.9],   greenFrac:[0.527,0.108], waypointFracs:[[0.497,0.611],[0.521,0.262]]},
   8: {teeFrac:[0.618,0.917], greenFrac:[0.492,0.107], waypointFracs:[[0.574,0.447],[0.602,0.195]]},
   9: {teeFrac:[0.28,0.907],  greenFrac:[0.369,0.093], waypointFracs:[[0.916,0.402]]},
  10: {teeFrac:[0.289,0.907], greenFrac:[0.339,0.106], waypointFracs:[[0.634,0.46]]},
  11: {teeFrac:[0.565,0.92],  greenFrac:[0.531,0.146], waypointFracs:[[0.452,0.357],[0.492,0.249]]},
  12: {teeFrac:[0.513,0.854], greenFrac:[0.487,0.257], waypointFracs:[[0.498,0.474]]},
  13: {teeFrac:[0.176,0.92],  greenFrac:[0.357,0.135], waypointFracs:[[0.969,0.621],[0.923,0.394]]},
  14: {teeFrac:[0.306,0.918], greenFrac:[0.406,0.128], waypointFracs:[[0.718,0.525]]},
  15: {teeFrac:[0.52,0.931],  greenFrac:[0.514,0.114], waypointFracs:[[0.537,0.548],[0.514,0.238]]},
  16: {teeFrac:[0.419,0.855], greenFrac:[0.509,0.173], waypointFracs:[[0.462,0.494],[0.487,0.327]]},
  17: {teeFrac:[0.389,0.918], greenFrac:[0.446,0.09],  waypointFracs:[[0.56,0.496]]},
  18: {teeFrac:[0.696,0.915], greenFrac:[0.627,0.095], waypointFracs:[[0.116,0.421]]},
}

// Blue tee distances (yards)
const HOLE_DISTANCES_PEBBLE: Record<number, number> = {
  1:378,2:509,3:397,4:333,5:189,6:498,7:107,8:416,9:483,
  10:444,11:370,12:202,13:401,14:559,15:393,16:400,17:182,18:541,
}
const HOLE_DISTANCES_AUGUSTA: Record<number, number> = {
  1:455,2:575,3:350,4:240,5:495,6:180,7:450,8:570,9:460,
  10:495,11:505,12:155,13:510,14:440,15:530,16:170,17:440,18:465,
}

const SAVED_POSITIONS_WII: Record<number, { teeFrac: FracPt; greenFrac: FracPt; waypointFracs?: FracPt[] }> = {
  1: {teeFrac:[0.481,0.918], greenFrac:[0.49,0.15],   waypointFracs:[[0.379,0.43]]},
  2: {teeFrac:[0.283,0.835], greenFrac:[0.602,0.286],  waypointFracs:[[0.479,0.58],[0.546,0.422]]},
  3: {teeFrac:[0.346,0.875], greenFrac:[0.359,0.095],  waypointFracs:[[0.768,0.685],[0.702,0.281]]},
}
const HOLE_DISTANCES_WII: Record<number, number> = {
  1: 370, 2: 134, 3: 465,
}

type CourseId = 'pebble-beach' | 'augusta' | 'wii-golf'

function getCourseHoleCount(course: CourseId) {
  if (course === 'wii-golf') return 3
  return 18
}
function getSavedPositions(course: CourseId) {
  if (course === 'augusta') return SAVED_POSITIONS_AUGUSTA
  if (course === 'wii-golf') return SAVED_POSITIONS_WII
  return SAVED_POSITIONS_PEBBLE
}
function getDistances(course: CourseId) {
  if (course === 'augusta') return HOLE_DISTANCES_AUGUSTA
  if (course === 'wii-golf') return HOLE_DISTANCES_WII
  return HOLE_DISTANCES_PEBBLE
}
function getImageUrl(course: CourseId, hole: number) {
  const n = String(hole).padStart(2, '0')
  if (course === 'augusta') return `/holes/augusta/hole_${n}.png`
  if (course === 'wii-golf') return `/holes/wii-golf/wii-golf-${hole}.png`
  return `/holes/hole_${n}.png`
}
function getVarNames(course: CourseId) {
  if (course === 'augusta') return { positions: 'AUGUSTA_POSITIONS', hazards: 'AUGUSTA_HAZARDS' }
  if (course === 'wii-golf') return { positions: 'WII_GOLF_POSITIONS', hazards: 'WII_GOLF_HAZARDS' }
  return { positions: 'HOLE_POSITIONS', hazards: 'REAL_COURSE_HAZARDS' }
}

// ── Bezier helpers ────────────────────────────────────────────────────────────

function bezierAt(t: number, pts: Pt[]): Pt {
  const u = 1 - t
  if (pts.length === 2) return { x: u*pts[0].x+t*pts[1].x, y: u*pts[0].y+t*pts[1].y }
  if (pts.length === 3) return { x: u*u*pts[0].x+2*u*t*pts[1].x+t*t*pts[2].x, y: u*u*pts[0].y+2*u*t*pts[1].y+t*t*pts[2].y }
  return {
    x: u*u*u*pts[0].x+3*u*u*t*pts[1].x+3*u*t*t*pts[2].x+t*t*t*pts[3].x,
    y: u*u*u*pts[0].y+3*u*u*t*pts[1].y+3*u*t*t*pts[2].y+t*t*t*pts[3].y,
  }
}

function buildPathPts(pos: typeof SAVED_POSITIONS_PEBBLE[number], imgW: number, imgH: number): Pt[] {
  const fracs: FracPt[] = [pos.teeFrac, ...(pos.waypointFracs ?? []), pos.greenFrac]
  return fracs.map(([x, y]) => ({ x: x * imgW, y: y * imgH }))
}

function samplePath(pts: Pt[], n = 80): string {
  return Array.from({ length: n + 1 }, (_, i) => {
    const p = bezierAt(i / n, pts)
    return `${p.x},${p.y}`
  }).join(' ')
}

// Project a click (pixel coords) onto a bezier path, return t ∈ [0,1]
function projectToPath(cx: number, cy: number, pts: Pt[]): number {
  let bestT = 0, bestDist = Infinity
  const SAMPLES = 300
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const p = bezierAt(t, pts)
    const d = (p.x - cx) ** 2 + (p.y - cy) ** 2
    if (d < bestDist) { bestDist = d; bestT = t }
  }
  return bestT
}

// Get pixel position of a t value along the path
function pathPxAt(t: number, pts: Pt[]): Pt {
  return bezierAt(t, pts)
}

// ── Modes ─────────────────────────────────────────────────────────────────────

const ALL_MODES = ['tee', 'green', 'waypoint', 'hazard', 'bunker'] as const
type Mode = typeof ALL_MODES[number]

const MODE_LABELS: Record<Mode, string> = {
  tee: '🏌️ Tee', green: '⛳ Green', waypoint: '〰️ Waypoint',
  hazard: '🌊 Hazard', bunker: '🏖️ Bunker',
}
const MODE_COLORS: Record<Mode, string> = {
  tee: '#f97316', green: '#22c55e', waypoint: '#60a5fa',
  hazard: '#3b82f6', bunker: '#f59e0b',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GolfCalibratePage() {
  const [course, setCourse] = useState<CourseId>('pebble-beach')
  const [hole, setHole] = useState(1)
  const [mode, setMode] = useState<Mode>('tee')
  const [calibByCourse, setCalibByCourse] = useState<Record<CourseId, Record<number, HoleCalib>>>(() => {
    const makeCalib = (saved: Record<number, { teeFrac: FracPt; greenFrac: FracPt; waypointFracs?: FracPt[] }>, count: number) => {
      const init: Record<number, HoleCalib> = {}
      for (let h = 1; h <= count; h++) {
        const s = saved[h]
        init[h] = s
          ? { tee: s.teeFrac, green: s.greenFrac, waypoints: s.waypointFracs ?? [], hazards: [], bunkers: [] }
          : EMPTY_CALIB()
      }
      return init
    }
    return {
      'pebble-beach': makeCalib(SAVED_POSITIONS_PEBBLE, 18),
      'augusta': makeCalib(SAVED_POSITIONS_AUGUSTA, 18),
      'wii-golf': makeCalib(SAVED_POSITIONS_WII, 3),
    }
  })
  const [pendingStart, setPendingStart] = useState<number | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const calib = calibByCourse[course]
  const setCalib = (updater: (prev: Record<number, HoleCalib>) => Record<number, HoleCalib>) => {
    setCalibByCourse(p => ({ ...p, [course]: updater(p[course]) }))
  }

  useEffect(() => {
    const update = () => {
      const img = imgRef.current
      if (img) setImgSize({ w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [hole, course])

  const current = calib[hole] ?? EMPTY_CALIB()
  const savedPositions = getSavedPositions(course)
  const pos = calib[hole]?.tee ? { teeFrac: calib[hole].tee!, greenFrac: calib[hole].green!, waypointFracs: calib[hole].waypoints } : savedPositions[hole]
  const pathPts = pos && pos.teeFrac && pos.greenFrac && imgSize.w > 0 ? buildPathPts(pos, imgSize.w, imgSize.h) : null
  const distance = getDistances(course)[hole] ?? 400
  const varNames = getVarNames(course)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const xFrac = (e.clientX - rect.left) / rect.width
    const yFrac = (e.clientY - rect.top) / rect.height
    const xPx = e.clientX - rect.left
    const yPx = e.clientY - rect.top
    const fracPt: FracPt = [Math.round(xFrac * 1000) / 1000, Math.round(yFrac * 1000) / 1000]

    if (mode === 'tee') {
      setCalib(p => ({ ...p, [hole]: { ...p[hole], tee: fracPt } }))
      setMode('green')
    } else if (mode === 'green') {
      setCalib(p => ({ ...p, [hole]: { ...p[hole], green: fracPt } }))
      setMode('waypoint')
    } else if (mode === 'waypoint') {
      setCalib(p => ({ ...p, [hole]: { ...p[hole], waypoints: [...(p[hole]?.waypoints ?? []), fracPt] } }))
    } else if (mode === 'hazard' || mode === 'bunker') {
      if (!pathPts) return
      const t = projectToPath(xPx, yPx, pathPts)
      const yards = Math.round(t * distance)
      if (pendingStart === null) {
        setPendingStart(yards)
      } else {
        const start = Math.min(pendingStart, yards)
        const end = Math.max(pendingStart, yards)
        setPendingStart(null)
        if (mode === 'hazard') {
          setCalib(p => ({ ...p, [hole]: { ...p[hole], hazards: [...(p[hole]?.hazards ?? []), { start, end }] } }))
        } else {
          setCalib(p => ({ ...p, [hole]: { ...p[hole], bunkers: [...(p[hole]?.bunkers ?? []), { start, end }] } }))
        }
      }
    }
  }, [hole, mode, pathPts, distance, pendingStart])

  const onImgLoad = () => {
    const img = imgRef.current
    if (img) setImgSize({ w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height })
  }

  const clearWaypoints = () => setCalib(p => ({ ...p, [hole]: { ...p[hole], waypoints: [] } }))
  const clearHazards = () => { setCalib(p => ({ ...p, [hole]: { ...p[hole], hazards: [], bunkers: [] } })); setPendingStart(null) }
  const cancelPending = () => setPendingStart(null)

  const outputPositionsJS = () => {
    const lines: string[] = []
    for (let h = 1; h <= holeCount; h++) {
      const c = calib[h]
      if (!c?.tee || !c?.green) continue
      const tf = `[${c.tee[0]},${c.tee[1]}]`
      const gf = `[${c.green[0]},${c.green[1]}]`
      const wf = c.waypoints.length ? `, waypointFracs:[${c.waypoints.map(w => `[${w[0]},${w[1]}]`).join(',')}]` : ''
      lines.push(` ${String(h).padStart(2)}: {teeFrac:${tf}, greenFrac:${gf}${wf}},`)
    }
    return `const ${varNames.positions} = {\n${lines.join('\n')}\n}`
  }

  const outputHazardsJS = () => {
    const lines: string[] = []
    for (let h = 1; h <= holeCount; h++) {
      const c = calib[h]
      if (!c?.hazards?.length && !c?.bunkers?.length) continue
      const parts: string[] = []
      if (c.hazards?.length) parts.push(`hazards:[${c.hazards.map(z => `{start:${z.start},end:${z.end}}`).join(',')}]`)
      if (c.bunkers?.length) parts.push(`bunkers:[${c.bunkers.map(b => `{start:${b.start},end:${b.end}}`).join(',')}]`)
      lines.push(` ${String(h).padStart(2)}: {${parts.join(', ')}},`)
    }
    return lines.length
      ? `const ${varNames.hazards} = {\n${lines.join('\n')}\n}`
      : '// No hazards calibrated yet'
  }

  const copyPositions = () => navigator.clipboard.writeText(outputPositionsJS())
  const copyHazards = () => navigator.clipboard.writeText(outputHazardsJS())

  // Render hazard/bunker markers on the image as positioned dots at their yard distance along the path
  const hazardMarkers: { label: string; t: number; color: string }[] = []
  current.hazards?.forEach((z, i) => {
    if (!pathPts) return
    hazardMarkers.push(
      { label: `W${i + 1}`, t: z.start / distance, color: MODE_COLORS.hazard },
      { label: `W${i + 1}`, t: z.end / distance, color: MODE_COLORS.hazard },
    )
  })
  current.bunkers?.forEach((b, i) => {
    if (!pathPts) return
    hazardMarkers.push(
      { label: `B${i + 1}`, t: b.start / distance, color: MODE_COLORS.bunker },
      { label: `B${i + 1}`, t: b.end / distance, color: MODE_COLORS.bunker },
    )
  })

  const holeCount = getCourseHoleCount(course)
  const calibrated = Object.keys(calib).filter(k => calib[+k]?.tee && calib[+k]?.green).length
  const withHazards = Object.keys(calib).filter(k => calib[+k]?.hazards?.length || calib[+k]?.bunkers?.length).length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: 'white', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ background: '#111827', borderBottom: '1px solid #1e2d4a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>⛳ Golf Calibrate</div>

        {/* Course toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {([['pebble-beach','Pebble Beach'],['augusta','Augusta'],['wii-golf','Wii Golf']] as [CourseId,string][]).map(([c,label]) => (
            <button key={c} onClick={() => { setCourse(c); setHole(1); setPendingStart(null) }}
              style={{ ...btnS, width: 'auto', background: course === c ? '#22c55e' : '#1e2d4a', color: course === c ? '#0a0f1e' : 'white', fontSize: 11 }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#8899bb' }}>{calibrated}/{holeCount} positions · {withHazards}/{holeCount} hazards</div>

        {/* Hole stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => { setHole(h => Math.max(1, h - 1)); setPendingStart(null) }} style={btnS}>&lsaquo;</button>
          <div style={{ minWidth: 56, textAlign: 'center', fontWeight: 900, fontSize: 16 }}>Hole {hole}</div>
          <button onClick={() => { setHole(h => Math.min(holeCount, h + 1)); setPendingStart(null) }} style={btnS}>&rsaquo;</button>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ALL_MODES.map(m => (
            <button key={m} onClick={() => { setMode(m); setPendingStart(null) }}
              style={{ ...btnS, background: mode === m ? MODE_COLORS[m] : '#1e2d4a', border: `2px solid ${mode === m ? MODE_COLORS[m] : 'transparent'}`, fontSize: 11 }}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {(mode === 'waypoint') && <button onClick={clearWaypoints} style={{ ...btnS, background: '#dc2626', fontSize: 11 }}>Clear waypoints</button>}
          {(mode === 'hazard' || mode === 'bunker') && <button onClick={clearHazards} style={{ ...btnS, background: '#dc2626', fontSize: 11 }}>Clear hazards</button>}
          <button onClick={copyPositions} style={{ ...btnS, background: '#7c3aed', fontSize: 11 }}>Copy positions</button>
          <button onClick={copyHazards} style={{ ...btnS, background: '#059669', fontSize: 11 }}>Copy hazards</button>
        </div>
      </div>

      {/* Pending instruction */}
      {pendingStart !== null && (
        <div style={{ background: 'rgba(59,130,246,0.15)', borderBottom: '1px solid rgba(59,130,246,0.3)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
            First point set at {pendingStart} yds — now click the {mode === 'hazard' ? 'far edge of the water' : 'far edge of the bunker'}
          </div>
          <button onClick={cancelPending} style={{ ...btnS, fontSize: 11 }}>Cancel</button>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Image panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, minHeight: 0 }}>
          <div onClick={handleClick} style={{ position: 'relative', cursor: 'crosshair', display: 'inline-block', maxHeight: 'calc(100vh - 100px)' }}>
            <img
              ref={imgRef}
              src={getImageUrl(course, hole)}
              alt={`Hole ${hole}`}
              onLoad={onImgLoad}
              style={{ display: 'block', maxHeight: 'calc(100vh - 100px)', maxWidth: '100%', userSelect: 'none' }}
              draggable={false}
            />

            {/* SVG overlay: path line + hazard markers */}
            {pathPts && imgSize.w > 0 && (
              <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: imgSize.w, height: imgSize.h }}>
                {/* Dashed fairway path */}
                <polyline
                  points={samplePath(pathPts)}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                />
                {/* Hazard range lines */}
                {current.hazards?.map((z, i) => {
                  const p0 = pathPxAt(z.start / distance, pathPts)
                  const p1 = pathPxAt(z.end / distance, pathPts)
                  return <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={MODE_COLORS.hazard} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
                })}
                {current.bunkers?.map((b, i) => {
                  const p0 = pathPxAt(b.start / distance, pathPts)
                  const p1 = pathPxAt(b.end / distance, pathPts)
                  return <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={MODE_COLORS.bunker} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
                })}
              </svg>
            )}

            {/* Dot markers: tee, green, waypoints */}
            {current.tee && <Dot frac={current.tee} color={MODE_COLORS.tee} label="T" />}
            {current.green && <Dot frac={current.green} color={MODE_COLORS.green} label="G" />}
            {current.waypoints.map((w, i) => <Dot key={i} frac={w} color={MODE_COLORS.waypoint} label={String(i + 1)} />)}

            {/* Dot markers for hazard endpoints */}
            {pathPts && hazardMarkers.map((m, i) => {
              const p = pathPxAt(Math.min(Math.max(m.t, 0), 1), pathPts)
              return (
                <div key={i} style={{
                  position: 'absolute', left: p.x, top: p.y,
                  transform: 'translate(-50%,-50%)',
                  width: 16, height: 16, borderRadius: '50%',
                  background: m.color, border: '2px solid white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7, fontWeight: 900, pointerEvents: 'none',
                }}>{m.label}</div>
              )
            })}
          </div>
        </div>

        {/* Output panel */}
        <div style={{ width: 300, background: '#111827', borderLeft: '1px solid #1e2d4a', padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>

          <div style={{ fontWeight: 800, color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hole {hole} · {distance} yds</div>

          <div style={{ fontFamily: 'monospace', background: '#0a0f1e', borderRadius: 8, padding: 10, lineHeight: 1.7 }}>
            <div style={{ color: '#f97316' }}>tee: {current.tee ? current.tee.join(', ') : '—'}</div>
            <div style={{ color: '#22c55e' }}>green: {current.green ? current.green.join(', ') : '—'}</div>
            <div style={{ color: '#60a5fa' }}>wpts: {current.waypoints.length ? current.waypoints.map(w => `[${w.join(',')}]`).join(' ') : '—'}</div>
            {current.hazards?.length
              ? current.hazards.map((z, i) => <div key={i} style={{ color: '#3b82f6', marginTop: i === 0 ? 4 : 0 }}>water {i + 1}: {z.start}–{z.end} yds</div>)
              : <div style={{ color: '#3b82f6', marginTop: 4 }}>water: —</div>
            }
            {current.bunkers?.map((b, i) => (
              <div key={i} style={{ color: '#f59e0b' }}>bunker {i + 1}: {b.start}–{b.end} yds</div>
            ))}
          </div>

          <div style={{ fontWeight: 800, color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Hazards output</div>
          <pre style={{ fontFamily: 'monospace', background: '#0a0f1e', borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#a5f3fc', margin: 0 }}>
            {outputHazardsJS()}
          </pre>
          <button onClick={copyHazards} style={{ ...btnS, background: '#059669', padding: '8px 0' }}>📋 Copy hazards JS</button>
          <button onClick={copyPositions} style={{ ...btnS, background: '#7c3aed', padding: '8px 0' }}>📋 Copy positions JS</button>

          {/* Hole jump grid */}
          <div style={{ fontWeight: 800, color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Jump to hole</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
            {Array.from({ length: holeCount }, (_, i) => i + 1).map(h => {
              const c = calib[h]
              const hasHazard = !!(c?.hazards?.length || c?.bunkers?.length)
              return (
                <button key={h} onClick={() => { setHole(h); setPendingStart(null) }}
                  style={{ ...btnS, background: h === hole ? '#dc2626' : hasHazard ? 'rgba(5,150,105,0.25)' : '#1e2d4a', border: `1px solid ${h === hole ? '#dc2626' : hasHazard ? 'rgba(5,150,105,0.5)' : 'transparent'}`, padding: '5px 0' }}>
                  {h}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Dot({ frac, color, label }: { frac: FracPt; color: string; label: string }) {
  return (
    <div style={{
      position: 'absolute', left: `${frac[0] * 100}%`, top: `${frac[1] * 100}%`,
      transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: '50%',
      background: color, border: '2px solid white', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 8, fontWeight: 900, pointerEvents: 'none',
    }}>{label}</div>
  )
}

const btnS: React.CSSProperties = {
  background: '#1e2d4a', color: 'white', border: '1px solid #2a3d5e',
  borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit', width: '100%',
}

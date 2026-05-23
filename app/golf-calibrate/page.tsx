'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Pt = { x: number; y: number }
type FracPt = [number, number] // [xFrac, yFrac] 0-1

type HazardCalib = { start: number; end: number } // yards from tee

type RouteCalib = {
  waypoints: FracPt[]
  hazards: HazardCalib[]
  bunkers: HazardCalib[]
}

type BranchCalib = {
  routeA: RouteCalib
  routeB: RouteCalib
  midFork: {
    yardStart: number
    yardEnd: number
    subL: RouteCalib
    subR: RouteCalib
  } | null
}

type HoleCalib = {
  tee: FracPt | null
  green: FracPt | null
  waypoints: FracPt[]
  hazards: HazardCalib[]
  bunkers: HazardCalib[]
  branch: BranchCalib | null
}

const EMPTY_ROUTE = (): RouteCalib => ({ waypoints: [], hazards: [], bunkers: [] })
const EMPTY_CALIB = (): HoleCalib => ({ tee: null, green: null, waypoints: [], hazards: [], bunkers: [], branch: null })

type RouteSlot = 'main' | 'A' | 'B' | 'subL' | 'subR'

const ROUTE_LABELS: Record<RouteSlot, string> = { main: 'Main', A: 'Route A', B: 'Route B', subL: 'Sub L', subR: 'Sub R' }
const ROUTE_COLORS: Record<RouteSlot, string> = { main: '#ffffff', A: '#60a5fa', B: '#f97316', subL: '#a78bfa', subR: '#22d3ee' }

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
  1: {teeFrac:[0.502,0.946], greenFrac:[0.506,0.134], waypointFracs:[[0.351,0.436]]},
  2: {teeFrac:[0.247,0.848], greenFrac:[0.609,0.277], waypointFracs:[[0.491,0.569],[0.544,0.494]]},
  3: {teeFrac:[0.238,0.909], greenFrac:[0.253,0.078], waypointFracs:[[0.918,0.62],[0.774,0.276]]},
  4: {teeFrac:[0.495,0.859], greenFrac:[0.411,0.222], waypointFracs:[[0.501,0.585],[0.501,0.432]]},
  5: {teeFrac:[0.586,0.839], greenFrac:[0.870,0.142], waypointFracs:[[0.106,0.405],[0.254,0.241]]},
  6: {teeFrac:[0.332,0.892], greenFrac:[0.645,0.173], waypointFracs:[[0.490,0.42]]},
  7: {teeFrac:[0.390,0.868], greenFrac:[0.788,0.273], waypointFracs:[[0.180,0.255],[0.418,0.109]]},
  8: {teeFrac:[0.450,0.807], greenFrac:[0.639,0.163], waypointFracs:[[0.574,0.568],[0.626,0.365]]},
  9: {teeFrac:[0.170,0.850], greenFrac:[0.470,0.080], waypointFracs:[[0.490,0.580],[0.730,0.300]]},
}
const HOLE_DISTANCES_WII: Record<number, number> = {
  1: 370, 2: 134, 3: 465,
  4: 142, 5: 461, 6: 345, 7: 327, 8: 223, 9: 455,
}

type CourseId = 'pebble-beach' | 'augusta' | 'wii-golf'

function getCourseHoleCount(course: CourseId) {
  if (course === 'wii-golf') return 9
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
          ? { tee: s.teeFrac, green: s.greenFrac, waypoints: s.waypointFracs ?? [], hazards: [], bunkers: [], branch: null }
          : EMPTY_CALIB()
      }
      return init
    }
    return {
      'pebble-beach': makeCalib(SAVED_POSITIONS_PEBBLE, 18),
      'augusta': makeCalib(SAVED_POSITIONS_AUGUSTA, 18),
      'wii-golf': makeCalib(SAVED_POSITIONS_WII, 9),
    }
  })
  const [pendingStart, setPendingStart] = useState<number | null>(null)
  const [activeRoute, setActiveRoute] = useState<RouteSlot>('main')
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const calib = calibByCourse[course]
  const setCalib = (updater: (prev: Record<number, HoleCalib>) => Record<number, HoleCalib>) => {
    setCalibByCourse(p => ({ ...p, [course]: updater(p[course]) }))
  }

  // ── Branch helpers ──
  const getRoute = (c: HoleCalib | undefined, slot: RouteSlot): RouteCalib => {
    if (!c) return EMPTY_ROUTE()
    if (slot === 'main') return { waypoints: c.waypoints, hazards: c.hazards, bunkers: c.bunkers }
    if (!c.branch) return EMPTY_ROUTE()
    if (slot === 'A') return c.branch.routeA
    if (slot === 'B') return c.branch.routeB
    if (!c.branch.midFork) return EMPTY_ROUTE()
    if (slot === 'subL') return c.branch.midFork.subL
    return c.branch.midFork.subR
  }
  const updateRoute = (c: HoleCalib, slot: RouteSlot, fn: (r: RouteCalib) => RouteCalib): HoleCalib => {
    if (slot === 'main') { const r = fn({ waypoints: c.waypoints, hazards: c.hazards, bunkers: c.bunkers }); return { ...c, ...r } }
    if (!c.branch) return c
    if (slot === 'A') return { ...c, branch: { ...c.branch, routeA: fn(c.branch.routeA) } }
    if (slot === 'B') return { ...c, branch: { ...c.branch, routeB: fn(c.branch.routeB) } }
    if (!c.branch.midFork) return c
    if (slot === 'subL') return { ...c, branch: { ...c.branch, midFork: { ...c.branch.midFork, subL: fn(c.branch.midFork.subL) } } }
    return { ...c, branch: { ...c.branch, midFork: { ...c.branch.midFork, subR: fn(c.branch.midFork.subR) } } }
  }
  const enableBranch = () => {
    setCalib(p => {
      const c = p[hole] ?? EMPTY_CALIB()
      if (c.branch) return p
      // Seed Route A with the existing main waypoints/hazards so the user has a starting line
      const seedA: RouteCalib = { waypoints: [...c.waypoints], hazards: [...c.hazards], bunkers: [...c.bunkers] }
      const seedB: RouteCalib = EMPTY_ROUTE()
      return { ...p, [hole]: { ...c, branch: { routeA: seedA, routeB: seedB, midFork: null } } }
    })
    setActiveRoute('A')
  }
  const disableBranch = () => {
    setCalib(p => ({ ...p, [hole]: { ...p[hole], branch: null } }))
    setActiveRoute('main')
  }
  const enableMidFork = () => {
    setCalib(p => {
      const c = p[hole]; if (!c?.branch) return p
      if (c.branch.midFork) return p
      return { ...p, [hole]: { ...c, branch: { ...c.branch, midFork: { yardStart: Math.round(distance * 0.45), yardEnd: Math.round(distance * 0.60), subL: EMPTY_ROUTE(), subR: EMPTY_ROUTE() } } } }
    })
  }
  const disableMidFork = () => {
    setCalib(p => {
      const c = p[hole]; if (!c?.branch) return p
      return { ...p, [hole]: { ...c, branch: { ...c.branch, midFork: null } } }
    })
    if (activeRoute === 'subL' || activeRoute === 'subR') setActiveRoute('A')
  }
  const setMidYards = (which: 'yardStart' | 'yardEnd', val: number) => {
    setCalib(p => {
      const c = p[hole]; if (!c?.branch?.midFork) return p
      return { ...p, [hole]: { ...c, branch: { ...c.branch, midFork: { ...c.branch.midFork, [which]: val } } } }
    })
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
  const distance = getDistances(course)[hole] ?? 400
  const varNames = getVarNames(course)
  const branchOn = !!current.branch
  const validSlots: RouteSlot[] = branchOn
    ? (current.branch!.midFork ? ['A','B','subL','subR'] : ['A','B'])
    : ['main']
  const slot: RouteSlot = validSlots.includes(activeRoute) ? activeRoute : (validSlots[0] ?? 'main')
  const activeRouteData = getRoute(current, slot)

  // For sub-routes the path STARTS at the mid-fork point on Route A, not at the tee
  const isSubSlot = slot === 'subL' || slot === 'subR'
  const subStartYards = current.branch?.midFork
    ? Math.round((current.branch.midFork.yardStart + current.branch.midFork.yardEnd) / 2)
    : 0
  const forkPointFrac: FracPt | null = (() => {
    if (!isSubSlot || !current.branch?.midFork || !current.tee || !current.green || imgSize.w === 0) return null
    const routeAPos = { teeFrac: current.tee, greenFrac: current.green, waypointFracs: current.branch.routeA.waypoints }
    const routeAPts = buildPathPts(routeAPos, imgSize.w, imgSize.h)
    const t = subStartYards / distance
    const p = pathPxAt(t, routeAPts)
    return [Math.round((p.x / imgSize.w) * 1000) / 1000, Math.round((p.y / imgSize.h) * 1000) / 1000]
  })()

  // Build pathPts for the currently active route — used for hazard/bunker yardage projection
  const activePos = current.tee && current.green
    ? (isSubSlot && forkPointFrac
        ? { teeFrac: forkPointFrac, greenFrac: current.green, waypointFracs: activeRouteData.waypoints }
        : { teeFrac: current.tee, greenFrac: current.green, waypointFracs: activeRouteData.waypoints })
    : (savedPositions[hole] ?? null)
  const pathPts = activePos && activePos.teeFrac && activePos.greenFrac && imgSize.w > 0
    ? buildPathPts(activePos, imgSize.w, imgSize.h) : null

  // For sub-routes: clicks project onto a path that represents only [subStart..distance] yards
  const yardsAtT = (t: number): number => isSubSlot ? Math.round(subStartYards + t * (distance - subStartYards)) : Math.round(t * distance)
  const tAtYards = (yards: number): number => isSubSlot ? Math.max(0, Math.min(1, (yards - subStartYards) / Math.max(1, distance - subStartYards))) : Math.max(0, Math.min(1, yards / distance))

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
      setCalib(p => ({ ...p, [hole]: { ...(p[hole] ?? EMPTY_CALIB()), tee: fracPt } }))
      setMode('green')
    } else if (mode === 'green') {
      setCalib(p => ({ ...p, [hole]: { ...(p[hole] ?? EMPTY_CALIB()), green: fracPt } }))
      setMode('waypoint')
    } else if (mode === 'waypoint') {
      setCalib(p => ({ ...p, [hole]: updateRoute(p[hole] ?? EMPTY_CALIB(), slot, r => ({ ...r, waypoints: [...r.waypoints, fracPt] })) }))
    } else if (mode === 'hazard' || mode === 'bunker') {
      if (!pathPts) return
      const t = projectToPath(xPx, yPx, pathPts)
      const yards = yardsAtT(t)
      if (pendingStart === null) {
        setPendingStart(yards)
      } else {
        const start = Math.min(pendingStart, yards)
        const end = Math.max(pendingStart, yards)
        setPendingStart(null)
        setCalib(p => ({ ...p, [hole]: updateRoute(p[hole] ?? EMPTY_CALIB(), slot, r => mode === 'hazard'
          ? ({ ...r, hazards: [...r.hazards, { start, end }] })
          : ({ ...r, bunkers: [...r.bunkers, { start, end }] }))
        }))
      }
    }
  }, [hole, mode, pathPts, distance, pendingStart, slot, isSubSlot, subStartYards])

  const onImgLoad = () => {
    const img = imgRef.current
    if (img) setImgSize({ w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height })
  }

  const clearWaypoints = () => setCalib(p => ({ ...p, [hole]: updateRoute(p[hole] ?? EMPTY_CALIB(), slot, r => ({ ...r, waypoints: [] })) }))
  const clearHazards = () => { setCalib(p => ({ ...p, [hole]: updateRoute(p[hole] ?? EMPTY_CALIB(), slot, r => ({ ...r, hazards: [], bunkers: [] })) })); setPendingStart(null) }
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

  const fmtRoute = (id: string, label: string, r: RouteCalib) => {
    const wp = r.waypoints.map(w => `[${w[0]},${w[1]}]`).join(',')
    const hz = r.hazards.map(z => `{start:${z.start},end:${z.end}}`).join(',')
    const bk = r.bunkers.map(z => `{start:${z.start},end:${z.end}}`).join(',')
    return `      {id:'${id}',label:'${label}',waypointFracs:[${wp}],hazards:[${hz}],bunkers:[${bk}]}`
  }
  const outputBranchesJS = () => {
    const lines: string[] = []
    for (let h = 1; h <= holeCount; h++) {
      const c = calib[h]
      if (!c?.branch || !c.tee || !c.green) continue
      const tf = `[${c.tee[0]},${c.tee[1]}]`
      const gf = `[${c.green[0]},${c.green[1]}]`
      const teeRoutes = [
        fmtRoute('A', 'Route A', c.branch.routeA),
        fmtRoute('B', 'Route B', c.branch.routeB),
      ].join(',\n')
      let midForkBlock = ''
      if (c.branch.midFork) {
        const mf = c.branch.midFork
        const subs = [
          fmtRoute('L', 'Sub L', mf.subL),
          fmtRoute('R', 'Sub R', mf.subR),
        ].join(',\n')
        midForkBlock = `,\n    midFork:{triggerYardRange:[${mf.yardStart},${mf.yardEnd}],subRoutes:[\n${subs}\n    ]}`
      }
      lines.push(`  ${h}: {\n    teeFrac:${tf}, greenFrac:${gf},\n    teeRoutes:[\n${teeRoutes}\n    ]${midForkBlock}\n  },`)
    }
    return lines.length
      ? `const WII_GOLF_BRANCHES = {\n${lines.join('\n')}\n}`
      : '// No branched holes yet'
  }

  const copyPositions = () => navigator.clipboard.writeText(outputPositionsJS())
  const copyHazards = () => navigator.clipboard.writeText(outputHazardsJS())
  const copyBranches = () => navigator.clipboard.writeText(outputBranchesJS())

  // Render hazard/bunker markers along the active route's path
  const hazardMarkers: { label: string; t: number; color: string }[] = []
  activeRouteData.hazards.forEach((z, i) => {
    if (!pathPts) return
    hazardMarkers.push(
      { label: `W${i + 1}`, t: tAtYards(z.start), color: MODE_COLORS.hazard },
      { label: `W${i + 1}`, t: tAtYards(z.end), color: MODE_COLORS.hazard },
    )
  })
  activeRouteData.bunkers.forEach((b, i) => {
    if (!pathPts) return
    hazardMarkers.push(
      { label: `B${i + 1}`, t: tAtYards(b.start), color: MODE_COLORS.bunker },
      { label: `B${i + 1}`, t: tAtYards(b.end), color: MODE_COLORS.bunker },
    )
  })

  // Build per-route pathPts for rendering all routes (active + ghost). Sub-routes anchor at the fork point.
  const routesToDraw: { slot: RouteSlot; pts: Pt[]; color: string; isActive: boolean }[] = []
  if (current.tee && current.green && imgSize.w > 0) {
    if (branchOn) {
      const r = current.branch!
      const aPos = { teeFrac: current.tee, greenFrac: current.green, waypointFracs: r.routeA.waypoints }
      const bPos = { teeFrac: current.tee, greenFrac: current.green, waypointFracs: r.routeB.waypoints }
      const aPts = buildPathPts(aPos, imgSize.w, imgSize.h)
      const bPts = buildPathPts(bPos, imgSize.w, imgSize.h)
      routesToDraw.push({ slot:'A', pts: aPts, color: ROUTE_COLORS.A, isActive: slot === 'A' })
      routesToDraw.push({ slot:'B', pts: bPts, color: ROUTE_COLORS.B, isActive: slot === 'B' })
      if (r.midFork) {
        const tMid = ((r.midFork.yardStart + r.midFork.yardEnd) / 2) / distance
        const forkPx = pathPxAt(tMid, aPts)
        const forkFrac: FracPt = [forkPx.x / imgSize.w, forkPx.y / imgSize.h]
        const lPos = { teeFrac: forkFrac, greenFrac: current.green, waypointFracs: r.midFork.subL.waypoints }
        const rPos = { teeFrac: forkFrac, greenFrac: current.green, waypointFracs: r.midFork.subR.waypoints }
        routesToDraw.push({ slot:'subL', pts: buildPathPts(lPos, imgSize.w, imgSize.h), color: ROUTE_COLORS.subL, isActive: slot === 'subL' })
        routesToDraw.push({ slot:'subR', pts: buildPathPts(rPos, imgSize.w, imgSize.h), color: ROUTE_COLORS.subR, isActive: slot === 'subR' })
      }
    } else if (pathPts) {
      routesToDraw.push({ slot:'main', pts: pathPts, color: ROUTE_COLORS.main, isActive: true })
    }
  }

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
          {branchOn && <button onClick={copyBranches} style={{ ...btnS, background: '#ea580c', fontSize: 11 }}>Copy branches</button>}
        </div>
      </div>

      {/* Branch-mode toolbar */}
      <div style={{ background: '#0f1a2e', borderBottom: '1px solid #1e2d4a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={branchOn ? disableBranch : enableBranch}
          style={{ ...btnS, width: 'auto', background: branchOn ? '#ea580c' : '#1e2d4a', fontSize: 11 }}>
          {branchOn ? '🌿 Branch ON' : '🌿 Enable branch'}
        </button>

        {branchOn && (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {validSlots.map(rs => (
                <button key={rs} onClick={() => { setActiveRoute(rs); setPendingStart(null) }}
                  style={{ ...btnS, width: 'auto', background: slot === rs ? ROUTE_COLORS[rs] : '#1e2d4a',
                    color: slot === rs ? '#0a0f1e' : 'white',
                    border: `2px solid ${ROUTE_COLORS[rs]}`, fontSize: 11, fontWeight: 800 }}>
                  {ROUTE_LABELS[rs]}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 22, background: '#1e2d4a' }} />

            {!current.branch?.midFork ? (
              <button onClick={enableMidFork} style={{ ...btnS, width: 'auto', background: '#1e2d4a', fontSize: 11 }}>+ Enable mid-fork</button>
            ) : (
              <>
                <div style={{ fontSize: 11, color: '#facc15', fontWeight: 700 }}>Mid-fork yards:</div>
                <input type="number" value={current.branch.midFork.yardStart} min={0} max={distance}
                  onChange={e => setMidYards('yardStart', Math.max(0, Math.min(distance, Number(e.target.value) || 0)))}
                  style={{ width: 70, background: '#0a0f1e', color: 'white', border: '1px solid #1e2d4a', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit' }} />
                <span style={{ fontSize: 11, color: '#8899bb' }}>–</span>
                <input type="number" value={current.branch.midFork.yardEnd} min={0} max={distance}
                  onChange={e => setMidYards('yardEnd', Math.max(0, Math.min(distance, Number(e.target.value) || 0)))}
                  style={{ width: 70, background: '#0a0f1e', color: 'white', border: '1px solid #1e2d4a', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit' }} />
                <button onClick={disableMidFork} style={{ ...btnS, width: 'auto', background: '#dc2626', fontSize: 11 }}>Remove fork</button>
              </>
            )}

            <div style={{ marginLeft: 'auto', fontSize: 11, color: ROUTE_COLORS[slot], fontWeight: 700 }}>
              Editing: {ROUTE_LABELS[slot]} ({activeRouteData.waypoints.length} wpts · {activeRouteData.hazards.length} water · {activeRouteData.bunkers.length} bunkers)
            </div>
          </>
        )}
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

            {/* SVG overlay: paths for all routes + hazard markers for active route */}
            {imgSize.w > 0 && (
              <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: imgSize.w, height: imgSize.h }}>
                {routesToDraw.map(rt => (
                  <polyline key={rt.slot}
                    points={samplePath(rt.pts)}
                    stroke={rt.color}
                    strokeWidth={rt.isActive ? 3 : 2}
                    fill="none"
                    strokeDasharray={rt.isActive ? '6 3' : '3 5'}
                    strokeLinecap="round"
                    opacity={rt.isActive ? 0.95 : 0.45}
                  />
                ))}
                {/* Active-route hazard range lines */}
                {pathPts && activeRouteData.hazards.map((z, i) => {
                  const p0 = pathPxAt(z.start / distance, pathPts)
                  const p1 = pathPxAt(z.end / distance, pathPts)
                  return <line key={`h${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={MODE_COLORS.hazard} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
                })}
                {pathPts && activeRouteData.bunkers.map((b, i) => {
                  const p0 = pathPxAt(b.start / distance, pathPts)
                  const p1 = pathPxAt(b.end / distance, pathPts)
                  return <line key={`b${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={MODE_COLORS.bunker} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
                })}
                {/* Mid-fork trigger band on Route A's path */}
                {branchOn && current.branch?.midFork && (() => {
                  const aPts = routesToDraw.find(r => r.slot === 'A')?.pts
                  if (!aPts) return null
                  const mf = current.branch.midFork
                  const p0 = pathPxAt(mf.yardStart / distance, aPts)
                  const p1 = pathPxAt(mf.yardEnd / distance, aPts)
                  return <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#facc15" strokeWidth={6} strokeLinecap="round" opacity={0.85} />
                })()}
              </svg>
            )}

            {/* Dot markers: tee, green, waypoints (active route) */}
            {current.tee && <Dot frac={current.tee} color={MODE_COLORS.tee} label="T" />}
            {current.green && <Dot frac={current.green} color={MODE_COLORS.green} label="G" />}
            {activeRouteData.waypoints.map((w, i) => <Dot key={i} frac={w} color={ROUTE_COLORS[slot]} label={String(i + 1)} />)}

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
            <div style={{ color: ROUTE_COLORS[slot] }}>wpts ({ROUTE_LABELS[slot]}): {activeRouteData.waypoints.length ? activeRouteData.waypoints.map(w => `[${w.join(',')}]`).join(' ') : '—'}</div>
            {activeRouteData.hazards.length
              ? activeRouteData.hazards.map((z, i) => <div key={i} style={{ color: '#3b82f6', marginTop: i === 0 ? 4 : 0 }}>water {i + 1}: {z.start}–{z.end} yds</div>)
              : <div style={{ color: '#3b82f6', marginTop: 4 }}>water: —</div>
            }
            {activeRouteData.bunkers.map((b, i) => (
              <div key={i} style={{ color: '#f59e0b' }}>bunker {i + 1}: {b.start}–{b.end} yds</div>
            ))}
            {branchOn && current.branch?.midFork && (
              <div style={{ color: '#facc15', marginTop: 6 }}>mid-fork trigger: {current.branch.midFork.yardStart}–{current.branch.midFork.yardEnd} yds</div>
            )}
          </div>

          <div style={{ fontWeight: 800, color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{branchOn ? 'Branches output' : 'Hazards output'}</div>
          <pre style={{ fontFamily: 'monospace', background: '#0a0f1e', borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#a5f3fc', margin: 0, fontSize: 10 }}>
            {branchOn ? outputBranchesJS() : outputHazardsJS()}
          </pre>
          {branchOn
            ? <button onClick={copyBranches} style={{ ...btnS, background: '#ea580c', padding: '8px 0' }}>📋 Copy branches JS</button>
            : <button onClick={copyHazards} style={{ ...btnS, background: '#059669', padding: '8px 0' }}>📋 Copy hazards JS</button>}
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

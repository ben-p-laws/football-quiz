/**
 * Generate a large set of circle puzzles with exact H3 populations.
 *
 * Usage:
 *   npx tsx scripts/generate-puzzles.ts ~/Downloads/kontur_population_20231101.gpkg [count]
 *
 * Default count: 2000. Outputs to lib/geo/circle-puzzles-data.json.
 * Skips circles with < 50,000 people (ocean / polar / desert).
 * Runs in background — typically 1–3 hours depending on machine.
 */
import Database from 'better-sqlite3'
import * as h3 from 'h3-js'
import * as fs from 'fs'
import * as path from 'path'

const BATCH       = 5_000
const H3_RES      = 8
const MIN_POP     = 50_000
const TARGET      = parseInt(process.argv[3] ?? '2000')
const GPKG_PATH   = process.argv[2]
const OUT_PATH    = path.join(process.cwd(), 'lib/geo/circle-puzzles-data.json')

if (!GPKG_PATH) {
  console.error('Usage: npx tsx scripts/generate-puzzles.ts <path-to.gpkg> [count]')
  process.exit(1)
}

// ── seeded PRNG (mulberry32) ──────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate N candidate circles, spread across lat -60..75, all longitudes. */
function generateCandidates(n: number) {
  const rng = mulberry32(0xDEADBEEF)
  const radii = [20, 30, 50, 75, 100, 150, 200, 300, 400, 600, 900, 1200, 1500, 2000]
  const candidates: { lat: number; lng: number; radiusKm: number }[] = []
  for (let i = 0; i < n; i++) {
    const lat = +(( rng() * 135 - 60)).toFixed(4)         // -60 to 75
    const lng = +((rng() * 360 - 180)).toFixed(4)         // -180 to 180
    const radiusKm = radii[Math.floor(rng() * radii.length)]
    candidates.push({ lat, lng, radiusKm })
  }
  return candidates
}

// ── H3 helpers ────────────────────────────────────────────────────────────────
function circlePoly(lat: number, lng: number, radiusKm: number): [number, number][] {
  const rLat = radiusKm / 111.32
  const rLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  const pts: [number, number][] = []
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * 2 * Math.PI
    pts.push([lat + rLat * Math.cos(a), lng + rLng * Math.sin(a)])
  }
  pts.push(pts[0])
  return pts
}

function computePop(
  db: Database.Database,
  table: string, h3Col: string, popCol: string,
  lat: number, lng: number, radiusKm: number
): number {
  const cells = h3.polygonToCells(circlePoly(lat, lng, radiusKm), H3_RES)
  let total = 0
  for (let i = 0; i < cells.length; i += BATCH) {
    const batch   = cells.slice(i, i + BATCH)
    const holders = batch.map(() => '?').join(',')
    const rows = db
      .prepare(`SELECT ${popCol} FROM ${table} WHERE ${h3Col} IN (${holders})`)
      .all(...batch) as Record<string, number>[]
    total += rows.reduce((s, r) => s + (r[popCol] ?? 0), 0)
  }
  return Math.round(total)
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const db = new Database(GPKG_PATH)

  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]
  const popTable = tables.find(t => t.name.toLowerCase().includes('population') || t.name.toLowerCase().includes('pop'))
  if (!popTable) { console.error('No population table found'); process.exit(1) }

  const cols = db.prepare(`PRAGMA table_info(${popTable.name})`).all() as { name: string }[]
  const h3Col  = cols.find((c: any) => c.name.toLowerCase() === 'h3')?.name ?? 'h3'
  const popCol = cols.find((c: any) => c.name.toLowerCase().includes('pop'))?.name ?? 'population'

  console.error(`Table: ${popTable.name}, h3: ${h3Col}, pop: ${popCol}`)
  console.error('Ensuring h3 index…')
  db.exec(`CREATE INDEX IF NOT EXISTS idx_kontur_h3 ON ${popTable.name}(${h3Col})`)
  console.error('Index ready. Generating candidates…\n')

  // Generate 3× candidates so we still hit TARGET after filtering low-pop circles
  const candidates = generateCandidates(TARGET * 3)
  const puzzles: { id: number; lat: number; lng: number; radiusKm: number; population: number }[] = []

  for (let i = 0; i < candidates.length && puzzles.length < TARGET; i++) {
    const { lat, lng, radiusKm } = candidates[i]
    process.stderr.write(`[${puzzles.length + 1}/${TARGET}] candidate ${i + 1} (r=${radiusKm}km, ${lat},${lng})… `)
    const pop = computePop(db, popTable.name, h3Col, popCol, lat, lng, radiusKm)
    if (pop < MIN_POP) {
      process.stderr.write(`skip (${pop.toLocaleString()} < ${MIN_POP.toLocaleString()})\n`)
      continue
    }
    process.stderr.write(`${pop.toLocaleString()}\n`)
    puzzles.push({ id: puzzles.length, lat, lng, radiusKm, population: pop })
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(puzzles, null, 2))
  console.error(`\nDone — ${puzzles.length} puzzles written to ${OUT_PATH}`)
}

main().catch(err => { console.error(err); process.exit(1) })

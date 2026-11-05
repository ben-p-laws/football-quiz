/**
 * Compute exact H3-based populations for every circle puzzle.
 *
 * Usage:
 *   npx tsx scripts/compute-circle-populations.ts /path/to/kontur_population.gpkg
 *
 * Outputs updated PUZZLES array to stdout — paste it into lib/geo/circle-puzzles.ts.
 */
import Database from 'better-sqlite3'
import * as h3 from 'h3-js'
import { PUZZLES } from '../lib/geo/circle-puzzles'

const H3_RES = 8  // Kontur uses resolution 8 (~461m edge, ~0.74 km² per cell)
const BATCH  = 5_000  // SQLite IN-clause batch size

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build a GeoJSON-like polygon approximating a geographic circle. */
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

/**
 * Convert an H3 cell string ("88abc...") to the signed 64-bit integer
 * that Kontur stores in SQLite.
 */
function h3ToSigned(cell: string): bigint {
  let n = BigInt('0x' + cell)
  if (n > BigInt('0x7FFFFFFFFFFFFFFF')) n -= (1n << 64n)
  return n
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const gpkgPath = process.argv[2]
  if (!gpkgPath) {
    console.error('Usage: npx tsx scripts/compute-circle-populations.ts <path-to.gpkg>')
    process.exit(1)
  }

  const db = new Database(gpkgPath, { readonly: true })
  db.defaultSafeIntegers(true)   // return BigInt for INTEGER columns

  // Auto-detect table and column names
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]
  console.error('Tables found:', tables.map(t => t.name).join(', '))

  const popTable = tables.find(t =>
    t.name.toLowerCase().includes('population') || t.name.toLowerCase().includes('pop')
  )
  if (!popTable) {
    console.error('Could not find population table. Tables:', tables.map(t => t.name))
    process.exit(1)
  }

  const cols = db.prepare(`PRAGMA table_info(${popTable.name})`).all() as { name: string }[]
  console.error(`Columns in ${popTable.name}:`, cols.map((c: any) => c.name).join(', '))

  const h3Col  = cols.find((c: any) => c.name.toLowerCase() === 'h3')?.name       ?? 'h3'
  const popCol = cols.find((c: any) => c.name.toLowerCase().includes('pop'))?.name ?? 'population'

  console.error(`Using table="${popTable.name}" h3="${h3Col}" population="${popCol}"\n`)

  const results: { id: number; label: string; oldPop: number; newPop: number }[] = []

  for (const puzzle of PUZZLES) {
    process.stderr.write(`Computing ${puzzle.label} (r=${puzzle.radiusKm}km)… `)

    const cells  = h3.polygonToCells(circlePoly(puzzle.lat, puzzle.lng, puzzle.radiusKm), H3_RES)
    let   total  = 0

    for (let i = 0; i < cells.length; i += BATCH) {
      const batch    = cells.slice(i, i + BATCH).map(h3ToSigned)
      const holders  = batch.map(() => '?').join(',')
      const rows     = db
        .prepare(`SELECT ${popCol} FROM ${popTable.name} WHERE ${h3Col} IN (${holders})`)
        .all(...batch) as Record<string, bigint>[]

      total += rows.reduce((s, r) => s + Number(r[popCol] ?? 0n), 0)
    }

    const rounded = Math.round(total)
    process.stderr.write(`${rounded.toLocaleString()} (was ${puzzle.population.toLocaleString()}, cells=${cells.length})\n`)
    results.push({ id: puzzle.id, label: puzzle.label, oldPop: puzzle.population, newPop: rounded })
  }

  // Output updated puzzle population lines (easy to paste into circle-puzzles.ts)
  console.log('\n// ── Updated populations ──')
  for (const r of results) {
    console.log(`  // ${r.label}: ${r.newPop.toLocaleString()} (was ${r.oldPop.toLocaleString()})`)
    console.log(`  population: ${r.newPop},`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })

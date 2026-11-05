/**
 * Run once to bake North America SVG paths for the Population Circle OG image:
 *   npx tsx scripts/generate-og-map.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import { feature } from 'topojson-client'
import { geoPath, geoEquirectangular } from 'd3-geo'
import type { Topology } from 'topojson-specification'

// Match the OG image panel exactly
const W = 700, H = 630
const LON0 = -130, LON1 = -60, LAT1 = 22, LAT0 = 56

const projection = geoEquirectangular()
  .translate([W / 2, H / 2])
  .scale(1)
  .fitExtent([[0, 0], [W, H]], {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[LON0, LAT1],[LON1, LAT1],[LON1, LAT0],[LON0, LAT0],[LON0, LAT1]]] },
    properties: {},
  })

const pathGen = geoPath(projection)

async function main() {
  const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  const topo = await res.json() as Topology

  const countries = feature(topo, (topo as any).objects.countries)
  const WANT = new Set([840, 124, 484, 192, 332, 388])
  const result: Record<string, string> = {}

  for (const f of (countries as any).features) {
    const id = Number(f.id)
    if (!WANT.has(id)) continue
    const d = pathGen(f)
    if (d) result[String(id)] = d
  }

  const out = path.join(process.cwd(), 'lib/geo/og-map-paths.json')
  fs.writeFileSync(out, JSON.stringify(result, null, 2))
  console.log('Written', out, '— ids:', Object.keys(result).join(', '))
}

main()

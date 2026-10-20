/**
 * Converts a SimpleMaps World Cities Basic CSV into lib/geo/cities.json
 *
 * 1. Download the free dataset from: https://simplemaps.com/data/world-cities
 *    (click "Download Basic" — free, just needs an email)
 * 2. Unzip and place worldcities.csv in the project root (or pass a path as arg)
 * 3. Run:  npx tsx scripts/process-cities.ts [path/to/worldcities.csv]
 *
 * Filters to cities with population >= 50,000 (~10k cities).
 * Output: lib/geo/cities.json
 */

import fs from 'fs'
import path from 'path'

type CityOut = {
  name: string
  country: string
  iso2: string
  pop: number
  capital?: boolean
}

const csvPath = process.argv[2] ?? path.join(process.cwd(), 'worldcities.csv')
const outPath = path.join(process.cwd(), 'lib/geo/cities.json')
const MIN_POP = 50_000

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found at: ${csvPath}`)
  console.error('Download from: https://simplemaps.com/data/world-cities')
  process.exit(1)
}

const raw = fs.readFileSync(csvPath, 'utf8')
const lines = raw.split('\n')
const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim())

function col(row: string[], name: string): string {
  const i = header.indexOf(name)
  return i >= 0 ? (row[i] ?? '').replace(/"/g, '').trim() : ''
}

const cities: CityOut[] = []
const seen = new Set<string>()

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue

  // SimpleMaps CSV uses quoted fields; split carefully
  const row: string[] = []
  let cur = ''
  let inQuote = false
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue }
    if (ch === ',' && !inQuote) { row.push(cur); cur = ''; continue }
    cur += ch
  }
  row.push(cur)

  const name    = col(row, 'city')
  const country = col(row, 'country')
  const iso2    = col(row, 'iso2').toUpperCase()
  const popRaw  = col(row, 'population')
  const capital = col(row, 'capital')

  if (!name || !iso2 || !popRaw) continue
  const pop = parseInt(popRaw.replace(/[^0-9]/g, ''), 10)
  if (isNaN(pop) || pop < MIN_POP) continue

  // Deduplicate by "name|iso2" (keeps first/largest occurrence since CSV is sorted by pop desc)
  const key = `${name.toLowerCase()}|${iso2}`
  if (seen.has(key)) continue
  seen.add(key)

  const city: CityOut = { name, country, iso2, pop }
  if (capital === 'primary') city.capital = true
  cities.push(city)
}

// Sort by population descending
cities.sort((a, b) => b.pop - a.pop)

fs.writeFileSync(outPath, JSON.stringify(cities, null, 2))
console.log(`✓ Written ${cities.length} cities to ${outPath}`)
console.log(`  Population range: ${cities.at(-1)?.pop?.toLocaleString()} – ${cities[0]?.pop?.toLocaleString()}`)

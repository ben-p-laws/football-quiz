/**
 * Syncs Perfect 10 player ratings from a published Google Sheet.
 *
 * Sheet format — header row + one player per row:
 *   Name | Left Foot | Right Foot | Finishing | Heading | Pace | Strength | Dribbling | Passing | Tackling | Engine
 *
 * Setup:
 *   1. Import scripts/perfect10-players.csv into Google Sheets
 *   2. File → Share → Publish to web → select tab → CSV → Publish → copy URL
 *   3. Edit ratings freely, then run this script to pull changes
 *
 * Usage:
 *   node scripts/sync-perfect10-players.mjs "https://docs.google.com/spreadsheets/d/.../pub?...&output=csv"
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.argv[2] || process.env.PERFECT10_SHEET_URL
if (!url) {
  console.error('Usage: node scripts/sync-perfect10-players.mjs "<csv-url>"')
  process.exit(1)
}

console.log('Fetching sheet…')
const res = await fetch(url)
if (!res.ok) {
  console.error(`Failed to fetch: ${res.status} ${res.statusText}`)
  process.exit(1)
}

const csv = await res.text()
const lines = csv.trim().split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))

// Skip header row (first cell is non-numeric)
const rows = lines.filter(cols => cols.length >= 11 && !isNaN(Number(cols[1])))

if (rows.length === 0) {
  console.error('No data rows found. Check the sheet format.')
  process.exit(1)
}

function nameToId(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const playerLines = rows.map(cols => {
  const [name, lf, rf, fin, head, pace, str, drib, pas, tack, eng] = cols
  const nums = [lf, rf, fin, head, pace, str, drib, pas, tack, eng].map(Number)
  if (nums.some(isNaN)) {
    console.warn(`Skipping row with invalid numbers: ${cols.join(', ')}`)
    return null
  }
  const id = nameToId(name)
  const nameEscaped = name.includes("'") ? `"${name}"` : `'${name}'`
  return `  ['${id}', ${nameEscaped}, ${nums.join(',')}],`
}).filter(Boolean)

const output = `export type P10Player = {
  id: string
  name: string
  lf: number   // left foot
  rf: number   // right foot
  fin: number  // finishing
  head: number // heading
  pace: number // pace
  tb: number   // strength
  drib: number // dribbling
  lp: number   // passing
  tack: number // tackling
  eng: number  // engine / work-rate
}

export const CATEGORY_KEYS = ['lf','rf','fin','head','pace','tb','drib','lp','tack','eng'] as const
export type CategoryKey = typeof CATEGORY_KEYS[number]

export const CATEGORIES: { key: CategoryKey; label: string; short: string }[] = [
  { key:'lf',   label:'Left Foot',  short:'L.Foot'  },
  { key:'rf',   label:'Right Foot', short:'R.Foot'  },
  { key:'fin',  label:'Finishing',  short:'Finish'  },
  { key:'head', label:'Heading',    short:'Header'  },
  { key:'pace', label:'Pace',       short:'Pace'    },
  { key:'tb',   label:'Strength',   short:'Strength'},
  { key:'drib', label:'Dribbling',  short:'Dribble' },
  { key:'lp',   label:'Passing',    short:'Passing' },
  { key:'tack', label:'Tackling',   short:'Tackle'  },
  { key:'eng',  label:'Engine',     short:'Engine'  },
]

// lf, rf, fin, head, pace, str(tb), drib, pas(lp), tack, eng
const RAW: [string, string, ...number[]][] = [
${playerLines.join('\n')}
]

const seen = new Set<string>()
export const PLAYERS: P10Player[] = RAW
  .filter(([id]) => { if (seen.has(id as string)) return false; seen.add(id as string); return true })
  .map(([id, name, lf, rf, fin, head, pace, tb, drib, lp, tack, eng]) => ({
    id: id as string,
    name: name as string,
    lf: lf as number, rf: rf as number, fin: fin as number, head: head as number,
    pace: pace as number, tb: tb as number, drib: drib as number, lp: lp as number,
    tack: tack as number, eng: eng as number,
  }))
`

const outPath = resolve(__dirname, '../lib/perfect10-players.ts')
writeFileSync(outPath, output, 'utf8')
console.log(`✓ Written ${rows.length} players to lib/perfect10-players.ts`)

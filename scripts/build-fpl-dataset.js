#!/usr/bin/env node
/**
 * Build the FPL Draft 11 player dataset.
 *
 * Pulls `players_raw.csv` from the vaastav/Fantasy-Premier-League repo for each
 * season from 2016-17 onwards (earlier seasons have a different layout) and
 * emits a normalised list to public/data/fpl-players.json.
 *
 * Output shape:
 *   { players: [{ id, name, team, season, position, fpl_points }, ...] }
 *
 * Usage:
 *   node scripts/build-fpl-dataset.js
 *   node scripts/build-fpl-dataset.js --seasons 2022-23,2023-24
 */

const fs = require('fs')
const path = require('path')

const RAW_BASE = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data'

// 2016-17 was the first season with the modern players_raw.csv layout.
const DEFAULT_SEASONS = [
  '2016-17',
  '2017-18',
  '2018-19',
  '2019-20',
  '2020-21',
  '2021-22',
  '2022-23',
  '2023-24',
  '2024-25',
  '2025-26',
]

const POSITION_MAP = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }

// ── CSV parsing ─────────────────────────────────────────────────────────────

function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field); field = ''
      } else if (ch === '\n') {
        row.push(field); rows.push(row); row = []; field = ''
      } else if (ch === '\r') {
        // ignore
      } else {
        field += ch
      }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  if (rows.length === 0) return []
  const header = rows.shift()
  return rows.filter(r => r.length === header.length).map(r => {
    const obj = {}
    header.forEach((h, i) => { obj[h] = r[i] })
    return obj
  })
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

// ── Team resolution ─────────────────────────────────────────────────────────

async function fetchTeamsForSeason(season) {
  const candidates = [
    `${RAW_BASE}/${season}/teams.csv`,
    `${RAW_BASE}/${season}/cleaned_teams.csv`,
  ]
  for (const url of candidates) {
    try {
      const text = await fetchText(url)
      const rows = parseCsv(text)
      const byId = new Map()
      for (const row of rows) {
        const id = row.id ?? row.team_id
        const name = row.name ?? row.team_name
        if (id && name) byId.set(String(id), name)
      }
      if (byId.size > 0) return byId
    } catch { /* try next */ }
  }
  return null
}

// ── Build ──────────────────────────────────────────────────────────────────

async function buildSeason(season) {
  const url = `${RAW_BASE}/${season}/players_raw.csv`
  let text
  try {
    text = await fetchText(url)
  } catch (err) {
    console.warn(`[${season}] skipped: ${err.message}`)
    return []
  }

  const rows = parseCsv(text)
  if (rows.length === 0) {
    console.warn(`[${season}] empty CSV, skipping`)
    return []
  }

  const teams = await fetchTeamsForSeason(season)
  const out = []
  for (const row of rows) {
    const first = (row.first_name ?? '').trim()
    const second = (row.second_name ?? row.web_name ?? '').trim()
    const web = (row.web_name ?? '').trim()
    const name = [first, second].filter(Boolean).join(' ') || web
    if (!name) continue

    const elementType = row.element_type ?? row.position
    const position = POSITION_MAP[Number(elementType)]
    if (!position) continue

    const fplPoints = Number(row.total_points)
    if (!Number.isFinite(fplPoints)) continue

    const teamRaw = row.team_name ?? row.team
    let team
    if (teamRaw && isNaN(Number(teamRaw))) {
      team = teamRaw
    } else if (teams && teamRaw != null) {
      team = teams.get(String(teamRaw))
    }
    if (!team) continue

    const elementId = row.id ?? row.element ?? row.code ?? `${season}-${name}`
    out.push({
      id: `${season}-${elementId}`,
      name,
      team,
      season,
      position,
      fpl_points: fplPoints,
    })
  }
  console.log(`[${season}] ${out.length} players`)
  return out
}

async function main() {
  const args = process.argv.slice(2)
  const seasonsArg = args.find(a => a.startsWith('--seasons'))
  const seasons = seasonsArg
    ? (seasonsArg.includes('=')
        ? seasonsArg.split('=')[1]
        : args[args.indexOf(seasonsArg) + 1]
      ).split(',').map(s => s.trim()).filter(Boolean)
    : DEFAULT_SEASONS

  const all = []
  for (const season of seasons) {
    const rows = await buildSeason(season)
    all.push(...rows)
  }

  const outDir = path.join(__dirname, '..', 'public', 'data')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'fpl-players.json')
  fs.writeFileSync(outPath, JSON.stringify({ players: all }))
  console.log(`Wrote ${all.length} players to ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

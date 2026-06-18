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

// Normalise team names to a single canonical form across all seasons
const TEAM_ALIASES = {
  'Manchester City':        'Man City',
  'Manchester United':      'Man Utd',
  'Leicester City':         'Leicester',
  'Newcastle United':       'Newcastle',
  'Tottenham Hotspur':      'Spurs',
  'West Bromwich Albion':   'West Brom',
  'West Ham United':        'West Ham',
  'Wolverhampton Wanderers':'Wolves',
}

function normaliseTeam(name) {
  return TEAM_ALIASES[name] ?? name
}

// teams.csv is missing for these seasons in the vaastav repo.
// FPL assigns team IDs alphabetically each season (1=Arsenal etc.) and resets on promotion/relegation.
const HARDCODED_TEAMS = {
  '2016-17': {
    '1': 'Arsenal', '2': 'Bournemouth', '3': 'Burnley', '4': 'Chelsea',
    '5': 'Crystal Palace', '6': 'Everton', '7': 'Hull City', '8': 'Leicester City',
    '9': 'Liverpool', '10': 'Manchester City', '11': 'Manchester United',
    '12': 'Middlesbrough', '13': 'Southampton', '14': 'Stoke City',
    '15': 'Sunderland', '16': 'Swansea City', '17': 'Tottenham Hotspur',
    '18': 'Watford', '19': 'West Bromwich Albion', '20': 'West Ham United',
  },
  '2017-18': {
    '1': 'Arsenal', '2': 'Bournemouth', '3': 'Brighton', '4': 'Burnley',
    '5': 'Chelsea', '6': 'Crystal Palace', '7': 'Everton', '8': 'Huddersfield Town',
    '9': 'Leicester City', '10': 'Liverpool', '11': 'Manchester City',
    '12': 'Manchester United', '13': 'Newcastle United', '14': 'Southampton',
    '15': 'Stoke City', '16': 'Swansea City', '17': 'Tottenham Hotspur',
    '18': 'Watford', '19': 'West Bromwich Albion', '20': 'West Ham United',
  },
  '2018-19': {
    '1': 'Arsenal', '2': 'Bournemouth', '3': 'Brighton', '4': 'Burnley',
    '5': 'Cardiff City', '6': 'Chelsea', '7': 'Crystal Palace', '8': 'Everton',
    '9': 'Fulham', '10': 'Huddersfield Town', '11': 'Leicester City',
    '12': 'Liverpool', '13': 'Manchester City', '14': 'Manchester United',
    '15': 'Newcastle United', '16': 'Southampton', '17': 'Tottenham Hotspur',
    '18': 'Watford', '19': 'West Ham United', '20': 'Wolverhampton Wanderers',
  },
}

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
  // Fallback: hardcoded maps for seasons where teams.csv is absent in the repo
  if (HARDCODED_TEAMS[season]) {
    return new Map(Object.entries(HARDCODED_TEAMS[season]))
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
      team = normaliseTeam(teamRaw)
    } else if (teams && teamRaw != null) {
      team = normaliseTeam(teams.get(String(teamRaw)) ?? '')
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

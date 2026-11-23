#!/usr/bin/env node
/**
 * Refresh site data from the official FPL API + premierleague.com stats (fast, parallel, ~10s).
 *
 *   1. player_seasons  — rebuilds the CURRENT season's rows in the FBref-style schema.
 *                        Names / nationality are matched to existing players so careers join up.
 *   2. pl_season_tables — adds the final table for the last COMPLETED season if missing
 *                        (computed from vaastav/Fantasy-Premier-League fixture results).
 *
 * Usage:
 *   node scripts/update-data.mjs           # dry run: prints report, writes preview JSON, touches nothing
 *   node scripts/update-data.mjs --write   # replaces current-season rows + inserts missing table
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 *
 * Penalties, fouls, offsides, interceptions etc. come from premierleague.com (joined by Opta id).
 * Those are season totals, so they're left null for players who played for 2+ PL clubs this season.
 * Not available anywhere here: unused_subs.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

dotenv.config({ path: '.env', quiet: true })
const WRITE = process.argv.includes('--write')
const FPL = 'https://fantasy.premierleague.com/api'
const PL_STATS = 'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/competitions/8' // premierleague.com
const VAASTAV ='https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data'

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// FPL team name -> name used in player_seasons (FBref style)
const PS_TEAM = {
  Leeds: 'Leeds United', 'Man City': 'Manchester City', 'Man Utd': 'Manchester Utd',
  Newcastle: 'Newcastle United', "Nott'm Forest": 'Nottingham Forest', Spurs: 'Tottenham Hotspur',
  'West Ham': 'West Ham United', Wolves: 'Wolves', Luton: 'Luton Town', Sheffield: 'Sheffield United',
  'Sheffield Utd': 'Sheffield United', Ipswich: 'Ipswich Town', Leicester: 'Leicester City',
}
// FPL team name -> name used in pl_season_tables (full names)
const TABLE_TEAM = {
  Brighton: 'Brighton & Hove Albion', Leeds: 'Leeds United', 'Man City': 'Manchester City',
  'Man Utd': 'Manchester United', Newcastle: 'Newcastle United', "Nott'm Forest": 'Nottingham Forest',
  Spurs: 'Tottenham Hotspur', 'West Ham': 'West Ham United', Wolves: 'Wolverhampton Wanderers',
  Luton: 'Luton Town', Sheffield: 'Sheffield United', 'Sheffield Utd': 'Sheffield United',
  Ipswich: 'Ipswich Town', Leicester: 'Leicester City',
}
const POS = { 1: 'GK', 2: 'DF', 3: 'MF', 4: 'FW' }

const getJson = async (url, tries = 4) => {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      return await r.json()
    } catch (e) {
      if (i >= tries) throw e
      await new Promise(res => setTimeout(res, 500 * 2 ** i))
    }
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]) }
  }))
  return out
}

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/ø/g, 'o').replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/ß/g, 'ss').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim()

function parseCsv(text) {
  const [head, ...lines] = text.trim().split('\n')
  const cols = head.split(',')
  return lines.map(l => Object.fromEntries(l.split(',').slice(0, cols.length).map((v, i) => [cols[i], v])))
}

async function loadExistingPlayers() {
  const { count } = await db.from('player_seasons').select('*', { count: 'exact', head: true })
  const pages = Array.from({ length: Math.ceil(count / 1000) }, (_, i) => i)
  const chunks = await pool(pages, 8, async p => {
    const { data, error } = await db.from('player_seasons')
      .select('name_display, nationality, year_id, teams_played_for').order('id').range(p * 1000, p * 1000 + 999)
    if (error) throw error
    return data
  })
  // normalised name -> latest known { name, nationality }
  const byName = new Map()
  for (const r of chunks.flat().sort((a, b) => a.year_id.localeCompare(b.year_id))) {
    byName.set(norm(r.name_display), { name: r.name_display, nationality: r.nationality, team: r.teams_played_for, year: r.year_id })
  }
  const nat = new Map() // 'ENG' / 'no' -> 'no NOR'
  for (const r of chunks.flat()) {
    if (!r.nationality) continue
    const [iso2, fifa] = r.nationality.split(' ')
    if (fifa) nat.set(fifa, r.nationality)
    if (iso2) nat.set(iso2, r.nationality)
  }
  return { byName, nat, total: count }
}

function matchName(el, byName, team, recent) {
  const first = el.first_name.trim(), second = el.second_name.trim()
  const f1 = first.split(' ')[0], sTok = second.split(' ')
  const cands = [el.known_name, `${first} ${second}`, `${f1} ${second}`, `${f1} ${sTok.at(-1)}`,
    `${first} ${sTok.at(-1)}`, `${f1} ${sTok[0]}`, `${first} ${sTok[0]}`, el.web_name.includes(' ') && el.web_name]
  // Several variants can hit different real players (David Raya Martín -> "David Raya" vs "David Martin"):
  // prefer one at the same club, then the most recently active.
  const exact = [...new Set(cands.filter(Boolean).map(c => byName.get(norm(c))).filter(Boolean))]
  if (exact.length) {
    return exact.find(p => p.team === team) ?? exact.sort((a, b) => b.year.localeCompare(a.year))[0]
  }
  // Fuzzy: recent DB players whose name tokens all appear in the FPL name, or whose surname is one of
  // the FPL surname tokens and first names are related (Ben/Benjamin, Tino/Valentino, Vitaliy/Vitalii).
  // Must be unique; team breaks ties.
  const fplTok = new Set(norm(`${first} ${second} ${el.web_name} ${el.known_name ?? ''}`).split(' '))
  const surTok = new Set(norm(`${second} ${el.web_name}`).split(' '))
  const nf = norm(first).split(' ')[0]
  const related = (a, b) => a.includes(b) || b.includes(a) || (a.length > 4 && b.startsWith(a.slice(0, -1)))
  const hits = recent.filter(p => {
    const t = p.tokens
    if (t.every(x => fplTok.has(x))) return t.length > 1 || p.team === team
    return t.length > 1 && surTok.has(t.at(-1)) && t.slice(0, -1).some(x => related(nf, x))
  })
  if (hits.length === 1) return hits[0]
  const sameTeam = hits.filter(p => p.team === team)
  return sameTeam.length === 1 ? sameTeam[0] : null
}

async function updateCurrentSeason() {
  const [boot, fixtures, regions, existing] = await Promise.all([
    getJson(`${FPL}/bootstrap-static/`), getJson(`${FPL}/fixtures/`), getJson(`${FPL}/regions/`), loadExistingPlayers(),
  ])
  const startYear = new Date(boot.events[0].deadline_time).getUTCFullYear()
  const season = `${startYear}-${startYear + 1}`
  const seasonStart = new Date(Date.UTC(startYear, 7, 1))
  const teamName = Object.fromEntries(boot.teams.map(t => [t.id, PS_TEAM[t.name] ?? t.name]))
  const fx = new Map(fixtures.map(f => [f.id, f]))
  const region = new Map(regions.map(r => [r.id, r]))

  const played = boot.elements.filter(e => e.minutes > 0)
  const recentYear = `${startYear - 3}`
  const recent = [...existing.byName.values()].filter(p => p.year >= recentYear)
    .map(p => ({ ...p, tokens: norm(p.name).split(' ') }))
  const t0 = Date.now()
  // FPL per-match history + premierleague.com season stats (keyed by Opta id, so the join is exact)
  const [summaries, plStats] = await Promise.all([
    pool(played, 30, e => getJson(`${FPL}/element-summary/${e.id}/`)),
    pool(played, 15, e => {
      const optaId = String(e.opta_code ?? '').replace(/^p/, '')
      return optaId ? getJson(`${PL_STATS}/seasons/${startYear}/players/${optaId}/stats`, 2).then(j => j.stats, () => null) : null
    }),
  ])
  const plMissing = plStats.filter(s => !s).length
  console.log(`Fetched ${played.length} FPL histories + ${played.length - plMissing} premierleague.com stat sheets in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  const rows = [], newPlayers = [], multiTeam = []
  played.forEach((el, i) => {
    const match = matchName(el, existing.byName, teamName[el.team], recent)
    const name = match?.name ?? (el.known_name || `${el.first_name} ${el.second_name}`).trim()
    if (!match) newPlayers.push(name)

    const r = region.get(el.region)
    const nationality = match?.nationality
      ?? (r && (existing.nat.get(r.iso_code_long) ?? existing.nat.get(r.iso_code_short.toLowerCase())
        ?? `${r.iso_code_short.toLowerCase()} ${r.iso_code_long}`)) ?? null

    const age = el.birth_date
      ? Math.floor((seasonStart - new Date(el.birth_date)) / (365.2425 * 864e5)) : null

    // Split matches by the team the player actually played for (handles mid-season moves)
    const byTeam = new Map()
    for (const h of summaries[i].history) {
      if (h.minutes <= 0) continue
      const f = fx.get(h.fixture)
      const team = f ? (h.was_home ? f.team_h : f.team_a) : el.team
      if (!byTeam.has(team)) byTeam.set(team, [])
      byTeam.get(team).push(h)
    }
    if (byTeam.size > 1) multiTeam.push(name)
    const pl = plStats[i]

    for (const [team, hs] of byTeam) {
      const sum = k => hs.reduce((a, h) => a + (Number(h[k]) || 0), 0)
      const isGk = el.element_type === 1
      let w = 0, d = 0, l = 0
      for (const h of hs) {
        const [us, them] = h.was_home ? [h.team_h_score, h.team_a_score] : [h.team_a_score, h.team_h_score]
        if (us == null || them == null) continue
        us > them ? w++ : us === them ? d++ : l++
      }
      const games = hs.length, starts = sum('starts'), minutes = sum('minutes')
      // Official goals/assists/cards from premierleague.com when the season is at one club
      // (FPL "assists" include fantasy-only assists); FPL per-match sums otherwise.
      const official = byTeam.size === 1 && pl
      const goals = official ? pl.goals ?? 0 : sum('goals_scored')
      const assists = official ? pl.goalAssists ?? 0 : sum('assists')
      rows.push({
        name_display: name, year_id: season, teams_played_for: teamName[team],
        comp_name_abbr: 'eng Premier League', age, nationality, pos: POS[el.element_type],
        games, games_starts: starts, games_subs: games - starts, minutes,
        minutes_90s: Math.round((minutes / 90) * 10) / 10,
        goals, assists, goals_assists: goals + assists,
        pens_missed: sum('penalties_missed'), cards_yellow: official ? pl.yellowCards ?? 0 : sum('yellow_cards'),
        cards_red: official ? pl.totalRedCards ?? 0 : sum('red_cards'),
        own_goals: sum('own_goals'), tackles_won: sum('tackles'),
        gk_goals_against: isGk ? sum('goals_conceded') : null,
        gk_saves: isGk ? sum('saves') : null,
        gk_clean_sheets: isGk ? sum('clean_sheets') : null,
        gk_clean_sheets_pct: isGk && games ? Math.round((sum('clean_sheets') / games) * 1000) / 10 : null,
        gk_wins: isGk ? w : 0, gk_ties: isGk ? d : 0, gk_losses: isGk ? l : 0,
        // premierleague.com stats are whole-season totals, so only apply them to single-club seasons
        ...(official ? {
          pens_made: pl.penaltyGoals ?? 0, pens_att: pl.penaltiesTaken ?? 0,
          pens_missed: (pl.penaltiesTaken ?? 0) - (pl.penaltyGoals ?? 0),
          goals_pens: goals - (pl.penaltyGoals ?? 0),
          pens_won: pl.foulWonPenalty ?? null, pens_conceded: pl.penaltiesConceded ?? null,
          fouls: pl.totalFoulsConceded ?? null, fouled: pl.totalFoulsWon ?? null,
          offsides: pl.offsides ?? null, interceptions: pl.interceptions ?? null,
          tackles_interceptions: (pl.tacklesWon ?? 0) + (pl.interceptions ?? 0),
          cards_yellow_red: pl.redCards2ndYellow ?? null,
          ...(isGk ? {
            gk_shots_on_target_against: (pl.savesMade ?? 0) + (pl.goalsConceded ?? 0),
            gk_save_pct: pl.savesMade + pl.goalsConceded
              ? Math.round((pl.savesMade / (pl.savesMade + pl.goalsConceded)) * 1000) / 10 : null,
          } : {}),
        } : {}),
      })
    }
  })

  console.log(`\n== player_seasons ${season} (FPL gameweek ${boot.events.find(e => e.is_current)?.id})`)
  console.log(`${rows.length} rows, ${played.length - newPlayers.length} matched to existing players, ${newPlayers.length} new`)
  const matchedDiff = played.map(el => [el, matchName(el, existing.byName, teamName[el.team], recent)])
    .filter(([el, m]) => m && norm(m.name) !== norm(`${el.first_name} ${el.second_name}`))
  console.log(`Matched with different spelling: ${matchedDiff.map(([el, m]) => `${el.first_name} ${el.second_name} -> ${m.name}`).join('; ')}`)
  if (newPlayers.length) console.log(`New (check spelling vs DB): ${newPlayers.join(', ')}`)
  if (multiTeam.length) console.log(`Played for 2+ PL clubs this season: ${multiTeam.join(', ')}`)
  const preview = join(tmpdir(), 'update-data-preview.json')
  writeFileSync(preview, JSON.stringify(rows, null, 1))
  console.log(`Preview: ${preview}`)

  if (WRITE) {
    const del = await db.from('player_seasons').delete().eq('year_id', season)
    if (del.error) throw del.error
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from('player_seasons').insert(rows.slice(i, i + 500))
      if (error) throw error
    }
    console.log(`Wrote ${rows.length} rows for ${season}`)
  }
  return startYear
}

async function addFinishedSeasonTable(currentStartYear) {
  const y = currentStartYear - 1
  const season = `${y}-${y + 1}`
  const { count } = await db.from('pl_season_tables').select('*', { count: 'exact', head: true }).eq('season', season)
  console.log(`\n== pl_season_tables ${season}`)
  if (count) return console.log(`Already present (${count} teams), skipping`)

  const dir = `${VAASTAV}/${y}-${String(y + 1).slice(2)}`
  const [teamsCsv, fixCsv] = await Promise.all([fetch(`${dir}/teams.csv`), fetch(`${dir}/fixtures.csv`)].map(p => p.then(r => r.text())))
  const teams = Object.fromEntries(parseCsv(teamsCsv).map(t => [t.id, t.name]))
  // stats column contains commas, so read only the leading fixed columns
  const st = new Map(Object.keys(teams).map(id => [id, { pts: 0, gd: 0, gf: 0 }]))
  let played = 0
  for (const f of parseCsv(fixCsv)) {
    if (f.finished !== 'True') continue
    const hs = +f.team_h_score, as = +f.team_a_score, h = st.get(f.team_h), a = st.get(f.team_a)
    h.gf += hs; a.gf += as; h.gd += hs - as; a.gd += as - hs
    if (hs > as) h.pts += 3; else if (hs < as) a.pts += 3; else { h.pts++; a.pts++ }
    played++
  }
  if (played < 380) return console.log(`Only ${played}/380 results available, skipping`)

  const table = [...st].sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .map(([id, s], i) => ({ season, team: TABLE_TEAM[teams[id]] ?? teams[id], position: i + 1, relegated: i >= 17, pts: s.pts }))
  console.log(table.map(t => `${t.position}. ${t.team} ${t.pts}${t.relegated ? ' (R)' : ''}`).join('\n'))

  if (WRITE) {
    const { error } = await db.from('pl_season_tables').insert(table.map(({ pts, ...t }) => t))
    if (error) throw error
    console.log(`Wrote ${table.length} teams for ${season}`)
  }
}

const t0 = Date.now()
const startYear = await updateCurrentSeason()
await addFinishedSeasonTable(startYear)
console.log(`\n${WRITE ? 'Done' : 'Dry run done (no DB changes) — re-run with --write'} in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

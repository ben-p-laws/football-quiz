'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ComposableMap, Geographies, Geography, Marker } = require('react-simple-maps')
import NavBar from './NavBar'
import {
  ROUTES, COUNTRY_NAMES, FIFA_TO_ISO, STAT_LABELS, STAT_KEYS,
  type StatKey, type ATWRoute,
} from '@/data/atw-routes'
import type { ATWPlayer } from '@/app/api/around-the-world/route'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

// Overseas territories / tiny dependencies to hide from the map
const SKIP_GEOS = new Set([
  254, // French Guiana
  474, // Martinique
  312, // Guadeloupe
  638, // Réunion
  175, // Mayotte
  666, // St Pierre & Miquelon
  258, // French Polynesia
  540, // New Caledonia
  630, // Puerto Rico
  850, // US Virgin Islands
   16, // American Samoa
  796, // Turks & Caicos
  535, // Bonaire / Sint Eustatius
  531, // Curaçao
  534, // Sint Maarten
  660, // Anguilla
  136, // Cayman Islands
  238, // Falkland Islands
  239, // South Georgia
   74, // Bouvet Island
  334, // Heard Island
])

// Approximate centroids [lon, lat] for zoom calculation
const CENTROIDS: Record<string, [number, number]> = {
  FRA: [2.3, 46.2],   ESP: [-3.7, 40.4],  POR: [-8.2, 39.4],  GER: [10.5, 51.2],
  NED: [5.3,  52.1],  BEL: [4.5,  50.5],  DEN: [10.0, 56.0],  SWE: [15.0, 62.0],
  NOR: [8.5,  60.5],  ITA: [12.6, 42.8],  SUI: [8.2,  46.8],  AUT: [14.5, 47.5],
  CZE: [15.5, 49.8],  GRE: [21.8, 39.1],  TUR: [35.2, 38.9],  SRB: [21.0, 44.0],
  CRO: [15.2, 45.1],  BUL: [25.5, 42.7],  POL: [19.1, 51.9],  SVK: [19.4, 48.7],
  HUN: [19.5, 47.2],  ROU: [24.9, 45.9],  ALB: [20.2, 41.2],  SVN: [14.8, 46.1],
  BIH: [17.7, 44.2],  MNE: [19.4, 42.8],  MKD: [21.7, 41.6],  FIN: [25.7, 61.9],
  MAR: [-7.1, 31.8],  ALG: [2.6,  28.0],  TUN: [9.6,  33.9],  EGY: [30.1, 26.8],
  SEN: [-14.5,14.5],  GUI: [-11.3,10.9],  CIV: [-5.6, 7.5],   GHA: [-1.2, 7.9],
  TGO: [0.8,  8.0],   BEN: [2.3,  9.3],   NGA: [8.1,  9.1],   CMR: [12.4, 5.7],
  GAB: [11.6, -0.8],  COD: [24.0, -2.9],  ZIM: [30.0, -20.0], ZAF: [25.0, -29.0],
  ARG: [-64.0,-34.0], BRA: [-51.9,-14.2], URU: [-55.8,-32.5], COL: [-74.3, 4.6],
  VEN: [-66.6, 8.0],  CHI: [-71.5,-35.7], ECU: [-78.1, -1.8], PER: [-75.0, -9.2],
  BOL: [-64.9,-16.3], PAR: [-58.4,-23.4],
  // British Isles
  ENG: [-1.5,  52.5], SCO: [-4.0,  56.8], WAL: [-3.5,  52.3], NIR: [-6.5,  54.7],
  IRL: [-8.0,  53.2],
  // North/Central America
  USA: [-98.0, 38.9], CAN: [-96.8, 56.1],
  MEX: [-102.5,23.9], GUA: [-90.5, 15.8], HON: [-86.6, 15.2], SLV: [-88.9, 13.8],
  NCA: [-85.2, 12.9], CRC: [-83.8,  9.8], PAN: [-80.8,  8.6],
  // More Africa
  MLI: [-2.0,  17.3], BFA: [-1.7,  12.4], MTN: [-11.0, 20.3],
  LBA: [17.2,  26.3], COG: [15.2,  -0.5], MOZ: [35.0, -18.0],
  GNB: [-15.2,  12.0], EQG: [10.5,   1.7], RWA: [29.9,  -2.0],
  SDN: [30.2,  16.0], SSD: [31.3,   7.0], ETH: [40.5,   9.1],
  KEN: [37.9,   0.0], TAN: [34.9,  -6.4], UGA: [32.3,   1.3],
  NAM: [18.0, -22.0], BOT: [24.7, -22.3], CHA: [18.5,  15.5],
  NIG: [ 8.6,  17.0], SOM: [46.2,   6.0], MWI: [34.3, -13.3],
  ERI: [39.7,  15.2], MAD: [46.9, -19.4], LES: [28.2, -29.6],
  SWZ: [31.5, -26.5], DJI: [42.6,  11.8],
  // Middle East
  SYR: [38.5,  35.0], LBN: [35.9,  33.9], ISR: [35.2,  31.5],
  JOR: [36.5,  30.6], IRQ: [44.4,  33.2], IRN: [53.7,  32.7],
  KOR: [127.8, 35.9], JPN: [138.3, 36.5],
  // Asia (new)
  IND: [78.9,  20.6], PAK: [69.3,  30.4], BAN: [90.4,  23.7],
  KSA: [45.1,  23.9], UAE: [53.8,  23.4], OMA: [57.6,  21.5],
  KUW: [47.5,  29.4], QAT: [51.2,  25.4], BHR: [50.6,  26.0],
  YEM: [48.5,  15.9], AFG: [67.7,  33.9], KAZ: [67.3,  48.0],
  UZB: [63.9,  41.4], TKM: [59.6,  40.5], KGZ: [74.6,  41.2],
  TJK: [71.3,  38.8], GEO: [43.4,  42.2], ARM: [44.9,  40.1],
  AZE: [47.4,  40.5], NEP: [84.1,  28.4], SRI: [80.7,   7.9],
  MYA: [96.5,  18.8], THA: [101.0, 15.9], VIE: [108.3, 14.1],
  CAM: [104.9, 12.6], LAO: [103.8, 18.2], MAS: [109.7,  4.2],
  INA: [113.9, -0.8], PHI: [121.8, 12.9], MNG: [103.9, 46.9],
  PRK: [127.2, 40.3], BHU: [90.4,  27.4], TLS: [125.7, -8.9],
  // Europe (new)
  BLR: [28.1,  53.7], LTU: [24.0,  55.3], LVA: [24.8,  56.9],
  EST: [25.0,  58.7], MDA: [28.4,  47.4], ISL: [-18.1, 65.0],
  RUS: [45.0,  60.0],
}

function computeProjection(countries: string[]): { center: [number, number]; scale: number } {
  const pts = countries.map(c => CENTROIDS[c]).filter(Boolean) as [number, number][]
  if (!pts.length) return { center: [0, 20], scale: 160 }
  const lons = pts.map(p => p[0]), lats = pts.map(p => p[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const spanLon = Math.max(maxLon - minLon, 8)
  const spanLat = Math.max(maxLat - minLat, 6)
  const center: [number, number] = [(minLon + maxLon) / 2, (minLat + maxLat) / 2]
  const scaleByLon = 147 * (300 / (spanLon + 25))
  const scaleByLat = 147 * (180 / (spanLat + 20))
  const scale = Math.min(scaleByLon, scaleByLat, 900)
  return { center, scale }
}

function buildIsoToFifa(): Record<string, string> {
  const m: Record<string, string> = {}
  for (const [fifa, iso] of Object.entries(FIFA_TO_ISO)) m[String(iso)] = fifa
  return m
}
const ISO_TO_FIFA = buildIsoToFifa()

function norm2(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const FIFA_TO_FLAG: Record<string, string> = {
  ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls', NIR: 'gb-nir', IRL: 'ie',
  FRA: 'fr', ESP: 'es', POR: 'pt', GER: 'de', NED: 'nl',
  BEL: 'be', DEN: 'dk', SWE: 'se', NOR: 'no', ITA: 'it',
  SUI: 'ch', AUT: 'at', CZE: 'cz', GRE: 'gr', TUR: 'tr',
  SRB: 'rs', CRO: 'hr', BUL: 'bg', POL: 'pl', SVK: 'sk',
  FIN: 'fi', HUN: 'hu', ROU: 'ro', UKR: 'ua', ALB: 'al',
  MNE: 'me', MKD: 'mk', SVN: 'si', BIH: 'ba',
  MAR: 'ma', ALG: 'dz', TUN: 'tn', EGY: 'eg',
  SEN: 'sn', GUI: 'gn', CIV: 'ci', GHA: 'gh',
  TGO: 'tg', BEN: 'bj', NGA: 'ng', CMR: 'cm',
  GAB: 'ga', COD: 'cd', ZIM: 'zw', ZAF: 'za',
  MLI: 'ml', BFA: 'bf', MTN: 'mr', SLE: 'sl', LBR: 'lr', GAM: 'gm',
  ARG: 'ar', BRA: 'br', URU: 'uy', COL: 'co',
  VEN: 've', CHI: 'cl', ECU: 'ec', PER: 'pe', BOL: 'bo', PAR: 'py',
  USA: 'us', CAN: 'ca', MEX: 'mx',
  GUA: 'gt', HON: 'hn', SLV: 'sv', NCA: 'ni', CRC: 'cr', PAN: 'pa',
  JPN: 'jp', KOR: 'kr', LBN: 'lb', ISR: 'il',
  JOR: 'jo', IRQ: 'iq', IRN: 'ir', SYR: 'sy', RUS: 'ru',
}
function flagUrl(fifa: string) {
  const c = FIFA_TO_FLAG[fifa]; return c ? `https://flagcdn.com/w80/${c}.png` : null
}
function flagImg(fifa: string, size = 20) {
  const url = flagUrl(fifa)
  return url ? <img src={url} width={size} style={{ borderRadius: 2, display: 'block', flexShrink: 0 }} alt="" /> : null
}

function statVal(p: ATWPlayer, s: StatKey): number {
  if (s === 'goals')        return p.goals
  if (s === 'goalsAssists') return p.goals + p.assists
  if (s === 'games')        return p.games
  if (s === 'yellowCards')  return p.yellowCards
  return 0
}

type Step = { code: string; player: string; val: number }
type Phase = 'setup' | 'playing' | 'won' | 'failed'
type GameMode = 'lobby' | 'daily' | 'freeplay'

type DailyConfig = {
  date:    string
  routeId: string
  stat:    StatKey
  mode:    'easy' | 'medium' | 'hard'
  target:  number
}

type LeaderboardEntry = {
  player_name: string
  score:       number
  target:      number
  pct:         number
  won:         boolean
  mode:        string
}

type MineLbEntry = {
  player_name: string
  lives_lost:  number
  won:         boolean
  continent:   string
}

// Adjacency: each country lists its valid neighbours (FIFA codes)
// Used to validate routes and reject any with non-bordering consecutive pairs
const BORDERS: Record<string, string[]> = {
  // British Isles (IRL-NIR land; NIR-SCO sea crossing allowed)
  IRL: ['NIR'],
  NIR: ['IRL','SCO'],
  SCO: ['NIR','ENG'],
  ENG: ['SCO','WAL'],
  WAL: ['ENG'],
  // Europe
  POR: ['ESP'],
  ESP: ['POR','FRA','MAR'],
  FRA: ['ESP','BEL','GER','SUI','ITA'],
  BEL: ['FRA','NED','GER'],
  NED: ['BEL','GER'],
  GER: ['FRA','BEL','NED','DEN','CZE','AUT','SUI','POL'],
  DEN: ['GER','SWE'],
  SWE: ['NOR','FIN','DEN'],
  NOR: ['SWE','FIN','RUS'],
  FIN: ['SWE','NOR','RUS'],
  ITA: ['FRA','SUI','AUT','SVN'],
  SUI: ['FRA','GER','AUT','ITA'],
  AUT: ['GER','CZE','SVK','HUN','SVN','ITA','SUI'],
  CZE: ['GER','POL','SVK','AUT'],
  GRE: ['ALB','MKD','BUL','TUR'],
  TUR: ['GRE','BUL','SYR','IRQ','IRN'],
  SRB: ['HUN','CRO','BIH','MNE','ALB','MKD','BUL','ROU'],
  CRO: ['SVN','HUN','SRB','BIH','MNE'],
  BUL: ['ROU','SRB','MKD','GRE','TUR'],
  POL: ['GER','CZE','SVK','UKR'],
  SVK: ['CZE','POL','UKR','HUN','AUT'],
  UKR: ['POL','SVK','HUN','ROU','RUS'],
  RUS: ['NOR','FIN','UKR','USA'],
  // Africa
  MAR: ['ESP','ALG'],
  ALG: ['MAR','TUN','MLI','MTN'],
  TUN: ['ALG'],
  MTN: ['MAR','ALG','MLI','SEN'],
  MLI: ['MTN','ALG','SEN','GUI','CIV','BFA'],
  BFA: ['MLI','BEN','TGO','GHA','CIV'],
  SEN: ['MTN','MLI','GUI','GNB','GAM'],
  GUI: ['SEN','MLI','CIV','SLE','LBR','GNB'],
  CIV: ['GUI','MLI','BFA','GHA','LBR'],
  GHA: ['CIV','BFA','TGO'],
  TGO: ['GHA','BFA','BEN'],
  BEN: ['TGO','NGA','BFA'],
  NGA: ['BEN','CMR'],
  CMR: ['NGA','COG','GAB'],
  GAB: ['CMR','COG'],
  COG: ['GAB','CMR','COD'],
  COD: ['COG','ZAM','ANG'],
  ZIM: ['ZAM','MOZ','ZAF'],
  ZAF: ['ZIM','MOZ'],
  // Middle East / Asia
  SYR: ['TUR','LBN','JOR','IRQ'],
  LBN: ['SYR','ISR'],
  ISR: ['LBN','JOR'],
  JOR: ['ISR','SYR','IRQ'],
  IRQ: ['SYR','JOR','IRN','TUR'],
  IRN: ['IRQ','TUR'],
  // North/Central America
  CAN: ['USA'],
  USA: ['CAN','MEX','RUS'],
  MEX: ['USA','GUA'],
  GUA: ['MEX','HON','SLV'],
  HON: ['GUA','SLV','NCA'],
  SLV: ['GUA','HON'],
  NCA: ['HON','CRC'],
  CRC: ['NCA','PAN'],
  PAN: ['CRC','COL'],
  // South America
  ARG: ['CHI','BOL','PAR','BRA','URU'],
  BRA: ['VEN','GUY','SUR','COL','PER','BOL','PAR','ARG','URU'],
  URU: ['ARG','BRA'],
  COL: ['VEN','BRA','ECU','PER','PAN'],
  VEN: ['COL','BRA','GUY'],
  CHI: ['PER','BOL','ARG'],
  ECU: ['COL','PER'],
  PER: ['ECU','COL','BRA','BOL','CHI'],
  BOL: ['PER','CHI','ARG','PAR','BRA'],
  PAR: ['BOL','ARG','BRA'],
}

// UK nations share ISO 826 on the map — handle them as a group
const UK_NATIONS = new Set(['ENG', 'SCO', 'WAL', 'NIR'])

// Normalise variant FIFA codes used in player DB → our internal codes
const NAT_NORM: Record<string, string> = { RSA: 'ZAF', TOG: 'TGO' }
function normNat(nat: string) { return NAT_NORM[nat] ?? nat }

function routeIsValid(countries: string[]): boolean {
  for (let i = 0; i < countries.length - 1; i++) {
    const a = countries[i], b = countries[i + 1]
    if (!BORDERS[a]?.includes(b) && !BORDERS[b]?.includes(a)) return false
  }
  return true
}

const WRAP = { maxWidth: 560, margin: '0 auto', width: '100%', padding: '0 20px', boxSizing: 'border-box' as const }

// ── Continent Challenge constants ──────────────────────────────────────────
const CNT_STATS: StatKey[] = ['goals', 'goalsAssists', 'games']

const CONTINENT_NAMES: Record<string, string> = {
  europe:    'Europe',
  africa:    'Africa',
  s_america: 'South America',
  n_america: 'North & Central America',
  asia:      'Asia & Middle East',
}

// FIFA codes per continent — every country that appears on the map
const CONTINENT_POOL: Record<string, string[]> = {
  europe:    ['ENG','IRL','FRA','ESP','POR','GER','NED','BEL','DEN','SWE','NOR','ITA','SUI','AUT','CZE','GRE','TUR','SRB','CRO','BUL','POL','SVK','FIN','HUN','ROU','UKR','ALB','MNE','MKD','SVN','BIH','RUS','BLR','LTU','LVA','EST','MDA','ISL'],
  africa:    ['MAR','ALG','TUN','EGY','LBA','SEN','GUI','CIV','GHA','TGO','BEN','NGA','CMR','GAB','COD','COG','ZIM','ZAF','ZAM','ANG','MOZ','MLI','MTN','BFA','SLE','LBR','GAM','GNB','EQG','RWA','SDN','SSD','ETH','KEN','TAN','UGA','NAM','BOT','CHA','NIG','SOM','MWI','ERI','MAD','LES','SWZ','DJI'],
  s_america: ['ARG','BRA','URU','COL','VEN','CHI','ECU','PER','BOL','PAR','GUY','SUR'],
  n_america: ['USA','CAN','MEX','GUA','HON','SLV','NCA','CRC','PAN'],
  asia:      ['JPN','KOR','CHN','IRN','IRQ','LBN','ISR','JOR','SYR','IND','PAK','BAN','KSA','UAE','OMA','KUW','QAT','BHR','YEM','AFG','KAZ','UZB','TKM','KGZ','TJK','GEO','ARM','AZE','NEP','SRI','MYA','THA','VIE','CAM','LAO','MAS','INA','PHI','MNG','PRK','BHU','TLS'],
}

const CONTINENT_RANGE: Record<string, [number, number]> = {
  europe:    [5, 20],
  africa:    [5, 13],
  s_america: [5,  9],
  n_america: [5, 10],
  asia:      [5, 10],
}

// Fixed zoom-to-continent projections
const CONTINENT_PROJ: Record<string, { center: [number, number]; scale: number }> = {
  europe:    { center: [10,  50],  scale: 1050 },
  africa:    { center: [20,   2],  scale: 360 },
  s_america: { center: [-58, -21], scale: 420 },
  n_america: { center: [-90,  35], scale: 460 },
  asia:      { center: [90,  25],  scale: 300 },
}

// ── Minefield constants ────────────────────────────────────────────
type MineCategory =
  | { kind: 'statThreshold'; stat: StatKey; threshold: number }
  | { kind: 'playedFor';     team: string }
  | { kind: 'scoredFor';     team: string }

const MINE_STATS: StatKey[] = ['goals', 'goalsAssists', 'games', 'yellowCards']
const MINE_THRESHOLDS: Record<StatKey, number[]> = {
  goals:        [5, 10, 15, 20, 30, 50, 75, 100, 150],
  goalsAssists: [10, 20, 30, 50, 75, 100, 150, 200],
  games:        [50, 100, 150, 200, 250, 300],
  yellowCards:  [5, 10, 20, 30, 50],
}
const MINE_TEAMS = [
  'Arsenal','Chelsea','Liverpool','Manchester City','Manchester Utd',
  'Tottenham','Everton','Aston Villa','Newcastle','West Ham',
  'Leicester','Southampton','Leeds','Wolves','Crystal Palace',
  'Fulham','Sunderland','Middlesbrough','Blackburn','Bolton',
  'Burnley','Sheffield Utd','Stoke','Swansea','West Brom',
  'Watford','Brighton','Bournemouth','Norwich','Wigan',
  'Ipswich','Charlton','Portsmouth','Derby','Reading',
]
const TEAM_DISPLAY: Record<string, string> = {
  'Manchester Utd': 'Manchester United',
  'QPR':            'Queens Park Rangers',
  'Sheffield Weds': 'Sheffield Wednesday',
  'Brighton':       'Brighton & Hove Albion',
  'West Brom':      'West Bromwich Albion',
}
function displayTeam(t: string) { return TEAM_DISPLAY[t] ?? t }

function mineCategoryMatches(p: ATWPlayer, cat: MineCategory): boolean {
  if (cat.kind === 'statThreshold') return statVal(p, cat.stat) >= cat.threshold
  if (cat.kind === 'playedFor')     return p.teams.includes(cat.team)
  if (cat.kind === 'scoredFor')     return (p.teamGoals[cat.team] ?? 0) >= 1
  return false
}
function mineCategoryBannerLabel(cat: MineCategory): string {
  if (cat.kind === 'statThreshold') return `${cat.threshold}+ ${STAT_LABELS[cat.stat]}`
  if (cat.kind === 'playedFor')     return `Played for ${displayTeam(cat.team)}`
  if (cat.kind === 'scoredFor')     return `Scored for ${displayTeam(cat.team)}`
  return ''
}
function mineSummaryText(cat: MineCategory): string {
  if (cat.kind === 'statThreshold') return `with a player who has ${cat.threshold}+ ${STAT_LABELS[cat.stat].toLowerCase()}`
  if (cat.kind === 'playedFor')     return `with a player who has played for ${displayTeam(cat.team)}`
  if (cat.kind === 'scoredFor')     return `with a player who has scored for ${displayTeam(cat.team)}`
  return ''
}

function DailyEndPanel({ phase, pct, runningTotal, target, mode, playerName, setPlayerName, scoreSubmitted, onSubmit, leaderboard, onPlayMore }: {
  phase: 'won' | 'failed'; pct: number; runningTotal: number; target: number; mode: string;
  playerName: string; setPlayerName: (v: string) => void;
  scoreSubmitted: boolean; onSubmit: () => void;
  leaderboard: LeaderboardEntry[]; onPlayMore: () => void;
}) {
  const sorted = [...leaderboard].sort((a, b) => {
    if (a.won !== b.won) return a.won ? -1 : 1
    return Math.abs(a.pct - 100) - Math.abs(b.pct - 100)
  })
  const pctColor = (p: number) => { const d = Math.abs(p - 100); return d <= 10 ? '#4ade80' : d <= 20 ? '#22c55e' : d <= 30 ? '#eab308' : d <= 40 ? '#f97316' : '#ef4444' }
  return (
    <div style={{ marginTop: 8 }}>
      {!scoreSubmitted ? (
        <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid #2a3d5e', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8899bb', marginBottom: 10 }}>
            Submit your score to the leaderboard
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && playerName.trim()) onSubmit() }}
              placeholder="Your name…"
              style={{ flex: 1, background: '#111827', border: '1px solid #2a3d5e', borderRadius: 6, padding: '8px 12px', color: 'white', fontSize: 16, outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={onSubmit} disabled={!playerName.trim()} style={{ padding: '8px 18px', background: playerName.trim() ? '#dc2626' : '#2a3d5e', color: 'white', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 13, cursor: playerName.trim() ? 'pointer' : 'default' }}>Submit</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4a6fa0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today&apos;s Leaderboard</div>
          {sorted.length === 0
            ? <p style={{ color: '#4a5568', fontSize: 13 }}>No scores yet.</p>
            : sorted.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4, background: e.player_name === playerName ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${e.player_name === playerName ? '#7f1d1d' : '#1e2d4a'}`, borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: '#4a5568', width: 20 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: e.won ? 'white' : '#8899bb' }}>{e.player_name}</span>
                <span style={{ fontSize: 11, color: '#4a5568', marginRight: 4 }}>{e.mode}</span>
                <span style={{ fontSize: 11, color: e.won ? '#22c55e' : '#ef4444' }}>{e.won ? '✓' : '✗'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: pctColor(e.pct) }}>{Math.abs(e.pct - 100)}% away</span>
              </div>
            ))
          }
        </div>
      )}
      <button onClick={onPlayMore} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Play More Routes →
      </button>
    </div>
  )
}

function MineDailyEndPanel({ won, livesLost, playerName, setPlayerName, scoreSubmitted, onSubmit, leaderboard, onPlayMore }: {
  won: boolean; livesLost: number;
  playerName: string; setPlayerName: (v: string) => void;
  scoreSubmitted: boolean; onSubmit: () => void;
  leaderboard: MineLbEntry[]; onPlayMore: () => void;
}) {
  const sorted = [...leaderboard].sort((a, b) => {
    if (a.won !== b.won) return a.won ? -1 : 1
    return a.lives_lost - b.lives_lost
  })
  const lifeColor = (l: number) => l === 0 ? '#4ade80' : l === 1 ? '#22c55e' : l === 2 ? '#eab308' : '#ef4444'
  return (
    <div style={{ marginTop: 8 }}>
      {!scoreSubmitted ? (
        <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid #2a3d5e', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8899bb', marginBottom: 10 }}>Submit your score to the leaderboard</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && playerName.trim()) onSubmit() }}
              placeholder="Your name…"
              style={{ flex: 1, background: '#111827', border: '1px solid #2a3d5e', borderRadius: 6, padding: '8px 12px', color: 'white', fontSize: 16, outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={onSubmit} disabled={!playerName.trim()} style={{ padding: '8px 18px', background: playerName.trim() ? '#dc2626' : '#2a3d5e', color: 'white', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 13, cursor: playerName.trim() ? 'pointer' : 'default' }}>Submit</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4a6fa0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today&apos;s Leaderboard</div>
          {sorted.length === 0
            ? <p style={{ color: '#4a5568', fontSize: 13 }}>No scores yet.</p>
            : sorted.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4, background: e.player_name === playerName ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${e.player_name === playerName ? '#7f1d1d' : '#1e2d4a'}`, borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: '#4a5568', width: 20 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: e.won ? 'white' : '#8899bb' }}>{e.player_name}</span>
                <span style={{ fontSize: 11, color: e.won ? '#22c55e' : '#ef4444' }}>{e.won ? '✓' : '✗'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: lifeColor(e.lives_lost) }}>
                  {e.lives_lost === 0 ? 'Perfect' : `${e.lives_lost} mistake${e.lives_lost !== 1 ? 's' : ''}`}
                </span>
              </div>
            ))
          }
        </div>
      )}
      <button onClick={onPlayMore} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Play More →</button>
    </div>
  )
}

export default function AroundTheWorld() {
  const [mounted,    setMounted]    = useState(false)
  const [players,    setPlayers]    = useState<ATWPlayer[] | null>(null)
  const [loadErr,    setLoadErr]    = useState(false)

  const [gameMode,       setGameMode]       = useState<GameMode>('lobby')
  const [dailyConfig,    setDailyConfig]    = useState<DailyConfig | null>(null)
  const [dailyLoading,   setDailyLoading]   = useState(false)
  const [dailyErr,       setDailyErr]       = useState(false)
  const [leaderboard,    setLeaderboard]    = useState<LeaderboardEntry[]>([])
  const [alreadyPlayed,  setAlreadyPlayed]  = useState(false)
  const [playerName,     setPlayerName]     = useState('')
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [showLobbyLb,    setShowLobbyLb]    = useState(false)

  // Continent daily state
  const [cntDailyLoading,       setCntDailyLoading]       = useState(false)
  const [cntDailyErr,           setCntDailyErr]           = useState(false)
  const [cntAlreadyPlayed,      setCntAlreadyPlayed]      = useState(false)
  const [cntDailyLeaderboard,   setCntDailyLeaderboard]   = useState<LeaderboardEntry[]>([])
  const [cntDailyPlayerName,    setCntDailyPlayerName]    = useState('')
  const [cntDailyScoreSubmitted,setCntDailyScoreSubmitted]= useState(false)
  const [showCntLobbyLb,        setShowCntLobbyLb]        = useState(false)

  // Minefield state
  const [mineContinent,         setMineContinent]         = useState('')
  const [mineCategory,          setMineCategory]          = useState<MineCategory | null>(null)
  const [mineTargets,           setMineTargets]           = useState<Set<string>>(new Set())
  const [minePicked,            setMinePicked]            = useState<Record<string, { player: string; val: number | null; count: number }>>({})
  const [mineWrong,             setMineWrong]             = useState<string[]>([])
  const [mineLivesLost,         setMineLivesLost]         = useState(0)
  const [minePending,           setMinePending]           = useState<string | null>(null)
  const [mineAllCountries,      setMineAllCountries]      = useState<string[]>([])
  // Minefield daily state
  const [mineDailyLoading,      setMineDailyLoading]      = useState(false)
  const [mineDailyErr,          setMineDailyErr]          = useState(false)
  const [mineAlreadyPlayed,     setMineAlreadyPlayed]     = useState(false)
  const [mineDailyLeaderboard,  setMineDailyLeaderboard]  = useState<MineLbEntry[]>([])
  const [mineDailyPlayerName,   setMineDailyPlayerName]   = useState('')
  const [mineDailyScoreSubmitted,setMineDailyScoreSubmitted] = useState(false)
  const [showMineLobbyLb,       setShowMineLobbyLb]       = useState(false)

  const [phase,      setPhase]      = useState<Phase>('setup')
  const [route,      setRoute]      = useState<ATWRoute | null>(null)
  const [stat,       setStat]       = useState<StatKey>('goals')
  const [target,     setTarget]     = useState(0)
  const [step,       setStep]       = useState(0)
  const [completed,  setCompleted]  = useState<Step[]>([])
  const [failReason, setFailReason] = useState('')
  const [mode,       setMode]       = useState<'easy' | 'medium' | 'hard'>('easy')
  const [revealed,   setRevealed]   = useState(false)
  const [zoom,       setZoom]       = useState(1)
  const [proj,       setProj]       = useState<{ center: [number, number]; scale: number }>({ center: [0, 20], scale: 160 })

  // Continent challenge state
  const [challengeType,  setChallengeType]  = useState<'chain' | 'continent' | 'minefield'>('chain')
  const [cntContinent,   setCntContinent]   = useState('')
  const [cntCountries,   setCntCountries]   = useState<string[]>([])  // full continent pool
  const [cntNeeded,      setCntNeeded]      = useState(0)              // how many to fill
  const [cntFilled,      setCntFilled]      = useState<Record<string, { player: string; val: number }>>({})
  const [cntSelected,    setCntSelected]    = useState<string | null>(null)
  const [cntFail,        setCntFail]        = useState('')

  const lastContinentRef = useRef<string | null>(null)

  const [input,       setInput]       = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggActive,  setSuggActive]  = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch('/api/around-the-world')
      .then(r => r.json())
      .then(d => setPlayers(d.players))
      .catch(() => setLoadErr(true))
  }, [])

  useEffect(() => {
    if (!mounted) return
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem(`atw_daily_${today}`))       setAlreadyPlayed(true)
    if (localStorage.getItem(`atw_cont_daily_${today}`)) setCntAlreadyPlayed(true)
    if (localStorage.getItem(`atw_mine_daily_${today}`)) setMineAlreadyPlayed(true)
  }, [mounted])

  async function startDailyGame() {
    if (!players) return
    setDailyLoading(true); setDailyErr(false)
    try {
      const res  = await fetch('/api/around-the-world/daily')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDailyConfig(data)
      setLeaderboard(data.leaderboard ?? [])
      const r = ROUTES.find(x => x.id === data.routeId)
      if (!r) throw new Error('Route not found')
      setChallengeType('chain')
      setRoute(r); setStat(data.stat); setTarget(data.target); setMode(data.mode)
      setStep(0); setCompleted([]); setFailReason(''); setRevealed(false); setZoom(1)
      setCntFilled({}); setCntSelected(null)
      setInput(''); setSuggestions([]); setSuggActive(-1)
      setProj(computeProjection(r.countries))
      setScoreSubmitted(false); setPlayerName('')
      setGameMode('daily'); setPhase('playing')
      setTimeout(() => inputRef.current?.focus(), 80)
    } catch {
      setDailyErr(true)
    } finally {
      setDailyLoading(false)
    }
  }

  async function submitDailyScore(wonGame: boolean, total: number, tgt: number, p: number, md: string) {
    if (!dailyConfig || !playerName.trim()) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      const res  = await fetch('/api/around-the-world/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, player_name: playerName.trim(), score: total, target: tgt, pct: p, won: wonGame, mode: md }),
      })
      const data = await res.json()
      setLeaderboard(data.leaderboard ?? [])
    } catch { /* silent */ }
    setScoreSubmitted(true)
    localStorage.setItem(`atw_daily_${today}`, JSON.stringify({ won: wonGame, pct: p }))
    setAlreadyPlayed(true)
  }

  async function viewDailyLeaderboard() {
    setShowLobbyLb(true)
    try {
      const res  = await fetch('/api/around-the-world/daily')
      const data = await res.json()
      setLeaderboard(data.leaderboard ?? [])
    } catch { /* silent */ }
  }

  async function startContinentDailyGame() {
    if (!players) return
    setCntDailyLoading(true); setCntDailyErr(false)
    try {
      const res  = await fetch('/api/around-the-world/continent-daily')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCntDailyLeaderboard(data.leaderboard ?? [])
      setCntDailyPlayerName(''); setCntDailyScoreSubmitted(false)
      const pool = CONTINENT_POOL[data.continent as keyof typeof CONTINENT_POOL] ?? []
      setChallengeType('continent')
      setCntContinent(data.continent); setCntCountries(pool); setCntNeeded(data.nNeeded)
      setCntFilled({}); setCntSelected(null); setCntFail('')
      setStat(data.stat); setTarget(data.target)
      setZoom(1); setProj(CONTINENT_PROJ[data.continent] ?? { center: [0, 20], scale: 160 })
      setInput(''); setSuggestions([]); setSuggActive(-1)
      setGameMode('daily'); setPhase('playing')
      setTimeout(() => inputRef.current?.focus(), 80)
    } catch {
      setCntDailyErr(true)
    } finally {
      setCntDailyLoading(false)
    }
  }

  async function submitContinentDailyScore(wonGame: boolean, total: number, tgt: number, p: number) {
    if (!cntDailyPlayerName.trim()) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      const res  = await fetch('/api/around-the-world/continent-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, player_name: cntDailyPlayerName.trim(), score: total, target: tgt, pct: p, won: wonGame, continent: cntContinent }),
      })
      const d = await res.json()
      setCntDailyLeaderboard(d.leaderboard ?? [])
    } catch { /* silent */ }
    setCntDailyScoreSubmitted(true)
    localStorage.setItem(`atw_cont_daily_${today}`, JSON.stringify({ won: wonGame, pct: p }))
    setCntAlreadyPlayed(true)
  }

  async function viewContinentDailyLeaderboard() {
    setShowCntLobbyLb(true)
    try {
      const res  = await fetch('/api/around-the-world/continent-daily')
      const data = await res.json()
      setCntDailyLeaderboard(data.leaderboard ?? [])
    } catch { /* silent */ }
  }

  function startMinefield() {
    if (!players) return
    const continents = ['europe', 'africa', 's_america']
    const continent  = continents[Math.floor(Math.random() * continents.length)]
    const pool = CONTINENT_POOL[continent]
    const valid: Array<{ cat: MineCategory; targets: string[] }> = []
    // Stat threshold categories
    for (const s of MINE_STATS) {
      for (const t of MINE_THRESHOLDS[s]) {
        const targets = pool.filter(code => (playersByNat[code] ?? []).some(p => statVal(p, s) >= t))
        if (targets.length >= 4) valid.push({ cat: { kind: 'statThreshold', stat: s, threshold: t }, targets })
      }
    }
    // Team categories
    for (const team of MINE_TEAMS) {
      const played = pool.filter(code => (playersByNat[code] ?? []).some(p => p.teams.includes(team)))
      if (played.length >= 4) valid.push({ cat: { kind: 'playedFor', team }, targets: played })
      const scored = pool.filter(code => (playersByNat[code] ?? []).some(p => (p.teamGoals[team] ?? 0) >= 1))
      if (scored.length >= 4) valid.push({ cat: { kind: 'scoredFor', team }, targets: scored })
    }
    if (!valid.length) { startMinefield(); return }
    const pick = valid[Math.floor(Math.random() * valid.length)]
    setChallengeType('minefield')
    setMineContinent(continent); setMineAllCountries(pool)
    setMineCategory(pick.cat)
    setMineTargets(new Set(pick.targets))
    setMinePicked({}); setMineWrong([]); setMineLivesLost(0); setMinePending(null)
    setZoom(1); setProj(CONTINENT_PROJ[continent])
    setPhase('playing')
  }

  async function startMinefieldDailyGame() {
    if (!players) return
    setMineDailyLoading(true); setMineDailyErr(false)
    try {
      const res  = await fetch('/api/around-the-world/minefield-daily')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMineDailyLeaderboard(data.leaderboard ?? [])
      setMineDailyPlayerName(''); setMineDailyScoreSubmitted(false)
      const pool = CONTINENT_POOL[data.continent as keyof typeof CONTINENT_POOL] ?? []
      const cat: MineCategory = data.category
      const targets = pool.filter((code: string) => (playersByNat[code] ?? []).some((p: ATWPlayer) => mineCategoryMatches(p, cat)))
      setChallengeType('minefield')
      setMineContinent(data.continent); setMineAllCountries(pool)
      setMineCategory(cat)
      setMineTargets(new Set(targets))
      setMinePicked({}); setMineWrong([]); setMineLivesLost(0); setMinePending(null)
      setMode('easy')
      setZoom(1); setProj(CONTINENT_PROJ[data.continent] ?? { center: [0, 20], scale: 160 })
      setGameMode('daily'); setPhase('playing')
    } catch { setMineDailyErr(true) }
    finally { setMineDailyLoading(false) }
  }

  async function submitMinefieldDailyScore(wonGame: boolean, livesLost: number) {
    if (!mineDailyPlayerName.trim()) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      const res = await fetch('/api/around-the-world/minefield-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, player_name: mineDailyPlayerName.trim(), lives_lost: livesLost, won: wonGame, continent: mineContinent }),
      })
      const d = await res.json()
      setMineDailyLeaderboard(d.leaderboard ?? [])
    } catch { /* silent */ }
    setMineDailyScoreSubmitted(true)
    localStorage.setItem(`atw_mine_daily_${today}`, JSON.stringify({ won: wonGame, livesLost }))
    setMineAlreadyPlayed(true)
  }

  async function viewMinefieldDailyLeaderboard() {
    setShowMineLobbyLb(true)
    try {
      const res  = await fetch('/api/around-the-world/minefield-daily')
      const data = await res.json()
      setMineDailyLeaderboard(data.leaderboard ?? [])
    } catch { /* silent */ }
  }

  function handleMineClick(geoId: string | number) {
    if (phase !== 'playing' || challengeType !== 'minefield') return
    const n = norm(geoId)
    let fifa: string | null = null
    if (n === '826') {
      const ukInGame = ['ENG','SCO','WAL','NIR'].filter(c => mineAllCountries.includes(c) && !minePicked[c] && !mineWrong.includes(c))
      fifa = ukInGame[0] ?? null
    } else {
      const f = ISO_TO_FIFA[n]
      if (f && mineAllCountries.includes(f) && !minePicked[f] && !mineWrong.includes(f)) fifa = f
    }
    if (!fifa) return
    setMinePending(fifa)
  }

  function confirmMinePick() {
    if (!minePending || !mineCategory) return
    const ps = (playersByNat[minePending] ?? []).filter(p => mineCategoryMatches(p, mineCategory))
    if (ps.length > 0) {
      const best = ps.reduce((a, b) => {
        if (mineCategory.kind === 'scoredFor') return (b.teamGoals[mineCategory.team] ?? 0) > (a.teamGoals[mineCategory.team] ?? 0) ? b : a
        if (mineCategory.kind === 'statThreshold') return statVal(b, mineCategory.stat) > statVal(a, mineCategory.stat) ? b : a
        return a
      })
      const val = mineCategory.kind === 'statThreshold' ? statVal(best, mineCategory.stat)
        : mineCategory.kind === 'scoredFor' ? (best.teamGoals[mineCategory.team] ?? 0)
        : null
      const newPicked = { ...minePicked, [minePending]: { player: best.name, val, count: ps.length } }
      setMinePicked(newPicked); setMinePending(null)
      if (Object.keys(newPicked).length >= mineTargets.size) setPhase('won')
    } else {
      const newWrong     = [...mineWrong, minePending]
      const newLivesLost = mineLivesLost + 1
      setMineWrong(newWrong); setMineLivesLost(newLivesLost); setMinePending(null)
      if (newLivesLost >= 3) setPhase('failed')
    }
  }

  const playerByName = useMemo(() => {
    if (!players) return {} as Record<string, ATWPlayer>
    const m: Record<string, ATWPlayer> = {}
    for (const p of players) m[norm2(p.name)] = p
    return m
  }, [players])

  const playersByNat = useMemo(() => {
    if (!players) return {} as Record<string, ATWPlayer[]>
    const m: Record<string, ATWPlayer[]> = {}
    for (const p of players) {
      const nat = normNat(p.nat)
      if (!m[nat]) m[nat] = []
      m[nat].push(p)
    }
    return m
  }, [players])

  function maxPossible(r: ATWRoute, s: StatKey) {
    return r.countries.reduce((sum, code) => {
      const ps = playersByNat[code] ?? []
      return sum + (ps.length ? Math.max(...ps.map(p => statVal(p, s))) : 0)
    }, 0)
  }

  function startGame() {
    if (!players) return
    const valid = ROUTES.filter(r =>
      r.countries.every(c => (playersByNat[c]?.length ?? 0) > 0) && routeIsValid(r.countries)
    )
    if (!valid.length) return

    const ALL_CONTINENTS = ['europe', 'africa', 'n_america', 's_america', 'asia'] as const
    const available = ALL_CONTINENTS.filter(c => c !== lastContinentRef.current && valid.some(r => r.continent === c))
    if (!available.length) return
    const continent = available[Math.floor(Math.random() * available.length)]
    lastContinentRef.current = continent

    const pool = valid.filter(r => r.continent === continent)
    const weights = pool.map(r => {
      const hasNiche = r.countries.some(c => (playersByNat[c]?.length ?? 0) < 5)
      return hasNiche ? 1 : 10
    })
    const total = weights.reduce((a, b) => a + b, 0)
    let rand = Math.random() * total
    let picked = pool[pool.length - 1]
    for (let i = 0; i < pool.length; i++) { rand -= weights[i]; if (rand <= 0) { picked = pool[i]; break } }

    const s  = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)]
    const mp = maxPossible(picked, s)
    const t  = Math.max(picked.countries.length, Math.floor(mp * (0.38 + Math.random() * 0.30)))

    setRoute(picked); setStat(s); setTarget(t)
    setStep(0); setCompleted([]); setFailReason(''); setRevealed(false); setZoom(1)
    setInput(''); setSuggestions([]); setSuggActive(-1)
    setProj(computeProjection(picked.countries))
    setPhase('playing')
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  function handleInput(val: string) {
    setInput(val); setSuggActive(-1)
    if (val.length < 2) { setSuggestions([]); return }
    const lc = norm2(val)
    setSuggestions(players!.filter(p => norm2(p.name).includes(lc)).slice(0, 8).map(p => p.name))
  }

  function submit(name: string) {
    if (!route) return
    const trimmed = name.trim()
    if (!trimmed) return
    const p = playerByName[norm2(trimmed)] ?? players!.find(pl => norm2(pl.name) === norm2(trimmed))
    const currentCode = route.countries[step]
    if (!p) { setFailReason(`"${trimmed}" not found in the PL database`); setPhase('failed'); return }
    if (normNat(p.nat) !== currentCode) {
      const got  = COUNTRY_NAMES[normNat(p.nat)]  ?? p.nat
      const need = COUNTRY_NAMES[currentCode] ?? currentCode
      setFailReason(`${p.name} is from ${got} — you needed a player from ${need}`)
      setPhase('failed'); return
    }
    const val  = statVal(p, stat)
    const next = [...completed, { code: currentCode, player: p.name, val }]
    setCompleted(next); setInput(''); setSuggestions([]); setSuggActive(-1)
    if (step + 1 >= route.countries.length) { setPhase('won') }
    else { setStep(step + 1); setTimeout(() => inputRef.current?.focus(), 50) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSuggActive(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSuggActive(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const name = suggActive >= 0 && suggestions[suggActive] ? suggestions[suggActive] : input
      if (challengeType === 'continent') submitContinent(name)
      else if (name.trim()) submit(name)
    }
    if (e.key === 'Escape') { setSuggestions([]); setSuggActive(-1) }
  }

  function startContinent() {
    if (!players) return
    const continents = ['europe', 'africa', 's_america']
    const continent  = continents[Math.floor(Math.random() * continents.length)]
    const s = CNT_STATS[Math.floor(Math.random() * CNT_STATS.length)]
    const pool = CONTINENT_POOL[continent]  // all countries, including those with no players
    const [minN, maxN] = CONTINENT_RANGE[continent]
    const n = Math.min(pool.length, minN + Math.floor(Math.random() * (maxN - minN + 1)))
    // Target based on top-n countries that actually have players
    const withPlayers = pool.filter(code => (playersByNat[code] ?? []).some(p => statVal(p, s) > 0))
    const perCountryBest = withPlayers.map(code =>
      Math.max(0, ...(playersByNat[code] ?? []).filter(p => statVal(p, s) > 0).map(p => statVal(p, s)))
    ).sort((a, b) => b - a)
    const maxP = perCountryBest.slice(0, n).reduce((a, b) => a + b, 0)
    const t = Math.max(n, Math.floor(maxP * (0.40 + Math.random() * 0.25)))
    setChallengeType('continent')
    setCntContinent(continent)
    setCntCountries(pool)   // all continent countries — user picks any
    setCntNeeded(n)
    setCntFilled({})
    setCntSelected(null)
    setCntFail('')
    setStat(s); setTarget(t)
    setZoom(1); setProj(CONTINENT_PROJ[continent])
    setInput(''); setSuggestions([]); setSuggActive(-1)
    setPhase('playing')
  }

  function submitContinent(name: string) {
    if (!cntSelected || !players) return
    const trimmed = name.trim()
    if (!trimmed) return
    const p = playerByName[norm2(trimmed)] ?? players.find(pl => norm2(pl.name) === norm2(trimmed))
    if (!p) { setCntFail(`"${trimmed}" not found in the PL database`); setPhase('failed'); return }
    if (normNat(p.nat) !== cntSelected) {
      const got  = COUNTRY_NAMES[normNat(p.nat)]  ?? p.nat
      const need = COUNTRY_NAMES[cntSelected] ?? cntSelected
      setCntFail(`${p.name} is from ${got} — you needed a player from ${need}`); setPhase('failed'); return
    }
    const v = statVal(p, stat)
    if (v === 0) {
      setCntFail(`${p.name} has 0 ${STAT_LABELS[stat].toLowerCase()} — pick someone with at least 1`); setPhase('failed'); return
    }
    const newFilled = { ...cntFilled, [cntSelected]: { player: p.name, val: v } }
    setCntFilled(newFilled); setCntSelected(null); setInput(''); setSuggestions([]); setSuggActive(-1)
    if (Object.keys(newFilled).length >= cntNeeded) setPhase('won')
    else setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleCntClick(geoId: string | number) {
    if (phase !== 'playing' || challengeType !== 'continent') return
    const n = norm(geoId)
    let fifa: string | null = null
    if (n === '826') {
      const ukInGame = ['ENG','SCO','WAL','NIR'].filter(c => cntCountries.includes(c) && !cntFilled[c])
      fifa = ukInGame[0] ?? null
    } else {
      const f = ISO_TO_FIFA[n]
      if (f && cntCountries.includes(f) && !cntFilled[f]) fifa = f
    }
    if (!fifa) return
    setCntSelected(fifa)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const routeSet     = useMemo(() => new Set(route?.countries ?? []), [route])
  const completedSet = useMemo(() => new Set(completed.map(c => c.code)), [completed])
  const currentCode  = route ? route.countries[step] : null
  const runningTotal = completed.reduce((s, c) => s + c.val, 0)
  const diff         = runningTotal - target
  const pct          = target > 0 ? Math.round((runningTotal / target) * 100) : 0

  const cntSet     = useMemo(() => new Set(cntCountries), [cntCountries])
  const cntRunning = useMemo(() => Object.values(cntFilled).reduce((s, e) => s + e.val, 0), [cntFilled])
  const cntPct     = target > 0 ? Math.round((cntRunning / target) * 100) : 0

  // Normalise: TopoJSON zero-pads codes < 100 (e.g. "056" for Belgium)
  function norm(id: string | number) { return String(Number(id)) }

  function geoFill(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      if (currentCode && UK_NATIONS.has(currentCode)) return 'rgba(245,158,11,0.30)'
      if ([...completedSet].some(c => UK_NATIONS.has(c))) return 'rgba(34,197,94,0.32)'
      if ([...routeSet].some(c => UK_NATIONS.has(c)))    return 'rgba(59,130,246,0.22)'
      return '#1a2d45'
    }
    const fifa = ISO_TO_FIFA[n]
    if (!fifa) return '#1a2d45'
    if (completedSet.has(fifa)) return 'rgba(34,197,94,0.32)'
    if (fifa === currentCode)   return 'rgba(245,158,11,0.30)'
    if (routeSet.has(fifa))     return 'rgba(59,130,246,0.22)'
    return '#1a2d45'
  }
  function geoStroke(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      if (currentCode && UK_NATIONS.has(currentCode)) return '#f59e0b'
      if ([...completedSet].some(c => UK_NATIONS.has(c))) return '#22c55e'
      if ([...routeSet].some(c => UK_NATIONS.has(c)))    return '#5b8fd4'
      return '#3d5f82'
    }
    const fifa = ISO_TO_FIFA[n]
    if (!fifa) return '#3d5f82'
    if (completedSet.has(fifa)) return '#22c55e'
    if (fifa === currentCode)   return '#f59e0b'
    if (routeSet.has(fifa))     return '#5b8fd4'
    return '#2e4a6a'
  }
  function geoStrokeW(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      if (currentCode && UK_NATIONS.has(currentCode)) return 1.6
      if ([...routeSet].some(c => UK_NATIONS.has(c))) return 1.1
      return 0.5
    }
    const fifa = ISO_TO_FIFA[n]
    if (!fifa) return 0.6
    if (fifa === currentCode) return 1.6
    if (routeSet.has(fifa))   return 1.1
    return 0.6
  }

  function cntGeoFill(id: string | number) {
    const n = norm(id)
    let fifa: string | null = null
    if (n === '826') {
      const ukInGame = ['ENG','SCO','WAL','NIR'].filter(c => cntSet.has(c))
      if (!ukInGame.length) return '#1a2d45'
      if (ukInGame.some(c => c === cntSelected))     return 'rgba(245,158,11,0.30)'
      if (ukInGame.every(c => !!cntFilled[c]))       return 'rgba(34,197,94,0.32)'
      if (ukInGame.some(c => !!cntFilled[c]))        return 'rgba(59,130,246,0.30)'
      return 'rgba(59,130,246,0.22)'
    }
    fifa = ISO_TO_FIFA[n] ?? null
    if (!fifa || !cntSet.has(fifa)) return '#1a2d45'
    if (cntFilled[fifa])    return 'rgba(34,197,94,0.32)'
    if (fifa === cntSelected) return 'rgba(245,158,11,0.30)'
    return 'rgba(59,130,246,0.22)'
  }
  function cntGeoStroke(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      const ukInGame = ['ENG','SCO','WAL','NIR'].filter(c => cntSet.has(c))
      if (!ukInGame.length) return '#2e4a6a'
      if (ukInGame.some(c => c === cntSelected)) return '#f59e0b'
      if (ukInGame.every(c => !!cntFilled[c]))   return '#22c55e'
      return '#5b8fd4'
    }
    const fifa = ISO_TO_FIFA[n]
    if (!fifa || !cntSet.has(fifa)) return '#2e4a6a'
    if (cntFilled[fifa])    return '#22c55e'
    if (fifa === cntSelected) return '#f59e0b'
    return '#5b8fd4'
  }
  function cntGeoStrokeW(id: string | number) {
    const n = norm(id)
    const fifa = n === '826' ? (['ENG','SCO','WAL','NIR'].find(c => cntSet.has(c)) ?? null) : (ISO_TO_FIFA[n] ?? null)
    if (!fifa || !cntSet.has(fifa)) return 0.5
    if (fifa === cntSelected || cntFilled[fifa]) return 1.6
    return 1.0
  }
  function cntGeoCursor(id: string | number) {
    const n = norm(id)
    let fifa: string | null = null
    if (n === '826') { fifa = ['ENG','SCO','WAL','NIR'].find(c => cntSet.has(c) && !cntFilled[c]) ?? null }
    else { const f = ISO_TO_FIFA[n]; if (f && cntSet.has(f) && !cntFilled[f]) fifa = f }
    return fifa ? 'pointer' : 'default'
  }

  function mineGeoFill(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      const ukInGame = ['ENG','SCO','WAL','NIR'].filter(c => mineAllCountries.includes(c))
      if (!ukInGame.length) return '#1a2d45'
      if (ukInGame.some(c => minePicked[c]))          return 'rgba(34,197,94,0.32)'
      if (ukInGame.some(c => mineWrong.includes(c)))  return 'rgba(239,68,68,0.30)'
      if (ukInGame.some(c => c === minePending))      return 'rgba(245,158,11,0.30)'
      return 'rgba(59,130,246,0.18)'
    }
    const fifa = ISO_TO_FIFA[n] ?? null
    if (!fifa || !mineAllCountries.includes(fifa)) return '#1a2d45'
    if (minePicked[fifa])          return 'rgba(34,197,94,0.32)'
    if (mineWrong.includes(fifa))  return 'rgba(239,68,68,0.30)'
    if (fifa === minePending)      return 'rgba(245,158,11,0.30)'
    return 'rgba(59,130,246,0.18)'
  }
  function mineGeoStroke(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      const ukInGame = ['ENG','SCO','WAL','NIR'].filter(c => mineAllCountries.includes(c))
      if (!ukInGame.length) return '#2e4a6a'
      if (ukInGame.some(c => minePicked[c]))          return '#22c55e'
      if (ukInGame.some(c => mineWrong.includes(c)))  return '#ef4444'
      if (ukInGame.some(c => c === minePending))      return '#f59e0b'
      return '#5b8fd4'
    }
    const fifa = ISO_TO_FIFA[n] ?? null
    if (!fifa || !mineAllCountries.includes(fifa)) return '#2e4a6a'
    if (minePicked[fifa])          return '#22c55e'
    if (mineWrong.includes(fifa))  return '#ef4444'
    if (fifa === minePending)      return '#f59e0b'
    return '#5b8fd4'
  }
  function mineGeoStrokeW(id: string | number) {
    const n = norm(id)
    const fifa = n === '826'
      ? (['ENG','SCO','WAL','NIR'].find(c => mineAllCountries.includes(c)) ?? null)
      : (ISO_TO_FIFA[n] ?? null)
    if (!fifa || !mineAllCountries.includes(fifa)) return 0.5
    if (fifa === minePending || minePicked[fifa] || mineWrong.includes(fifa)) return 1.6
    return 1.0
  }
  function mineGeoCursor(id: string | number) {
    const n = norm(id)
    let fifa: string | null = null
    if (n === '826') {
      fifa = ['ENG','SCO','WAL','NIR'].find(c => mineAllCountries.includes(c) && !minePicked[c] && !mineWrong.includes(c)) ?? null
    } else {
      const f = ISO_TO_FIFA[n]
      if (f && mineAllCountries.includes(f) && !minePicked[f] && !mineWrong.includes(f)) fifa = f
    }
    return fifa ? 'pointer' : 'default'
  }

  function scoreLabel() {
    const d = Math.abs(pct - 100)
    if (d === 0)  return '🎯 Bullseye!'
    if (d <= 5)   return '🔥 Almost perfect'
    if (d <= 15)  return '✈️ Great journey'
    if (d <= 30)  return '🌍 Good effort'
    return '🗺️ Keep exploring'
  }

  const page = { background: '#0a0f1e', minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, sans-serif" } as const

  // ── LOBBY ──────────────────────────────────────────────────────────
  if (gameMode === 'lobby') {
    const today = mounted ? new Date().toISOString().slice(0, 10) : ''
    const sortedLb = [...leaderboard].sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1
      return Math.abs(a.pct - 100) - Math.abs(b.pct - 100)
    })
    const sortedCntLb = [...cntDailyLeaderboard].sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1
      return Math.abs(a.pct - 100) - Math.abs(b.pct - 100)
    })
    const lbRow = (e: typeof leaderboard[0], i: number) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2d4a', borderRadius: 6 }}>
        <span style={{ fontSize: 12, color: '#4a5568', width: 18 }}>{i + 1}.</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: e.won ? 'white' : '#8899bb' }}>{e.player_name}</span>
        <span style={{ fontSize: 11, color: e.won ? '#22c55e' : '#ef4444' }}>{e.won ? '✓' : '✗'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: (() => { const d = Math.abs(e.pct - 100); return d <= 10 ? '#4ade80' : d <= 20 ? '#22c55e' : d <= 30 ? '#eab308' : d <= 40 ? '#f97316' : '#ef4444' })() }}>{Math.abs(e.pct - 100)}% away</span>
      </div>
    )
    return (
      <div style={page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '0 0 6px' }}>Around the World in 80 Goals</h1>
              <p style={{ color: '#8899bb', margin: 0, fontSize: 14, lineHeight: 1.5 }}>Name PL players from across the globe and hit the target score to win.</p>
            </div>

            {/* ── Card 0: Minefield ── */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2d4a', borderRadius: 14, padding: '20px 20px 16px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: 'white' }}>💣 Minefield</div>
                <div style={{ fontSize: 12, color: '#8899bb', marginTop: 4 }}>Find every country hitting a stat threshold · 3 lives</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  disabled={mineDailyLoading || !players}
                  onClick={mineAlreadyPlayed ? viewMinefieldDailyLeaderboard : startMinefieldDailyGame}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 10,
                    border: `2px solid ${mineAlreadyPlayed ? '#1e5c2e' : '#dc2626'}`,
                    background: mineAlreadyPlayed ? 'rgba(34,197,94,0.07)' : 'rgba(220,38,38,0.10)',
                    color: 'white', cursor: (mineDailyLoading || !players) ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{mineAlreadyPlayed ? '✓ Played' : '⚡ Daily Challenge'}</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#8899bb' }}>{mineAlreadyPlayed ? 'View leaderboard' : mineDailyLoading ? 'Loading…' : today}</span>
                </button>
                <button
                  onClick={() => { setChallengeType('minefield'); setGameMode('freeplay'); setPhase('setup') }}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 10,
                    border: '2px solid #2a3d5e', background: 'transparent',
                    color: '#c0cde0', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>🎲 Free Play</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#4a5568' }}>Random continent</span>
                </button>
              </div>
              {mineDailyErr && <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0' }}>Failed to load — try again</p>}
              {showMineLobbyLb && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4a6fa0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today&apos;s Leaderboard</div>
                  {[...mineDailyLeaderboard].sort((a, b) => { if (a.won !== b.won) return a.won ? -1 : 1; return a.lives_lost - b.lives_lost }).length === 0
                    ? <p style={{ color: '#4a5568', fontSize: 13, margin: 0 }}>No scores yet today.</p>
                    : [...mineDailyLeaderboard].sort((a, b) => { if (a.won !== b.won) return a.won ? -1 : 1; return a.lives_lost - b.lives_lost }).map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2d4a', borderRadius: 6 }}>
                        <span style={{ fontSize: 12, color: '#4a5568', width: 18 }}>{i + 1}.</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: e.won ? 'white' : '#8899bb' }}>{e.player_name}</span>
                        <span style={{ fontSize: 11, color: e.won ? '#22c55e' : '#ef4444' }}>{e.won ? '✓' : '✗'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: e.lives_lost === 0 ? '#4ade80' : e.lives_lost <= 2 ? '#22c55e' : '#ef4444' }}>
                          {e.lives_lost === 0 ? 'Perfect' : `${e.lives_lost} mistake${e.lives_lost !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* ── Card 1: Continent Challenge ── */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2d4a', borderRadius: 14, padding: '20px 20px 16px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: 'white' }}>🌍 Continent Challenge</div>
                <div style={{ fontSize: 12, color: '#8899bb', marginTop: 4 }}>Pick players from across a continent · Hit the target</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Continent Daily */}
                <button
                  disabled={cntDailyLoading || !players}
                  onClick={cntAlreadyPlayed ? viewContinentDailyLeaderboard : startContinentDailyGame}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 10,
                    border: `2px solid ${cntAlreadyPlayed ? '#1e5c2e' : '#dc2626'}`,
                    background: cntAlreadyPlayed ? 'rgba(34,197,94,0.07)' : 'rgba(220,38,38,0.10)',
                    color: 'white', cursor: (cntDailyLoading || !players) ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>
                    {cntAlreadyPlayed ? '✓ Played' : '⚡ Daily Challenge'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#8899bb' }}>
                    {cntAlreadyPlayed ? `View leaderboard` : cntDailyLoading ? 'Loading…' : today}
                  </span>
                </button>
                {/* Continent Free Play */}
                <button
                  onClick={() => { setChallengeType('continent'); setGameMode('freeplay'); setPhase('setup') }}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 10,
                    border: '2px solid #2a3d5e', background: 'transparent',
                    color: '#c0cde0', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>🎲 Free Play</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#4a5568' }}>Random continent</span>
                </button>
              </div>
              {cntDailyErr && <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0' }}>Failed to load — try again</p>}
              {showCntLobbyLb && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4a6fa0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today&apos;s Leaderboard</div>
                  {sortedCntLb.length === 0
                    ? <p style={{ color: '#4a5568', fontSize: 13, margin: 0 }}>No scores yet today.</p>
                    : sortedCntLb.map(lbRow)
                  }
                </div>
              )}
            </div>

            {/* ── Card 2: Complete the Chain ── */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2d4a', borderRadius: 14, padding: '20px 20px 16px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: 'white' }}>🔗 Complete the Chain</div>
                <div style={{ fontSize: 12, color: '#8899bb', marginTop: 4 }}>Chain neighbouring countries · Hit the target</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Chain Daily */}
                <button
                  disabled={dailyLoading || !players}
                  onClick={alreadyPlayed ? viewDailyLeaderboard : startDailyGame}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 10,
                    border: `2px solid ${alreadyPlayed ? '#1e5c2e' : '#dc2626'}`,
                    background: alreadyPlayed ? 'rgba(34,197,94,0.07)' : 'rgba(220,38,38,0.10)',
                    color: 'white', cursor: (dailyLoading || !players) ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>
                    {alreadyPlayed ? '✓ Played' : '⚡ Daily Challenge'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#8899bb' }}>
                    {alreadyPlayed ? `View leaderboard` : dailyLoading ? 'Loading…' : today}
                  </span>
                </button>
                {/* Chain Free Play */}
                <button
                  onClick={() => { setChallengeType('chain'); setGameMode('freeplay'); setPhase('setup') }}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 10,
                    border: '2px solid #2a3d5e', background: 'transparent',
                    color: '#c0cde0', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>🎲 Free Play</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#4a5568' }}>Random route</span>
                </button>
              </div>
              {dailyErr && <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0' }}>Failed to load — try again</p>}
              {showLobbyLb && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4a6fa0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today&apos;s Leaderboard</div>
                  {sortedLb.length === 0
                    ? <p style={{ color: '#4a5568', fontSize: 13, margin: 0 }}>No scores yet today.</p>
                    : sortedLb.map(lbRow)
                  }
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ── SETUP ──────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 520 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{challengeType === 'continent' ? '🌍' : '🔗'}</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 10px' }}>
              {challengeType === 'continent' ? 'Continent Challenge' : challengeType === 'minefield' ? '💣 Minefield' : 'Complete the Chain'}
            </h1>
            {challengeType === 'minefield' ? (
              <>
                <p style={{ color: '#8899bb', marginBottom: 8, lineHeight: 1.6 }}>
                  A continent, stat, and threshold are revealed. Find every country on the map where a player has hit that stat. 3 wrong picks and the game is over.
                </p>
                <p style={{ color: '#4a5568', fontSize: 12, marginBottom: 28 }}>
                  Easy: country name shown on hover · Hard: no name — click blind
                </p>
              </>
            ) : challengeType === 'continent' ? (
              <>
                <p style={{ color: '#8899bb', marginBottom: 8, lineHeight: 1.6 }}>
                  A continent, stat, and target are chosen at random. Click any countries from that continent, name a PL player from each, and fill the required number to win.
                </p>
                <p style={{ color: '#4a5568', fontSize: 12, marginBottom: 28 }}>
                  Wrong nationality = game over · Player must have at least 1 for the stat
                </p>
              </>
            ) : (
              <>
                <p style={{ color: '#8899bb', marginBottom: 8, lineHeight: 1.6 }}>
                  A chain of neighbouring countries is revealed on the map. Name a PL player from each one to advance. Hit the target score to win.
                </p>
                <p style={{ color: '#4a5568', fontSize: 12, marginBottom: 28 }}>
                  Wrong nationality = game over · 0 is valid if a player has 0 of that stat
                </p>
              </>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginBottom: 28 }}>
              {([
                { m: 'easy',   label: 'Easy',   sub: 'Country names shown · running total visible' },
                { m: 'medium', label: 'Medium', sub: 'No country names · running total visible' },
                { m: 'hard',   label: 'Hard',   sub: 'No country names · score revealed at end' },
              ] as const).map(({ m, label, sub }) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '10px 22px', borderRadius: 8, width: 320,
                  border: `2px solid ${mode === m ? '#dc2626' : '#2a3d5e'}`,
                  background: mode === m ? 'rgba(220,38,38,0.12)' : 'transparent',
                  color: mode === m ? 'white' : '#6b7fa3',
                  fontWeight: 700, cursor: 'pointer', fontSize: 13,
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                }}>
                  <span>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: mode === m ? '#8899bb' : '#4a5568' }}>{sub}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={() => setGameMode('lobby')} style={{ padding: '14px 20px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Lobby</button>
              <button onClick={challengeType === 'continent' ? startContinent : challengeType === 'minefield' ? startMinefield : startGame} disabled={!players} style={{
                padding: '14px 44px', background: players ? '#dc2626' : '#2a3d5e',
                color: 'white', border: 'none', borderRadius: 10,
                fontSize: 16, fontWeight: 800, cursor: players ? 'pointer' : 'default',
              }}>
                {loadErr ? 'Failed to load — refresh' : !players ? 'Loading data…' : 'Start Game'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── MINEFIELD WON ─────────────────────────────────────────────────
  if (phase === 'won' && challengeType === 'minefield') {
    const rating = mineLivesLost === 0 ? { emoji: '💎', label: 'Perfect — no mistakes!' }
      : mineLivesLost === 1 ? { emoji: '⭐', label: 'Great — 1 mistake' }
      : { emoji: '👍', label: 'Good — 2 mistakes' }
    return (
      <div style={page}>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ ...WRAP, textAlign: 'center' as const, maxWidth: 560 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{rating.emoji}</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 4px' }}>{rating.label}</h2>
            <p style={{ color: '#8899bb', marginBottom: 24 }}>
              Found all <strong style={{ color: 'white' }}>{mineTargets.size}</strong> countries in {CONTINENT_NAMES[mineContinent]} {mineCategory ? mineSummaryText(mineCategory) : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
              {Object.entries(minePicked).map(([code, { player, val, count }], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '8px 14px' }}>
                  {flagImg(code, 18)}
                  <span style={{ fontSize: 11, color: '#8899bb', width: 80, textAlign: 'left' as const }}>{COUNTRY_NAMES[code] ?? code}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'white', textAlign: 'left' as const }}>{player}{val !== null ? ` (${val})` : ''}</span>
                  {count > 1 && <span style={{ fontSize: 11, color: '#4a5568' }}>+{count - 1} more</span>}
                </div>
              ))}
            </div>
            {gameMode === 'daily' ? (
              <MineDailyEndPanel
                won={true} livesLost={mineLivesLost}
                playerName={mineDailyPlayerName} setPlayerName={setMineDailyPlayerName}
                scoreSubmitted={mineDailyScoreSubmitted}
                onSubmit={() => submitMinefieldDailyScore(true, mineLivesLost)}
                leaderboard={mineDailyLeaderboard}
                onPlayMore={() => { setGameMode('lobby'); setPhase('setup') }}
              />
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={startMinefield} style={{ padding: '12px 32px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Play Again</button>
                <button onClick={() => setPhase('setup')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Change Mode</button>
                <button onClick={() => setGameMode('lobby')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Lobby</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── MINEFIELD FAILED ──────────────────────────────────────────────
  if (phase === 'failed' && challengeType === 'minefield') {
    const remaining = [...mineTargets].filter(c => !minePicked[c] && !mineWrong.includes(c))
    return (
      <div style={page}>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ ...WRAP, textAlign: 'center' as const, maxWidth: 520 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💣</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>Game Over</h2>
            <p style={{ color: '#ef4444', marginBottom: 16, fontSize: 14 }}>3 wrong picks — you hit a mine</p>
            <p style={{ color: '#8899bb', fontSize: 13, marginBottom: 20 }}>
              Found <strong style={{ color: 'white' }}>{Object.keys(minePicked).length}</strong> of <strong style={{ color: 'white' }}>{mineTargets.size}</strong> countries in {CONTINENT_NAMES[mineContinent]} {mineCategory ? mineSummaryText(mineCategory) : ''}
            </p>
            {mineWrong.length > 0 && (
              <div style={{ marginBottom: 16, textAlign: 'left' as const }}>
                <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 6 }}>Wrong picks:</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {mineWrong.map((c, i) => {
                    const ps = playersByNat[c] ?? []
                    const best = mineCategory?.kind === 'statThreshold' && ps.length
                      ? ps.reduce((a, b) => statVal(b, mineCategory.stat) > statVal(a, mineCategory.stat) ? b : a)
                      : null
                    return (
                      <div key={i} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {flagImg(c, 14)}
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>{COUNTRY_NAMES[c] ?? c}</span>
                        {best && mineCategory?.kind === 'statThreshold' && <span style={{ color: '#4a5568' }}>· best: {best.name} ({statVal(best, mineCategory.stat)})</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {remaining.length > 0 && (
              <div style={{ marginBottom: 24, textAlign: 'left' as const }}>
                <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 6 }}>Countries you missed:</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {remaining.map((c, i) => {
                    const cat = mineCategory
                    const ps  = (playersByNat[c] ?? []).filter(p => cat ? mineCategoryMatches(p, cat) : false)
                    const best = ps.length ? ps.reduce((a, b) => {
                      if (cat?.kind === 'scoredFor') return (b.teamGoals[cat.team] ?? 0) > (a.teamGoals[cat.team] ?? 0) ? b : a
                      if (cat?.kind === 'statThreshold') return statVal(b, cat.stat) > statVal(a, cat.stat) ? b : a
                      return a
                    }) : null
                    const bestVal = best && cat?.kind === 'statThreshold' ? statVal(best, cat.stat)
                      : best && cat?.kind === 'scoredFor' ? (best.teamGoals[cat.team] ?? 0) : null
                    return (
                      <div key={i} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {flagImg(c, 14)}
                        <span style={{ color: '#5b8fd4', fontWeight: 700 }}>{COUNTRY_NAMES[c] ?? c}</span>
                        {best && <span style={{ color: '#4a5568' }}>· {best.name}{bestVal !== null ? ` (${bestVal})` : ''}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {gameMode === 'daily' ? (
              <MineDailyEndPanel
                won={false} livesLost={3}
                playerName={mineDailyPlayerName} setPlayerName={setMineDailyPlayerName}
                scoreSubmitted={mineDailyScoreSubmitted}
                onSubmit={() => submitMinefieldDailyScore(false, 3)}
                leaderboard={mineDailyLeaderboard}
                onPlayMore={() => { setGameMode('lobby'); setPhase('setup') }}
              />
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={startMinefield} style={{ padding: '12px 32px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Play Again</button>
                <button onClick={() => setGameMode('lobby')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Lobby</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── WON ────────────────────────────────────────────────────────────
  if (phase === 'won') {
    const isChain  = challengeType === 'chain'
    const total    = isChain ? runningTotal : cntRunning
    const pctFinal = isChain ? pct : cntPct
    const pctColor = (d: number) => d <= 10 ? '#4ade80' : d <= 20 ? '#22c55e' : d <= 30 ? '#eab308' : d <= 40 ? '#f97316' : '#ef4444'
    const cntEntries = Object.entries(cntFilled).map(([code, e]) => ({ code, ...e }))
    return (
      <div style={page}>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ ...WRAP, textAlign: 'center' as const, maxWidth: 560 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{scoreLabel().split(' ')[0]}</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 4px' }}>{scoreLabel().slice(2)}</h2>
            <p style={{ color: '#8899bb', marginBottom: 24 }}>
              Total: <strong style={{ color: 'white' }}>{total}</strong> {STAT_LABELS[stat].toLowerCase()}&nbsp;·&nbsp;
              Target: <strong style={{ color: '#f59e0b' }}>{target}</strong>&nbsp;·&nbsp;
              <span style={{ color: pctColor(Math.abs(pctFinal - 100)) }}>{Math.abs(pctFinal - 100)}% away</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
              {(isChain ? completed : cntEntries).map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '8px 14px' }}>
                  {flagImg(c.code, 18)}
                  <span style={{ fontSize: 11, color: '#8899bb', width: 80, textAlign: 'left' as const }}>{COUNTRY_NAMES[c.code] ?? c.code}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'white', textAlign: 'left' as const }}>{c.player}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{c.val}</span>
                </div>
              ))}
            </div>
            {gameMode === 'daily' ? (
              <DailyEndPanel
                phase="won" pct={pctFinal} runningTotal={total} target={target} mode={mode}
                playerName={isChain ? playerName : cntDailyPlayerName}
                setPlayerName={isChain ? setPlayerName : setCntDailyPlayerName}
                scoreSubmitted={isChain ? scoreSubmitted : cntDailyScoreSubmitted}
                onSubmit={isChain
                  ? () => submitDailyScore(true, total, target, pctFinal, mode)
                  : () => submitContinentDailyScore(true, total, target, pctFinal)
                }
                leaderboard={isChain ? leaderboard : cntDailyLeaderboard}
                onPlayMore={() => { setGameMode('lobby'); setPhase('setup') }}
              />
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={isChain ? startGame : startContinent} style={{ padding: '12px 32px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Play Again</button>
                <button onClick={() => setPhase('setup')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Change Mode</button>
                <button onClick={() => setGameMode('lobby')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Lobby</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── FAILED ─────────────────────────────────────────────────────────
  if (phase === 'failed') {
    const isChain    = challengeType === 'chain'
    const reason     = isChain ? failReason : cntFail
    const cntEntries = Object.entries(cntFilled).map(([code, e]) => ({ code, ...e }))
    const progress   = isChain ? completed : cntEntries
    return (
      <div style={page}>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ ...WRAP, textAlign: 'center' as const, maxWidth: 520 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>❌</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>Game Over</h2>
            <p style={{ color: '#ef4444', marginBottom: 24, fontSize: 14 }}>{reason}</p>
            {progress.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 24, textAlign: 'left' as const }}>
                <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 4 }}>Progress before fail:</div>
                {progress.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '6px 12px' }}>
                    {flagImg(c.code, 16)}
                    <span style={{ fontSize: 11, color: '#8899bb', width: 72 }}>{COUNTRY_NAMES[c.code] ?? c.code}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'white' }}>{c.player}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>{c.val}</span>
                  </div>
                ))}
              </div>
            )}
            {isChain && route && (
              <p style={{ color: '#4a5568', fontSize: 12, marginBottom: 24 }}>
                Full route: {route.countries.map(c => COUNTRY_NAMES[c] ?? c).join(' → ')}
              </p>
            )}
            {gameMode === 'daily' ? (
              <DailyEndPanel
                phase="failed" pct={isChain ? pct : cntPct} runningTotal={isChain ? runningTotal : cntRunning} target={target} mode={mode}
                playerName={isChain ? playerName : cntDailyPlayerName}
                setPlayerName={isChain ? setPlayerName : setCntDailyPlayerName}
                scoreSubmitted={isChain ? scoreSubmitted : cntDailyScoreSubmitted}
                onSubmit={isChain
                  ? () => submitDailyScore(false, runningTotal, target, pct, mode)
                  : () => submitContinentDailyScore(false, cntRunning, target, cntPct)
                }
                leaderboard={isChain ? leaderboard : cntDailyLeaderboard}
                onPlayMore={() => { setGameMode('lobby'); setPhase('setup') }}
              />
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={isChain ? startGame : startContinent} style={{ padding: '12px 32px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Try Again</button>
                <button onClick={() => setPhase('setup')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Change Mode</button>
                <button onClick={() => setGameMode('lobby')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Lobby</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── MINEFIELD PLAYING ─────────────────────────────────────────────
  if (phase === 'playing' && challengeType === 'minefield') {
    const foundCount   = Object.keys(minePicked).length
    const totalTargets = mineTargets.size
    const showMineName = mode === 'easy'
    const hearts       = [0, 1, 2].map(i => i < (3 - mineLivesLost) ? '#ef4444' : '#374151')

    return (
      <div style={{ ...page, display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        `}</style>
        <NavBar />
        <div style={WRAP}>

          {/* ── Top actions ── */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '10px 0 4px' }}>
            {gameMode !== 'daily' && <button onClick={() => setPhase('setup')} style={{ padding: '5px 14px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Change Mode</button>}
            <button onClick={startMinefield} style={{ padding: '5px 14px', background: 'transparent', color: '#dc2626', border: '1px solid #7f1d1d', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Restart</button>
          </div>

          {/* ── Challenge summary ── */}
          <div style={{ padding: '14px 0 10px' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.3 }}>
              Find all <span style={{ color: '#f59e0b' }}>{totalTargets}</span> <span style={{ color: '#3b82f6' }}>{CONTINENT_NAMES[mineContinent]}</span> countries {mineCategory ? mineSummaryText(mineCategory) : ''}
            </div>
          </div>

          {/* ── Banner ── */}
          <div style={{ padding: '4px 0 10px', borderBottom: '1px solid #1e2d4a' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d4a', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Found</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#8899bb', lineHeight: 1 }}>{foundCount}<span style={{ fontSize: 13, fontWeight: 500, color: '#4a5568' }}>/{totalTargets}</span></div>
              </div>
              <div style={{ flex: 2, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#6d5ca0', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Category</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'white', lineHeight: 1.2 }}>{mineCategory ? mineCategoryBannerLabel(mineCategory) : ''}</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#7f1d1d', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Lives</div>
                <div style={{ fontSize: 18, lineHeight: 1 }}>
                  {hearts.map((c, i) => <span key={i} style={{ color: c, marginRight: 2 }}>♥</span>)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Map ── */}
          <div style={{ background: '#04101f', borderRadius: 10, overflow: 'hidden', margin: '12px 0 12px', border: '1px solid #1e2d4a', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[{ label: '+', fn: () => setZoom(z => Math.min(z * 1.4, 8)) }, { label: '−', fn: () => setZoom(z => Math.max(z / 1.4, 0.2)) }].map(({ label, fn }) => (
                <button key={label} onClick={fn} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', border: '1px solid #2a3d5e', borderRadius: 6, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</button>
              ))}
            </div>
            {mounted && (
              <ComposableMap
                projectionConfig={{ scale: proj.scale * zoom, center: proj.center }}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies
                      .filter((geo: any) => !SKIP_GEOS.has(Number(geo.id)))
                      .map((geo: any) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={mineGeoFill(geo.id)}
                          stroke={mineGeoStroke(geo.id)}
                          strokeWidth={mineGeoStrokeW(geo.id)}
                          onClick={() => handleMineClick(geo.id)}
                          style={{
                            default: { outline: 'none', cursor: mineGeoCursor(geo.id) },
                            hover:   { outline: 'none', cursor: mineGeoCursor(geo.id), opacity: 0.85 },
                            pressed: { outline: 'none' },
                          }}
                        />
                      ))
                  }
                </Geographies>
              </ComposableMap>
            )}
          </div>

          {/* ── Pending / instructions ── */}
          <div style={{ paddingBottom: 24, minHeight: 80 }}>
            {minePending ? (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8899bb', marginBottom: 10 }}>Confirm your pick:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {flagImg(minePending, 24)}
                    <span style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>
                      {showMineName ? (COUNTRY_NAMES[minePending] ?? minePending) : '???'}
                    </span>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={() => setMinePending(null)} style={{ padding: '8px 16px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={confirmMinePick} style={{ padding: '8px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 7, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Confirm Pick</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#4a5568', padding: '12px 0' }}>
                Click a country on the map — confirm to lock in your pick
              </div>
            )}
            {(Object.keys(minePicked).length > 0 || mineWrong.length > 0) && (
              <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' as const }}>
                {Object.entries(minePicked).map(([code, { player, val, count }], i) => (
                  <div key={`ok-${i}`} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {flagImg(code, 14)}
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{COUNTRY_NAMES[code] ?? code}</span>
                    <span style={{ color: '#4a5568' }}>·</span>
                    <span style={{ color: '#c0cde0' }}>{player}{val !== null ? ` (${val})` : ''}</span>
                    {count > 1 && <span style={{ color: '#4a5568', fontSize: 10 }}>+{count - 1}</span>}
                  </div>
                ))}
                {mineWrong.map((code, i) => {
                  const ps = playersByNat[code] ?? []
                  const best = mineCategory?.kind === 'statThreshold' && ps.length
                    ? ps.reduce((a, b) => statVal(b, mineCategory.stat) > statVal(a, mineCategory.stat) ? b : a)
                    : null
                  return (
                    <div key={`wrong-${i}`} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {flagImg(code, 14)}
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{COUNTRY_NAMES[code] ?? code}</span>
                      {best && mineCategory?.kind === 'statThreshold' && <span style={{ color: '#4a5568' }}>· best: {best.name} ({statVal(best, mineCategory.stat)})</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ── CONTINENT PLAYING ──────────────────────────────────────────────
  if (phase === 'playing' && challengeType === 'continent') {
    const filledCount = Object.keys(cntFilled).length
    const cntEntries  = Object.entries(cntFilled).map(([code, e]) => ({ code, ...e }))
    const showCntName = mode === 'easy'
    const cntLabel    = cntSelected
      ? (showCntName ? (COUNTRY_NAMES[cntSelected] ?? cntSelected) : 'the highlighted country')
      : null

    return (
      <div style={{ ...page, display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
          .atw-sug:hover { background: rgba(255,255,255,0.07) !important; }
        `}</style>
        <NavBar />
        <div style={WRAP}>

          {/* ── Top actions ── */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '10px 0 4px' }}>
            <button onClick={() => setPhase('setup')} style={{ padding: '5px 14px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Change Mode</button>
            <button onClick={startContinent} style={{ padding: '5px 14px', background: 'transparent', color: '#dc2626', border: '1px solid #7f1d1d', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Restart</button>
          </div>

          {/* ── Challenge summary ── */}
          <div style={{ padding: '14px 0 10px' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.25 }}>
              Pick players from <span style={{ color: '#3b82f6' }}>{cntNeeded} different {CONTINENT_NAMES[cntContinent]} countries</span> with a combined <span style={{ color: '#f59e0b' }}>{target} {STAT_LABELS[stat].toLowerCase()}</span>
            </div>
          </div>

          {/* ── Banner ── */}
          <div style={{ padding: '4px 0 10px', borderBottom: '1px solid #1e2d4a' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              {/* Countries counter — first */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d4a', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Use {cntNeeded} countries</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#8899bb', lineHeight: 1 }}>{filledCount}<span style={{ fontSize: 13, fontWeight: 500, color: '#4a5568' }}>/{cntNeeded} used</span></div>
              </div>
              {/* Stat */}
              <div style={{ flex: 1, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#4a6fa0', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Stat</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'white', lineHeight: 1 }}>{STAT_LABELS[stat]}</div>
              </div>
              {/* Target */}
              <div style={{ flex: 1, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#a07830', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Target</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{target}</div>
              </div>
              {/* Running total — hidden in hard mode */}
              {mode !== 'hard' && (
                <div style={{ flex: 1, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#2a6645', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Score</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{cntRunning}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Continent label ── */}
          <div style={{ padding: '8px 0 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {CONTINENT_NAMES[cntContinent] ?? cntContinent}
            </span>
          </div>

          {/* ── Map ── */}
          <div style={{ background: '#04101f', borderRadius: 10, overflow: 'hidden', margin: '8px 0 12px', border: '1px solid #1e2d4a', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[{ label: '+', fn: () => setZoom(z => Math.min(z * 1.4, 8)) }, { label: '−', fn: () => setZoom(z => Math.max(z / 1.4, 0.2)) }].map(({ label, fn }) => (
                <button key={label} onClick={fn} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', border: '1px solid #2a3d5e', borderRadius: 6, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</button>
              ))}
            </div>
            {mounted && (
              <ComposableMap
                projectionConfig={{ scale: proj.scale * zoom, center: proj.center }}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies
                      .filter((geo: any) => !SKIP_GEOS.has(Number(geo.id)))
                      .map((geo: any) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={cntGeoFill(geo.id)}
                          stroke={cntGeoStroke(geo.id)}
                          strokeWidth={cntGeoStrokeW(geo.id)}
                          onClick={() => handleCntClick(geo.id)}
                          style={{
                            default: { outline: 'none', cursor: cntGeoCursor(geo.id) },
                            hover:   { outline: 'none', cursor: cntGeoCursor(geo.id), opacity: 0.85 },
                            pressed: { outline: 'none' },
                          }}
                        />
                      ))
                  }
                </Geographies>
              </ComposableMap>
            )}
          </div>

          {/* ── Input ── */}
          <div style={{ paddingBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8899bb', marginBottom: 8 }}>
              {cntLabel
                ? <>Name a PL player from <span style={{ color: '#f59e0b', fontWeight: 900 }}>{cntLabel}</span></>
                : <span style={{ color: '#4a5568' }}>Click a country on the map to pick it</span>
              }
            </div>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                placeholder={cntLabel ? 'Type a player name…' : 'Select a country first…'}
                disabled={!cntSelected}
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  background: cntSelected ? '#111827' : '#0a0f1e',
                  border: `1px solid ${cntSelected ? '#2a3d5e' : '#151f30'}`,
                  borderRadius: 8, padding: '10px 14px',
                  color: cntSelected ? 'white' : '#2a3d5e',
                  fontSize: 16, outline: 'none', fontFamily: 'inherit',
                  cursor: cntSelected ? 'text' : 'default',
                }}
              />
              {suggestions.length > 0 && cntSelected && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #2a3d5e', borderRadius: 8, marginBottom: 4, zIndex: 50, overflow: 'hidden' }}>
                  {suggestions.map((name, i) => (
                    <div key={name} className="atw-sug"
                      onMouseDown={() => { submitContinent(name) }}
                      style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: i === suggActive ? 'white' : '#c0cde0', background: i === suggActive ? 'rgba(255,255,255,0.08)' : 'transparent', borderBottom: i < suggestions.length - 1 ? '1px solid #1e2d4a' : 'none' }}>
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cntEntries.length > 0 && (
              <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' as const }}>
                {cntEntries.map((c, i) => (
                  <div key={i} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {flagImg(c.code, 14)}
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{COUNTRY_NAMES[c.code] ?? c.code}</span>
                    <span style={{ color: '#4a5568' }}>·</span>
                    <span style={{ color: '#c0cde0' }}>{c.player}</span>
                    {mode !== 'hard' && <span style={{ color: '#22c55e', fontWeight: 800, marginLeft: 4 }}>{c.val}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ── PLAYING ────────────────────────────────────────────────────────
  const showCountryName = mode === 'easy' || revealed
  const countryLabel = currentCode
    ? (showCountryName ? (COUNTRY_NAMES[currentCode] ?? currentCode) : '???')
    : ''

  return (
    <div style={{ ...page, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        .atw-sug:hover { background: rgba(255,255,255,0.07) !important; }
      `}</style>
      <NavBar />

      <div style={WRAP}>

        {/* ── Top actions ── */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '10px 0 4px' }}>
          {gameMode === 'daily' ? (
            <button onClick={() => { setGameMode('lobby'); setPhase('setup') }} style={{ padding: '5px 14px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>← Lobby</button>
          ) : (
            <>
              <button onClick={() => setPhase('setup')} style={{ padding: '5px 14px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Change Mode</button>
              <button onClick={startGame} style={{ padding: '5px 14px', background: 'transparent', color: '#dc2626', border: '1px solid #7f1d1d', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Restart</button>
            </>
          )}
        </div>

        {/* ── Banner ── */}
        <div style={{ padding: '12px 0 10px', borderBottom: '1px solid #1e2d4a' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            {/* Stat category */}
            <div style={{ flex: 1, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#4a6fa0', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Stat</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'white', lineHeight: 1 }}>{STAT_LABELS[stat]}</div>
            </div>
            {/* Target */}
            <div style={{ flex: 1, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#a07830', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Target</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{target}</div>
            </div>
            {/* Running total — hidden in hard mode */}
            {mode !== 'hard' && (
              <div style={{ flex: 1, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#2a6645', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Score</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{runningTotal}</div>
              </div>
            )}
            {/* Step counter */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d4a', borderRadius: 10, padding: '10px 14px', minWidth: 56, textAlign: 'center' as const }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Step</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#8899bb', lineHeight: 1 }}>{step + 1}<span style={{ fontSize: 11, fontWeight: 500, color: '#4a5568' }}>/{route!.countries.length}</span></div>
            </div>
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ background: '#04101f', borderRadius: 10, overflow: 'hidden', margin: '12px 0', border: '1px solid #1e2d4a', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[{ label: '+', fn: () => setZoom(z => Math.min(z * 1.4, 8)) }, { label: '−', fn: () => setZoom(z => Math.max(z / 1.4, 0.2)) }].map(({ label, fn }) => (
              <button key={label} onClick={fn} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', border: '1px solid #2a3d5e', borderRadius: 6, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</button>
            ))}
          </div>
          {mounted && (
            <ComposableMap
              projectionConfig={{ scale: proj.scale * zoom, center: proj.center }}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies
                    .filter((geo: any) => !SKIP_GEOS.has(Number(geo.id)))
                    .map((geo: any) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={geoFill(geo.id)}
                        stroke={geoStroke(geo.id)}
                        strokeWidth={geoStrokeW(geo.id)}
                        style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                      />
                    ))
                }
              </Geographies>
            </ComposableMap>
          )}
        </div>

        {/* ── Input ── */}
        <div style={{ paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8899bb' }}>
              {mode === 'easy' || revealed
                ? <>Name a PL player from <span style={{ color: '#f59e0b', fontWeight: 900 }}>{countryLabel}</span></>
                : <>Name a PL player from the <span style={{ color: '#f59e0b', fontWeight: 900 }}>highlighted country</span></>
              }
            </div>
            {mode !== 'easy' && !revealed && (
              <button onClick={() => setRevealed(true)} style={{ flexShrink: 0, padding: '4px 12px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Reveal countries
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Type a player name…"
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                background: '#111827', border: '1px solid #2a3d5e',
                borderRadius: 8, padding: '10px 14px',
                color: 'white', fontSize: 16, outline: 'none', fontFamily: 'inherit',
              }}
            />
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #2a3d5e', borderRadius: 8, marginBottom: 4, zIndex: 50, overflow: 'hidden' }}>
                {suggestions.map((name, i) => (
                  <div key={name} className="atw-sug"
                    onMouseDown={() => submit(name)}
                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: i === suggActive ? 'white' : '#c0cde0', background: i === suggActive ? 'rgba(255,255,255,0.08)' : 'transparent', borderBottom: i < suggestions.length - 1 ? '1px solid #1e2d4a' : 'none' }}>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {completed.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' as const }}>
              {completed.map((c, i) => (
                <div key={i} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {flagImg(c.code, 14)}
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{COUNTRY_NAMES[c.code] ?? c.code}</span>
                  <span style={{ color: '#4a5568' }}>·</span>
                  <span style={{ color: '#c0cde0' }}>{c.player}</span>
                  {mode !== 'hard' && <span style={{ color: '#22c55e', fontWeight: 800, marginLeft: 4 }}>{c.val}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ComposableMap, Geographies, Geography } = require('react-simple-maps')
import NavBar from './NavBar'
import {
  ROUTES, COUNTRY_NAMES, FIFA_TO_ISO, STAT_LABELS, STAT_KEYS,
  type StatKey, type ATWRoute,
} from '@/data/atw-routes'
import type { ATWPlayer } from '@/app/api/around-the-world/route'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

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
  // Middle East
  SYR: [38.5,  35.0], LBN: [35.9,  33.9], ISR: [35.2,  31.5],
  JOR: [36.5,  30.6], IRQ: [44.4,  33.2], IRN: [53.7,  32.7],
  KOR: [127.8, 35.9], JPN: [138.3, 36.5],
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

function statVal(p: ATWPlayer, s: StatKey): number {
  if (s === 'goals')        return p.goals
  if (s === 'goalsAssists') return p.goals + p.assists
  if (s === 'games')        return p.games
  if (s === 'yellowCards')  return p.yellowCards
  return 0
}

type Step = { code: string; player: string; val: number }
type Phase = 'setup' | 'playing' | 'won' | 'failed'

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

function routeIsValid(countries: string[]): boolean {
  for (let i = 0; i < countries.length - 1; i++) {
    const a = countries[i], b = countries[i + 1]
    if (!BORDERS[a]?.includes(b) && !BORDERS[b]?.includes(a)) return false
  }
  return true
}

const WRAP = { maxWidth: 560, margin: '0 auto', width: '100%', padding: '0 20px', boxSizing: 'border-box' as const }

export default function AroundTheWorld() {
  const [mounted,    setMounted]    = useState(false)
  const [players,    setPlayers]    = useState<ATWPlayer[] | null>(null)
  const [loadErr,    setLoadErr]    = useState(false)

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
      if (!m[p.nat]) m[p.nat] = []
      m[p.nat].push(p)
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
    if (p.nat !== currentCode) {
      const got  = COUNTRY_NAMES[p.nat]  ?? p.nat
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
    if (e.key === 'Enter')     { e.preventDefault(); if (suggActive >= 0 && suggestions[suggActive]) submit(suggestions[suggActive]); else if (input.trim()) submit(input) }
    if (e.key === 'Escape')    { setSuggestions([]); setSuggActive(-1) }
  }

  const routeSet     = useMemo(() => new Set(route?.countries ?? []), [route])
  const completedSet = useMemo(() => new Set(completed.map(c => c.code)), [completed])
  const currentCode  = route ? route.countries[step] : null
  const runningTotal = completed.reduce((s, c) => s + c.val, 0)
  const diff         = runningTotal - target
  const pct          = target > 0 ? Math.round((runningTotal / target) * 100) : 0

  // Normalise: TopoJSON zero-pads codes < 100 (e.g. "056" for Belgium)
  function norm(id: string | number) { return String(Number(id)) }

  function geoFill(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      if (currentCode && UK_NATIONS.has(currentCode)) return 'rgba(245,158,11,0.22)'
      if ([...completedSet].some(c => UK_NATIONS.has(c))) return 'rgba(34,197,94,0.28)'
      if ([...routeSet].some(c => UK_NATIONS.has(c)))    return 'rgba(59,130,246,0.14)'
      return '#111f35'
    }
    const fifa = ISO_TO_FIFA[n]
    if (!fifa) return '#111f35'
    if (completedSet.has(fifa)) return 'rgba(34,197,94,0.28)'
    if (fifa === currentCode)   return 'rgba(245,158,11,0.22)'
    if (routeSet.has(fifa))     return 'rgba(59,130,246,0.14)'
    return '#111f35'
  }
  function geoStroke(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      if (currentCode && UK_NATIONS.has(currentCode)) return '#f59e0b'
      if ([...completedSet].some(c => UK_NATIONS.has(c))) return '#22c55e'
      if ([...routeSet].some(c => UK_NATIONS.has(c)))    return '#4a7fc0'
      return '#1e2d4a'
    }
    const fifa = ISO_TO_FIFA[n]
    if (!fifa) return '#1e2d4a'
    if (completedSet.has(fifa)) return '#22c55e'
    if (fifa === currentCode)   return '#f59e0b'
    if (routeSet.has(fifa))     return '#4a7fc0'
    return '#1e2d4a'
  }
  function geoStrokeW(id: string | number) {
    const n = norm(id)
    if (n === '826') {
      if (currentCode && UK_NATIONS.has(currentCode)) return 1.4
      if ([...routeSet].some(c => UK_NATIONS.has(c))) return 0.8
      return 0.3
    }
    const fifa = ISO_TO_FIFA[n]
    if (!fifa) return 0.3
    if (fifa === currentCode) return 1.4
    if (routeSet.has(fifa))   return 0.8
    return 0.3
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

  // ── SETUP ──────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 520 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 10px' }}>
              Around the World in 80 Goals
            </h1>
            <p style={{ color: '#8899bb', marginBottom: 8, lineHeight: 1.6 }}>
              A chain of neighbouring countries is revealed on the map. Name a PL player from each one to advance. Hit the target score to win.
            </p>
            <p style={{ color: '#4a5568', fontSize: 12, marginBottom: 28 }}>
              Wrong nationality = game over · 0 is valid if a player has 0 of that stat
            </p>
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
            <button onClick={startGame} disabled={!players} style={{
              padding: '14px 44px', background: players ? '#dc2626' : '#2a3d5e',
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: 16, fontWeight: 800, cursor: players ? 'pointer' : 'default',
            }}>
              {loadErr ? 'Failed to load — refresh' : !players ? 'Loading data…' : 'Start Game'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── WON ────────────────────────────────────────────────────────────
  if (phase === 'won') {
    return (
      <div style={page}>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ ...WRAP, textAlign: 'center' as const, maxWidth: 560 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{scoreLabel().split(' ')[0]}</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 4px' }}>{scoreLabel().slice(2)}</h2>
            <p style={{ color: '#8899bb', marginBottom: 24 }}>
              Total: <strong style={{ color: 'white' }}>{runningTotal}</strong> {STAT_LABELS[stat].toLowerCase()}&nbsp;·&nbsp;
              Target: <strong style={{ color: '#f59e0b' }}>{target}</strong>&nbsp;·&nbsp;
              <span style={{ color: diff >= 0 ? '#22c55e' : '#ef4444' }}>
                {diff >= 0 ? `+${diff}` : diff} ({pct}%)
              </span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
              {completed.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '8px 14px' }}>
                  <span style={{ fontSize: 11, color: '#4a5568', width: 90, textAlign: 'right' as const }}>{COUNTRY_NAMES[c.code] ?? c.code}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'white', textAlign: 'left' as const }}>{c.player}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{c.val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={startGame} style={{ padding: '12px 32px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Play Again</button>
              <button onClick={() => setPhase('setup')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Change Mode</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── FAILED ─────────────────────────────────────────────────────────
  if (phase === 'failed') {
    return (
      <div style={page}>
        <NavBar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: 24 }}>
          <div style={{ ...WRAP, textAlign: 'center' as const, maxWidth: 520 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>❌</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>Game Over</h2>
            <p style={{ color: '#ef4444', marginBottom: 24, fontSize: 14 }}>{failReason}</p>
            {completed.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 24, textAlign: 'left' as const }}>
                <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 4 }}>Progress before fail:</div>
                {completed.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '6px 12px' }}>
                    <span style={{ fontSize: 11, color: '#4a5568', width: 80, textAlign: 'right' as const }}>{COUNTRY_NAMES[c.code] ?? c.code}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'white' }}>{c.player}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>{c.val}</span>
                  </div>
                ))}
              </div>
            )}
            {route && (
              <p style={{ color: '#4a5568', fontSize: 12, marginBottom: 24 }}>
                Full route: {route.countries.map(c => COUNTRY_NAMES[c] ?? c).join(' → ')}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={startGame} style={{ padding: '12px 32px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Try Again</button>
              <button onClick={() => setPhase('setup')} style={{ padding: '12px 32px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Change Mode</button>
            </div>
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
          <button onClick={() => setPhase('setup')} style={{ padding: '5px 14px', background: 'transparent', color: '#8899bb', border: '1px solid #2a3d5e', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Change Mode</button>
          <button onClick={startGame} style={{ padding: '5px 14px', background: 'transparent', color: '#dc2626', border: '1px solid #7f1d1d', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Restart</button>
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
        <div style={{ background: '#060e1c', borderRadius: 10, overflow: 'hidden', margin: '12px 0', border: '1px solid #1e2d4a', position: 'relative' }}>
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
                color: 'white', fontSize: 15, outline: 'none', fontFamily: 'inherit',
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
                <div key={i} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{COUNTRY_NAMES[c.code] ?? c.code}</span>
                  <span style={{ color: '#4a5568', margin: '0 4px' }}>·</span>
                  <span style={{ color: '#c0cde0' }}>{c.player}</span>
                  {mode !== 'hard' && <span style={{ color: '#22c55e', fontWeight: 800, marginLeft: 6 }}>{c.val}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

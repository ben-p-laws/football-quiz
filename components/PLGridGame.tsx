'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import NavBar from '@/components/NavBar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ───────────────────────────────────────────────────────────────────
type Slot    = { type: string; id: string; name: string; tooltip: string }
type Puzzle  = { id: string; date: string; rows: Slot[]; cols: Slot[]; answerCounts: Record<string, number> }
type Guess   = { name: string; score: number; rank: number; valid: boolean }
type Answer  = { player_name: string; combined_appearances: number; display_rank: number; score: number; rank: number; popularity_score: number; popularity_rank: number }
type LBEntry = { player_name: string; score: number; correct: number; rarity_score?: number | null; popularity_score?: number | null }

// ── Constants ────────────────────────────────────────────────────────────────
const INVALID_SCORE = 25
const MAX_GUESSES   = 9
const STORAGE_KEY   = (date: string, mode: string) => `topbins_grid_${date}_${mode}`
const SEEN_KEY      = (date: string) => `topbins_grid_${date}_seen`
const NAME_KEY      = 'topbins_grid_username'

const TEAM_OPTIONS = [
  'Arsenal', 'Aston Villa', 'Birmingham City', 'Blackburn Rovers', 'Blackpool',
  'Bolton Wanderers', 'Bradford City', 'Brentford', 'Brighton & Hove Albion', 'Burnley',
  'Cardiff City', 'Charlton Athletic', 'Chelsea', 'Coventry City', 'Crystal Palace',
  'Derby County', 'Everton', 'Fulham', 'Huddersfield Town', 'Hull City',
  'Ipswich Town', 'Leeds United', 'Leicester City', 'Liverpool', 'Manchester City',
  'Manchester United', 'Middlesbrough', 'Newcastle United', 'Norwich City',
  'Nottingham Forest', 'Oldham Athletic', 'Portsmouth', 'Queens Park Rangers',
  'Reading', 'Sheffield United', 'Sheffield Wednesday', 'Southampton', 'Stoke City',
  'Sunderland', 'Swansea City', 'Swindon Town', 'Tottenham Hotspur', 'Watford',
  'West Bromwich Albion', 'West Ham United', 'Wigan Athletic', 'Wimbledon',
  'Wolverhampton Wanderers',
]

const STAT_OPTIONS = [
  { value: 'won_pl',           label: 'PL Winner' },
  { value: 'won_3plus_pl',     label: '3+ PL Wins' },
  { value: 'relegated',        label: 'Relegated' },
  { value: 'golden_boot',      label: 'Golden Boot' },
  { value: 'golden_glove',     label: 'Golden Glove' },
  { value: 'scored_100_goals', label: '100+ PL Goals' },
]

type CustomSlot = { category: string; team: string }

// Abbreviate long team names so they fit in the grid header
const SHORT_NAMES: Record<string, string> = {
  'Manchester United':        'Man Utd',
  'Manchester City':          'Man City',
  'Tottenham Hotspur':        'Spurs',
  'Newcastle United':         'Newcastle',
  'West Ham United':          'West Ham',
  'Wolverhampton Wanderers':  'Wolves',
  'Sheffield Wednesday':      'Sheff Wed',
  'Sheffield United':         'Sheff Utd',
  'Queens Park Rangers':      'QPR',
  'Nottingham Forest':        'Nott\'m Forest',
  'Blackburn Rovers':         'Blackburn',
  'Leicester City':           'Leicester',
  'Crystal Palace':           'C. Palace',
  'Middlesbrough':            'Middlesbrough',
  'Huddersfield Town':        'Huddersfield',
  'Stoke City':               'Stoke',
  'Swansea City':             'Swansea',
  'Cardiff City':             'Cardiff',
  'Brighton & Hove Albion':   'Brighton',
  'Brentford':                'Brentford',
  'Oldham Athletic':          'Oldham',
  'Ipswich Town':             'Ipswich',
  'Coventry City':            'Coventry',
  'Sunderland':               'Sunderland',
  'West Bromwich Albion':     'West Brom',
  'Bolton Wanderers':         'Bolton',
  'Charlton Athletic':        'Charlton',
  'Birmingham City':          'Birmingham',
  'Wigan Athletic':           'Wigan',
}

function shortName(team: string): string {
  return SHORT_NAMES[team] ?? team
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLast14Days(): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return dates
}

function resolveSlot(type: string, ref: string | null): Slot {
  if (type === 'team') {
    return { type, id: ref!, name: shortName(ref!), tooltip: `Played for ${ref}` }
  }
  const slots: Record<string, Slot> = {
    won_pl:            { type, id: type, name: 'PL Winner',    tooltip: 'Won the Premier League at least once' },
    won_3plus_pl:      { type, id: type, name: '3+ PL Wins',   tooltip: 'Won the Premier League 3 or more times' },
    relegated:         { type, id: type, name: 'Relegated',    tooltip: 'Been relegated from the Premier League at least once' },
    golden_boot:       { type, id: type, name: 'Golden Boot',  tooltip: 'Won the PL Golden Boot (top scorer in a season)' },
    golden_glove:      { type, id: type, name: 'Golden Glove', tooltip: 'Won the PL Golden Glove (GK with most clean sheets in a season)' },
    scored_100_goals:  { type, id: type, name: '100+ PL Goals', tooltip: 'Scored 100 or more Premier League goals' },
  }
  return slots[type] ?? { type, id: type, name: type, tooltip: type }
}

// ── scoreLabel ───────────────────────────────────────────────────────────────
function scoreLabel(score: number, mode: 'rarity' | 'popularity'): string {
  if (mode === 'rarity') {
    if (score <= 2)  return 'Ultra Rare'
    if (score <= 6)  return 'Rare'
    if (score <= 12) return 'Average'
    return 'Common'
  } else {
    if (score <= 2)  return 'Top Pick'
    if (score <= 6)  return 'Popular'
    if (score <= 12) return 'Average'
    return 'Obscure'
  }
}

// ── scoreColor ───────────────────────────────────────────────────────────────
function scoreColor(rank: number) {
  const pct   = 1 - Math.min(rank - 1, 19) / 19
  const light = Math.round(15 + pct * 25)
  const green = Math.round(30 + pct * 60)
  return {
    bg:     `rgb(${light}, ${green + 10}, ${light})`,
    border: `rgb(${light * 2}, ${green + 40}, ${light * 2})`,
    text:   `rgb(${light * 2}, ${green + 80}, ${light * 2})`,
  }
}

// ── LoadingAnimation ─────────────────────────────────────────────────────────
function LoadingAnimation() {
  const [lit, setLit] = useState<number[]>([])
  const colors = ['#22c55e','#dc2626','#f97316','#3b82f6','#22c55e','#dc2626','#f97316','#3b82f6','#22c55e']
  useEffect(() => {
    let cancelled = false
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    async function cycle() {
      while (!cancelled) {
        setLit([])
        await delay(300)
        for (let i = 0; i < 9; i++) {
          if (cancelled) return
          setLit(prev => [...prev, i])
          await delay(120)
        }
        await delay(700)
      }
    }
    cycle()
    return () => { cancelled = true }
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, width: 120 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{
            width: 36, height: 36, borderRadius: 6,
            background: lit.includes(i) ? `${colors[i]}22` : '#0a0f1e',
            border: `2px solid ${lit.includes(i) ? colors[i] : '#1e2d4a'}`,
            transition: 'all 0.2s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#8899bb' }}>Loading Grid...</div>
    </div>
  )
}

// ── Style constants ──────────────────────────────────────────────────────────
const s = {
  page:  { background: '#0a0f1e', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  card:  { background: '#111827', border: '1px solid #1e2d4a', borderRadius: '12px', padding: '16px' } as React.CSSProperties,
  hdr:   { background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: '8px', textAlign: 'center' as const, fontSize: '11px', fontWeight: 700, color: '#f97316', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  input: { width: '100%', background: '#0a0f1e', border: '1px solid #2a3d5e', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' as const },
  pill:  (on: boolean, col = '#f97316') => ({ padding: '6px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? col : '#2a3d5e'}`, background: on ? col : 'transparent', color: on ? 'white' : '#8899bb' } as React.CSSProperties),
}

const tooltipStyle: React.CSSProperties = {
  display: 'none', position: 'absolute', background: '#0d1424', border: '1px solid #f97316',
  borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#fed7aa',
  zIndex: 20, whiteSpace: 'nowrap', marginTop: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
}

function showTip(e: React.MouseEvent) {
  const tip = (e.currentTarget as HTMLElement).querySelector('.tip') as HTMLElement | null
  if (tip) tip.style.display = 'block'
}
function hideTip(e: React.MouseEvent) {
  const tip = (e.currentTarget as HTMLElement).querySelector('.tip') as HTMLElement | null
  if (tip) tip.style.display = 'none'
}

const hdrSelectStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#f97316', fontSize: '10px',
  fontWeight: 700, textAlign: 'center', cursor: 'pointer', width: '100%',
  outline: 'none', textTransform: 'uppercase', letterSpacing: '0.04em',
}

// ── CustomSlotHeader ─────────────────────────────────────────────────────────
function CustomSlotHeader({ slot, placeholder, onSelect, minHeight }: {
  slot: CustomSlot
  placeholder: string
  onSelect: (cat: string, team: string) => void
  minHeight: number
}) {
  const [open, setOpen]           = useState(false)
  const [teamsOpen, setTeamsOpen] = useState(false)
  const resolved = slot.category && (slot.category !== 'team' || slot.team)
    ? resolveSlot(slot.category, slot.team || null)
    : null

  const item: React.CSSProperties = {
    padding: '9px 12px', fontSize: 12, color: 'white', cursor: 'pointer',
    borderBottom: '1px solid #1e2d4a', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
  }

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { setOpen(false); setTeamsOpen(false) }}>

      <div style={{ ...s.hdr, position: 'relative', minHeight, padding: '4px 6px', cursor: 'pointer' }}>
        <span style={{ color: resolved ? '#f97316' : '#4a5568' }}>
          {resolved?.name ?? placeholder}
        </span>
        {!resolved && <span style={{ fontSize: 8, color: '#4a5568', marginLeft: 2 }}>▾</span>}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          background: '#111827', border: '1px solid #2a3d5e', borderRadius: 8,
          minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.7)', overflow: 'visible',
        }}>
          {/* Teams with submenu */}
          <div style={{ position: 'relative' }}
            onMouseEnter={() => setTeamsOpen(true)}
            onMouseLeave={() => setTeamsOpen(false)}>
            <div style={{ ...item, background: teamsOpen ? '#1e2d4a' : 'transparent' }}>
              <span>Teams</span>
              <span style={{ color: '#8899bb', fontSize: 10 }}>›</span>
            </div>
            {teamsOpen && (
              <div style={{
                position: 'absolute', top: 0, left: '100%',
                background: '#111827', border: '1px solid #2a3d5e', borderRadius: 8,
                maxHeight: 260, overflowY: 'auto', minWidth: 210, zIndex: 201,
                boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
              }}>
                {TEAM_OPTIONS.map(t => (
                  <div key={t}
                    onMouseDown={() => { onSelect('team', t); setOpen(false); setTeamsOpen(false) }}
                    style={{ ...item }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e2d4a'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          {STAT_OPTIONS.map(o => (
            <div key={o.value}
              onMouseDown={() => { onSelect(o.value, ''); setOpen(false) }}
              style={{ ...item }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e2d4a'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PLGridGame() {
  const todayStr = getTodayStr()

  const [puzzle, setPuzzle]                   = useState<Puzzle | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(false)
  const [mode, setMode]                       = useState<'rarity' | 'popularity'>('rarity')
  const [rarityGuesses, setRarityGuesses]     = useState<Record<string, Guess>>({})
  const [popGuesses, setPopGuesses]           = useState<Record<string, Guess>>({})
  const [rarityScore, setRarityScore]         = useState(0)
  const [popScore, setPopScore]               = useState(0)
  const [activeCell, setActiveCell]           = useState<{ r: number; c: number } | null>(null)
  const [search, setSearch]                   = useState('')
  const [results, setResults]                 = useState<string[]>([])
  const [searching, setSearching]             = useState(false)
  const [rarityDone, setRarityDone]           = useState(false)
  const [popDone, setPopDone]                 = useState(false)
  const [answersSeen, setAnswersSeen]         = useState(false)
  const [cellAnswers, setCellAnswers]         = useState<Record<string, Answer[]>>({})
  const [overlayCell, setOverlayCell]         = useState<string | null>(null)
  const [overlayPos, setOverlayPos]           = useState<{ top: number } | null>(null)
  const [betterCell, setBetterCell]           = useState<string | null>(null)
  const [betterPos, setBetterPos]             = useState<{ top: number } | null>(null)
  const [betterList, setBetterList]           = useState<Array<{ name: string; rank: number; score: number }>>([])
  const [betterLoading, setBetterLoading]     = useState(false)
  const [leaderboard, setLeaderboard]         = useState<{ rarity: LBEntry[]; popularity: LBEntry[]; combined: LBEntry[] }>({ rarity: [], popularity: [], combined: [] })
  const [lbTab, setLbTab]                     = useState<'rarity' | 'popularity' | 'combined'>('combined')
  const [userName, setUserName]               = useState('')
  const [submitted, setSubmitted]             = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  // Date / mode state
  const [activeDate, setActiveDate]           = useState(todayStr)
  const [availableDates, setAvailableDates]   = useState<string[]>([todayStr])
  const [loadTrigger, setLoadTrigger]         = useState(0)
  const [gridMode, setGridMode]               = useState<'daily' | 'custom'>('daily')

  // Custom grid state
  const [customRows, setCustomRows]           = useState<[CustomSlot, CustomSlot, CustomSlot]>([{ category: '', team: '' }, { category: '', team: '' }, { category: '', team: '' }])
  const [customCols, setCustomCols]           = useState<[CustomSlot, CustomSlot, CustomSlot]>([{ category: '', team: '' }, { category: '', team: '' }, { category: '', team: '' }])
  const [customCells, setCustomCells]         = useState<Record<string, Answer[]>>({})
  const [customLoading, setCustomLoading]     = useState(false)
  const [customReady, setCustomReady]         = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)

  // ── Load puzzle + available dates via cached API route ────────────────────
  useEffect(() => {
    setLoading(true)
    setError(false)
    setPuzzle(null)
    setRarityGuesses({})
    setPopGuesses({})
    setRarityScore(0)
    setPopScore(0)
    setRarityDone(false)
    setPopDone(false)
    setAnswersSeen(false)
    setCellAnswers({})
    setActiveCell(null)
    setOverlayCell(null)
    setSubmitted(false)
    setMode('rarity')

    async function load() {
      try {
        const res = await fetch(`/api/grid?date=${activeDate}`)
        if (!res.ok) throw new Error('fetch failed')
        const { availableDates: dates, puzzle: pd, answerCounts } = await res.json()

        if (dates && dates.length > 0) {
          setAvailableDates(dates)
          if (!dates.includes(todayStr) && activeDate === todayStr) {
            setActiveDate(dates[0])
            return
          }
        }

        if (!pd) { setError(true); setLoading(false); return }

        const puzz: Puzzle = {
          id: pd.id,
          date: pd.puzzle_date,
          rows: [
            resolveSlot(pd.row1_type, pd.row1_ref),
            resolveSlot(pd.row2_type, pd.row2_ref),
            resolveSlot(pd.row3_type, pd.row3_ref),
          ],
          cols: [
            resolveSlot(pd.col1_type, pd.col1_ref),
            resolveSlot(pd.col2_type, pd.col2_ref),
            resolveSlot(pd.col3_type, pd.col3_ref),
          ],
          answerCounts: answerCounts || {},
        }
        setPuzzle(puzz)

        const rSaved    = localStorage.getItem(STORAGE_KEY(activeDate, 'rarity'))
        const pSaved    = localStorage.getItem(STORAGE_KEY(activeDate, 'popularity'))
        const seenSaved = localStorage.getItem(SEEN_KEY(activeDate))
        const nameSaved = localStorage.getItem(NAME_KEY)

        if (rSaved) {
          const st = JSON.parse(rSaved)
          setRarityGuesses(st.guesses || {})
          setRarityScore(st.score || 0)
          setRarityDone(st.done || false)
        }
        if (pSaved) {
          const st = JSON.parse(pSaved)
          setPopGuesses(st.guesses || {})
          setPopScore(st.score || 0)
          setPopDone(st.done || false)
        }
        if (seenSaved) setAnswersSeen(true)
        if (nameSaved) setUserName(nameSaved)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeDate, loadTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-enter custom mode only if there are truly no published puzzles ───
  useEffect(() => {
    if (!loading && gridMode === 'daily' && (error || !puzzle) && availableDates.length === 0) {
      setGridMode('custom')
      setCustomRows([{ category: '', team: '' }, { category: '', team: '' }, { category: '', team: '' }])
      setCustomCols([{ category: '', team: '' }, { category: '', team: '' }, { category: '', team: '' }])
      setCustomCells({})
      setCustomReady(false)
    }
  }, [loading, error, puzzle, availableDates]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load answers when revealed ─────────────────────────────────────────────
  useEffect(() => {
    if (!answersSeen) return
    loadCellAnswers()
    if (gridMode !== 'custom' && puzzle) loadLeaderboard()
  }, [answersSeen]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveState(m: 'rarity' | 'popularity', guesses: Record<string, Guess>, score: number, done: boolean) {
    localStorage.setItem(STORAGE_KEY(activeDate, m), JSON.stringify({ guesses, score, done }))
  }

  // ── Autocomplete search ────────────────────────────────────────────────────
  useEffect(() => {
    if (search.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('player_seasons')
        .select('name_display')
        .ilike('name_display', `%${search}%`)
        .limit(50)
      const names = [...new Set((data || []).map((r: any) => r.name_display as string))].sort().slice(0, 8)
      setResults(names)
      setSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  // ── Submit guess ───────────────────────────────────────────────────────────
  async function submitGuess(name: string) {
    if (!activeCell) return
    if (gridMode !== 'custom' && !puzzle) return
    const { r, c } = activeCell
    const key    = `${r}_${c}`
    const guesses = mode === 'rarity' ? rarityGuesses : popGuesses
    if (guesses[key]) return

    let guess: Guess
    if (gridMode === 'custom') {
      const answers = customCells[key] || []
      const found   = answers.find(a => a.player_name === name)
      if (found) {
        const useScore = mode === 'rarity' ? found.score : found.popularity_score
        const useRank  = mode === 'rarity' ? found.rank  : found.popularity_rank
        guess = { name, score: useScore, rank: useRank, valid: true }
      } else {
        guess = { name, score: INVALID_SCORE, rank: 0, valid: false }
      }
    } else {
      const { data } = await supabase
        .from('pl_grid_cell_answers')
        .select('score, rank, popularity_score, popularity_rank, combined_appearances')
        .eq('puzzle_id', puzzle!.id)
        .eq('row_index', r)
        .eq('col_index', c)
        .eq('player_name', name)
        .maybeSingle()

      if (data) {
        const useScore = mode === 'rarity' ? data.score : (data.popularity_score ?? data.score)
        const useRank  = mode === 'rarity' ? data.rank  : (data.popularity_rank  ?? data.rank)
        guess = { name, score: useScore, rank: useRank, valid: true }
      } else {
        guess = { name, score: INVALID_SCORE, rank: 0, valid: false }
      }
    }

    setSearch('')
    setResults([])
    setActiveCell(null)

    if (mode === 'rarity') {
      const next = { ...rarityGuesses, [key]: guess }
      const nextScore = rarityScore + guess.score
      const done = Object.keys(next).length >= MAX_GUESSES
      setRarityGuesses(next)
      setRarityScore(nextScore)
      if (done) setRarityDone(true)
      if (gridMode !== 'custom') saveState('rarity', next, nextScore, done)
    } else {
      const next = { ...popGuesses, [key]: guess }
      const nextScore = popScore + guess.score
      const done = Object.keys(next).length >= MAX_GUESSES
      setPopGuesses(next)
      setPopScore(nextScore)
      if (done) setPopDone(true)
      if (gridMode !== 'custom') saveState('popularity', next, nextScore, done)
    }
  }

  // ── Give up current mode ───────────────────────────────────────────────────
  function giveUp() {
    const guesses = mode === 'rarity' ? rarityGuesses : popGuesses
    const next = { ...guesses }
    let added = 0
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const key = `${r}_${c}`
        if (!next[key]) {
          next[key] = { name: 'Given up', score: INVALID_SCORE, rank: 0, valid: false }
          added += INVALID_SCORE
        }
      }
    }
    if (mode === 'rarity') {
      const nextScore = rarityScore + added
      setRarityGuesses(next); setRarityScore(nextScore); setRarityDone(true)
      if (gridMode !== 'custom') saveState('rarity', next, nextScore, true)
    } else {
      const nextScore = popScore + added
      setPopGuesses(next); setPopScore(nextScore); setPopDone(true)
      if (gridMode !== 'custom') saveState('popularity', next, nextScore, true)
    }
    setShowSkipConfirm(false)
    setActiveCell(null)
  }

  // ── Load cell answers (on reveal) ──────────────────────────────────────────
  async function loadCellAnswers() {
    if (gridMode === 'custom') {
      setCellAnswers({ ...customCells })
      return
    }
    if (!puzzle) return
    const { data } = await supabase
      .from('pl_grid_cell_answers')
      .select('row_index, col_index, player_name, combined_appearances, score, rank, popularity_score, popularity_rank')
      .eq('puzzle_id', puzzle.id)

    const grouped: Record<string, Answer[]> = {}
    for (const row of data || []) {
      const key = `${row.row_index}_${row.col_index}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push({
        player_name: row.player_name,
        combined_appearances: row.combined_appearances,
        score: row.score,
        rank: row.rank,
        popularity_score: row.popularity_score ?? row.score,
        popularity_rank: row.popularity_rank ?? row.rank,
        display_rank: 0,
      })
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.combined_appearances - b.combined_appearances)
      grouped[key].forEach((a, i) => { a.display_rank = i + 1 })
    }
    setCellAnswers(grouped)
  }

  // ── Load leaderboard ───────────────────────────────────────────────────────
  async function loadLeaderboard() {
    if (!puzzle) return
    const [rRes, pRes, cRes] = await Promise.all([
      supabase.from('pl_grid_leaderboard').select('player_name, score, correct, rarity_score, popularity_score')
        .eq('puzzle_date', puzzle.date).not('rarity_score', 'is', null).order('rarity_score', { ascending: true }).limit(10),
      supabase.from('pl_grid_leaderboard').select('player_name, score, correct, rarity_score, popularity_score')
        .eq('puzzle_date', puzzle.date).not('popularity_score', 'is', null).order('popularity_score', { ascending: true }).limit(10),
      supabase.from('pl_grid_leaderboard').select('player_name, score, correct, rarity_score, popularity_score')
        .eq('puzzle_date', puzzle.date).order('score', { ascending: true }).limit(10),
    ])
    setLeaderboard({
      rarity:     (rRes.data || []).map(r => ({ player_name: r.player_name, score: r.rarity_score!, correct: r.correct, rarity_score: r.rarity_score, popularity_score: r.popularity_score })),
      popularity: (pRes.data || []).map(r => ({ player_name: r.player_name, score: r.popularity_score!, correct: r.correct, rarity_score: r.rarity_score, popularity_score: r.popularity_score })),
      combined:   (cRes.data || []).map(r => ({ player_name: r.player_name, score: r.score, correct: r.correct, rarity_score: r.rarity_score, popularity_score: r.popularity_score })),
    })
  }

  // ── Submit to leaderboard ──────────────────────────────────────────────────
  async function submitToLeaderboard() {
    if (!puzzle || !userName.trim() || submitted || gridMode === 'custom') return
    setSubmitting(true)
    const correctR = Object.values(rarityGuesses).filter(g => g.valid).length
    const correctP = Object.values(popGuesses).filter(g => g.valid).length
    await supabase.from('pl_grid_leaderboard').insert({
      puzzle_id:        puzzle.id,
      puzzle_date:      puzzle.date,
      player_name:      userName.trim(),
      score:            (rarityDone ? rarityScore : 0) + (popDone ? popScore : 0),
      rarity_score:     rarityDone     ? rarityScore : null,
      popularity_score: popDone        ? popScore    : null,
      correct:          Math.max(correctR, correctP),
    })
    localStorage.setItem(NAME_KEY, userName.trim())
    setSubmitted(true)
    setSubmitting(false)
    await loadLeaderboard()
  }

  // ── Reveal answers ─────────────────────────────────────────────────────────
  function revealAnswers() {
    setAnswersSeen(true)
    if (gridMode !== 'custom') localStorage.setItem(SEEN_KEY(activeDate), 'true')
    setShowSkipConfirm(false)
    setActiveCell(null)
    setBetterCell(null)
  }

  // ── Overlay toggle ─────────────────────────────────────────────────────────
  function openOverlay(key: string, e: React.MouseEvent) {
    if (!answersSeen) return
    if (overlayCell === key) { setOverlayCell(null); setOverlayPos(null); return }
    const cell = e.currentTarget as HTMLElement
    const grid = gridRef.current
    if (!grid) return
    const cellRect = cell.getBoundingClientRect()
    const gridRect = grid.getBoundingClientRect()
    setOverlayCell(key)
    setOverlayPos({ top: cellRect.bottom - gridRect.top + 4 })
  }

  // ── Better answers panel ───────────────────────────────────────────────────
  async function openBetterAnswers(key: string, r: number, c: number, currentRank: number, e: React.MouseEvent) {
    if (betterCell === key) { setBetterCell(null); setBetterPos(null); return }
    const cell = e.currentTarget as HTMLElement
    const grid = gridRef.current
    if (!grid) return
    const cellRect = cell.getBoundingClientRect()
    const gridRect = grid.getBoundingClientRect()
    setBetterCell(key)
    setBetterPos({ top: cellRect.bottom - gridRect.top + 4 })
    setBetterList([])
    setBetterLoading(true)

    if (gridMode === 'custom') {
      const all = customCells[key] || []
      const better = all
        .filter(a => (mode === 'rarity' ? a.rank : a.popularity_rank) < currentRank)
        .sort((a, b) => (mode === 'rarity' ? a.rank - b.rank : a.popularity_rank - b.popularity_rank))
      setBetterList(better.map(a => ({ name: a.player_name, rank: mode === 'rarity' ? a.rank : a.popularity_rank, score: mode === 'rarity' ? a.score : a.popularity_score })))
    } else if (puzzle) {
      const rankCol  = mode === 'rarity' ? 'rank'  : 'popularity_rank'
      const scoreCol = mode === 'rarity' ? 'score' : 'popularity_score'
      const { data } = await supabase
        .from('pl_grid_cell_answers')
        .select('player_name, rank, popularity_rank, score, popularity_score')
        .eq('puzzle_id', puzzle.id)
        .eq('row_index', r)
        .eq('col_index', c)
        .lt(rankCol, currentRank)
        .order(rankCol, { ascending: true })
      setBetterList((data || []).map((d: any) => ({ name: d.player_name, rank: d[rankCol], score: d[scoreCol] })))
    }
    setBetterLoading(false)
  }

  // ── Play another (random daily puzzle) ────────────────────────────────────
  function playAnother() {
    const others = availableDates.filter(d => d !== activeDate)
    if (others.length === 0) return
    const next = others[Math.floor(Math.random() * others.length)]
    setGridMode('daily')
    setActiveDate(next)
  }

  // ── Enter custom build mode ────────────────────────────────────────────────
  function enterCustomMode() {
    setGridMode('custom')
    setMode('rarity')
    setRarityGuesses({})
    setPopGuesses({})
    setRarityScore(0)
    setPopScore(0)
    setRarityDone(false)
    setPopDone(false)
    setAnswersSeen(false)
    setCellAnswers({})
    setActiveCell(null)
    setOverlayCell(null)
    setShowSkipConfirm(false)
    setCustomRows([{ category: '', team: '' }, { category: '', team: '' }, { category: '', team: '' }])
    setCustomCols([{ category: '', team: '' }, { category: '', team: '' }, { category: '', team: '' }])
    setCustomCells({})
    setCustomReady(false)
  }

  // ── Exit custom mode → reload daily puzzle ─────────────────────────────────
  function exitCustomMode() {
    setGridMode('daily')
    setLoadTrigger(t => t + 1)
  }

  // ── Generate custom grid ───────────────────────────────────────────────────
  async function generateCustomGrid() {
    if (customRows.some(t => !t) || customCols.some(t => !t)) return
    setCustomLoading(true)
    try {
      const enc = (s: CustomSlot) => s.category === 'team' ? `team:${s.team}` : s.category
      const params = new URLSearchParams({
        row0: enc(customRows[0]), row1: enc(customRows[1]), row2: enc(customRows[2]),
        col0: enc(customCols[0]), col1: enc(customCols[1]), col2: enc(customCols[2]),
      })
      const res  = await fetch(`/api/grid-custom?${params}`)
      const data = await res.json()
      const cells = data.cells || {}
      setCustomCells(cells)
      setCustomReady(true)
      setRarityGuesses({})
      setPopGuesses({})
      setRarityScore(0)
      setPopScore(0)
      setRarityDone(false)
      setPopDone(false)
      setAnswersSeen(false)
      setCellAnswers({})
      setActiveCell(null)
      setMode('rarity')
    } finally {
      setCustomLoading(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const guesses      = mode === 'rarity' ? rarityGuesses : popGuesses
  const currentScore = mode === 'rarity' ? rarityScore   : popScore
  const currentDone  = mode === 'rarity' ? rarityDone    : popDone
  const bothDone     = rarityDone && popDone

  const gridRows: Slot[] = gridMode === 'custom'
    ? customRows.map((s, i) => s.category && (s.category !== 'team' || s.team) ? resolveSlot(s.category, s.team || null) : { type: '', id: `r${i}`, name: `Row ${i + 1}`, tooltip: '' })
    : (puzzle?.rows ?? [])
  const gridCols: Slot[] = gridMode === 'custom'
    ? customCols.map((s, i) => s.category && (s.category !== 'team' || s.team) ? resolveSlot(s.category, s.team || null) : { type: '', id: `c${i}`, name: `Col ${i + 1}`, tooltip: '' })
    : (puzzle?.cols ?? [])
  const effectiveAnswerCounts: Record<string, number> = gridMode === 'custom'
    ? Object.fromEntries(Object.entries(customCells).map(([k, v]) => [k, (v as Answer[]).length]))
    : (puzzle?.answerCounts ?? {})

  const customAllSelected = customRows.every(s => s.category && (s.category !== 'team' || s.team)) &&
                            customCols.every(s => s.category && (s.category !== 'team' || s.team))

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading || (gridMode === 'daily' && (error || !puzzle))) return (
    <div style={s.page}>
      <NavBar />
      <LoadingAnimation />
    </div>
  )

  return (
    <div style={s.page}>
      <NavBar />
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '16px 12px 60px' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          {/* Mode / date controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {gridMode === 'daily' ? (
              <>
                <select
                  value={activeDate}
                  onChange={e => { if (availableDates.includes(e.target.value)) setActiveDate(e.target.value) }}
                  style={{
                    background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: 20,
                    padding: '3px 10px', fontSize: 11, color: '#8899bb', cursor: 'pointer', outline: 'none',
                  }}>
                  {!availableDates.includes(todayStr) && (
                    <option value={todayStr} disabled>Today ({todayStr}) — no puzzle yet</option>
                  )}
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d === todayStr ? `Today (${d})` : d}</option>
                  ))}
                </select>
                {availableDates.length > 1 && (
                  <button onClick={playAnother}
                    style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#8899bb', cursor: 'pointer' }}>
                    🎲 Random
                  </button>
                )}
                <button onClick={enterCustomMode}
                  style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#8899bb', cursor: 'pointer' }}>
                  🔧 Build your own
                </button>
              </>
            ) : (
              <>
                <button onClick={exitCustomMode}
                  style={{ background: '#1e2d4a', border: '1px solid #2a3d5e', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#8899bb', cursor: 'pointer' }}>
                  ← Daily Grid
                </button>
                <div style={{ background: '#1e2d4a', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: '#f97316', fontWeight: 700 }}>
                  🔧 Custom Grid
                </div>
              </>
            )}
          </div>

          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span> Grid
          </div>
          <div style={{ fontSize: 12, color: '#8899bb', marginBottom: 12 }}>
            {gridMode === 'custom' && !customReady
              ? 'Hover the grid headers to choose rows and columns'
              : 'Find a PL player for each row × column combination'}
          </div>

          {/* Score row — only show when playing */}
          {(gridMode === 'daily' || customReady) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 2 }}>
              {[
                { label: 'Rarity', value: rarityScore, done: rarityDone, col: '#22c55e' },
                { label: 'Popularity', value: popScore, done: popDone, col: '#f97316' },
                { label: 'Combined', value: (rarityDone ? rarityScore : 0) + (popDone ? popScore : 0), done: bothDone, col: '#8899bb' },
              ].map(({ label, value, done, col }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: done ? col : 'white' }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* ── Mode tabs + Give Up — only when grid is active ── */}
        {(gridMode === 'daily' || customReady) && !answersSeen && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => { if (!rarityDone) setMode('rarity') }}
              style={{ ...s.pill(mode === 'rarity', '#22c55e'), cursor: rarityDone ? 'default' : 'pointer', opacity: rarityDone ? 0.7 : 1 }}>
              🎯 Rarity {rarityDone ? '✓' : ''}
            </button>
            <button
              onClick={() => { if (!popDone) setMode('popularity') }}
              style={{ ...s.pill(mode === 'popularity', '#f97316'), cursor: popDone ? 'default' : 'pointer', opacity: popDone ? 0.7 : 1 }}>
              ⭐ Popularity {popDone ? '✓' : ''}
            </button>
            {!currentDone && (
              <button
                onClick={() => setShowSkipConfirm(true)}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626' }}>
                Give Up
              </button>
            )}
          </div>
        )}

        {/* ── Scoring guide ── */}
        {(gridMode === 'daily' || customReady) && !currentDone && !answersSeen && (
          <div style={{ textAlign: 'center', fontSize: 11, color: '#8899bb', marginBottom: 10 }}>
            {mode === 'rarity'
              ? '🎯 Pick rarer players — fewer combined appearances scores better'
              : '⭐ Pick popular players — more combined appearances scores better'}
          </div>
        )}

        {/* ── Switch mode prompt ── */}
        {(gridMode === 'daily' || customReady) && currentDone && !bothDone && !answersSeen && (
          <div style={{ ...s.card, marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#f97316', fontWeight: 700, marginBottom: 8 }}>
              {mode === 'rarity' ? '🎯 Rarity done! Now try Popularity.' : '⭐ Popularity done! Now try Rarity.'}
            </div>
            <button
              onClick={() => setMode(mode === 'rarity' ? 'popularity' : 'rarity')}
              style={s.pill(true, '#f97316')}>
              Switch to {mode === 'rarity' ? 'Popularity' : 'Rarity'} Mode
            </button>
          </div>
        )}

        {/* ── Skip confirm ── */}
        {showSkipConfirm && (
          <div style={{ ...s.card, marginBottom: 12, textAlign: 'center', border: '1px solid #dc2626' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 6 }}>
              Give up on {mode} mode?
            </div>
            <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 12 }}>
              Empty cells count as +25 pts each.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={giveUp} style={s.pill(true, '#dc2626')}>Yes, Give Up</button>
              <button onClick={() => setShowSkipConfirm(false)} style={s.pill(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Both done → reveal prompt ── */}
        {(gridMode === 'daily' || customReady) && bothDone && !answersSeen && (
          <div style={{ ...s.card, marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 8 }}>Both modes complete! 🎉</div>
            <div style={{ fontSize: 12, color: '#8899bb', marginBottom: 12 }}>
              Combined score: {rarityScore + popScore} pts
            </div>
            <button onClick={revealAnswers} style={s.pill(true, '#22c55e')}>
              See Answers
            </button>
          </div>
        )}

        {/* ── 3×3 Grid ── */}
        {(gridMode === 'daily' || gridMode === 'custom') && (
          <div ref={gridRef} style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '117px 1fr 1fr 1fr', gap: 3 }}>

              {/* Top-left corner */}
              <div />

              {/* Column headers */}
              {[0, 1, 2].map(ci => (
                gridMode === 'custom' ? (
                  <CustomSlotHeader key={ci}
                    slot={customCols[ci]}
                    placeholder={`Col ${ci + 1}`}
                    onSelect={(cat, team) => { const n = [...customCols] as [CustomSlot,CustomSlot,CustomSlot]; n[ci] = { category: cat, team }; setCustomCols(n) }}
                    minHeight={48}
                  />
                ) : (
                  <div key={ci}
                    style={{ ...s.hdr, position: 'relative', minHeight: 48, padding: '4px 6px' }}
                    onMouseEnter={showTip}
                    onMouseLeave={hideTip}>
                    <span>{gridCols[ci].name}</span>
                    <span className="tip" style={{ ...tooltipStyle, left: '50%', transform: 'translateX(-50%)', top: '100%' }}>
                      {gridCols[ci].tooltip}
                    </span>
                  </div>
                )
              ))}

              {/* Rows */}
              {[0, 1, 2].map(ri => (
                <>
                  {/* Row header */}
                  {gridMode === 'custom' ? (
                    <CustomSlotHeader key={`rh${ri}`}
                      slot={customRows[ri]}
                      placeholder={`Row ${ri + 1}`}
                      onSelect={(cat, team) => { const n = [...customRows] as [CustomSlot,CustomSlot,CustomSlot]; n[ri] = { category: cat, team }; setCustomRows(n) }}
                      minHeight={64}
                    />
                  ) : (
                    <div key={`rh${ri}`}
                      style={{ ...s.hdr, position: 'relative', minHeight: 64, padding: '4px 6px' }}
                      onMouseEnter={showTip}
                      onMouseLeave={hideTip}>
                      <span>{gridRows[ri].name}</span>
                      <span className="tip" style={{ ...tooltipStyle, left: '100%', top: '50%', transform: 'translateY(-50%)', marginTop: 0, marginLeft: 4 }}>
                        {gridRows[ri].tooltip}
                      </span>
                    </div>
                  )}

                  {/* Cells */}
                  {[0, 1, 2].map(ci => {
                    const key    = `${ri}_${ci}`
                    const guess  = guesses[key]
                    const count  = effectiveAnswerCounts[key] ?? 0
                    const active = activeCell?.r === ri && activeCell?.c === ci
                    const colors = guess?.valid ? scoreColor(guess.rank) : null

                    let bg = '#0a0f1e', brd = '#1e2d4a'
                    if (active)       { bg = '#0a1628'; brd = '#f97316' }
                    else if (guess) {
                      if (guess.valid) { bg = colors!.bg; brd = colors!.border }
                      else             { bg = '#2a1010'; brd = '#7f1d1d' }
                    }

                    const notReady = gridMode === 'custom' && !customReady
                    if (notReady) { bg = '#080d18'; brd = '#0f1828' }

                    const canShowBetter = guess?.valid && guess.rank > 1 && !answersSeen
                    return (
                      <button key={`cell${ri}_${ci}`}
                        onClick={(e) => {
                          if (notReady) return
                          if (answersSeen) { openOverlay(key, e); return }
                          if (canShowBetter) { openBetterAnswers(key, ri, ci, guess!.rank, e); return }
                          if (currentDone || guess) return
                          setActiveCell(active ? null : { r: ri, c: ci })
                          setSearch(''); setResults([])
                        }}
                        style={{
                          background: bg, border: `2px solid ${brd}`, borderRadius: 8,
                          minHeight: 64, cursor: notReady ? 'default' : (answersSeen || canShowBetter) ? 'pointer' : (currentDone || guess ? 'default' : 'pointer'),
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          padding: '6px 4px', gap: 2, transition: 'border-color 0.15s', position: 'relative',
                        }}>
                        {!guess && !answersSeen && (
                          <>
                            <span style={{ fontSize: 20, color: active ? '#f97316' : '#4a5568' }}>{active ? '?' : '+'}</span>
                            {count > 0 && <span style={{ fontSize: 9, color: '#4a5568' }}>{count} answers</span>}
                          </>
                        )}
                        {!guess && answersSeen && (
                          <span style={{ fontSize: 10, color: '#8899bb' }}>tap to see ▼</span>
                        )}
                        {guess && (
                          <>
                            <span style={{
                              fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
                              color: guess.valid ? (colors?.text ?? '#22c55e') : '#f87171',
                            }}>
                              {guess.name === 'Given up' ? '—' : guess.name}
                            </span>
                            {!answersSeen && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 6px',
                                background: guess.valid ? colors!.border : '#7f1d1d',
                                color:      guess.valid ? colors!.text  : '#fca5a5',
                              }}>
                                {guess.valid
                                  ? `${scoreLabel(guess.score, mode)} · ${guess.score}`
                                  : `+${INVALID_SCORE} pts`}
                              </span>
                            )}
                            {canShowBetter && (
                              <span style={{ fontSize: 8, color: '#8899bb' }}>Better Answers</span>
                            )}
                            {answersSeen && (
                              <span style={{ fontSize: 9, color: '#8899bb' }}>tap ▼</span>
                            )}
                          </>
                        )}
                      </button>
                    )
                  })}
                </>
              ))}
            </div>

            {/* ── Answer overlay ── */}
            {answersSeen && overlayCell && overlayPos && (() => {
              const answers = cellAnswers[overlayCell]
              if (!answers) return null
              const [ri, ci] = overlayCell.split('_').map(Number)
              const rowName  = gridRows[ri]?.name ?? ''
              const colName  = gridCols[ci]?.name ?? ''
              const sorted   = [...answers].sort((a, b) =>
                mode === 'popularity'
                  ? b.combined_appearances - a.combined_appearances
                  : a.combined_appearances - b.combined_appearances
              )
              const myR = rarityGuesses[overlayCell]
              const myP = popGuesses[overlayCell]
              return (
                <div style={{
                  position: 'absolute', top: overlayPos.top, left: 0, right: 0,
                  background: '#0d1424', border: '1px solid #1e2d4a', borderRadius: 10,
                  zIndex: 30, padding: 12, maxHeight: 320, overflowY: 'auto',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316' }}>{rowName} × {colName}</div>
                      <div style={{ fontSize: 10, color: '#8899bb' }}>
                        {mode === 'rarity' ? 'Fewest appearances first' : 'Most appearances first'}
                      </div>
                    </div>
                    <button onClick={() => { setOverlayCell(null); setOverlayPos(null) }}
                      style={{ background: 'none', border: 'none', color: '#8899bb', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
                  </div>

                  {(myR || myP) && (
                    <div style={{ marginBottom: 8, padding: '6px 8px', background: '#111827', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: '#8899bb', marginBottom: 4 }}>Your picks:</div>
                      {myR && <div style={{ fontSize: 11, color: myR.valid ? '#22c55e' : '#f87171' }}>🎯 {myR.name} {myR.valid ? `(${myR.score} pts)` : '✗'}</div>}
                      {myP && <div style={{ fontSize: 11, color: myP.valid ? '#f97316' : '#f87171' }}>⭐ {myP.name} {myP.valid ? `(${myP.score} pts)` : '✗'}</div>}
                    </div>
                  )}

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ color: '#8899bb' }}>
                        <td style={{ padding: '2px 4px' }}>#</td>
                        <td style={{ padding: '2px 4px' }}>Player</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>Appearances</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>Score</td>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((a, idx) => {
                        const isMyR    = myR?.name === a.player_name && myR.valid
                        const isMyP    = myP?.name === a.player_name && myP.valid
                        const useScore = mode === 'rarity' ? a.score : a.popularity_score
                        return (
                          <tr key={a.player_name} style={{ borderTop: '1px solid #1e2d4a', color: (isMyR || isMyP) ? '#f97316' : 'white' }}>
                            <td style={{ padding: '3px 4px', color: '#8899bb' }}>{idx + 1}</td>
                            <td style={{ padding: '3px 4px' }}>
                              {a.player_name}
                              {isMyR && <span style={{ marginLeft: 4, fontSize: 9, color: '#22c55e' }}>← 🎯</span>}
                              {isMyP && <span style={{ marginLeft: 4, fontSize: 9, color: '#f97316' }}>← ⭐</span>}
                            </td>
                            <td style={{ padding: '3px 4px', textAlign: 'right', color: '#8899bb' }}>{a.combined_appearances}</td>
                            <td style={{ padding: '3px 4px', textAlign: 'right' }}>{useScore}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Better answers panel ── */}
        {betterCell && betterPos && (
          <div style={{
            position: 'absolute', top: betterPos.top, left: '50%', transform: 'translateX(-50%)',
            width: 220,
            background: '#111827', border: '1px solid #2a3d5e', borderRadius: 8,
            padding: '8px 10px', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700 }}>
                {mode === 'rarity' ? '🎯 Rarer picks' : '⭐ More popular picks'}
              </div>
              <button onClick={() => { setBetterCell(null); setBetterPos(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8899bb', fontSize: 12, padding: 0, lineHeight: 1 }}>
                ✕
              </button>
            </div>
            {betterLoading && <div style={{ fontSize: 11, color: '#8899bb' }}>Loading...</div>}
            {!betterLoading && betterList.length === 0 && (
              <div style={{ fontSize: 11, color: '#8899bb' }}>Already the best!</div>
            )}
            {!betterLoading && betterList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                {betterList.map((a) => {
                  const c = scoreColor(a.rank)
                  return (
                    <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 8, padding: '1px 6px', background: c.border, color: c.text, flexShrink: 0 }}>
                        {a.score}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Generate button for custom mode ── */}
        {gridMode === 'custom' && customAllSelected && !customReady && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button
              onClick={generateCustomGrid}
              disabled={customLoading}
              style={{ ...s.pill(true, '#22c55e'), opacity: customLoading ? 0.5 : 1 }}>
              {customLoading ? 'Generating…' : '▶ Generate Grid'}
            </button>
          </div>
        )}

        {/* ── Search card ── */}
        {activeCell && !currentDone && !answersSeen && (
          <div style={{ ...s.card, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#8899bb', marginBottom: 8 }}>
              {gridRows[activeCell.r]?.name} × {gridCols[activeCell.c]?.name}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && results[0]) submitGuess(results[0]) }}
                placeholder="Search for a player..."
                style={s.input}
              />
              {searching && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#8899bb' }}>…</div>
              )}
              {results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, marginTop: 4, zIndex: 50, overflow: 'hidden' }}>
                  {results.map(name => (
                    <div key={name}
                      onMouseDown={() => submitGuess(name)}
                      style={{ padding: '10px 14px', fontSize: 14, color: 'white', cursor: 'pointer', borderBottom: '1px solid #1e2d4a' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e2d4a'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Post-game section ── */}
        {answersSeen && (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...s.card, marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 12 }}>Game Over</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
                <div><div style={{ fontSize: 10, color: '#8899bb' }}>Rarity</div><div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>{rarityScore}</div></div>
                <div><div style={{ fontSize: 10, color: '#8899bb' }}>Popularity</div><div style={{ fontSize: 22, fontWeight: 800, color: '#f97316' }}>{popScore}</div></div>
                <div><div style={{ fontSize: 10, color: '#8899bb' }}>Combined</div><div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>{rarityScore + popScore}</div></div>
              </div>
              {gridMode === 'custom' ? (
                <div style={{ fontSize: 12, color: '#8899bb' }}>Custom grids don't count for the leaderboard</div>
              ) : !submitted ? (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitToLeaderboard() }}
                    placeholder="Your name"
                    style={{ ...s.input, width: 160 }}
                  />
                  <button
                    onClick={submitToLeaderboard}
                    disabled={submitting || !userName.trim()}
                    style={{ ...s.pill(true, '#f97316'), opacity: (submitting || !userName.trim()) ? 0.5 : 1 }}>
                    {submitting ? '…' : 'Submit Score'}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#22c55e' }}>Score submitted ✓</div>
              )}
            </div>

            {/* Leaderboard — daily only */}
            {gridMode === 'daily' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Leaderboard</span>
                  <button onClick={() => setShowLeaderboard(v => !v)}
                    style={{ background: 'none', border: 'none', color: '#8899bb', cursor: 'pointer', fontSize: 12 }}>
                    {showLeaderboard ? '▲ Hide' : '▼ Show'}
                  </button>
                </div>

                {showLeaderboard && (
                  <div style={s.card}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {(['combined', 'rarity', 'popularity'] as const).map(tab => (
                        <button key={tab} onClick={() => setLbTab(tab)}
                          style={{ ...s.pill(lbTab === tab, tab === 'rarity' ? '#22c55e' : tab === 'popularity' ? '#f97316' : '#8899bb'), fontSize: 11, padding: '4px 12px' }}>
                          {tab === 'combined' ? '🏆 Combined' : tab === 'rarity' ? '🎯 Rarity' : '⭐ Popularity'}
                        </button>
                      ))}
                    </div>
                    {leaderboard[lbTab].length === 0 ? (
                      <div style={{ fontSize: 12, color: '#8899bb', textAlign: 'center' }}>No entries yet</div>
                    ) : leaderboard[lbTab].map((entry, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4a', fontSize: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color: i < 3 ? '#f97316' : '#8899bb', fontWeight: 700, width: 20 }}>{i + 1}</span>
                          <span style={{ color: 'white' }}>{entry.player_name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ color: '#22c55e' }}>{entry.rarity_score != null ? `🎯${entry.rarity_score}` : '—'}</span>
                          <span style={{ color: '#f97316' }}>{entry.popularity_score != null ? `⭐${entry.popularity_score}` : '—'}</span>
                          <span style={{ color: 'white', fontWeight: 700 }}>{entry.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Reveal button if not seen yet and at least one mode done ── */}
        {(gridMode === 'daily' || customReady) && !answersSeen && !bothDone && (rarityDone || popDone) && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button onClick={revealAnswers}
              style={{ ...s.pill(false), fontSize: 12 }}>
              Reveal Answers (locks remaining modes)
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

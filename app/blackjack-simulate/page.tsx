'use client'
import { useState } from 'react'

type SimResult = {
  n: number
  seasonCount: number
  statFreq: Record<string, number>
  seasonFreq: Record<string, number>
}

const STAT_LABELS: Record<string, string> = {
  goals: 'Goals',
  assists: 'Assists',
  yellow_cards: 'Yellow Cards',
  clean_sheets: 'Clean Sheets',
  club_seasons: 'Seasons at Club',
}

// Expected probabilities from startHand() logic
const STAT_EXPECTED: Record<string, number> = {
  club_seasons: 0.25,
  goals: 0.1875,
  assists: 0.1875,
  yellow_cards: 0.1875,
  clean_sheets: 0.1875,
}

function pct(v: number, n: number) { return ((v / n) * 100).toFixed(2) }
function ratio(actual: number, expected: number) { return (actual / expected).toFixed(3) }

function StatTable({ statFreq, n }: { statFreq: Record<string, number>; n: number }) {
  const stats = ['club_seasons', 'goals', 'assists', 'yellow_cards', 'clean_sheets']
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: '#f59e0b' }}>Stat Type Distribution</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#111827', textAlign: 'left' }}>
            <th style={{ padding: '7px 10px', color: '#555' }}>Stat</th>
            <th style={{ padding: '7px 10px', color: '#555' }}>Count</th>
            <th style={{ padding: '7px 10px', color: '#555' }}>Actual %</th>
            <th style={{ padding: '7px 10px', color: '#555' }}>Expected %</th>
            <th style={{ padding: '7px 10px', color: '#555' }}>Ratio</th>
            <th style={{ padding: '7px 10px', color: '#555' }}>Bar</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(stat => {
            const count = statFreq[stat] ?? 0
            const exp = STAT_EXPECTED[stat]
            const r = count / n / exp
            const barW = Math.round((count / n / 0.25) * 100)
            return (
              <tr key={stat} style={{ borderBottom: '1px solid #1e2d4a', background: r > 1.05 || r < 0.95 ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                <td style={{ padding: '6px 10px', fontWeight: 700, color: 'white' }}>{STAT_LABELS[stat]}</td>
                <td style={{ padding: '6px 10px', color: '#888' }}>{count.toLocaleString()}</td>
                <td style={{ padding: '6px 10px', fontWeight: 700, color: 'white' }}>{pct(count, n)}%</td>
                <td style={{ padding: '6px 10px', color: '#555' }}>{(exp * 100).toFixed(2)}%</td>
                <td style={{ padding: '6px 10px', fontWeight: 700, color: r > 1.05 ? '#ef4444' : r < 0.95 ? '#60a5fa' : '#4ade80' }}>{r.toFixed(3)}×</td>
                <td style={{ padding: '6px 10px', minWidth: 120 }}>
                  <div style={{ height: 8, width: `${Math.min(barW, 100)}%`, background: '#f59e0b', borderRadius: 4, opacity: 0.7 }}/>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SeasonTable({ seasonFreq, n, seasonCount }: { seasonFreq: Record<string, number>; n: number; seasonCount: number }) {
  const [showAll, setShowAll] = useState(false)
  const total = Object.values(seasonFreq).reduce((s, v) => s + v, 0)
  const expectedPerSeason = 1 / seasonCount
  const sorted = Object.entries(seasonFreq).sort((a, b) => b[1] - a[1])
  const displayed = showAll ? sorted : sorted.slice(0, 40)
  const maxCount = sorted[0]?.[1] ?? 1

  const avg = total / seasonCount
  const stddev = Math.sqrt(
    sorted.reduce((s, [, v]) => s + Math.pow(v - avg, 2), 0) / sorted.length
  )

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, color: '#f59e0b' }}>Season Distribution</h2>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <span>Total season rolls: <strong style={{ color: '#aaa' }}>{total.toLocaleString()}</strong></span>
        <span>Unique seasons: <strong style={{ color: '#aaa' }}>{seasonCount}</strong></span>
        <span>Expected per season: <strong style={{ color: '#aaa' }}>{(expectedPerSeason * 100).toFixed(3)}%</strong></span>
        <span>Avg count: <strong style={{ color: '#aaa' }}>{avg.toFixed(1)}</strong></span>
        <span>Std dev: <strong style={{ color: '#aaa' }}>{stddev.toFixed(1)}</strong> ({((stddev / avg) * 100).toFixed(1)}% of avg)</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#111827', textAlign: 'left' }}>
            <th style={{ padding: '5px 8px', color: '#555' }}>#</th>
            <th style={{ padding: '5px 8px', color: '#555' }}>Season</th>
            <th style={{ padding: '5px 8px', color: '#555' }}>Count</th>
            <th style={{ padding: '5px 8px', color: '#555' }}>% of season rolls</th>
            <th style={{ padding: '5px 8px', color: '#555' }}>vs expected</th>
            <th style={{ padding: '5px 8px', color: '#555' }}>Bar</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map(([season, count], i) => {
            const p = count / total
            const r = p / expectedPerSeason
            const barW = Math.round((count / maxCount) * 100)
            const hot = r > 1.25
            const cold = r < 0.75
            return (
              <tr key={season} style={{ borderBottom: '1px solid #111827', background: hot ? 'rgba(239,68,68,0.07)' : cold ? 'rgba(96,165,250,0.07)' : 'transparent' }}>
                <td style={{ padding: '4px 8px', color: '#444' }}>{i + 1}</td>
                <td style={{ padding: '4px 8px', color: 'white', fontWeight: 600 }}>{season}</td>
                <td style={{ padding: '4px 8px', color: '#777' }}>{count.toLocaleString()}</td>
                <td style={{ padding: '4px 8px', fontWeight: 700, color: 'white' }}>{(p * 100).toFixed(3)}%</td>
                <td style={{ padding: '4px 8px', fontWeight: 700, color: hot ? '#ef4444' : cold ? '#60a5fa' : '#4ade80' }}>{r.toFixed(3)}×</td>
                <td style={{ padding: '4px 8px', minWidth: 100 }}>
                  <div style={{ height: 6, width: `${barW}%`, background: hot ? '#ef4444' : cold ? '#60a5fa' : '#4ade80', borderRadius: 3, opacity: 0.65 }}/>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length > 40 && (
        <button onClick={() => setShowAll(v => !v)}
          style={{ marginTop: 10, padding: '6px 16px', background: '#1e2d4a', border: '1px solid #374151', color: '#8899bb', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
          {showAll ? `▲ Show top 40 only` : `▼ Show all ${sorted.length} seasons`}
        </button>
      )}
    </div>
  )
}

export default function BlackjackSimulatePage() {
  const [n, setN] = useState('50000')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch(`/api/blackjack-simulate?n=${n}`)
      const data = await r.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0f1e', color: 'white', fontFamily: 'monospace', padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Blackjack Category Simulator</h1>
      <p style={{ fontSize: 12, color: '#555', marginBottom: 20 }}>
        Simulates the stat/season selection logic from startHand() to check randomness distribution.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Simulations</label>
          <select value={n} onChange={e => setN(e.target.value)}
            style={{ background: '#111827', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'monospace' }}>
            <option value="10000">10,000</option>
            <option value="50000">50,000</option>
            <option value="100000">100,000</option>
            <option value="500000">500,000</option>
            <option value="1000000">1,000,000</option>
            <option value="2000000">2,000,000</option>
          </select>
        </div>
        <button onClick={run} disabled={loading}
          style={{ background: loading ? '#333' : '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 14, fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontFamily: 'monospace' }}>
          {loading ? 'Running…' : 'Run Simulation'}
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>}
      {loading && <div style={{ color: '#888', fontSize: 13 }}>Simulating {Number(n).toLocaleString()} hands…</div>}

      {result && (
        <div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 24 }}>
            {result.n.toLocaleString()} simulated hands · {result.seasonCount} seasons in pool ·
            {' '}<span style={{ color: '#4ade80' }}>green</span> = within 5% of expected ·
            {' '}<span style={{ color: '#ef4444' }}>red</span> = overrepresented ·
            {' '}<span style={{ color: '#60a5fa' }}>blue</span> = underrepresented
          </div>
          <StatTable statFreq={result.statFreq} n={result.n} />
          <SeasonTable seasonFreq={result.seasonFreq} n={result.n} seasonCount={result.seasonCount} />
        </div>
      )}
    </div>
  )
}

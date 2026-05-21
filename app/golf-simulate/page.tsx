'use client'
import { useState } from 'react'

const DEFAULT_DISTANCES = '20,50,80,140,220,270'
const DEFAULT_N = '100000'

type Results = Record<string, Record<string, number>>

function pct(count: number, n: number) { return ((count / n) * 100).toFixed(2) }

function DistanceTable({ dist, freq, n }: { dist: string; freq: Record<string, number>; n: number }) {
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 30)
  const expectedUniform = 1 / Object.keys(freq).length

  // Group by filter type
  const byType: Record<string, number> = {}
  for (const [k, v] of Object.entries(freq)) {
    const type = k.startsWith('club:') ? 'club'
      : k.startsWith('nat:') ? 'nat'
      : k.startsWith('cont:') ? 'cont'
      : k.startsWith('cc:') ? 'cc'
      : k === 'all' ? 'all' : 'other'
    byType[type] = (byType[type] ?? 0) + v
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        Distance: {dist}y — {getClub(Number(dist))} (threshold: {getThreshold(Number(dist))})
      </h2>

      {/* Type breakdown */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
          <div key={type} style={{ background: '#1e2d4a', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
            <span style={{ fontWeight: 800, color: typeColor(type) }}>{type}</span>
            <span style={{ color: '#aaa', marginLeft: 6 }}>{pct(count, n)}%</span>
          </div>
        ))}
      </div>

      {/* Top entries table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#1e2d4a', textAlign: 'left' }}>
            <th style={{ padding: '6px 10px' }}>#</th>
            <th style={{ padding: '6px 10px' }}>Filter</th>
            <th style={{ padding: '6px 10px' }}>Count</th>
            <th style={{ padding: '6px 10px' }}>%</th>
            <th style={{ padding: '6px 10px' }}>vs avg</th>
          </tr>
        </thead>
        <tbody>
          {top.map(([key, count], i) => {
            const p = count / n
            const ratio = p / expectedUniform
            const type = key.startsWith('club:') ? 'club' : key.startsWith('nat:') ? 'nat' : key.startsWith('cont:') ? 'cont' : key.startsWith('cc:') ? 'cc' : 'all'
            return (
              <tr key={key} style={{ borderBottom: '1px solid #222', background: ratio > 3 ? 'rgba(239,68,68,0.15)' : ratio > 2 ? 'rgba(251,191,36,0.1)' : 'transparent' }}>
                <td style={{ padding: '5px 10px', color: '#666' }}>{i + 1}</td>
                <td style={{ padding: '5px 10px' }}>
                  <span style={{ color: typeColor(type), fontWeight: 700, marginRight: 6, fontSize: 11 }}>{type}</span>
                  {key.replace(/^(club|nat|cont|cc):/, '')}
                </td>
                <td style={{ padding: '5px 10px', color: '#aaa' }}>{count.toLocaleString()}</td>
                <td style={{ padding: '5px 10px', fontWeight: 700 }}>{pct(count, n)}%</td>
                <td style={{ padding: '5px 10px', color: ratio > 2 ? '#ef4444' : ratio > 1.5 ? '#fbbf24' : '#22c55e', fontWeight: 700 }}>
                  {ratio.toFixed(2)}×
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{Object.keys(freq).length} unique categories · showing top 30</div>
    </div>
  )
}

function getClub(dist: number) {
  if (dist > 250) return 'driver'
  if (dist > 150) return 'iron'
  if (dist > 50)  return 'wedge'
  return 'putter'
}
function getThreshold(dist: number) {
  return { driver: 250, iron: 150, wedge: 50, putter: 10 }[getClub(dist)]
}
function typeColor(type: string) {
  return { all: '#94a3b8', nat: '#60a5fa', cont: '#a78bfa', club: '#34d399', cc: '#fb923c', other: '#f87171' }[type] ?? '#fff'
}

export default function GolfSimulatePage() {
  const [distances, setDistances] = useState(DEFAULT_DISTANCES)
  const [n, setN] = useState(DEFAULT_N)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ n: number; distances: number[]; results: Results } | null>(null)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const r = await fetch(`/api/golf-simulate?n=${n}&distances=${distances}`)
      const data = await r.json()
      if (data.error) { setError(data.error); return }
      setResults(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0f1e', color: 'white', fontFamily: 'monospace', padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Golf Category Simulator</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Distances (yards, comma separated)</label>
          <input value={distances} onChange={e => setDistances(e.target.value)}
            style={{ background: '#111827', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 14, width: 280, fontFamily: 'monospace' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Simulations per distance</label>
          <select value={n} onChange={e => setN(e.target.value)}
            style={{ background: '#111827', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'monospace' }}>
            <option value="10000">10,000</option>
            <option value="100000">100,000</option>
            <option value="500000">500,000</option>
            <option value="1000000">1,000,000</option>
          </select>
        </div>
        <button onClick={run} disabled={loading}
          style={{ background: loading ? '#333' : '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 14, fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontFamily: 'monospace' }}>
          {loading ? 'Running…' : 'Run Simulation'}
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>}

      {loading && (
        <div style={{ color: '#888', fontSize: 14 }}>
          Running {Number(n).toLocaleString()} iterations per distance…
        </div>
      )}

      {results && (
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 24 }}>
            {Number(results.n).toLocaleString()} iterations per distance · red = 3×+ expected · yellow = 2×+ expected
          </div>
          {results.distances.map(dist => (
            <DistanceTable key={dist} dist={String(dist)} freq={results.results[dist]} n={results.n} />
          ))}
        </div>
      )}
    </div>
  )
}

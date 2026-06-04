'use client'
import { useState } from 'react'

const DEFAULT_DISTANCES = '20,50,80,140,220,270'
const DEFAULT_N = '100000'

type Results = Record<string, Record<string, number>>

function pct(count: number, n: number) { return ((count / n) * 100).toFixed(2) }

function TypeBreakdown({ label, entries, n, color }: { label: string; entries: [string,number][]; n: number; color: string }) {
  const [open, setOpen] = useState(false)
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const expectedUniform = 1 / entries.length
  const avg = entries.reduce((s,[,v]) => s+v, 0) / entries.length
  const max = sorted[0]?.[1] ?? 0
  const min = sorted[sorted.length-1]?.[1] ?? 0

  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 10, background: '#111827',
        border: `1px solid ${color}44`, borderRadius: 8, padding: '8px 12px',
        color: 'white', cursor: 'pointer', fontFamily: 'monospace', width: '100%', textAlign: 'left',
      }}>
        <span style={{ fontWeight: 800, color, minWidth: 40 }}>{label}</span>
        <span style={{ color: '#aaa', fontSize: 12 }}>{entries.length} entries</span>
        <span style={{ color: '#aaa', fontSize: 12 }}>· avg {pct(avg, n)}%</span>
        <span style={{ color: '#aaa', fontSize: 12 }}>· max {pct(max, n)}%</span>
        <span style={{ color: '#aaa', fontSize: 12 }}>· min {pct(min, n)}%</span>
        <span style={{ marginLeft: 'auto', color: '#666', fontSize: 11 }}>{open ? '▲ hide' : '▼ show all'}</span>
      </button>
      {open && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 2 }}>
          <thead>
            <tr style={{ background: '#0d1526', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px', color: '#555' }}>#</th>
              <th style={{ padding: '4px 8px', color: '#555' }}>Name</th>
              <th style={{ padding: '4px 8px', color: '#555' }}>Count</th>
              <th style={{ padding: '4px 8px', color: '#555' }}>%</th>
              <th style={{ padding: '4px 8px', color: '#555' }}>vs type avg</th>
              <th style={{ padding: '4px 8px', color: '#555' }}>bar</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([key, count], i) => {
              const ratio = count / avg
              const barW = Math.round((count / max) * 100)
              return (
                <tr key={key} style={{ borderBottom: '1px solid #0d1526', background: ratio > 1.5 ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                  <td style={{ padding: '3px 8px', color: '#444' }}>{i + 1}</td>
                  <td style={{ padding: '3px 8px', color: 'white' }}>{key.replace(/^(club|nat|cont|cc|letter):/, '')}</td>
                  <td style={{ padding: '3px 8px', color: '#888' }}>{count.toLocaleString()}</td>
                  <td style={{ padding: '3px 8px', fontWeight: 700, color: ratio > 1.5 ? '#ef4444' : ratio > 1.2 ? '#fbbf24' : '#aaa' }}>{pct(count, n)}%</td>
                  <td style={{ padding: '3px 8px', color: ratio > 1.5 ? '#ef4444' : ratio > 1.2 ? '#fbbf24' : '#6b7280' }}>{ratio.toFixed(2)}×</td>
                  <td style={{ padding: '3px 8px', minWidth: 80 }}>
                    <div style={{ height: 6, width: `${barW}%`, background: color, borderRadius: 3, opacity: 0.7 }} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function DistanceTable({ dist, freq, n }: { dist: string; freq: Record<string, number>; n: number }) {
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 30)
  const expectedUniform = 1 / Object.keys(freq).length

  // Group by filter type
  const byType: Record<string, [string,number][]> = {}
  for (const [k, v] of Object.entries(freq)) {
    const type = k.startsWith('club:') ? 'club'
      : k.startsWith('nat:') ? 'nat'
      : k.startsWith('cont:') ? 'cont'
      : k.startsWith('cc:') ? 'cc'
      : k.startsWith('letter:') ? 'letter'
      : k === 'all' ? 'all' : 'other'
    if (!byType[type]) byType[type] = []
    byType[type].push([k, v])
  }

  const typeTotals: Record<string, number> = {}
  for (const [type, entries] of Object.entries(byType)) {
    typeTotals[type] = entries.reduce((s, [,v]) => s+v, 0)
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        Distance: {dist}y — {getClub(Number(dist))} (threshold: {getThreshold(Number(dist))})
      </h2>

      {/* Type summary pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(typeTotals).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
          <div key={type} style={{ background: '#1e2d4a', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
            <span style={{ fontWeight: 800, color: typeColor(type) }}>{type}</span>
            <span style={{ color: '#aaa', marginLeft: 6 }}>{pct(count, n)}%</span>
          </div>
        ))}
      </div>

      {/* Per-type collapsible breakdowns */}
      {(['club','nat','cc','cont','all','letter'] as const).map(type => {
        const entries = byType[type] ?? []
        if (entries.length === 0) return null
        return (
          <TypeBreakdown key={type} label={type} entries={entries} n={n} color={typeColor(type)} />
        )
      })}

      {/* Top 30 overall */}
      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', color: '#666', fontSize: 12, marginBottom: 8 }}>
          Top 30 overall ({Object.keys(freq).length} unique categories)
        </summary>
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
              const type = key.startsWith('club:') ? 'club' : key.startsWith('nat:') ? 'nat' : key.startsWith('cont:') ? 'cont' : key.startsWith('cc:') ? 'cc' : key.startsWith('letter:') ? 'letter' : 'all'
              return (
                <tr key={key} style={{ borderBottom: '1px solid #222', background: ratio > 3 ? 'rgba(239,68,68,0.15)' : ratio > 2 ? 'rgba(251,191,36,0.1)' : 'transparent' }}>
                  <td style={{ padding: '5px 10px', color: '#666' }}>{i + 1}</td>
                  <td style={{ padding: '5px 10px' }}>
                    <span style={{ color: typeColor(type), fontWeight: 700, marginRight: 6, fontSize: 11 }}>{type}</span>
                    {key.replace(/^(club|nat|cont|cc|letter):/, '')}
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
      </details>
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
  return { all: '#94a3b8', nat: '#60a5fa', cont: '#a78bfa', club: '#34d399', cc: '#fb923c', letter: '#f472b6', other: '#f87171' }[type] ?? '#fff'
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
      {loading && <div style={{ color: '#888', fontSize: 14 }}>Running {Number(n).toLocaleString()} iterations per distance…</div>}

      {results && (
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 24 }}>
            {Number(results.n).toLocaleString()} iterations per distance · click a type row to expand full breakdown
          </div>
          {results.distances.map(dist => (
            <DistanceTable key={dist} dist={String(dist)} freq={results.results[dist]} n={results.n} />
          ))}
        </div>
      )}
    </div>
  )
}

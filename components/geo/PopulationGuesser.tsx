'use client'

import { useState, useRef, useEffect } from 'react'
import { CITIES, City, formatPopFull, computeRank, diffColor, getContinent } from '@/lib/geo/city-data'

type GuessResult = {
  city: City
  rank: number
  pct: number
}

// Cities that an international audience (skewing UK/European) would recognise
const WELL_KNOWN = new Set([
  // UK — England
  'London','Manchester','Birmingham','Leeds','Sheffield','Liverpool','Bristol',
  'Newcastle','Nottingham','Leicester','Coventry','Bradford','Wolverhampton',
  'Southampton','Portsmouth','Brighton','Hull','Derby','Stoke-on-Trent','Plymouth',
  'Bournemouth','Reading','Middlesbrough','Sunderland','Oxford','Cambridge',
  'Bath','York','Exeter','Norwich','Ipswich','Luton','Milton Keynes','Peterborough',
  // UK — Scotland, Wales, NI
  'Edinburgh','Glasgow','Aberdeen','Dundee','Inverness','Cardiff','Swansea','Newport','Belfast',
  // Germany
  'Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart','Düsseldorf','Leipzig',
  'Dortmund','Essen','Bremen','Dresden','Hanover','Nuremberg','Duisburg','Bochum',
  'Wuppertal','Bielefeld','Bonn','Münster','Augsburg','Karlsruhe','Mannheim',
  'Kiel','Magdeburg','Freiburg','Erfurt','Rostock','Lübeck','Aachen',
  // France
  'Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Strasbourg','Bordeaux',
  'Lille','Rennes','Reims','Grenoble','Dijon','Angers','Le Havre','Rouen',
  'Saint-Étienne','Toulon','Brest','Metz','Tours','Caen','Orléans','Amiens',
  'Limoges','Perpignan','Clermont-Ferrand','Nancy','Besançon','Mulhouse',
  // Italy
  'Rome','Milan','Naples','Turin','Palermo','Genoa','Bologna','Florence','Venice',
  'Bari','Catania','Verona','Messina','Padua','Trieste','Taranto','Brescia',
  'Reggio Calabria','Modena','Cagliari','Parma','Ferrara','Salerno','Livorno',
  // Spain
  'Madrid','Barcelona','Valencia','Seville','Zaragoza','Málaga','Bilbao','Murcia',
  'Palma','Las Palmas','Alicante','Córdoba','Valladolid','Vigo','Gijón','Granada',
  'Vitoria','Salamanca','Santiago de Compostela','Tarragona',
  // Other Western Europe
  'Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven','Tilburg','Groningen',
  'Brussels','Antwerp','Bruges','Liège','Ghent',
  'Zurich','Geneva','Bern','Basel','Lausanne',
  'Lisbon','Porto',
  'Vienna','Graz','Linz','Salzburg','Innsbruck',
  'Stockholm','Gothenburg','Malmö',
  'Copenhagen','Aarhus',
  'Oslo','Bergen',
  'Helsinki','Tampere','Turku',
  'Dublin','Cork','Galway',
  // Eastern & Central Europe
  'Prague','Brno','Warsaw','Krakow','Wroclaw','Lodz','Poznan','Gdansk','Szczecin',
  'Budapest','Debrecen','Bratislava','Bucharest','Cluj-Napoca','Belgrade','Novi Sad',
  'Zagreb','Split','Sarajevo','Skopje','Sofia','Plovdiv','Varna',
  'Kyiv','Kharkiv','Odessa','Lviv','Minsk','Chisinau',
  'Riga','Vilnius','Tallinn',
  'Athens','Thessaloniki','Patras',
  'Tirana','Nicosia','Reykjavik','Luxembourg',
  // Americas — USA
  'New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio',
  'San Diego','Dallas','San Jose','Austin','Jacksonville','Fort Worth','Columbus',
  'Charlotte','Indianapolis','San Francisco','Seattle','Denver','Nashville',
  'Oklahoma City','El Paso','Washington DC','Las Vegas','Louisville','Memphis',
  'Portland','Baltimore','Milwaukee','Albuquerque','Tucson','Fresno','Sacramento',
  'Mesa','Kansas City','Atlanta','Omaha','Colorado Springs','Raleigh','Long Beach',
  'Virginia Beach','Minneapolis','Tampa','New Orleans','Arlington','Bakersfield',
  'Honolulu','Anaheim','Aurora','Santa Ana','Corpus Christi','Riverside','St. Louis',
  'Pittsburgh','Lexington','Anchorage','Stockton','Cincinnati','St. Paul','Toledo',
  'Greensboro','Newark','Buffalo','Plano','Madison','Orlando','Baton Rouge',
  'Durham','Laredo','Lubbock','Winston-Salem','Reno','Rochester','Akron','Tacoma',
  'Providence','Knoxville','Chattanooga','Syracuse','Spokane','Salt Lake City',
  'Des Moines','Richmond','Jackson','Detroit','Boston','Miami','Cleveland',
  // Americas — Canada & Latin America
  'Toronto','Montreal','Vancouver','Calgary','Ottawa','Edmonton','Quebec City',
  'Winnipeg','Hamilton','Halifax',
  'Mexico City','Guadalajara','Monterrey','Tijuana','Puebla','León',
  'São Paulo','Rio de Janeiro','Salvador','Fortaleza','Belo Horizonte','Manaus',
  'Curitiba','Recife','Porto Alegre','Belém','Goiânia','Brasília',
  'Buenos Aires','Córdoba','Rosario','Mendoza',
  'Lima','Arequipa',
  'Bogotá','Medellín','Cali','Barranquilla',
  'Santiago','Valparaíso','Concepción',
  'Caracas','Maracaibo',
  'Quito','Guayaquil',
  'La Paz','Santa Cruz','Cochabamba',
  'Montevideo','Asunción',
  'Havana','Panama City','Santo Domingo','San José','Guatemala City','Tegucigalpa',
  'Managua','San Salvador',
  // Asia & Middle East
  'Tokyo','Delhi','Shanghai','Mumbai','Beijing','Osaka','Karachi','Lahore','Istanbul',
  'Jakarta','Bangkok','Seoul','Manila','Kolkata','Bangalore','Chennai','Hyderabad',
  'Tehran','Baghdad','Riyadh','Jeddah','Dubai','Singapore','Kuala Lumpur',
  'Ho Chi Minh City','Hanoi','Yangon','Kabul','Kathmandu','Colombo','Tashkent',
  'Almaty','Baku','Tbilisi','Yerevan','Doha','Abu Dhabi','Kuwait City','Amman',
  'Damascus','Beirut','Tel Aviv','Jerusalem','Ankara','Taipei','Hong Kong','Pyongyang',
  'Busan','Chengdu','Wuhan','Guangzhou','Shenzhen','Dhaka','Islamabad','Naypyidaw',
  'Shenyang','Tianjin','Xi\'an','Nanjing','Hangzhou','Chongqing','Harbin','Dalian',
  'Phnom Penh','Vientiane','Ulaanbaatar','Bishkek','Dushanbe','Ashgabat','Muscat',
  'Riyadh','Sanaa','Kabul',
  'Sapporo','Nagoya','Kyoto','Kobe','Hiroshima','Sendai','Fukuoka',
  // Africa
  'Cairo','Lagos','Kinshasa','Luanda','Nairobi','Addis Ababa','Dar es Salaam',
  'Khartoum','Abidjan','Accra','Casablanca','Algiers','Tunis','Johannesburg',
  'Cape Town','Durban','Kampala','Dakar','Mogadishu','Harare','Lusaka','Maputo',
  'Kigali','Bamako','Tripoli','Alexandria','Rabat','Pretoria','Antananarivo',
  'Douala','Yaoundé','Conakry','Lomé','Cotonou','Ouagadougou','Niamey','Ndjamena',
  'Libreville','Brazzaville','Malabo','Kigali','Bujumbura','Asmara','Djibouti',
  'Windhoek','Gaborone','Maseru','Mbabane','Blantyre','Lusaka','Harare',
  'Mombasa','Kumasi','Ibadan','Kano','Port Harcourt','Kaduna',
  // Oceania
  'Sydney','Melbourne','Brisbane','Perth','Adelaide','Canberra','Hobart','Darwin',
  'Gold Coast','Newcastle','Auckland','Wellington','Christchurch','Hamilton',
  'Port Moresby','Suva',
])

function pickTarget(): City {
  const pool = CITIES.filter(c => WELL_KNOWN.has(c.name))
  return pool[Math.floor(Math.random() * pool.length)]
}

function ClueSlot({ revealed, unlocked, onClick, icon, value, color, borderColor, bgColor, disabled }: {
  revealed: boolean; unlocked: boolean; onClick: () => void
  icon: string; value: string; color: string; borderColor: string; bgColor: string; disabled: boolean
}) {
  return (
    <button
      onClick={() => unlocked && !revealed && !disabled && onClick()}
      style={{
        flex: 1, border: `1px solid ${revealed ? borderColor : '#1e2d4a'}`,
        background: revealed ? bgColor : '#0a0f1e', borderRadius: 10, padding: '10px 8px',
        cursor: revealed || !unlocked || disabled ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        opacity: !unlocked ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 16 }}>{!unlocked ? '🔒' : icon}</span>
      {revealed
        ? <span style={{ fontSize: 12, fontWeight: 800, color, textAlign: 'center', lineHeight: 1.2 }}>{value}</span>
        : <span style={{ fontSize: 11, fontWeight: 600, color: unlocked ? '#4a6080' : '#2a3d5e' }}>
            {unlocked ? 'Tap to reveal' : 'Locked'}
          </span>
      }
    </button>
  )
}

export default function PopulationGuesser() {
  const [target, setTarget] = useState<City>(pickTarget)
  const [guesses, setGuesses] = useState<GuessResult[]>([])
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<City[]>([])
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [error, setError] = useState('')
  const [clueLevel, setClueLevel] = useState(0)
  const [gaveUp, setGaveUp] = useState(false)
  const [solved, setSolved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const guessedNames = new Set(guesses.map(g => g.city.name))
  const disabled = solved || gaveUp
  const continent = getContinent(target)

  function respin() {
    let next = pickTarget()
    while (next.name === target.name) next = pickTarget()
    setTarget(next)
    setGuesses([])
    setClueLevel(0)
    setGaveUp(false)
    setSolved(false)
    setInput('')
    setSuggestions([])
    setError('')
  }

  function handleInput(val: string) {
    setInput(val)
    setError('')
    if (val.length < 2) { setSuggestions([]); return }
    const v = val.toLowerCase()
    const starts = CITIES.filter(c => c.name.toLowerCase().startsWith(v))
    const contains = CITIES.filter(c => !c.name.toLowerCase().startsWith(v) && c.name.toLowerCase().includes(v))
    setSuggestions([...starts, ...contains].slice(0, 8))
    setSelectedIdx(-1)
  }

  function submitGuess(city: City) {
    // Win condition — guessed the exact target
    if (city.name === target.name && city.country === target.country) {
      setSolved(true)
      setInput('')
      setSuggestions([])
      return
    }
    if (guessedNames.has(city.name)) { setError('Already guessed!'); return }
    const diff = Math.abs(city.pop - target.pop)
    const pct = (diff / target.pop) * 100
    const rank = computeRank(city, target)
    setGuesses(prev => [...prev, { city, rank, pct }].sort((a, b) => a.rank - b.rank))
    setInput('')
    setSuggestions([])
    setSelectedIdx(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const pick = selectedIdx >= 0 ? suggestions[selectedIdx] : suggestions.length === 1 ? suggestions[0] : null
      if (pick) submitGuess(pick)
    }
    if (e.key === 'Escape') { setSuggestions([]); setSelectedIdx(-1) }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setSuggestions([])
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function shareResult() {
    const status = gaveUp ? 'gave up' : `found in ${guesses.length + 1}`
    const lines = [
      `🌍 City Population Guesser`,
      `${target.name} (${formatPopFull(target.pop)}) — ${status}`,
      '',
      ...guesses.map(g => {
        const c = diffColor(g.pct)
        return `${c.emoji} ${g.city.name}`
      }),
      '',
      'topbinsfooty.com/geo/population',
    ]
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", paddingBottom: 48 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        .geo-input::placeholder { color: #4a5568; }
        .geo-input:focus { outline: none; border-color: #dc2626 !important; }
        .geo-suggestion:hover { background: rgba(255,255,255,0.06) !important; }
        .geo-btn:hover { opacity: 0.85; }
      `}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ padding: '16px 0 14px', borderBottom: '1px solid #1e2d4a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/geo" style={{ color: '#4a5568', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</a>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>Population Guesser</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>Guess the mystery city from its population</div>
          </div>
          <button className="geo-btn" onClick={respin} style={{ background: '#1e2d4a', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#8899bb', cursor: 'pointer' }}>
            🔄 New city
          </button>
        </div>

        {/* Mystery target card — no population shown */}
        <div style={{ margin: '20px 0 12px', background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Mystery city</div>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🔍</div>
          <div style={{ fontSize: 13, color: '#4a5568' }}>Use your guesses to find it</div>
        </div>

        {/* Clues tile — hints about the hidden target */}
        <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Clues</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ClueSlot revealed={clueLevel >= 1} unlocked={true} disabled={disabled}
              onClick={() => setClueLevel(1)} icon="🌍" value={continent}
              color="#60a5fa" borderColor="rgba(59,130,246,0.4)" bgColor="rgba(59,130,246,0.1)" />
            <ClueSlot revealed={clueLevel >= 2} unlocked={clueLevel >= 1} disabled={disabled}
              onClick={() => setClueLevel(2)} icon="🏳️" value={target.country}
              color="#c084fc" borderColor="rgba(168,85,247,0.4)" bgColor="rgba(168,85,247,0.1)" />
            <ClueSlot revealed={clueLevel >= 3} unlocked={clueLevel >= 2} disabled={disabled}
              onClick={() => setClueLevel(3)} icon="🔤" value={`"${target.name[0]}…"`}
              color="#fbbf24" borderColor="rgba(251,191,36,0.4)" bgColor="rgba(251,191,36,0.1)" />
          </div>
        </div>

        {/* Input */}
        {!disabled && (
          <div ref={dropdownRef} style={{ position: 'relative', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={inputRef} className="geo-input" value={input}
                onChange={e => handleInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Guess a city…" autoComplete="off"
                style={{ flex: 1, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: 'white', fontFamily: 'inherit' }}
              />
              <button
                onClick={() => {
                  const pick = selectedIdx >= 0 ? suggestions[selectedIdx] : suggestions.length === 1 ? suggestions[0] : null
                  if (pick) submitGuess(pick)
                }}
                disabled={suggestions.length === 0}
                style={{ background: '#dc2626', border: 'none', borderRadius: 10, padding: '0 18px', fontSize: 18, cursor: suggestions.length === 0 ? 'not-allowed' : 'pointer', opacity: suggestions.length === 0 ? 0.4 : 1, color: 'white' }}
              >→</button>
            </div>
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {suggestions.map((c, i) => (
                  <div key={`${c.name}-${c.iso2}`} className="geo-suggestion" onMouseDown={() => submitGuess(c)}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: i === selectedIdx ? 'rgba(220,38,38,0.1)' : 'transparent', borderBottom: i < suggestions.length - 1 ? '1px solid #1a2540' : 'none' }}>
                    <span style={{ fontSize: 14, color: guessedNames.has(c.name) ? '#4a5568' : 'white', fontWeight: 600 }}>
                      {c.name}
                      {guessedNames.has(c.name) && <span style={{ fontSize: 11, marginLeft: 6, color: '#4a5568' }}>already guessed</span>}
                    </span>
                    <span style={{ fontSize: 12, color: '#4a5568' }}>{c.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, paddingLeft: 4 }}>{error}</div>}

        {/* Give up */}
        {!disabled && (
          <button className="geo-btn" onClick={() => setGaveUp(true)}
            style={{ width: '100%', marginBottom: 16, background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>
            🏳️ Give up
          </button>
        )}

        {/* Solved banner */}
        {solved && (
          <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', marginBottom: 6 }}>🎉 You got it!</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 2 }}>{target.name}</div>
            <div style={{ fontSize: 13, color: '#8899bb', marginBottom: 12 }}>{target.country} · {formatPopFull(target.pop)} · {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={shareResult} style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer' }}>Copy result</button>
              <button onClick={respin} style={{ background: '#1e2d4a', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer' }}>🔄 New city</button>
            </div>
          </div>
        )}

        {/* Gave up banner */}
        {gaveUp && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>🏳️ You gave up</div>
            <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 2 }}>The city was:</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 2 }}>{target.name}</div>
            <div style={{ fontSize: 14, color: '#8899bb', marginBottom: 12 }}>{target.country} · {formatPopFull(target.pop)}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {guesses.length > 0 && <button onClick={shareResult} style={{ background: '#1e2d4a', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 800, color: '#8899bb', cursor: 'pointer' }}>Share</button>}
              <button onClick={respin} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer' }}>🔄 New city</button>
            </div>
          </div>
        )}

        {/* Guess history — colour only, no numbers */}
        {guesses.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'} — closest first
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {guesses.map(g => {
                const c = diffColor(g.pct)
                return (
                  <div key={g.city.name} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Rank badge */}
                    <div style={{ minWidth: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, color: c.text, textTransform: 'uppercase', lineHeight: 1 }}>rank</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: c.text, lineHeight: 1.1 }}>#{g.rank}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.city.name}</div>
                      <div style={{ fontSize: 11, color: '#8899bb' }}>{g.city.country}</div>
                    </div>
                    {/* Population only — no direction/% */}
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {formatPopFull(g.city.pop)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {guesses.length === 0 && !solved && !gaveUp && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#4a5568' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Guess any city to start</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Each guess shows its rank and population — use them to find the mystery city</div>
          </div>
        )}

      </div>
    </div>
  )
}

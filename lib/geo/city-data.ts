import rawCities from './cities.json'

export type City = {
  name: string
  country: string
  iso2: string
  pop: number
  capital?: boolean
}

// Loaded from lib/geo/cities.json
// To replace with the full ~10k city dataset, run:
//   npx tsx scripts/process-cities.ts [path/to/worldcities.csv]
// Download worldcities.csv free from: https://simplemaps.com/data/world-cities
export const CITIES: City[] = rawCities as City[]

export function formatPop(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'k'
  return n.toLocaleString()
}

export function formatPopFull(n: number): string {
  return n.toLocaleString()
}

export function pctDiff(guess: City, target: City): number {
  return (Math.abs(guess.pop - target.pop) / target.pop) * 100
}

export function computeRank(guess: City, target: City): number {
  const diff = Math.abs(guess.pop - target.pop)
  return CITIES.filter(c => c.name !== guess.name && Math.abs(c.pop - target.pop) < diff).length + 1
}

const CONTINENT_BY_ISO2: Record<string, string> = {
  // Africa
  DZ:'Africa',AO:'Africa',BJ:'Africa',BW:'Africa',BF:'Africa',BI:'Africa',CM:'Africa',
  CV:'Africa',CF:'Africa',TD:'Africa',KM:'Africa',CG:'Africa',CD:'Africa',CI:'Africa',
  DJ:'Africa',EG:'Africa',GQ:'Africa',ER:'Africa',ET:'Africa',GA:'Africa',GM:'Africa',
  GH:'Africa',GN:'Africa',GW:'Africa',KE:'Africa',LS:'Africa',LR:'Africa',LY:'Africa',
  MG:'Africa',MW:'Africa',ML:'Africa',MR:'Africa',MU:'Africa',MA:'Africa',MZ:'Africa',
  NA:'Africa',NE:'Africa',NG:'Africa',RW:'Africa',SN:'Africa',SL:'Africa',SO:'Africa',
  ZA:'Africa',SS:'Africa',SD:'Africa',SZ:'Africa',TZ:'Africa',TG:'Africa',TN:'Africa',
  UG:'Africa',ZM:'Africa',ZW:'Africa',ST:'Africa',
  // Asia
  AF:'Asia',AM:'Asia',AZ:'Asia',BH:'Asia',BD:'Asia',BT:'Asia',BN:'Asia',KH:'Asia',
  CN:'Asia',GE:'Asia',IN:'Asia',ID:'Asia',IR:'Asia',IQ:'Asia',IL:'Asia',JP:'Asia',
  JO:'Asia',KZ:'Asia',KW:'Asia',KG:'Asia',LA:'Asia',LB:'Asia',MY:'Asia',MV:'Asia',
  MN:'Asia',MM:'Asia',NP:'Asia',KP:'Asia',OM:'Asia',PK:'Asia',PH:'Asia',QA:'Asia',
  SA:'Asia',SG:'Asia',LK:'Asia',SY:'Asia',TW:'Asia',TJ:'Asia',TH:'Asia',TL:'Asia',
  TM:'Asia',AE:'Asia',UZ:'Asia',VN:'Asia',YE:'Asia',CY:'Asia',
  // Europe
  AL:'Europe',AD:'Europe',AT:'Europe',BY:'Europe',BE:'Europe',BA:'Europe',BG:'Europe',
  HR:'Europe',CZ:'Europe',DK:'Europe',EE:'Europe',FI:'Europe',FR:'Europe',DE:'Europe',
  GR:'Europe',HU:'Europe',IS:'Europe',IE:'Europe',IT:'Europe',XK:'Europe',LV:'Europe',
  LI:'Europe',LT:'Europe',LU:'Europe',MT:'Europe',MD:'Europe',MC:'Europe',ME:'Europe',
  NL:'Europe',MK:'Europe',NO:'Europe',PL:'Europe',PT:'Europe',RO:'Europe',RU:'Europe',
  SM:'Europe',RS:'Europe',SK:'Europe',SI:'Europe',ES:'Europe',SE:'Europe',CH:'Europe',
  TR:'Europe',UA:'Europe',GB:'Europe',VA:'Europe',
  // North America
  CA:'North America',US:'North America',MX:'North America',GT:'North America',
  BZ:'North America',HN:'North America',SV:'North America',NI:'North America',
  CR:'North America',PA:'North America',CU:'North America',JM:'North America',
  HT:'North America',DO:'North America',TT:'North America',BS:'North America',
  BB:'North America',LC:'North America',VC:'North America',GD:'North America',
  DM:'North America',AG:'North America',KN:'North America',PR:'North America',
  // South America
  BR:'South America',AR:'South America',CO:'South America',PE:'South America',
  VE:'South America',CL:'South America',EC:'South America',BO:'South America',
  PY:'South America',UY:'South America',GY:'South America',SR:'South America',
  // Oceania
  AU:'Oceania',NZ:'Oceania',PG:'Oceania',FJ:'Oceania',SB:'Oceania',VU:'Oceania',
  WS:'Oceania',TO:'Oceania',KI:'Oceania',FM:'Oceania',MH:'Oceania',NR:'Oceania',
  NC:'Oceania',GU:'Oceania',
  // Asia (missing)
  KR:'Asia',HK:'Asia',MO:'Asia',
  // North America (territories)
  MQ:'North America',GP:'North America',CW:'North America',
  // Africa (territories)
  RE:'Africa',YT:'Africa',GF:'South America',
  // Disputed / special
  XG:'Europe',XW:'Europe',
}

export function getContinent(city: City): string {
  return CONTINENT_BY_ISO2[city.iso2] ?? 'Unknown'
}

export function diffColor(pct: number): { bg: string; border: string; text: string; emoji: string } {
  if (pct <= 10)  return { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.5)',  text: '#22c55e', emoji: '🟢' }
  if (pct <= 25)  return { bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.5)',  text: '#eab308', emoji: '🟡' }
  if (pct <= 50)  return { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.5)', text: '#f97316', emoji: '🟠' }
  return           { bg: 'rgba(239,68,68,0.15)',         border: 'rgba(239,68,68,0.45)', text: '#ef4444', emoji: '🔴' }
}

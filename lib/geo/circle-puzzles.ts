export type CirclePuzzle = {
  id: number
  lat: number
  lng: number
  radiusKm: number
  population: number
  label: string
}

export const PUZZLES: CirclePuzzle[] = [
  // City/metro level (radiusKm 50–100)
  { id: 0,  lat: 35.6762,  lng: 139.6503, radiusKm: 80,   population: 38_508_600,     label: 'Greater Tokyo' },
  { id: 1,  lat: 28.6139,  lng: 77.2090,  radiusKm: 70,   population: 43_584_480,     label: 'Delhi NCR' },
  { id: 2,  lat: 31.2304,  lng: 121.4737, radiusKm: 80,   population: 39_711_162,     label: 'Greater Shanghai' },
  { id: 3,  lat: 19.0760,  lng: 72.8777,  radiusKm: 60,   population: 27_243_794,     label: 'Mumbai Metropolitan Region' },
  { id: 4,  lat: -6.2088,  lng: 106.8456, radiusKm: 70,   population: 40_472_142,     label: 'Greater Jakarta (Jabodetabek)' },
  { id: 5,  lat: 40.7128,  lng: -74.0060, radiusKm: 80,   population: 18_767_344,     label: 'New York Metropolitan Area' },
  { id: 6,  lat: 23.8103,  lng: 90.4125,  radiusKm: 60,   population: 37_989_332,     label: 'Greater Dhaka' },
  { id: 7,  lat: 30.0444,  lng: 31.2357,  radiusKm: 70,   population: 36_340_374,     label: 'Greater Cairo' },
  { id: 8,  lat: 19.4326,  lng: -99.1332, radiusKm: 80,   population: 27_567_789,     label: 'Mexico City Metro Area' },
  { id: 9,  lat: -23.5505, lng: -46.6333, radiusKm: 80,   population: 26_233_128,     label: 'Greater São Paulo' },
  { id: 10, lat: 14.5995,  lng: 120.9842, radiusKm: 70,   population: 31_786_959,     label: 'Metro Manila' },
  { id: 11, lat: 41.0082,  lng: 28.9784,  radiusKm: 75,   population: 19_712_556,     label: 'Istanbul Metro Area' },
  { id: 12, lat: 6.5244,   lng: 3.3792,   radiusKm: 80,   population: 20_051_811,     label: 'Lagos Metro Area' },
  { id: 13, lat: 13.7563,  lng: 100.5018, radiusKm: 70,   population: 22_234_958,     label: 'Bangkok Metropolitan Region' },
  { id: 14, lat: 22.5726,  lng: 88.3639,  radiusKm: 65,   population: 37_022_465,     label: 'Kolkata Metropolitan Area' },
  { id: 15, lat: 39.9042,  lng: 116.4074, radiusKm: 85,   population: 29_284_088,     label: 'Beijing Metro Area' },
  { id: 16, lat: 48.8566,  lng: 2.3522,   radiusKm: 80,   population: 13_390_951,     label: 'Greater Paris (Île-de-France)' },
  { id: 17, lat: 51.5074,  lng: -0.1278,  radiusKm: 75,   population: 17_799_948,     label: 'Greater London' },
  { id: 18, lat: -34.6037, lng: -58.3816, radiusKm: 80,   population: 17_004_097,     label: 'Greater Buenos Aires' },
  { id: 19, lat: 23.1291,  lng: 113.2644, radiusKm: 100,  population: 49_317_312,     label: 'Pearl River Delta (Guangzhou–Shenzhen)' },

  // Regional (radiusKm 150–400)
  { id: 20, lat: 52.3702,  lng: 4.8952,   radiusKm: 180,  population: 29_130_870,     label: 'The Netherlands' },
  { id: 21, lat: 37.5665,  lng: 126.9780, radiusKm: 200,  population: 46_426_351,     label: 'South Korea' },
  { id: 22, lat: 23.6850,  lng: 90.3563,  radiusKm: 180,  population: 129_730_027,    label: 'Bangladesh' },
  { id: 23, lat: 23.6978,  lng: 120.9605, radiusKm: 200,  population: 23_853_314,     label: 'Taiwan' },
  { id: 24, lat: 30.8025,  lng: 30.9980,  radiusKm: 180,  population: 81_136_845,     label: 'Nile Delta Region' },
  { id: 25, lat: 52.3555,  lng: -1.1743,  radiusKm: 350,  population: 65_656_433,     label: 'England' },
  { id: 26, lat: -7.1500,  lng: 107.8000, radiusKm: 250,  population: 90_183_822,     label: 'West Java' },
  { id: 27, lat: 51.2000,  lng: 6.8000,   radiusKm: 160,  population: 32_411_842,     label: 'Rhine-Ruhr Metropolis' },
  { id: 28, lat: 45.0703,  lng: 10.8600,  radiusKm: 200,  population: 25_639_462,     label: 'Po Valley (Northern Italy)' },
  { id: 29, lat: 31.2000,  lng: 120.5000, radiusKm: 300,  population: 157_963_446,    label: 'Yangtze River Delta' },
  { id: 30, lat: 16.0000,  lng: 107.0000, radiusKm: 400,  population: 30_379_920,     label: 'Vietnam' },
  { id: 31, lat: 26.5000,  lng: 80.0000,  radiusKm: 400,  population: 329_840_765,    label: 'Ganges Plain' },
  { id: 32, lat: 33.3000,  lng: 44.4000,  radiusKm: 300,  population: 32_507_416,     label: 'Iraq' },
  { id: 33, lat: 34.0000,  lng: 37.0000,  radiusKm: 250,  population: 33_618_455,     label: 'Syria & Lebanon' },
  { id: 34, lat: 40.8000,  lng: -74.0000, radiusKm: 350,  population: 55_558_391,     label: 'US Northeast Corridor (Boston–DC)' },
  { id: 35, lat: 36.7783,  lng: -119.4179,radiusKm: 400,  population: 38_152_576,     label: 'California' },
  { id: 36, lat: 8.0000,   lng: 7.0000,   radiusKm: 400,  population: 131_403_723,    label: 'Southern Nigeria' },
  { id: 37, lat: 33.5000,  lng: -3.0000,  radiusKm: 400,  population: 30_820_101,     label: 'Morocco & Algeria Atlantic Coast' },

  // Continental (radiusKm 500–2000)
  { id: 38, lat: 50.0000,  lng: 10.0000,  radiusKm: 900,  population: 338_446_030,    label: 'Western Europe' },
  { id: 39, lat: 24.0000,  lng: 75.0000,  radiusKm: 1500, population: 1_679_233_465,  label: 'Indian Subcontinent' },
  { id: 40, lat: 38.0000,  lng: -90.0000, radiusKm: 1200, population: 190_040_456,    label: 'US East of Mississippi' },
  { id: 41, lat: 32.0000,  lng: 115.0000, radiusKm: 1200, population: 1_219_435_601,  label: 'Eastern China' },
  { id: 42, lat: 5.0000,   lng: 115.0000, radiusKm: 1500, population: 329_343_117,    label: 'Southeast Asia' },
  { id: 43, lat: 8.0000,   lng: 1.0000,   radiusKm: 1200, population: 381_710_555,    label: 'West Africa' },
  { id: 44, lat: 42.0000,  lng: 14.0000,  radiusKm: 1000, population: 235_109_645,    label: 'Mediterranean Europe' },
  { id: 45, lat: -36.0000, lng: -64.0000, radiusKm: 1200, population: 65_462_333,     label: 'Southern Cone (South America)' },
  { id: 46, lat: 15.0000,  lng: -86.0000, radiusKm: 1000, population: 72_236_687,     label: 'Central America & Caribbean' },
  { id: 47, lat: 14.0000,  lng: 17.0000,  radiusKm: 1500, population: 279_734_330,    label: 'Sahel Region' },
  { id: 48, lat: 40.0000,  lng: 63.0000,  radiusKm: 1200, population: 226_335_267,    label: 'Central Asia' },
  { id: 49, lat: -31.0000, lng: 149.0000, radiusKm: 900,  population: 19_458_752,     label: 'Australia East Coast' },
]

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed | 0
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    const j = Math.abs(s) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function getDailyState(): { days: number; shuffled: CirclePuzzle[] } {
  const epoch = new Date('2026-01-01').getTime()
  const days = Math.floor((Date.now() - epoch) / 86_400_000)
  const cycle = Math.floor(days / PUZZLES.length)
  const shuffled = seededShuffle(PUZZLES, cycle + 1)
  return { days, shuffled }
}

export function getDailyPuzzle(): CirclePuzzle {
  const { days, shuffled } = getDailyState()
  return shuffled[days % shuffled.length]
}

export function getDailyFreePool(): CirclePuzzle[] {
  const { days, shuffled } = getDailyState()
  const dailyId = shuffled[days % shuffled.length].id
  const pool = shuffled.filter(p => p.id !== dailyId)
  return pool.slice(0, 10)
}

export function guessPct(guess: number, actual: number): number {
  return (Math.abs(guess - actual) / actual) * 100
}

export function parsePopGuess(s: string): number | null {
  const clean = s.trim().toLowerCase().replace(/,/g, '')
  const m = clean.match(/^([\d.]+)\s*([kmb]?)$/)
  if (!m) return null
  const n = parseFloat(m[1])
  if (isNaN(n) || n <= 0) return null
  const mult = m[2] === 'b' ? 1e9 : m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : 1
  return Math.round(n * mult)
}

export function formatPopGuess(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k'
  return n.toLocaleString()
}

'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import NavBar from '@/components/NavBar'

// ── Categories ───────────────────────────────────────────────────────────────

// Nationality labels for display
const NAT_LABELS: Record<string, string> = {
  ENG:'English',FRA:'French',IRL:'Irish',SCO:'Scottish',WAL:'Welsh',ESP:'Spanish',
  NED:'Dutch',BRA:'Brazilian',POR:'Portuguese',NOR:'Norwegian',DEN:'Danish',ARG:'Argentine',
  NIR:'N. Irish',BEL:'Belgian',GER:'German',NGA:'Nigerian',JAM:'Jamaican',SWE:'Swedish',
  ITA:'Italian',USA:'American',SEN:'Senegalese',AUS:'Australian',CIV:'Ivorian',CZE:'Czech',
  SRB:'Serbian',CMR:'Cameroonian',GHA:'Ghanaian',SUI:'Swiss',CRO:'Croatian',ISL:'Icelandic',
  ZIM:'Zimbabwean',TRI:'Trinidadian',KOR:'South Korean',URU:'Uruguayan',ALG:'Algerian',
  BUL:'Bulgarian',ROU:'Romanian',EGY:'Egyptian',TUR:'Turkish',RUS:'Russian',UKR:'Ukrainian',
  COL:'Colombian',MLI:'Malian',TGO:'Togolese',NZL:'New Zealand',ZAF:'South African',
  ECU:'Ecuadorian',FIN:'Finnish',JPN:'Japanese',BIH:'Bosnian',SVK:'Slovak',PAR:'Paraguayan',
  GRE:'Greek',TUN:'Tunisian',MAR:'Moroccan',HUN:'Hungarian',ARM:'Armenian',AUT:'Austrian',
  ISR:'Israeli',SVN:'Slovenian',MNE:'Montenegrin',LIB:'Liberian',POL:'Polish',VEN:'Venezuelan',
  COD:'Congolese',GAM:'Gambian',CAN:'Canadian',CHI:'Chilean',GEO:'Georgian',ALB:'Albanian',
  MKD:'Macedonian',KVX:'Kosovar',
}

// Nationality code → continent name (must match server CONTINENT_MAP)
// Covers all FIFA member nations to future-proof against any PL player nationality
const CONTINENT_MEMBERS: Record<string, string> = {
  // Africa
  ALG:'Africa',ANG:'Africa',BEN:'Africa',BOT:'Africa',BDI:'Africa',CPV:'Africa',
  CMR:'Africa',CTA:'Africa',CHA:'Africa',COM:'Africa',COG:'Africa',COD:'Africa',
  DJI:'Africa',EGY:'Africa',EQG:'Africa',ERI:'Africa',SWZ:'Africa',ETH:'Africa',
  GAB:'Africa',GAM:'Africa',GHA:'Africa',GUI:'Africa',GNB:'Africa',CIV:'Africa',
  KEN:'Africa',LES:'Africa',LIB:'Africa',LBR:'Africa',LBA:'Africa',MAD:'Africa',
  MWI:'Africa',MLI:'Africa',MTN:'Africa',MRI:'Africa',MAR:'Africa',MOZ:'Africa',
  NAM:'Africa',NIG:'Africa',NGA:'Africa',RWA:'Africa',STP:'Africa',SEN:'Africa',
  SLE:'Africa',SOM:'Africa',ZAF:'Africa',SSD:'Africa',SDN:'Africa',TAN:'Africa',
  TGO:'Africa',TUN:'Africa',UGA:'Africa',ZAM:'Africa',ZIM:'Africa',BFA:'Africa',
  // Europe
  ALB:'Europe',AND:'Europe',ARM:'Europe',AUT:'Europe',AZE:'Europe',BLR:'Europe',
  BEL:'Europe',BIH:'Europe',BUL:'Europe',CRO:'Europe',CYP:'Europe',CZE:'Europe',
  DEN:'Europe',ENG:'Europe',EST:'Europe',FRO:'Europe',FIN:'Europe',FRA:'Europe',
  GEO:'Europe',GER:'Europe',GIB:'Europe',GRE:'Europe',HUN:'Europe',ISL:'Europe',
  IRL:'Europe',ISR:'Europe',ITA:'Europe',KVX:'Europe',LVA:'Europe',LIE:'Europe',
  LTU:'Europe',LUX:'Europe',MLT:'Europe',MDA:'Europe',MNE:'Europe',NED:'Europe',
  MKD:'Europe',NIR:'Europe',NOR:'Europe',POL:'Europe',POR:'Europe',ROU:'Europe',
  RUS:'Europe',SMR:'Europe',SCO:'Europe',SRB:'Europe',SVK:'Europe',SVN:'Europe',
  ESP:'Europe',SWE:'Europe',SUI:'Europe',TUR:'Europe',UKR:'Europe',WAL:'Europe',
  // Asia
  AFG:'Asia',BHR:'Asia',BAN:'Asia',BHU:'Asia',CAM:'Asia',CHN:'Asia',TPE:'Asia',
  IND:'Asia',IDN:'Asia',IRN:'Asia',IRQ:'Asia',JPN:'Asia',JOR:'Asia',KAZ:'Asia',
  KUW:'Asia',KGZ:'Asia',LAO:'Asia',LBN:'Asia',MAC:'Asia',MAS:'Asia',MDV:'Asia',
  MNG:'Asia',MYA:'Asia',NEP:'Asia',PRK:'Asia',OMA:'Asia',PAK:'Asia',PSE:'Asia',
  PHI:'Asia',QAT:'Asia',KSA:'Asia',SGP:'Asia',KOR:'Asia',LKA:'Asia',SYR:'Asia',
  TJK:'Asia',THA:'Asia',TLS:'Asia',TKM:'Asia',UAE:'Asia',UZB:'Asia',VIE:'Asia',YEM:'Asia',
  // S. America
  ARG:'S. America',BOL:'S. America',BRA:'S. America',CHI:'S. America',COL:'S. America',
  ECU:'S. America',GUY:'S. America',PAR:'S. America',PER:'S. America',URU:'S. America',
  VEN:'S. America',SUR:'S. America',
  // N. America (incl. Caribbean + Central America)
  USA:'N. America',CAN:'N. America',MEX:'N. America',
  BLZ:'N. America',CRC:'N. America',SLV:'N. America',GUA:'N. America',
  HON:'N. America',NCA:'N. America',PAN:'N. America',
  JAM:'N. America',TRI:'N. America',HAI:'N. America',CUB:'N. America',DOM:'N. America',
  BRB:'N. America',GRN:'N. America',ATG:'N. America',SKN:'N. America',LCA:'N. America',
  VIN:'N. America',CUW:'N. America',ARU:'N. America',BAH:'N. America',DMA:'N. America',PUR:'N. America',
  // Oceania
  AUS:'Oceania',NZL:'Oceania',FIJ:'Oceania',PNG:'Oceania',SOL:'Oceania',
  VAN:'Oceania',SAM:'Oceania',TGA:'Oceania',FSM:'Oceania',PLW:'Oceania',
  MHL:'Oceania',KIR:'Oceania',NRU:'Oceania',TUV:'Oceania',COK:'Oceania',NCL:'Oceania',
}

// Adjective form for category labels e.g. "African PL Goals"
const CONTINENT_LABELS: Record<string, string> = {
  'Africa':'African','Europe':'European','Asia':'Asian',
  'S. America':'S. American','N. America':'N. American','Oceania':'Oceanian',
}

type StatKey = 'goals'|'assists'|'goals_assists'|'appearances'|'apps_minus_goals'|
               'yellow_cards'|'clean_sheets'|'goals_2010'|'ga_2010'|'goals_2015'|'ga_2015'
type Category = { key: StatKey; label: string; statLabel: string; clubFilter?: string; natFilter?: string; continentFilter?: string; seasonFilter?: string }
type ClubType = 'driver'|'iron'|'wedge'|'putter'

// Driver/iron: stats where all-time top-3 easily hits 150+
const LONG_STATS: StatKey[] = ['goals','assists','goals_assists','appearances','apps_minus_goals','goals_2010','ga_2010','goals_2015','ga_2015']
// Wedge/putter: all stats including niche ones
const SHORT_STATS: StatKey[] = ['goals','assists','goals_assists','appearances','apps_minus_goals','yellow_cards','goals_2010','ga_2010','goals_2015','ga_2015','clean_sheets']

const STAT_LABEL: Record<StatKey, string> = {
  goals:'Goals', assists:'Assists', goals_assists:'Goals + Assists',
  appearances:'Appearances', apps_minus_goals:'Appearances − Goals',
  yellow_cards:'Yellow Cards', clean_sheets:'Clean Sheets',
  goals_2010:'Goals (since 10/11)', ga_2010:'Goals + Assists (since 10/11)',
  goals_2015:'Goals (since 15/16)', ga_2015:'Goals + Assists (since 15/16)',
}

// Stats that support per-club and continent+club queries (2010/2015 stats do not)
const CLUB_STATS: StatKey[] = ['goals','assists','goals_assists','appearances','apps_minus_goals','yellow_cards','clean_sheets']

const CLUB_THRESHOLD: Record<ClubType, number> = { driver:250, iron:150, wedge:50, putter:10 }

type NationEntry = { code: string; label: string }

// Fallback nation list (used before meta loads)
const FALLBACK_NATIONS: NationEntry[] = [
  'ENG','FRA','IRL','SCO','WAL','ESP','NED','BRA','POR','NOR','DEN','ARG','NIR','BEL','GER',
  'NGA','JAM','SWE','ITA','USA','SEN','AUS','CIV','CZE','SRB','CMR','GHA','SUI','CRO','ISL',
].map(c => ({ code:c, label:NAT_LABELS[c]??c }))

const FALLBACK_CLUBS = [
  'Tottenham Hotspur','Manchester United','Everton','Chelsea','Arsenal','Liverpool',
  'West Ham United','Newcastle United','Aston Villa','Manchester City','Southampton',
  'Fulham','Crystal Palace','Leicester City','Sunderland','Blackburn Rovers',
  'Middlesbrough','Leeds United','Wolves','West Bromwich Albion',
]

type FilterSpec =
  | { k:'all' }
  | { k:'nat'; code:string; label:string }
  | { k:'club'; name:string }
  | { k:'cont'; name:string }
  | { k:'cc'; continent:string; club:string }

function cacheKeyFor(stat: StatKey, f: FilterSpec): string {
  if (f.k==='all')  return `${stat}::`
  if (f.k==='nat')  return `${stat}:${f.code}:`
  if (f.k==='club') return `${stat}::${f.name}`
  if (f.k==='cont') return `${stat}:cont:${f.name}`
  return `${stat}:cont:${f.continent}:${f.club}`
}

function filterStr(f: FilterSpec): string {
  if (f.k==='all')  return ''
  if (f.k==='nat')  return f.code
  if (f.k==='club') return f.name
  if (f.k==='cont') return f.name
  return `${f.continent}:${f.club}`
}

function makeLabel(stat: StatKey, f: FilterSpec): string {
  const sl = STAT_LABEL[stat]
  if (f.k==='all')  return `All-time PL ${sl}`
  if (f.k==='nat')  return `${f.label} PL ${sl}`
  if (f.k==='club') return `PL ${sl} for ${f.name}`
  if (f.k==='cont') return `${CONTINENT_LABELS[f.name]??f.name} PL ${sl}`
  return `${CONTINENT_LABELS[f.continent]??f.continent} PL ${sl} for ${f.club}`
}

function makeCategoryLabel(stat: StatKey, f: FilterSpec): { label: string; statLabel: string } {
  return { label: makeLabel(stat, f), statLabel: STAT_LABEL[stat] }
}

function makeFilterLabel(cat: Category): string {
  const noun = cat.key === 'clean_sheets' ? 'goalkeepers' : 'players'
  if (cat.seasonFilter) {
    const [y1, y2] = cat.seasonFilter.split('-')
    return `in ${y1.slice(2)}/${y2.slice(2)}`
  }
  if (cat.continentFilter && cat.clubFilter) {
    return `${CONTINENT_LABELS[cat.continentFilter] ?? cat.continentFilter} ${cat.clubFilter} ${noun}`
  }
  if (cat.continentFilter) return `${CONTINENT_LABELS[cat.continentFilter] ?? cat.continentFilter} ${noun}`
  if (cat.clubFilter)      return `${cat.clubFilter} ${noun}`
  if (cat.natFilter)       return `${NAT_LABELS[cat.natFilter] ?? cat.natFilter} ${noun}`
  return `All PL ${noun}`
}

function pickCategory(
  remaining: number,
  club: ClubType,
  usedLabels: Set<string>,
  recentFilters: string[],
  recentStats: StatKey[],
  nations: NationEntry[],
  clubs: string[],
  continents: string[],
  contClubPairs: [string,string][],
  top3Cache: Record<string,number> | null,
  minReach?: number,
): Category {
  const recentSet      = new Set(recentFilters)
  const recentStatsSet = new Set(recentStats)
  const threshold = Math.max(CLUB_THRESHOLD[club], minReach ?? 0)
  const stats = remaining > 150 ? LONG_STATS : SHORT_STATS
  // Prefer stats not recently used; fall back to full pool if all are recent
  const freshStats = stats.filter(s => !recentStatsSet.has(s))
  const statPool = freshStats.length > 0 ? freshStats : stats

  // Build full filter pool
  const allFilters: FilterSpec[] = [
    { k:'all' },
    ...nations.map(n => ({ k:'nat' as const, code:n.code, label:n.label })),
    ...clubs.map(c => ({ k:'club' as const, name:c })),
    ...continents.map(c => ({ k:'cont' as const, name:c })),
    ...contClubPairs.map(([cont,cl]) => ({ k:'cc' as const, continent:cont, club:cl })),
  ]

  for (let attempt = 0; attempt < 120; attempt++) {
    const stat = statPool[Math.floor(Math.random() * statPool.length)]
    const isClubStat = CLUB_STATS.includes(stat)

    const valid = allFilters.filter(f => {
      if (!isClubStat && (f.k==='club' || f.k==='cc')) return false
      const fs = filterStr(f)
      if (fs && recentSet.has(fs)) return false
      if (top3Cache) {
        const sum = top3Cache[cacheKeyFor(stat, f)] ?? 0
        if (sum < threshold) return false
      }
      return !usedLabels.has(makeLabel(stat, f))
    })

    if (valid.length === 0) continue

    const f = valid[Math.floor(Math.random() * valid.length)]
    const { label, statLabel } = makeCategoryLabel(stat, f)
    const cat: Category = { key:stat, label, statLabel }
    if (f.k==='nat') cat.natFilter = f.code
    if (f.k==='club') cat.clubFilter = f.name
    if (f.k==='cont') cat.continentFilter = f.name
    if (f.k==='cc') { cat.continentFilter = f.continent; cat.clubFilter = f.club }
    return cat
  }

  // Fallback
  const stat = stats[Math.floor(Math.random() * stats.length)]
  const sl = STAT_LABEL[stat]
  return { key:stat, label:`All-time PL ${sl}`, statLabel:sl }
}

const BAD_LIE_SEASONS = ['2000-2001','2004-2005','2008-2009','2012-2013','2015-2016','2018-2019']

function pickBadLieCategory(season: string): Category {
  const keys: StatKey[] = ['goals','assists','yellow_cards']
  const key = keys[Math.floor(Math.random() * keys.length)]
  const [y1, y2] = season.split('-')
  const statLabel = key==='goals'?'Goals':key==='assists'?'Assists':'Yellow Cards'
  const label = `${statLabel} in ${y1.slice(2)}/${y2.slice(2)}`
  return { key, label, statLabel, seasonFilter: season }
}

// Single-season question for green/short-wedge shots — all 6 stats supported
const SEASON_STATS: StatKey[] = ['goals','goals_assists','assists','appearances','yellow_cards','clean_sheets']

function pickSeasonCategory(season: string): Category {
  const key = SEASON_STATS[Math.floor(Math.random() * SEASON_STATS.length)]
  const [y1, y2] = season.split('-')
  const statLabel = STAT_LABEL[key]
  const label = `${statLabel} in ${y1.slice(2)}/${y2.slice(2)}`
  return { key, label, statLabel, seasonFilter: season }
}


// ── Bunker questions ──────────────────────────────────────────────────────────

type BunkerQ = { q: string; opts: string[]; a: number }

const BUNKER_QUESTIONS: BunkerQ[] = [
  { q:"Who did Nicky Butt make the most PL appearances for?",
    opts:["Newcastle United","Manchester United","Birmingham City","Fulham"], a:1 },
  { q:"How many PL goals did Alan Shearer score in his career?",
    opts:["240","250","260","277"], a:2 },
  { q:"Which player has made the most PL appearances of all time?",
    opts:["Ryan Giggs","Frank Lampard","Gareth Barry","David James"], a:2 },
  { q:"In which season did Chelsea win their first Premier League title?",
    opts:["2001-02","2003-04","2004-05","2005-06"], a:2 },
  { q:"Who was PL top scorer in Arsenal's Invincibles 2003-04 season?",
    opts:["Ruud van Nistelrooy","Thierry Henry","Robert Pires","Patrick Vieira"], a:1 },
  { q:"How many Premier League titles has Manchester United won?",
    opts:["11","12","13","14"], a:2 },
  { q:"Who scored the fastest hat-trick in PL history (2 min 56 sec)?",
    opts:["Robbie Fowler","Jermain Defoe","Sadio Mané","Michael Owen"], a:2 },
  { q:"Which season did Cantona serve his 8-month ban after the kung-fu kick?",
    opts:["1993-94","1994-95","1995-96","1996-97"], a:1 },
  { q:"How many PL goals did Cristiano Ronaldo score in 2007-08 (his Golden Boot year)?",
    opts:["26","31","36","42"], a:1 },
  { q:"Who was Leicester City's top scorer in their 2015-16 title-winning season?",
    opts:["Riyad Mahrez","Leonardo Ulloa","Shinji Okazaki","Jamie Vardy"], a:3 },
  { q:"Which player has won the most PL Golden Boots?",
    opts:["Andrew Cole","Alan Shearer","Harry Kane","Thierry Henry"], a:3 },
  { q:"Who scored the first ever Premier League goal?",
    opts:["Teddy Sheringham","Alan Shearer","Brian Deane","Mark Hughes"], a:2 },
  { q:"In which year did Arsenal complete their unbeaten Invincibles PL season?",
    opts:["2002","2003","2004","2005"], a:2 },
  { q:"At what age did Wayne Rooney score his first PL goal (for Everton)?",
    opts:["15","16","17","18"], a:1 },
  { q:"How many PL titles did Man City win between 2017-18 and 2022-23?",
    opts:["3","4","5","6"], a:2 },
  { q:"Which club did Peter Schmeichel win his 5 PL titles with?",
    opts:["Aston Villa","Manchester City","Manchester United","Sporting CP"], a:2 },
  { q:"Who holds the record for most PL assists in a single season (20 in 2019-20)?",
    opts:["Kevin De Bruyne","Ryan Giggs","Cesc Fàbregas","David Beckham"], a:0 },
  { q:"Which team finished runners-up to Leicester in 2015-16?",
    opts:["Arsenal","Tottenham Hotspur","Manchester City","Chelsea"], a:0 },
]

// ── Hole shapes ────────────────────────────────────────────────────────────────

type Tee = 'Blue'|'White'|'Red'
type Pt  = {x:number; y:number}
// HolePath: 2pts = straight line, 3pts = quadratic bezier, 4pts = cubic bezier
// Tee is always pts[0] (y≈148), green is always pts[last] (y≈17)
type HolePath = {pts: Pt[]}

function bezierAt(t:number, pts:Pt[]): Pt {
  const u=1-t
  if(pts.length===2) return {x:u*pts[0].x+t*pts[1].x, y:u*pts[0].y+t*pts[1].y}
  if(pts.length===3) return {x:u*u*pts[0].x+2*u*t*pts[1].x+t*t*pts[2].x, y:u*u*pts[0].y+2*u*t*pts[1].y+t*t*pts[2].y}
  return {
    x:u*u*u*pts[0].x+3*u*u*t*pts[1].x+3*u*t*t*pts[2].x+t*t*t*pts[3].x,
    y:u*u*u*pts[0].y+3*u*u*t*pts[1].y+3*u*t*t*pts[2].y+t*t*t*pts[3].y,
  }
}

function bezierTangent(t:number, pts:Pt[]): Pt {
  const u=1-t
  if(pts.length===2) return {x:pts[1].x-pts[0].x, y:pts[1].y-pts[0].y}
  if(pts.length===3) return {x:2*(u*(pts[1].x-pts[0].x)+t*(pts[2].x-pts[1].x)), y:2*(u*(pts[1].y-pts[0].y)+t*(pts[2].y-pts[1].y))}
  return {
    x:3*(u*u*(pts[1].x-pts[0].x)+2*u*t*(pts[2].x-pts[1].x)+t*t*(pts[3].x-pts[2].x)),
    y:3*(u*u*(pts[1].y-pts[0].y)+2*u*t*(pts[2].y-pts[1].y)+t*t*(pts[3].y-pts[2].y)),
  }
}

function pathToD(pts:Pt[]): string {
  if(pts.length===2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`
  if(pts.length===3) return `M ${pts[0].x},${pts[0].y} Q ${pts[1].x},${pts[1].y} ${pts[2].x},${pts[2].y}`
  return `M ${pts[0].x},${pts[0].y} C ${pts[1].x},${pts[1].y} ${pts[2].x},${pts[2].y} ${pts[3].x},${pts[3].y}`
}

function yardToSVG(yards:number, total:number, path:HolePath): Pt {
  if(yards <= total) return bezierAt(Math.max(0, yards/total), path.pts)
  // extrapolate past the hole along the end tangent
  const start = path.pts[0], end = path.pts[path.pts.length-1]
  const svgSpan = Math.sqrt((end.x-start.x)**2+(end.y-start.y)**2)||131
  const tan = bezierTangent(1, path.pts)
  const tanLen = Math.sqrt(tan.x*tan.x+tan.y*tan.y)||1
  const extra = (yards-total)/total*svgSpan
  return {x:end.x+tan.x/tanLen*extra, y:end.y+tan.y/tanLen*extra}
}

function holeXY(path:HolePath): Pt {
  return bezierAt(1, path.pts)
}

function fairwayNormal(yards:number, total:number, path:HolePath): {lx:number;ly:number;rx:number;ry:number} {
  const t = Math.max(0.01, Math.min(0.99, yards/total))
  const tang = bezierTangent(t, path.pts)
  const len = Math.sqrt(tang.x*tang.x+tang.y*tang.y)
  const nx=-tang.y/len, ny=tang.x/len
  return {lx:nx, ly:ny, rx:-nx, ry:-ny}
}

function pathEndAngle(path:HolePath): number {
  const tang = bezierTangent(0, path.pts)
  return Math.atan2(tang.x, -tang.y) * 180 / Math.PI
}

// ── Course data ───────────────────────────────────────────────────────────────

type Hazard  = { start:number; end:number }
type Bunker  = { start:number; end:number }
type Hole    = { number:number; par:number; distance:number; hazard:Hazard|null; bunkers:Bunker[]; path:HolePath; isIsland?:boolean; dropZoneYards?:number }
type HoleDef = { number:number; par:number; yardages:Record<Tee,number>; path:HolePath; hazardFrac:{startFrac:number;endFrac:number}|null; bunkerCount:number }

function randBetween(min:number,max:number){ return min+Math.floor(Math.random()*(max-min+1)) }

function shuffle<T>(arr:T[]):T[]{
  const a=[...arr]
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]] }
  return a
}

const RANDOM_PATHS: HolePath[] = [
  {pts:[{x:50,y:148},{x:50,y:17}]},                           // straight
  {pts:[{x:42,y:148},{x:74,y:82},{x:42,y:17}]},               // bend-right
  {pts:[{x:58,y:148},{x:26,y:82},{x:58,y:17}]},               // bend-left
]

function generateHoles(count:3|6|9|18): Hole[] {
  const holes: Hole[] = []
  const groups = count / 3
  const pathPool = shuffle([...RANDOM_PATHS,...RANDOM_PATHS,...RANDOM_PATHS,...RANDOM_PATHS])
  for (let g = 0; g < groups; g++) {
    for (const par of shuffle([3,4,5])) {
      const isIslandCandidate = par===3 && Math.random() < 1/3
      const distance = par===3
        ? (isIslandCandidate ? randBetween(120,170) : randBetween(160,240))
        : par===4 ? randBetween(320,380) : randBetween(430,500)
      let hazard: Hazard|null = null
      const PIN_CLEAR = 20
      if (par===3) {
        const start = Math.round(distance*(0.60+Math.random()*0.12)/5)*5
        hazard = {start, end:Math.min(start+40, distance-PIN_CLEAR)}
      } else if (par===5) {
        const start = randBetween(36,46)*5
        hazard = {start, end:Math.min(start+40, distance-PIN_CLEAR)}
      } else {
        const fromHole = Math.round(randBetween(40,100)/5)*5
        const start = distance-fromHole
        hazard = {start, end:Math.min(start+40, distance-PIN_CLEAR)}
      }
      const isIsland = isIslandCandidate
      const path = isIsland ? RANDOM_PATHS[0] : pathPool[holes.length % pathPool.length]
      const bunkers = isIsland ? [] : generateBunkers(distance, hazard, 1)
      const dropZoneYards = isIsland ? randBetween(60, 80) : undefined
      if (isIsland) hazard = {start: 25, end: distance - 20}
      holes.push({number:holes.length+1, par, distance, hazard, bunkers, path, isIsland, dropZoneYards})
    }
  }
  return holes
}

// Paths derived from Pebble Beach aerial images.
// pts[0]=tee, pts[last]=green. y-values mapped from actual image positions.
// SVG viewBox "0 0 100 260": y = imageFraction*260  (matches 600×1560 image ratio 5:13)
// Path pts derived from aerial image analysis.
// For real-course mode these are remapped to HOLE_POSITIONS tee/green;
// the intermediate control points define the fairway bend shape.
const PEBBLE_BEACH: HoleDef[] = [
  { number:1,  par:4, yardages:{Blue:378,White:337,Red:310}, path:{pts:[{x:59.8,y:228.6},{x:37.6,y:104.0},{x:46,y:156.0},{x:70.8,y:26.3}]},   hazardFrac:null,                          bunkerCount:2 },
  { number:2,  par:5, yardages:{Blue:509,White:458,Red:358}, path:{pts:[{x:57.5,y:243.8},{x:50.7,y:116.6},{x:47.9,y:168.6},{x:32.4,y:40.5}]}, hazardFrac:null,                          bunkerCount:2 },
  { number:3,  par:4, yardages:{Blue:397,White:340,Red:285}, path:{pts:[{x:67.7,y:191.1},{x:58.4,y:104.0},{x:59.7,y:143.4},{x:54.1,y:47.0}]}, hazardFrac:null,                          bunkerCount:3 },
  { number:4,  par:4, yardages:{Blue:333,White:295,Red:197}, path:{pts:[{x:40,y:221.2},{x:49.7,y:130.8},{x:50.8,y:168.6},{x:73.3,y:66.7}]},   hazardFrac:{startFrac:0.45,endFrac:0.85}, bunkerCount:2 },
  { number:5,  par:3, yardages:{Blue:189,White:134,Red:111}, path:{pts:[{x:55.2,y:226.3},{x:48.8,y:116.6},{x:50,y:168.6},{x:56.1,y:64.1}]},   hazardFrac:{startFrac:0.35,endFrac:0.80}, bunkerCount:2 },
  { number:6,  par:5, yardages:{Blue:498,White:465,Red:420}, path:{pts:[{x:42.4,y:243.8},{x:43.1,y:104.0},{x:60.2,y:168.6},{x:33.4,y:17.2}]},  hazardFrac:{startFrac:0.40,endFrac:0.80}, bunkerCount:2 },
  { number:7,  par:3, yardages:{Blue:107,White:94, Red:87},  path:{pts:[{x:35.8,y:203.4},{x:56,y:116.6},{x:39.6,y:156.0},{x:73.9,y:56.1}]},   hazardFrac:{startFrac:0.35,endFrac:0.78}, bunkerCount:2 },
  { number:8,  par:4, yardages:{Blue:416,White:364,Red:349}, path:{pts:[{x:60.5,y:216.7},{x:24.8,y:104.0},{x:46.2,y:156.0},{x:20,y:50.4}]},   hazardFrac:{startFrac:0.74,endFrac:0.90}, bunkerCount:2 },
  { number:9,  par:4, yardages:{Blue:483,White:436,Red:350}, path:{pts:[{x:40,y:218.4},{x:37.9,y:104.0},{x:42.2,y:156.0},{x:58.2,y:37.0}]},   hazardFrac:{startFrac:0.65,endFrac:0.80}, bunkerCount:2 },
  { number:10, par:4, yardages:{Blue:444,White:408,Red:338}, path:{pts:[{x:34.6,y:229.1},{x:33.1,y:104.0},{x:38.4,y:156.0},{x:33.8,y:33.7}]}, hazardFrac:{startFrac:0.70,endFrac:0.85}, bunkerCount:2 },
  { number:11, par:4, yardages:{Blue:370,White:338,Red:298}, path:{pts:[{x:57.6,y:231.5},{x:45.4,y:104.0},{x:49,y:156.0},{x:32.9,y:36.6}]},   hazardFrac:null,                          bunkerCount:2 },
  { number:12, par:3, yardages:{Blue:202,White:176,Red:126}, path:{pts:[{x:25.8,y:168.6},{x:41.6,y:104.0},{x:43.5,y:130.8},{x:42.8,y:64.9}]}, hazardFrac:null,                          bunkerCount:2 },
  { number:13, par:4, yardages:{Blue:401,White:370,Red:295}, path:{pts:[{x:60.5,y:241.3},{x:50.7,y:116.6},{x:44.5,y:168.6},{x:68.6,y:40.3}]}, hazardFrac:null,                          bunkerCount:3 },
  { number:14, par:5, yardages:{Blue:559,White:490,Red:446}, path:{pts:[{x:44.8,y:218.7},{x:43.2,y:104.0},{x:40.4,y:156.0},{x:49.5,y:38.8}]}, hazardFrac:null,                          bunkerCount:3 },
  { number:15, par:4, yardages:{Blue:393,White:338,Red:247}, path:{pts:[{x:29.5,y:236.2},{x:43.2,y:104.0},{x:53.1,y:168.6},{x:33.3,y:26.9}]}, hazardFrac:null,                          bunkerCount:2 },
  { number:16, par:4, yardages:{Blue:400,White:368,Red:312}, path:{pts:[{x:45.7,y:208.5},{x:44.1,y:116.6},{x:60.8,y:156.0},{x:56.3,y:60.8}]}, hazardFrac:null,                          bunkerCount:2 },
  { number:17, par:3, yardages:{Blue:182,White:166,Red:142}, path:{pts:[{x:70,y:235.9},{x:55.3,y:143.4},{x:54.1,y:182.8},{x:44.1,y:84.8}]},  hazardFrac:{startFrac:0.62,endFrac:0.84}, bunkerCount:2 },
  { number:18, par:5, yardages:{Blue:541,White:506,Red:454}, path:{pts:[{x:70.3,y:208.6},{x:70,y:130.8},{x:67.7,y:168.6},{x:47.7,y:81.0}]},  hazardFrac:{startFrac:0.52,endFrac:0.67}, bunkerCount:3 },
]

function generateBunkers(distance: number, hazard: Hazard|null, count: number): Bunker[] {
  const bunkers: Bunker[] = []
  const HOLE_RANGE  = 100
  const minStart    = distance - HOLE_RANGE
  const maxStart    = distance - 40  // end = start+20, so end ≤ distance-20
  if (minStart >= maxStart) return bunkers
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const start = Math.round(randBetween(minStart, maxStart) / 5) * 5
      const end   = start + 20
      if (hazard && start < hazard.end + 10 && end > hazard.start - 10) continue
      if (bunkers.some(b => start < b.end + 20 && end > b.start - 20)) continue
      bunkers.push({ start, end })
      break
    }
  }
  return bunkers
}

function buildCourse(tee: Tee, count: number): Hole[] {
  return PEBBLE_BEACH.slice(0, count).map(def => {
    const distance = def.yardages[tee]
    let hazard: Hazard | null = null
    if (def.hazardFrac) {
      hazard = {
        start: Math.round(distance * def.hazardFrac.startFrac / 5) * 5,
        end:   Math.round(distance * def.hazardFrac.endFrac   / 5) * 5,
      }
    }
    const bunkers = generateBunkers(distance, hazard, def.bunkerCount)
    return { number: def.number, par: def.par, distance, hazard, bunkers, path: def.path }
  })
}

// ── Club types ─────────────────────────────────────────────────────────────────

function getClub(remaining:number):ClubType{
  if(remaining>260) return 'driver'
  if(remaining>70)  return 'iron'
  if(remaining>20)  return 'wedge'
  return 'putter'
}

const CLUB_RANGES:Record<ClubType,[number,number]>={driver:[250,300],iron:[120,260],wedge:[20,100],putter:[0,50]}
const CLUB_LABEL:Record<ClubType,string>={driver:'Driver',iron:'Iron',wedge:'Wedge',putter:'Putter'}

// ── Types ──────────────────────────────────────────────────────────────────────

type ShotResult={
  total:number; breakdown:{name:string;value:number}[]
  isOOB:boolean; isHoled:boolean; isGimme:boolean
  isInBunker:boolean; penaltyReason:string
  waterDropRemaining?:number  // set when OOB was a water hazard; new remaining after drop
}

type PlayerDataLocal = {
  goals:number; assists:number; games:number; yellow_cards:number; clean_sheets:number; nationality:string
  goals2010:number; ga2010:number; goals2015:number; ga2015:number
  clubGoals:Record<string,number>; clubAssists:Record<string,number>; clubGames:Record<string,number>
  clubYellowCards:Record<string,number>; clubCleanSheets:Record<string,number>
}

function normSearch(s:string){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['''`]/g,'').toLowerCase()}

type H2HStep = 'off'|'create'|'join'|'waiting-host'|'lobby'|'playing'

function calcNewBallState(result:ShotResult, remaining:number, pastPin:boolean):{remaining:number;pastPin:boolean}{
  if(result.isOOB) return {remaining:result.waterDropRemaining??remaining,pastPin}
  if(result.isHoled||result.isGimme) return {remaining:0,pastPin:false}
  const overshoot=result.total-remaining
  if(overshoot>0) return {remaining:overshoot,pastPin:!pastPin}
  return {remaining:remaining-result.total,pastPin}
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FootballGolf(){
  const [phase,setPhase]                 = useState<'setup'|'playing'|'done'>('setup')
  const [courseMode,setCourseMode]       = useState<'random'|'real'>('random')
  const [selectedCourse,setSelectedCourse] = useState<string>('pebble-beach')
  const [numHoles,setNumHoles]           = useState<3|6|9|18>(9)
  const [tee,setTee]                     = useState<Tee>('White')
  const [holes,setHoles]                 = useState<Hole[]>([])
  const [holeIdx,setHoleIdx]             = useState(0)
  const [remaining,setRemaining]         = useState(0)
  const [strokes,setStrokes]             = useState(0)
  const [scores,setScores]               = useState<(number|null)[]>([])
  const [question,setQuestion]           = useState<Category|null>(null)
  const usedLabels    = useRef<Set<string>>(new Set())
  const recentFilters = useRef<string[]>([])
  const recentStats   = useRef<StatKey[]>([])
  const metaNations      = useRef<NationEntry[]>(FALLBACK_NATIONS)
  const metaClubs        = useRef<string[]>(FALLBACK_CLUBS)
  const metaContinents   = useRef<string[]>(['Africa','Europe','Asia','S. America','N. America','Oceania'])
  const metaContClubPairs = useRef<[string,string][]>([])
  const top3CacheRef     = useRef<Record<string,number>|null>(null)
  const [metaReady, setMetaReady] = useState(false)
  const [playerInputs,setPlayerInputs]   = useState(['','',''])
  const [suggestions,setSuggestions]     = useState<string[][]>([[],[],[]])
  const [confirmedPlayers,setConfirmedPlayers] = useState<(string|null)[]>([null,null,null])
  const [shotResult,setShotResult]       = useState<ShotResult|null>(null)
  const [inputError,setInputError]       = useState('')
  const [allPlayerNames,setAllPlayerNames] = useState<string[]>([])
  const [playerData,setPlayerData]       = useState<Record<string,PlayerDataLocal>>({})
  const [namesLoading,setNamesLoading]   = useState(true)
  // Animation
  const [isAnimating,setIsAnimating]     = useState(false)
  const [animBallPos,setAnimBallPos]     = useState(0)   // yards from tee
  const [preAnimBallPos,setPreAnimBallPos] = useState(0) // ball pos before shot started (for swing graphic)
  const [arcOffset,setArcOffset]         = useState(0)   // lateral arc during flight
  const [pendingResult,setPendingResult] = useState<ShotResult|null>(null)
  const animFrameRef       = useRef<number|null>(null)
  const oobDir             = useRef<0|1|-1>(0)
  const oobTargetArcOffset = useRef<number>(0)
  const [bunkerQ,setBunkerQ]             = useState<BunkerQ|null>(null)
  const [bunkerLieResult,setBunkerLieResult] = useState<'good'|'bad'|null>(null)
  const [badLiePlayerData,setBadLiePlayerData] = useState<Record<string,{goals:number;assists:number;yellow_cards:number}>>({})
  const badLieSeason = useRef<string>('')
  const [pastPin,setPastPin]             = useState(false)
  const [holeResult,setHoleResult]       = useState<{label:string;color:string;diff:number}|null>(null)
  const normalisedNames = useRef<string[]>([])

  // ── H2H multiplayer state ───────────────────────────────────────────────────
  const [h2hStep, setH2HStep] = useState<H2HStep>('off')
  const [h2hRoomId, setH2HRoomId] = useState('')
  const [h2hJoinInput, setH2HJoinInput] = useState('')
  const [h2hPlayerName, setH2HPlayerName] = useState('')
  const [h2hOppName, setH2HOppName] = useState('')
  const [h2hWaiting, setH2HWaiting] = useState(false)
  const [h2hOppRemaining, setH2HOppRemaining] = useState<number|null>(null)
  const [h2hOppPastPin, setH2HOppPastPin] = useState(false)
  const [h2hOppHoledOut, setH2HOppHoledOut] = useState(false)
  const [matchScore, setMatchScore] = useState(0)
  const [h2hError, setH2HError] = useState('')
  const [h2hFinishHoleReady, setH2HFinishHoleReady] = useState(false)
  const [h2hIsMyTurn, setH2HIsMyTurn] = useState(true)
  const [h2hOppShotCount, setH2HOppShotCount] = useState(0) // shots opp has taken this hole
  // Trigger states
  const [h2hOppShotReady, setH2HOppShotReady] = useState<any>(null) // tee shot sync
  const [h2hOppTurnShot, setH2HOppTurnShot] = useState<any>(null)   // non-tee opp shot
  // Refs
  const h2hPlayerId    = useRef('')
  const h2hIsHost      = useRef(false)
  const h2hOppId       = useRef('')
  const h2hRoomIdRef   = useRef('')
  const h2hRoomData    = useRef<{holes:Hole[];teeCategories:Category[]}>({holes:[],teeCategories:[]})
  const h2hMyHoleStrokes = useRef(0)
  const h2hOppHoleStrokesRef = useRef<number|null>(null)
  const h2hOppRemainingRef = useRef<number|null>(null)
  const h2hOppPastPinRef = useRef(false)
  const h2hOppShotIdxRef = useRef(-1)
  const h2hIFinishedRef  = useRef(false)
  const h2hOppFinishedRef = useRef(false)
  const h2hMyRemainingRef = useRef(0)
  const h2hPendingShot = useRef<{result:ShotResult;toPos:number}|null>(null)
  const h2hPollRef     = useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(()=>{
    fetch('/api/football-golf?names=1').then(r=>r.json()).then(d=>{
      const names:string[]=d.playerNames||[]
      setAllPlayerNames(names)
      normalisedNames.current=names.map(normSearch)
      setNamesLoading(false)
    }).catch(()=>setNamesLoading(false))
  },[])

  useEffect(()=>{
    fetch('/api/football-golf?data=1').then(r=>r.json()).then(d=>setPlayerData(d.players||{})).catch(()=>{})
  },[])

  useEffect(()=>{
    fetch('/api/football-golf?meta=1').then(r=>r.json())
      .then((m:{clubs:string[];nations:string[];continents:string[];contClubPairs:[string,string][];top3Cache:Record<string,number>})=>{
        metaNations.current      = m.nations.map(c=>({code:c,label:NAT_LABELS[c]??c}))
        metaClubs.current        = m.clubs
        metaContinents.current   = m.continents
        metaContClubPairs.current = m.contClubPairs
        top3CacheRef.current     = m.top3Cache
        setMetaReady(true)
      }).catch(()=>setMetaReady(true)) // on error, allow play with fallback lists
  },[])

  useEffect(()=>{
    const s = BAD_LIE_SEASONS[Math.floor(Math.random()*BAD_LIE_SEASONS.length)]
    badLieSeason.current = s
    fetch(`/api/football-golf?season=${s}`).then(r=>r.json()).then(d=>setBadLiePlayerData(d.players||{})).catch(()=>{})
  },[])

  useEffect(()=>()=>{ if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current) },[])

  // Read ?room=XXX from URL → auto-show join screen
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    const room=params.get('room')
    if(room){ setH2HJoinInput(room.toUpperCase()); setH2HStep('join') }
  },[])

  // Tee shot: both players submit then reveal simultaneously
  useEffect(()=>{
    if(!h2hOppShotReady||!h2hPendingShot.current) return
    const oRem=h2hOppShotReady.remaining_after
    const oPP=h2hOppShotReady.past_pin
    const oHoledOut=h2hOppShotReady.holed_out
    h2hOppRemainingRef.current=oHoledOut?0:oRem
    h2hOppPastPinRef.current=oPP
    h2hOppShotIdxRef.current=0
    setH2HWaiting(false)
    setH2HOppRemaining(oHoledOut?0:oRem)
    setH2HOppPastPin(oPP)
    if(oHoledOut){setH2HOppHoledOut(true);h2hOppHoleStrokesRef.current=h2hOppShotReady.hole_strokes;h2hOppFinishedRef.current=true}
    setH2HOppShotCount(1)
    const {result,toPos}=h2hPendingShot.current
    h2hPendingShot.current=null
    animateShot(ballPos,toPos,result)
    setH2HOppShotReady(null)
    // Turn is determined in advanceFromResult after user clicks through the result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[h2hOppShotReady])

  // Non-tee opp shot arrives while we wait for their turn
  useEffect(()=>{
    if(!h2hOppTurnShot) return
    setH2HOppTurnShot(null)
    setH2HWaiting(false)
    const oRem=h2hOppTurnShot.remaining_after
    const oPP=h2hOppTurnShot.past_pin
    const oHoledOut=h2hOppTurnShot.holed_out
    h2hOppRemainingRef.current=oHoledOut?0:oRem
    h2hOppPastPinRef.current=oPP
    h2hOppShotIdxRef.current=h2hOppTurnShot.shot_idx
    setH2HOppShotCount(c=>c+1)
    setH2HOppRemaining(oHoledOut?0:oRem)
    setH2HOppPastPin(oPP)
    if(oHoledOut){
      setH2HOppHoledOut(true)
      h2hOppHoleStrokesRef.current=h2hOppTurnShot.hole_strokes
      h2hOppFinishedRef.current=true
      if(h2hIFinishedRef.current){
        resolveH2HHole(h2hMyHoleStrokes.current,h2hOppTurnShot.hole_strokes)
      } else {
        setH2HIsMyTurn(true) // opp finished, I keep playing
      }
    } else {
      const myRem=h2hMyRemainingRef.current
      if(myRem>oRem) setH2HIsMyTurn(true)
      else if(myRem<oRem){setH2HIsMyTurn(false);setH2HWaiting(true);startOppPoll(holeIdx)}
      else{const mt=Math.random()<0.5;setH2HIsMyTurn(mt);if(!mt){setH2HWaiting(true);startOppPoll(holeIdx)}}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[h2hOppTurnShot])

  const currentHole  = holes[holeIdx]
  const club         = remaining>0 ? getClub(remaining) : 'driver'
  const [,clubMax]   = CLUB_RANGES[club]
  const completedScores = scores.filter(s=>s!==null) as number[]
  const completedPar    = holes.slice(0,completedScores.length).reduce((s,h)=>s+h.par,0)
  const totalStrokes    = completedScores.reduce((s,n)=>s+n,0)
  const vsPar           = totalStrokes-completedPar
  const vsParStr        = vsPar===0?'E':vsPar>0?`+${vsPar}`:String(vsPar)

  // Absolute ball pos in yards from tee — >distance means ball is past the pin
  const ballPos = currentHole
    ? (pastPin ? currentHole.distance + remaining : currentHole.distance - remaining)
    : 0

  function nextPickedCategory(dist: number, minReach?: number): Category {
    const clubForDist = dist > 0 ? getClub(dist) : 'driver'
    if (dist > 0 && dist < 50 && metaClubs.current.length) {
      const SHORT_STATS: StatKey[] = ['goals','assists','goals_assists','yellow_cards']
      for (let attempt = 0; attempt < 60; attempt++) {
        const stat = SHORT_STATS[Math.floor(Math.random() * SHORT_STATS.length)]
        const club = metaClubs.current[Math.floor(Math.random() * metaClubs.current.length)]
        const label = makeLabel(stat, { k:'club', name:club })
        if (usedLabels.current.has(label)) continue
        if (recentFilters.current.slice(-3).includes(club)) continue
        usedLabels.current.add(label)
        recentFilters.current = [...recentFilters.current.slice(-9), club]
        recentStats.current   = [...recentStats.current.slice(-3), stat]
        const { label: l, statLabel } = makeCategoryLabel(stat, { k:'club', name:club })
        return { key:stat, label:l, statLabel, clubFilter:club }
      }
    }
    // Only include cont+club pairs when top3Cache is loaded — they require threshold enforcement
    const contClubPairs = top3CacheRef.current ? metaContClubPairs.current : []
    const cat = pickCategory(
      dist, clubForDist, usedLabels.current, recentFilters.current, recentStats.current,
      metaNations.current, metaClubs.current,
      metaContinents.current, contClubPairs,
      top3CacheRef.current,
      minReach,
    )
    usedLabels.current.add(cat.label)
    const f = cat.natFilter || cat.clubFilter || cat.continentFilter
    if (f) recentFilters.current = [...recentFilters.current.slice(-9), f]
    recentStats.current = [...recentStats.current.slice(-3), cat.key]
    return cat
  }

  function startGame(){
    const hs = courseMode === 'real' ? buildCourse(tee, numHoles) : generateHoles(numHoles)
    usedLabels.current    = new Set()
    recentFilters.current = []
    recentStats.current   = []
    setHoles(hs)
    setScores(new Array(numHoles).fill(null))
    setHoleIdx(0)
    setRemaining(hs[0].distance)
    setStrokes(0)
    setShotResult(null)
    setPastPin(false)
    setQuestion(nextPickedCategory(hs[0].distance, hs[0].isIsland ? hs[0].distance - 20 : undefined))
    resetInputs()
    setPhase('playing')
  }

  function resetInputs(){
    setPlayerInputs(['','',''])
    setConfirmedPlayers([null,null,null])
    setSuggestions([[],[],[]])
    setInputError('')
  }

  function onInputChange(idx:number,val:string){
    setPlayerInputs(prev=>{ const n=[...prev];n[idx]=val;return n })
    setConfirmedPlayers(prev=>{ const n=[...prev];n[idx]=null;return n })
    if(val.length<2){ setSuggestions(prev=>{ const n=[...prev];n[idx]=[];return n });return }
    const q=normSearch(val)
    const matches=allPlayerNames.filter((_,i)=>normalisedNames.current[i]?.includes(q)).slice(0,8)
    setSuggestions(prev=>{ const n=[...prev];n[idx]=matches;return n })
  }

  function confirmSuggestion(idx:number,name:string){
    setPlayerInputs(prev=>{ const n=[...prev];n[idx]=name;return n })
    setConfirmedPlayers(prev=>{ const n=[...prev];n[idx]=name;return n })
    setSuggestions(prev=>{ const n=[...prev];n[idx]=[];return n })
  }

  function animateShot(fromPos:number, toPos:number, result:ShotResult){
    if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsAnimating(true)
    setPreAnimBallPos(fromPos)
    setPendingResult(result)
    setAnimBallPos(fromPos)
    setArcOffset(0)
    const startTime = performance.now()
    const duration  = 2000
    const dir = oobDir.current
    const tick = (now:number)=>{
      const t     = Math.min(1,(now-startTime)/duration)
      const eased = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2
      setAnimBallPos(fromPos+(toPos-fromPos)*eased)
      if(dir!==0){
        setArcOffset(oobTargetArcOffset.current*eased)
      }else{
        setArcOffset(Math.sin(Math.PI*eased)*7)
      }
      if(t<1){
        animFrameRef.current=requestAnimationFrame(tick)
      }else{
        setIsAnimating(false)
        if(dir===0) setArcOffset(0)
        setShotResult(result)
        setPendingResult(null)
      }
    }
    animFrameRef.current=requestAnimationFrame(tick)
  }

  function submitShot(){
    if(!question||!currentHole) return
    const named=confirmedPlayers.filter(Boolean) as string[]
    if(named.length===0){ setInputError('Select at least one player');return }
    setInputError('')

    const breakdown:{name:string;value:number}[]=[]
    let total=0
    for(const name of named){
      let value=0
      if(question.seasonFilter){
        const p=badLiePlayerData[name]
        if(p){
          if(question.key==='goals')             value=p.goals
          else if(question.key==='assists')      value=p.assists
          else if(question.key==='yellow_cards') value=p.yellow_cards
        }
      }else{
        const p=playerData[name]
        if(!p){ breakdown.push({name,value:0});continue }
        if(question.natFilter && p.nationality!==question.natFilter){ breakdown.push({name,value:0});continue }
        if(question.continentFilter && CONTINENT_MEMBERS[p.nationality]!==question.continentFilter){ breakdown.push({name,value:0});continue }
        const cf=question.clubFilter
        if(cf){
          if(question.key==='goals')              value=p.clubGoals[cf]||0
          else if(question.key==='assists')       value=p.clubAssists[cf]||0
          else if(question.key==='goals_assists') value=(p.clubGoals[cf]||0)+(p.clubAssists[cf]||0)
          else if(question.key==='appearances')   value=p.clubGames[cf]||0
          else if(question.key==='apps_minus_goals') value=Math.max(0,(p.clubGames[cf]||0)-(p.clubGoals[cf]||0))
          else if(question.key==='yellow_cards')  value=p.clubYellowCards[cf]||0
          else if(question.key==='clean_sheets')  value=p.clubCleanSheets[cf]||0
        }else{
          if(question.key==='goals')              value=p.goals
          else if(question.key==='assists')       value=p.assists
          else if(question.key==='goals_assists') value=p.goals+p.assists
          else if(question.key==='appearances')   value=p.games
          else if(question.key==='apps_minus_goals') value=Math.max(0,p.games-p.goals)
          else if(question.key==='yellow_cards')  value=p.yellow_cards
          else if(question.key==='clean_sheets')  value=p.clean_sheets
          else if(question.key==='goals_2010')    value=p.goals2010??0
          else if(question.key==='ga_2010')       value=p.ga2010??0
          else if(question.key==='goals_2015')    value=p.goals2015??0
          else if(question.key==='ga_2015')       value=p.ga2015??0
        }
      }
      breakdown.push({name,value})
      total+=value
    }

    let isOOB=false
    let penaltyReason=''

    // Club max exceeded
    const isClubMaxOOB = total > clubMax
    if(isClubMaxOOB){
      isOOB=true
      penaltyReason=`Exceeded ${CLUB_LABEL[club]} max of ${clubMax} yds`
      const dir: 1|-1 = Math.random()<0.5 ? 1 : -1
      oobDir.current = dir
      // offset ~50% of fairway width (strokeWidth=24) past the fairway edge = 24 units from centre
      oobTargetArcOffset.current = dir * 24
    }else{
      oobDir.current = 0
      oobTargetArcOffset.current = 0
    }

    // Water hazard — only on approach (not when going back from past the pin)
    let waterDropRemaining: number|undefined
    if(!isOOB && !pastPin && currentHole.hazard){
      const approachPos = currentHole.distance - remaining
      const newPos = approachPos + total
      const {start,end} = currentHole.hazard
      if(newPos>=start && newPos<=end){
        isOOB=true
        if(currentHole.isIsland && currentHole.dropZoneYards){
          waterDropRemaining = currentHole.dropZoneYards
          penaltyReason=`Water! Drop zone — ${currentHole.dropZoneYards} yds from pin (+1 stroke)`
        } else {
          const dropYards = start - 1
          waterDropRemaining = currentHole.distance - dropYards
          penaltyReason=`Water hazard! Drop at ${dropYards} yds from tee (+1 stroke)`
        }
      }
    }

    const overshoot = total - remaining     // positive = went past hole (or back past on pastPin side)

    // >50 yards past hole = OOB (pin is centre of green; green extends 20 yds each way, OOB is 30 yds beyond the back)
    if(!isOOB && overshoot>50){
      isOOB=true
      penaltyReason=`${overshoot} yds past the flag — out of bounds!`
    }

    // Exact match = holed on this shot
    const isHoled = !isOOB && total === remaining
    // Within 5 yds but not exact = gimme (tap-in conceded, +1 stroke added on advance)
    const isGimme = !isOOB && !isHoled && Math.abs(overshoot) <= 5

    // Bunker: ball lands in one of this hole's bunker zones (approach side only)
    const approachPosNow = currentHole.distance - remaining  // tee-relative position before shot
    const approachPosNew = approachPosNow + total             // where ball lands (tee-relative)
    const wasInBunker = !pastPin && currentHole.bunkers.some(b => approachPosNow >= b.start && approachPosNow <= b.end)
    const isInBunker  = !isOOB && !isHoled && !isGimme && !pastPin && !wasInBunker &&
      currentHole.bunkers.some(b => approachPosNew >= b.start && approachPosNew <= b.end)

    const result:ShotResult={ total,breakdown,isOOB,isHoled,isGimme,isInBunker,penaltyReason,waterDropRemaining }

    // Animation: when pastPin ball flies BACK toward hole (decreasing absolute pos)
    const toPos = pastPin
      ? (isOOB ? ballPos - clubMax : ballPos - total)   // going back
      : isClubMaxOOB
          ? Math.min(ballPos + 300, currentHole.distance + 10)  // flies 300 yds but off to side
          : (isOOB && penaltyReason.includes('past')
              ? currentHole.distance + Math.min(overshoot, 55)
              : Math.min(ballPos + total, currentHole.distance + 50))

    // H2H tee shot: synchronized — both submit then reveal together
    if(h2hStep==='playing'&&strokes===0){
      h2hPendingShot.current={result,toPos}
      const penaltyStrokes=result.isOOB?1:0
      const newStrokes=1+penaltyStrokes
      const holedOut=result.isHoled||result.isGimme
      const {remaining:ra,pastPin:pp}=calcNewBallState(result,remaining,pastPin)
      setH2HWaiting(true)
      fetch('/api/golf-room',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          action:'shot',roomId:h2hRoomIdRef.current,playerId:h2hPlayerId.current,
          holeIdx,shotIdx:0,
          remainingAfter:holedOut?0:ra,pastPin:pp,holedOut,
          holeStrokes:holedOut?(result.isGimme?newStrokes+1:newStrokes):null,
          isGimme:result.isGimme??false,
        }),
      }).then(r=>r.json()).then(d=>{
        if(d.bothReady) setH2HOppShotReady(d.opponentShot)
        else startTeePoll(holeIdx)
      }).catch(()=>startTeePoll(holeIdx))
      return
    }

    // H2H non-tee shot: take immediately (turn-based, furthest from hole goes next)
    if(h2hStep==='playing'){
      const penaltyStrokes=result.isOOB?1:0
      const newStrokes=strokes+1+penaltyStrokes
      const holedOut=result.isHoled||result.isGimme
      const {remaining:ra,pastPin:pp}=calcNewBallState(result,remaining,pastPin)
      fetch('/api/golf-room',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          action:'shot',roomId:h2hRoomIdRef.current,playerId:h2hPlayerId.current,
          holeIdx,shotIdx:strokes,
          remainingAfter:holedOut?0:ra,pastPin:pp,holedOut,
          holeStrokes:holedOut?(result.isGimme?newStrokes+1:newStrokes):null,
          isGimme:result.isGimme??false,
        }),
      })
      animateShot(ballPos,toPos,result)
      return
    }

    animateShot(ballPos, toPos, result)
  }

  function advanceFromResult(){
    if(!shotResult||!currentHole) return
    const penaltyStrokes = shotResult.isOOB ? 1 : 0
    const newStrokes=strokes+1+penaltyStrokes

    const lieResult = bunkerLieResult
    setBunkerLieResult(null)

    // Keep season-specific question if: this was a bad-lie shot, OR OOB on a bad-lie shot (ball still in bunker)
    const keepBadLie = lieResult === 'bad' || (shotResult.isOOB && !!question?.seasonFilter)
    function nextCat(nextRemaining: number): Category {
      if (keepBadLie) return pickBadLieCategory(badLieSeason.current)
      return nextPickedCategory(nextRemaining)
    }

    if(shotResult.isOOB){
      const newRemaining = shotResult.waterDropRemaining ?? remaining
      setRemaining(newRemaining)
      setStrokes(newStrokes)
      setShotResult(null)
      setBunkerQ(null)
      setQuestion(nextCat(newRemaining))
      resetInputs()
      oobDir.current = 0
      setArcOffset(0)
      if(h2hStep==='playing'){
        h2hMyRemainingRef.current=newRemaining
        if(h2hOppFinishedRef.current){
          const oppFinal=h2hOppHoleStrokesRef.current!
          if(newStrokes+1>oppFinal){
            const finishStrokes=newStrokes+1
            h2hIFinishedRef.current=true
            h2hMyHoleStrokes.current=finishStrokes
            fetch('/api/golf-room',{method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({action:'shot',roomId:h2hRoomIdRef.current,playerId:h2hPlayerId.current,
                holeIdx,shotIdx:newStrokes,remainingAfter:0,pastPin:false,holedOut:true,
                holeStrokes:finishStrokes,isGimme:false})})
            resolveH2HHole(finishStrokes,oppFinal)
            return
          }
        } else {
          determineTurn(newRemaining,h2hOppRemainingRef.current??newRemaining,holeIdx)
        }
      }
      return
    }

    if(shotResult.isHoled || shotResult.isGimme){
      finishHole(shotResult.isGimme ? newStrokes + 1 : newStrokes)
      return
    }

    const overshoot = shotResult.total - remaining
    let newRemaining: number
    let newPastPin: boolean

    if(overshoot > 0){
      newRemaining = overshoot
      newPastPin   = !pastPin
    } else {
      newRemaining = remaining - shotResult.total
      newPastPin   = pastPin
    }

    setRemaining(newRemaining)
    setPastPin(newPastPin)
    setStrokes(newStrokes)
    setShotResult(null)
    setBunkerQ(null)
    setQuestion(nextCat(newRemaining))
    resetInputs()
    if(h2hStep==='playing'){
      h2hMyRemainingRef.current=newRemaining
      if(h2hOppFinishedRef.current){
        const oppFinal=h2hOppHoleStrokesRef.current!
        if(newStrokes+1>oppFinal){
          const finishStrokes=newStrokes+1
          h2hIFinishedRef.current=true
          h2hMyHoleStrokes.current=finishStrokes
          fetch('/api/golf-room',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({action:'shot',roomId:h2hRoomIdRef.current,playerId:h2hPlayerId.current,
              holeIdx,shotIdx:newStrokes,remainingAfter:0,pastPin:false,holedOut:true,
              holeStrokes:finishStrokes,isGimme:false})})
          resolveH2HHole(finishStrokes,oppFinal)
          return
        }
      } else {
        determineTurn(newRemaining,h2hOppRemainingRef.current??newRemaining,holeIdx)
      }
    }
  }

  function answerBunkerQ(idx:number){
    if(!bunkerQ) return
    const correct = idx === bunkerQ.a
    setBunkerQ(null)
    setBunkerLieResult(correct ? 'good' : 'bad')
  }

  function triggerBunkerQuestion(){
    // Pick a random bunker question not recently seen
    const q=BUNKER_QUESTIONS[Math.floor(Math.random()*BUNKER_QUESTIONS.length)]
    setBunkerQ(q)
  }

  function finishHole(finalStrokes:number){
    const newScores=[...scores]
    newScores[holeIdx]=finalStrokes
    setScores(newScores)
    setShotResult(null)
    setBunkerQ(null)
    setBunkerLieResult(null)
    resetInputs()

    const par=currentHole?.par??4
    const diff=finalStrokes-par
    const resultMap:{[k:number]:{label:string;color:string}}={
      [-3]:{label:'Albatross',color:'#22c55e'},
      [-2]:{label:'Eagle',color:'#22c55e'},
      [-1]:{label:'Birdie',color:'#22c55e'},
      [0]: {label:'Par',color:'#94a3b8'},
      [1]: {label:'Bogey',color:'#ef4444'},
      [2]: {label:'Double Bogey',color:'#ef4444'},
    }
    const res=resultMap[diff]??{label:`+${diff}`,color:'#ef4444'}
    setHoleResult({...res,diff})

    if(h2hStep==='playing'){
      setRemaining(0)
      h2hMyRemainingRef.current=0
      h2hMyHoleStrokes.current=finalStrokes
      h2hIFinishedRef.current=true
      if(h2hOppFinishedRef.current){
        resolveH2HHole(finalStrokes,h2hOppHoleStrokesRef.current??finalStrokes)
      }else{
        setH2HWaiting(true)
        startOppPoll(holeIdx)
      }
      return
    }

    setTimeout(()=>{
      setHoleResult(null)
      if(holeIdx+1>=holes.length){
        setPhase('done')
      }else{
        const nextIdx=holeIdx+1
        setHoleIdx(nextIdx)
        const dist=holes[nextIdx].distance
        setRemaining(dist)
        setPastPin(false)
        setStrokes(0)
        setQuestion(nextPickedCategory(dist, holes[nextIdx].isIsland ? holes[nextIdx].distance - 20 : undefined))
      }
    },3000)
  }

  // ── H2H functions ───────────────────────────────────────────────────────────

  function stopH2HPoll(){
    if(h2hPollRef.current){clearInterval(h2hPollRef.current);h2hPollRef.current=null}
  }

  function startTeePoll(hi:number){
    stopH2HPoll()
    h2hPollRef.current=setInterval(async()=>{
      const d=await fetch(`/api/golf-room?roomId=${h2hRoomIdRef.current}&holeIdx=${hi}`).then(r=>r.json()).catch(()=>null)
      if(!d) return
      const shots:any[]=d.shots||[]
      const oppShot=shots.find((s:any)=>s.player_id===h2hOppId.current&&s.shot_idx===0)
      if(oppShot){stopH2HPoll();setH2HOppShotReady(oppShot)}
    },1500)
  }

  function startOppPoll(hi:number){
    stopH2HPoll()
    const lastSeen=h2hOppShotIdxRef.current
    h2hPollRef.current=setInterval(async()=>{
      const d=await fetch(`/api/golf-room?roomId=${h2hRoomIdRef.current}&holeIdx=${hi}`).then(r=>r.json()).catch(()=>null)
      if(!d) return
      const shots:any[]=d.shots||[]
      const newer=shots
        .filter((s:any)=>s.player_id===h2hOppId.current&&s.shot_idx>lastSeen)
        .sort((a:any,b:any)=>b.shot_idx-a.shot_idx)
      if(newer.length>0){stopH2HPoll();setH2HOppTurnShot(newer[0])}
    },1500)
  }

  function determineTurn(myRem:number,oppRem:number,hi:number){
    if(h2hOppFinishedRef.current){setH2HIsMyTurn(true);return}
    if(myRem>oppRem) setH2HIsMyTurn(true)
    else if(myRem<oppRem){setH2HIsMyTurn(false);setH2HWaiting(true);startOppPoll(hi)}
    else{
      const mt=Math.random()<0.5
      setH2HIsMyTurn(mt)
      if(!mt){setH2HWaiting(true);startOppPoll(hi)}
    }
  }

  function startLobbyPoll(){
    stopH2HPoll()
    h2hPollRef.current=setInterval(async()=>{
      const d=await fetch(`/api/golf-room?roomId=${h2hRoomIdRef.current}`).then(r=>r.json()).catch(()=>null)
      if(!d?.room) return
      if(h2hIsHost.current&&d.room.guest_id&&d.room.guest_name){
        stopH2HPoll()
        setH2HOppName(d.room.guest_name)
        h2hOppId.current=d.room.guest_id
        setH2HStep('lobby')
      }else if(!h2hIsHost.current&&d.room.status==='playing'){
        stopH2HPoll()
        startH2HGame()
      }
    },2000)
  }

  function resolveH2HHole(myStrokes:number,oppStrokes:number){
    let delta=0,label='Halved',color='#94a3b8'
    if(myStrokes<oppStrokes){delta=1;label='Hole Won';color='#22c55e'}
    else if(myStrokes>oppStrokes){delta=-1;label='Hole Lost';color='#ef4444'}
    setMatchScore(prev=>prev+delta)
    setHoleResult({label,color,diff:0})
    setH2HFinishHoleReady(true)
  }

  function advanceH2HHole(){
    stopH2HPoll()
    setH2HFinishHoleReady(false)
    setHoleResult(null)
    setShotResult(null)
    setBunkerQ(null)
    setBunkerLieResult(null)
    setH2HOppHoledOut(false)
    setH2HOppRemaining(null)
    setH2HOppPastPin(false)
    setH2HIsMyTurn(true)
    setH2HOppShotCount(0)
    h2hOppHoleStrokesRef.current=null
    h2hOppRemainingRef.current=null
    h2hOppShotIdxRef.current=-1
    h2hIFinishedRef.current=false
    h2hOppFinishedRef.current=false
    h2hMyHoleStrokes.current=0
    if(holeIdx+1>=holes.length){setPhase('done');return}
    const nextIdx=holeIdx+1
    setHoleIdx(nextIdx)
    const dist=holes[nextIdx].distance
    setRemaining(dist)
    h2hMyRemainingRef.current=dist
    setPastPin(false)
    setStrokes(0)
    const teeCat=h2hRoomData.current.teeCategories[nextIdx]
    setQuestion(teeCat??nextPickedCategory(dist, holes[nextIdx]?.isIsland ? holes[nextIdx].distance - 20 : undefined))
    resetInputs()
  }

  async function createH2HRoom(){
    if(!metaReady) return
    const pid=h2hPlayerId.current||(()=>{
      const stored=localStorage.getItem('golf_h2h_pid')
      if(stored) return stored
      const id=Math.random().toString(36).slice(2,12)
      localStorage.setItem('golf_h2h_pid',id)
      return id
    })()
    h2hPlayerId.current=pid
    h2hIsHost.current=true
    setH2HError('')
    const hs=courseMode==='real'?buildCourse(tee,numHoles):generateHoles(numHoles)
    // Pre-generate tee categories for all holes (same for both players)
    const tmpUsed=new Set<string>()
    const tmpRecentF:string[]=[]
    const tmpRecentS:StatKey[]=[]
    const ccPairs=top3CacheRef.current?metaContClubPairs.current:[]
    const teeCats=hs.map(hole=>{
      const cl=getClub(hole.distance)
      const cat=pickCategory(hole.distance,cl,tmpUsed,tmpRecentF,tmpRecentS,metaNations.current,metaClubs.current,metaContinents.current,ccPairs,top3CacheRef.current)
      tmpUsed.add(cat.label)
      tmpRecentS.push(cat.key)
      return cat
    })
    const res=await fetch('/api/golf-room',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'create',hostId:pid,hostName:h2hPlayerName||'Host',config:{courseMode,numHoles,tee},holes:hs,teeCategories:teeCats}),
    }).then(r=>r.json())
    if(res.error){setH2HError(res.error);return}
    setH2HRoomId(res.roomId)
    h2hRoomIdRef.current=res.roomId
    h2hRoomData.current={holes:hs,teeCategories:teeCats}
    setH2HStep('waiting-host')
    startLobbyPoll()
  }

  async function joinH2HRoom(){
    const code=(h2hJoinInput||'').toUpperCase().trim()
    if(code.length<4){setH2HError('Enter a valid room code');return}
    const pid=h2hPlayerId.current||(()=>{
      const stored=localStorage.getItem('golf_h2h_pid')
      if(stored) return stored
      const id=Math.random().toString(36).slice(2,12)
      localStorage.setItem('golf_h2h_pid',id)
      return id
    })()
    h2hPlayerId.current=pid
    h2hIsHost.current=false
    setH2HError('')
    const res=await fetch('/api/golf-room',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'join',roomId:code,guestId:pid,guestName:h2hPlayerName||'Guest'}),
    }).then(r=>r.json())
    if(res.error){setH2HError(res.error);return}
    setH2HRoomId(code)
    h2hRoomIdRef.current=code
    setH2HOppName(res.room.host_name)
    h2hOppId.current=res.room.host_id
    h2hRoomData.current={holes:res.room.holes,teeCategories:res.room.tee_categories}
    setH2HStep('lobby')
    startLobbyPoll()
  }

  function startH2HGame(){
    const rd=h2hRoomData.current
    const hs=rd.holes
    usedLabels.current=new Set()
    recentFilters.current=[]
    recentStats.current=[]
    setHoles(hs)
    setScores(new Array(hs.length).fill(null))
    setHoleIdx(0)
    setRemaining(hs[0].distance)
    setStrokes(0)
    setShotResult(null)
    setPastPin(false)
    h2hMyHoleStrokes.current=0
    h2hOppRemainingRef.current=null
    h2hOppShotIdxRef.current=-1
    h2hIFinishedRef.current=false
    h2hOppFinishedRef.current=false
    h2hMyRemainingRef.current=hs[0].distance
    setH2HIsMyTurn(true)
    setH2HOppShotCount(0)
    setH2HOppRemaining(null)
    setH2HOppPastPin(false)
    setH2HOppHoledOut(false)
    setMatchScore(0)
    setQuestion(rd.teeCategories[0])
    resetInputs()
    if(h2hIsHost.current){
      fetch('/api/golf-room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',roomId:h2hRoomIdRef.current})})
    }
    setH2HStep('playing')
    setPhase('playing')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // H2H screens (take priority over setup)
  const h2hScreenStyle:React.CSSProperties={minHeight:'calc(100dvh - 56px)',background:'#0a0f1e',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,fontFamily:"'DM Sans',sans-serif",padding:'24px'}
  const h2hInputStyle:React.CSSProperties={background:'#1e2d4a',border:'1px solid #2d3f5e',borderRadius:10,padding:'12px 16px',color:'white',fontSize:15,fontWeight:600,width:'100%',maxWidth:300,fontFamily:'inherit'}
  const h2hBtnStyle:React.CSSProperties={background:'#dc2626',color:'white',border:'none',borderRadius:10,padding:'13px 36px',fontSize:14,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}
  const h2hSecBtnStyle:React.CSSProperties={...h2hBtnStyle,background:'#1e2d4a'}

  if(h2hStep==='create'){
    return(<><NavBar />
      <div style={h2hScreenStyle}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:900,color:'white'}}>Challenge a Friend</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:6}}>You've set up the course — enter your name to create a room</div>
        </div>
        <input style={h2hInputStyle} placeholder="Your name" value={h2hPlayerName} onChange={e=>setH2HPlayerName(e.target.value)} maxLength={20}/>
        {h2hError&&<div style={{fontSize:12,color:'#ef4444',fontWeight:700}}>{h2hError}</div>}
        <div style={{display:'flex',gap:10}}>
          <button style={h2hSecBtnStyle} onClick={()=>setH2HStep('off')}>← Back</button>
          <button style={h2hBtnStyle} onClick={createH2HRoom} disabled={!metaReady}>{metaReady?'Create Room':'Loading…'}</button>
        </div>
      </div>
    </>)
  }

  if(h2hStep==='join'){
    return(<><NavBar />
      <div style={h2hScreenStyle}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:900,color:'white'}}>Join Room</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:6}}>Enter your name and the room code from your opponent</div>
        </div>
        <input style={h2hInputStyle} placeholder="Your name" value={h2hPlayerName} onChange={e=>setH2HPlayerName(e.target.value)} maxLength={20}/>
        <input style={{...h2hInputStyle,textTransform:'uppercase',letterSpacing:'0.15em',fontSize:18,fontWeight:900,textAlign:'center'}} placeholder="ROOM CODE" value={h2hJoinInput} onChange={e=>setH2HJoinInput(e.target.value.toUpperCase())} maxLength={6}/>
        {h2hError&&<div style={{fontSize:12,color:'#ef4444',fontWeight:700}}>{h2hError}</div>}
        <div style={{display:'flex',gap:10}}>
          <button style={h2hSecBtnStyle} onClick={()=>setH2HStep('off')}>← Back</button>
          <button style={h2hBtnStyle} onClick={joinH2HRoom}>Join →</button>
        </div>
      </div>
    </>)
  }

  if(h2hStep==='waiting-host'){
    const shareUrl=typeof window!=='undefined'?`${window.location.origin}${window.location.pathname}?room=${h2hRoomId}`:''
    return(<><NavBar />
      <div style={h2hScreenStyle}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Room Code</div>
          <div style={{fontSize:52,fontWeight:900,color:'white',letterSpacing:'0.15em'}}>{h2hRoomId}</div>
        </div>
        <div style={{background:'#111827',border:'1px solid #1e2d4a',borderRadius:10,padding:'12px 16px',maxWidth:340,width:'100%'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Share link</div>
          <div style={{fontSize:11,color:'#6b7fa3',wordBreak:'break-all'}}>{shareUrl}</div>
          <button onClick={()=>navigator.clipboard?.writeText(shareUrl)} style={{marginTop:8,background:'#1e2d4a',border:'none',borderRadius:6,padding:'6px 12px',color:'white',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Copy link</button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#f59e0b',animation:'pulse 1.5s ease-in-out infinite'}}/>
          <div style={{fontSize:14,color:'rgba(255,255,255,0.5)'}}>Waiting for opponent to join…</div>
        </div>
      </div>
    </>)
  }

  if(h2hStep==='lobby'){
    return(<><NavBar />
      <div style={h2hScreenStyle}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:900,color:'white',marginBottom:4}}>Room {h2hRoomId}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Both players connected</div>
        </div>
        <div style={{display:'flex',gap:12}}>
          {[{name:h2hPlayerName||'You',isYou:true},{name:h2hOppName||'Opponent',isYou:false}].map(({name,isYou})=>(
            <div key={name} style={{background:'#111827',border:`1px solid ${isYou?'#22c55e':'#1e2d4a'}`,borderRadius:10,padding:'14px 20px',textAlign:'center',minWidth:120}}>
              <div style={{fontSize:11,color:isYou?'#22c55e':'#6b7fa3',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{isYou?'You':'Opponent'}</div>
              <div style={{fontSize:16,fontWeight:800,color:'white'}}>{name}</div>
            </div>
          ))}
        </div>
        {h2hIsHost.current
          ? <button style={h2hBtnStyle} onClick={startH2HGame}>Start Game →</button>
          : <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#f59e0b'}}/>
              <div style={{fontSize:14,color:'rgba(255,255,255,0.5)'}}>Waiting for host to start…</div>
            </div>
        }
      </div>
    </>)
  }

  if(phase==='setup') return(<><NavBar /><SetupScreen courseMode={courseMode} setCourseMode={setCourseMode} selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} numHoles={numHoles} setNumHoles={setNumHoles} tee={tee} setTee={setTee} onStart={startGame} onH2H={()=>setH2HStep('create')} onJoin={()=>setH2HStep('join')} /></>)
  if(phase==='done')  return <><NavBar /><DoneScreen holes={holes} scores={scores as number[]} numHoles={numHoles} onRestart={()=>setPhase('setup')} /></>
  if(!currentHole) return null

  // Keep ball at landing spot while result/bunker panel is open; only reset to actual pos after advancing
  const displayPos = (isAnimating || !!shotResult || !!bunkerQ || !!bunkerLieResult) ? animBallPos : ballPos

  return (
    <div style={{minHeight:'100dvh',background:'#0a0f1e',fontFamily:"'DM Sans',-apple-system,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');
        * { box-sizing:border-box; }
        input::placeholder { color:rgba(255,255,255,0.3); }
        input:focus { outline:none; }
        @keyframes clubSwing {
          0%   { transform: rotate(-50deg); }
          35%  { transform: rotate(25deg); }
          60%  { transform: rotate(-8deg); }
          100% { transform: rotate(-8deg); }
        }
        .club-swing { animation: clubSwing 0.5s ease-out forwards; transform-origin: 0 0; }
        @keyframes holeResultIn {
          0%   { opacity:0; transform:translate(-50%,-50%) scale(0.5); }
          15%  { opacity:1; transform:translate(-50%,-50%) scale(1.12); }
          30%  { transform:translate(-50%,-50%) scale(1); }
          80%  { opacity:1; transform:translate(-50%,-50%) scale(1); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(0.9); }
        }
        .hole-result-pop { animation: holeResultIn 3s ease-in-out forwards; }
      `}</style>
      <NavBar />
      {holeResult && (
        <div style={{position:'fixed',inset:0,zIndex:999,pointerEvents:h2hFinishHoleReady?'auto':'none',background:h2hFinishHoleReady?'rgba(0,0,0,0.6)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className={h2hFinishHoleReady?undefined:'hole-result-pop'} style={{
            position:h2hFinishHoleReady?'relative':'absolute',
            top:h2hFinishHoleReady?undefined:'50%',
            left:h2hFinishHoleReady?undefined:'50%',
            transform:h2hFinishHoleReady?undefined:'translate(-50%,-50%)',
            textAlign:'center',
            background:'rgba(10,15,30,0.95)',
            border:`3px solid ${holeResult.color}`,
            borderRadius:20,
            padding:'28px 48px',
            boxShadow:`0 0 60px ${holeResult.color}55`,
          }}>
            <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.5)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>
              Hole {currentHole?.number} · {currentHole?.par && `Par ${currentHole.par}`}
            </div>
            <div style={{fontSize:42,fontWeight:900,color:holeResult.color,lineHeight:1}}>
              {holeResult.label}
            </div>
            {h2hFinishHoleReady ? (
              <>
                <div style={{fontSize:16,fontWeight:700,color:'rgba(255,255,255,0.6)',marginTop:10}}>
                  {matchScore===0?'All Square':matchScore>0?`${matchScore} UP`:`${Math.abs(matchScore)} DOWN`}
                </div>
                <button onClick={advanceH2HHole} style={{marginTop:20,background:holeResult.color,color:'white',border:'none',borderRadius:10,padding:'12px 32px',fontSize:14,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}}>
                  {holeIdx+1>=holes.length?'View Result':'Next Hole →'}
                </button>
              </>
            ) : (
              <div style={{fontSize:20,fontWeight:700,color:'white',marginTop:8}}>
                {holeResult.diff===0?'E':holeResult.diff>0?`+${holeResult.diff}`:holeResult.diff}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{maxWidth:560,margin:'0 auto',width:'100%',padding:'0 20px'}}>
        {/* H2H HUD */}
        {h2hStep==='playing'&&currentHole&&(
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0 6px',borderBottom:'1px solid #1e2d4a',marginBottom:4}}>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:1}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:h2hIsHost.current?'#3b82f6':'#fbbf24',flexShrink:0}}/>
                <div style={{fontSize:12,fontWeight:h2hIsMyTurn?900:600,color:h2hIsMyTurn?'white':'rgba(255,255,255,0.45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h2hPlayerName||'You'}</div>
                {h2hIsMyTurn&&<div style={{fontSize:10,fontWeight:800,color:'#22c55e'}}>▶</div>}
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',paddingLeft:13}}>Sh {strokes+1} · {remaining} yds</div>
            </div>
            <div style={{textAlign:'center',flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:900,color:matchScore>0?'#22c55e':matchScore<0?'#ef4444':'#94a3b8'}}>
                {matchScore===0?'AS':matchScore>0?`${matchScore} UP`:`${Math.abs(matchScore)} DN`}
              </div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.2)',marginTop:1}}>Hole {holeIdx+1} · Par {currentHole.par}</div>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:1,alignItems:'flex-end'}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                {!h2hIsMyTurn&&<div style={{fontSize:10,fontWeight:800,color:'#22c55e'}}>▶</div>}
                <div style={{fontSize:12,fontWeight:!h2hIsMyTurn?900:600,color:!h2hIsMyTurn?'white':'rgba(255,255,255,0.45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h2hOppName||'Opp'}</div>
                <div style={{width:8,height:8,borderRadius:'50%',background:h2hIsHost.current?'#fbbf24':'#3b82f6',flexShrink:0}}/>
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',paddingRight:13}}>Sh {h2hOppShotCount+1} · {h2hOppRemaining!==null?`${h2hOppRemaining} yds`:'...'}</div>
            </div>
          </div>
        )}
        <div style={{display:'flex',alignItems:'stretch',height:'calc(50dvh + 172px)'}}>

          {/* Left panel */}
          <div style={{flex:13,padding:'12px 8px 20px',display:'flex',flexDirection:'column',gap:10,minWidth:0}}>
            <Scorecard holes={holes} scores={scores} currentIdx={holeIdx} />
            <div style={{display:'flex',flexDirection:'column',gap:6,padding:'2px 0 4px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                  Hole {currentHole.number} · Par {currentHole.par}
                </div>
                <div style={{fontSize:13,fontWeight:800,color:'white',background:'#1e2d4a',borderRadius:6,padding:'2px 8px'}}>
                  Shot {strokes + 1}
                </div>
              </div>
              <div style={{fontSize:22,fontWeight:900,color:'white',lineHeight:1.1}}>
                {remaining} yards to pin
              </div>
              {(()=>{
                const approachPos = pastPin ? -1 : currentHole.distance - remaining
                const inBunker = !pastPin && currentHole.bunkers.some(b => approachPos >= b.start && approachPos <= b.end)
                return (
                  <>
                    <div style={{fontSize:16,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>
                      {CLUB_LABEL[club]} · max {clubMax} yds
                      {inBunker && <span style={{color:'#f59e0b'}}> · 🏖️ In bunker</span>}
                    </div>
                  </>
                )
              })()}
              {/* Past-pin indicator */}
              {pastPin&&(
                <div style={{fontSize:11,color:'#f97316',fontWeight:700}}>
                  📍 {remaining} yds past the flag
                </div>
              )}
            </div>

            {/* Bottom section — flex:1 so left panel height stays constant regardless of content */}
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,minHeight:0}}>

            {/* Category — two side-by-side boxes, fixed height so layout never shifts */}
            {question&&(()=>{
              const filterText = makeFilterLabel(question)
              const boxStyle: React.CSSProperties = {
                flex:1, background:'#1e2d4a', border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:10, padding:'5px 8px', height:68, display:'flex',
                flexDirection:'column', alignItems:'center', overflow:'hidden', flexShrink:0,
              }
              const labelStyle: React.CSSProperties = {
                fontSize:9, fontWeight:700, color:'#6b7fa3', textTransform:'uppercase',
                letterSpacing:'0.06em', textAlign:'center', flexShrink:0,
              }
              return (
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  <div style={boxStyle}>
                    <div style={labelStyle}>Stat</div>
                    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',width:'100%'}}>
                      <div style={{fontSize:13,fontWeight:800,color:'white',lineHeight:1.2,textAlign:'center'}}>{question.statLabel}</div>
                    </div>
                  </div>
                  <div style={boxStyle}>
                    <div style={labelStyle}>Filter</div>
                    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',width:'100%'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'white',lineHeight:1.2,textAlign:'center'}}>{filterText}</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Bunker MC question → lie result → shot result */}
            {bunkerLieResult ? (
              <LieResultPanel result={bunkerLieResult} onContinue={advanceFromResult} />
            ) : bunkerQ ? (
              <BunkerPanel bq={bunkerQ} onAnswer={answerBunkerQ} />
            ) : shotResult ? (
              <ShotResultPanel
                result={shotResult}
                club={club}
                remaining={remaining}
                onContinue={shotResult.isInBunker ? triggerBunkerQuestion : advanceFromResult}
                isBunker={shotResult.isInBunker}
              />
            ) : isAnimating ? (
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Distance</div>
                <div style={{fontSize:52,fontWeight:900,color:'white',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>
                  {Math.abs(Math.round(animBallPos - preAnimBallPos))}
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.5)'}}>yards</div>
              </div>
            ) : h2hWaiting ? (
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b',boxShadow:'0 0 12px #f59e0b88'}}/>
                <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.6)',textAlign:'center'}}>
                  {h2hIFinishedRef.current?'Waiting for opponent to finish…':`${h2hOppName||'Opp'} is taking their shot…`}
                </div>
                {h2hOppRemaining!==null&&(
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{h2hOppName||'Opp'} · {h2hOppRemaining} yds to go</div>
                )}
              </div>
            ) : (
              <>
                {namesLoading&&<div style={{fontSize:12,color:'rgba(255,255,255,0.35)',textAlign:'center',padding:'4px 0'}}>Loading players…</div>}
                {[0,1,2].map(idx=>(
                  <PlayerInputRow
                    key={idx} idx={idx} value={playerInputs[idx]}
                    confirmed={!!confirmedPlayers[idx]} suggestions={suggestions[idx]}
                    onChange={val=>onInputChange(idx,val)} onConfirm={name=>confirmSuggestion(idx,name)}
                    onClear={()=>{
                      setPlayerInputs(prev=>{const n=[...prev];n[idx]='';return n})
                      setConfirmedPlayers(prev=>{const n=[...prev];n[idx]=null;return n})
                      setSuggestions(prev=>{const n=[...prev];n[idx]=[];return n})
                    }}
                  />
                ))}
                {inputError&&<div style={{fontSize:12,color:'#dc2626',fontWeight:700}}>{inputError}</div>}
                <button
                  onClick={submitShot}
                  disabled={confirmedPlayers.every(p=>!p)||isAnimating}
                  style={{
                    background:confirmedPlayers.every(p=>!p)||isAnimating?'#1a2540':'#dc2626',
                    color:'white',border:'none',borderRadius:10,padding:'13px 0',
                    fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                    transition:'background 0.2s',marginTop:2,
                  }}
                >
                  {isAnimating?'⛳ In flight…':'⛳ Take Shot'}
                </button>
              </>
            )}

            </div>{/* end bottom section */}
          </div>

          {/* Right panel — course */}
          <div style={{flex:7,minWidth:0,display:'flex',flexDirection:'column',padding:'0 0 20px'}}>
            <div style={{padding:'8px 0',textAlign:'center',display:'flex',flexDirection:'column',gap:4,paddingTop:10}}>
              <div style={{fontSize:8,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em',height:16,lineHeight:'16px'}}>Overall</div>
              <div style={{height:16}}/>
              <div style={{fontSize:22,fontWeight:900,color:vsPar<0?'#22c55e':vsPar>0?'#ef4444':'white',height:18,lineHeight:'18px'}}>{vsParStr}</div>
            </div>
            <div style={{flex:1,minHeight:0,marginTop:22}}>
              <CourseView
                hole={currentHole}
                displayBallPos={displayPos}
                preAnimBallPos={preAnimBallPos}
                arcOffset={arcOffset}
                isAnimating={isAnimating}
                strokes={strokes}
                maxRangePos={!pastPin && remaining > clubMax ? ballPos + clubMax : undefined}
                imageUrl={courseMode==='real' ? `/holes/hole_${String(currentHole.number).padStart(2,'0')}.jpg` : undefined}
                imageRotation={courseMode==='real' ? (PEBBLE_PHOTO_ROTATIONS[currentHole.number] ?? 0) : undefined}
                realTeePos={courseMode==='real' ? fracToSVG(HOLE_POSITIONS[currentHole.number].teeFrac) : undefined}
                realGreenPos={courseMode==='real' ? fracToSVG(HOLE_POSITIONS[currentHole.number].greenFrac) : undefined}
                oppBallPos={h2hStep==='playing'&&h2hOppRemaining!==null
                  ? (h2hOppPastPin?currentHole.distance+h2hOppRemaining:currentHole.distance-h2hOppRemaining)
                  : undefined}
                myBallColor={h2hStep==='playing'?(h2hIsHost.current?'#3b82f6':'#fbbf24'):undefined}
                oppBallColor={h2hStep==='playing'?(h2hIsHost.current?'#fbbf24':'#3b82f6'):undefined}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Bunker MC panel ────────────────────────────────────────────────────────────

function BunkerPanel({bq,onAnswer}:{bq:BunkerQ;onAnswer:(idx:number)=>void}){
  return(
    <div style={{flex:1,background:'#2a1f00',border:'1px solid #f59e0b',borderRadius:12,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <div style={{fontSize:10,fontWeight:800,color:'#f59e0b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>🏖️ Sand Trap — Answer to play on</div>
        <div style={{fontSize:13,fontWeight:800,color:'white',lineHeight:1.4}}>{bq.q}</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:3}}>Wrong answer = bad lie next shot</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
        {bq.opts.map((opt,i)=>(
          <button
            key={i}
            onClick={()=>onAnswer(i)}
            style={{
              background:'#1e2d4a',border:'1px solid #2a3d5e',borderRadius:8,
              padding:'10px 8px',fontSize:12,fontWeight:700,color:'white',
              cursor:'pointer',fontFamily:'inherit',textAlign:'left',lineHeight:1.3,
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(245,158,11,0.15)')}
            onMouseLeave={e=>(e.currentTarget.style.background='#1e2d4a')}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Lie result panel ──────────────────────────────────────────────────────────

function LieResultPanel({result,onContinue}:{result:'good'|'bad';onContinue:()=>void}){
  const good = result==='good'
  return(
    <div style={{flex:1,background:good?'#0d2d1a':'#2a1400',border:`1px solid ${good?'#22c55e':'#f59e0b'}`,borderRadius:12,padding:'16px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{fontSize:20,fontWeight:900,color:good?'#22c55e':'#f59e0b',textAlign:'center'}}>
        {good?'✅ Good Lie!':'⚠️ Bad Lie!'}
      </div>
      <div style={{fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:1.5}}>
        {good
          ? 'Correct answer — good lie in the bunker. Next shot plays normally from the sand.'
          : 'Wrong answer — bad lie in the sand. Your next shot will be harder: the category will be restricted to a single season, so scores are likely to be lower.'}
      </div>
      <button
        onClick={onContinue}
        style={{background:good?'#16a34a':'#b45309',color:'white',border:'none',borderRadius:8,padding:'11px 0',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}
      >
        Play from the bunker →
      </button>
    </div>
  )
}

// ── Gimme panel ───────────────────────────────────────────────────────────────

function GimmePanel({remaining,onAccept}:{remaining:number;onAccept:()=>void}){
  return(
    <div style={{background:'#0d2d1a',border:'1px solid #22c55e',borderRadius:12,padding:'16px',display:'flex',flexDirection:'column',gap:10,textAlign:'center'}}>
      <div style={{fontSize:22,fontWeight:900,color:'#22c55e'}}>🤝 Gimme!</div>
      <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.4}}>
        {remaining === 0 ? 'Ball is at the pin' : `${remaining} yds from the pin`} — close enough to concede
      </div>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>Counts as +1 stroke</div>
      <button
        onClick={onAccept}
        style={{background:'#16a34a',color:'white',border:'none',borderRadius:8,padding:'11px 0',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}
      >
        Pick it up →
      </button>
    </div>
  )
}

// ── Course view ────────────────────────────────────────────────────────────────

function CourseView({hole,displayBallPos,preAnimBallPos,arcOffset,isAnimating,strokes,maxRangePos,imageUrl,imageRotation,realTeePos,realGreenPos,oppBallPos,myBallColor,oppBallColor}:{
  hole:Hole; displayBallPos:number; preAnimBallPos:number; arcOffset:number; isAnimating:boolean; strokes:number; maxRangePos?:number; imageUrl?:string; imageRotation?:number
  realTeePos?:{x:number;y:number}; realGreenPos?:{x:number;y:number}; oppBallPos?:number; myBallColor?:string; oppBallColor?:string
}){
  // Remap the hole path so pts[0]=realTeePos and pts[last]=realGreenPos when calibrated
  const effectivePath = useMemo(()=>{
    if(!realTeePos||!realGreenPos) return hole.path
    const pts=hole.path.pts
    const oldTee=pts[0], oldGreen=pts[pts.length-1]
    const oldSpanY=oldGreen.y-oldTee.y
    const newPts=pts.map((p,i)=>{
      if(i===0) return realTeePos
      if(i===pts.length-1) return realGreenPos
      const t=oldSpanY!==0?(p.y-oldTee.y)/oldSpanY:i/(pts.length-1)
      const oldCx=oldTee.x+t*(oldGreen.x-oldTee.x)
      const newCx=realTeePos.x+t*(realGreenPos.x-realTeePos.x)
      return {x:newCx+(p.x-oldCx), y:realTeePos.y+t*(realGreenPos.y-realTeePos.y)}
    })
    return {pts:newPts}
  },[hole.path,realTeePos,realGreenPos])

  // displayBallPos is yards-from-tee; past-pin if > hole.distance
  const ballTeePosForLabels = Math.min(displayBallPos, hole.distance)
  const {x:ballX,y:ballY} = yardToSVG(displayBallPos, hole.distance, effectivePath)
  const finalBallX = ballX + arcOffset
  const {x:swingX,y:swingY} = yardToSVG(preAnimBallPos, hole.distance, effectivePath)

  const yardToY=(d:number)=>{ const {y}=yardToSVG(d,hole.distance,effectivePath);return y }
  const yardToX=(d:number)=>{ const {x}=yardToSVG(d,hole.distance,effectivePath);return x }

  const teePos  = yardToSVG(0, hole.distance, effectivePath)
  const holePos = holeXY(effectivePath)
  const endAngle = pathEndAngle(effectivePath)
  const fairwayD = pathToD(effectivePath.pts)

  const rot = imageRotation ?? 0
  const labelFs = imageUrl ? 8 : 4.5
  const iconFs  = imageUrl ? 6 : 4
  const bHalf   = imageUrl ? 14 : 8   // half-width of label box
  const bSingle = imageUrl ? 14 : 8   // height of single-line box
  const bDouble = imageUrl ? 22 : 13  // height of double-line box
  const ballR   = imageUrl ? 5 : 3.2

  return (
    <div style={{userSelect:'none',height:'100%',display:'flex',flexDirection:'column',borderRadius:28,overflow:'hidden',position:'relative'}}>

      {/* Real course photo — images are pre-rotated to 600×1560 portrait, display fills naturally */}
      {imageUrl && (
        <img src={imageUrl} alt="" style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%',
          objectFit:'cover', objectPosition:'center',
          ...(rot ? {transform:`rotate(${rot}deg)`} : {}),
        }}/>
      )}
      {/* Slight dark scrim so labels stay readable */}
      {imageUrl && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.18)',pointerEvents:'none'}}/>}

      <svg width="100%" viewBox={imageUrl ? "0 0 100 260" : "0 -10 100 165"} preserveAspectRatio="xMidYMid slice" style={{display:'block',flex:1,position:'relative'}}>
        <defs>
          <linearGradient id="fairway" x1="0" y1="35" x2="0" y2="255" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a4a1a"/>
            <stop offset="100%" stopColor="#2d6a2d"/>
          </linearGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c8a96e"/>
            <stop offset="100%" stopColor="#a8843e"/>
          </linearGradient>
        </defs>

        {/* Generated-course-only: rough background + fairway + bunker fills */}
        {!imageUrl && <rect x={0} y={-10} width={100} height={175} fill="#0f2e0f" opacity={0.6}/>}
        {!imageUrl && !hole.isIsland && <path d={fairwayD} stroke="url(#fairway)" strokeWidth={24} fill="none" strokeLinecap="butt"/>}
        {!imageUrl && !hole.isIsland && hole.bunkers.map((b,i)=>{
          const midYards = (b.start+b.end)/2
          const midPos   = yardToSVG(midYards,hole.distance,hole.path)
          const sideX    = b.start%20<10 ? midPos.x-9 : midPos.x+9
          return <ellipse key={i} cx={sideX} cy={midPos.y} rx={6} ry={3.5} fill="url(#sand)" opacity={0.85}/>
        })}

        {/* Island green: rounded-rect water with wavy sides */}
        {!imageUrl && hole.isIsland && (()=>{
          const x1=18, x2=82
          const yT=holePos.y-26, yB=teePos.y-8
          const r=12   // large corner radius
          const amp=2  // gentle wave amplitude on straight sections
          const eL=x2-r-(x1+r)  // usable horizontal edge length
          const eV=yB-r-(yT+r)  // usable vertical edge length

          // Rounded rect with one S-wave per side (2 quadratic beziers) + arc corners
          const pathD=[
            `M ${x1+r},${yT}`,
            `Q ${x1+r+eL*.25},${yT-amp} ${x1+r+eL*.5},${yT}`,
            `Q ${x1+r+eL*.75},${yT+amp} ${x2-r},${yT}`,
            `A ${r} ${r} 0 0 1 ${x2},${yT+r}`,
            `Q ${x2+amp},${yT+r+eV*.25} ${x2},${yT+r+eV*.5}`,
            `Q ${x2-amp},${yT+r+eV*.75} ${x2},${yB-r}`,
            `A ${r} ${r} 0 0 1 ${x2-r},${yB}`,
            `Q ${x2-r-eL*.25},${yB+amp} ${x2-r-eL*.5},${yB}`,
            `Q ${x2-r-eL*.75},${yB-amp} ${x1+r},${yB}`,
            `A ${r} ${r} 0 0 1 ${x1},${yB-r}`,
            `Q ${x1-amp},${yB-r-eV*.25} ${x1},${yB-r-eV*.5}`,
            `Q ${x1+amp},${yB-r-eV*.75} ${x1},${yT+r}`,
            `A ${r} ${r} 0 0 1 ${x1+r},${yT} Z`,
          ].join(' ')

          const cx=50, cy=yT+(yB-yT)*0.72
          const front=hole.distance-20, back=hole.distance+20

          return (
            <g>
              <path d={pathD} fill="#1a3f8f" opacity={0.88}/>
              <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={0.7} opacity={0.45}/>
              <text x={cx} y={cy-3.5} fontSize={5} fill="white" textAnchor="middle" fontWeight="900"
                fontFamily="system-ui,sans-serif" opacity={0.95}>ISLAND GREEN</text>
              <text x={cx} y={cy+5} fontSize={4.2} fill="rgba(255,255,255,0.8)" textAnchor="middle"
                fontWeight="700" fontFamily="system-ui,sans-serif">Land between</text>
              <text x={cx} y={cy+11} fontSize={4.2} fill="rgba(255,255,255,0.8)" textAnchor="middle"
                fontWeight="700" fontFamily="system-ui,sans-serif">{front}–{back} yds</text>
            </g>
          )
        })()}

        {/* Water hazard — blob only for generated, text label for both (suppressed on island holes) */}
        {hole.hazard&&!hole.isIsland&&(()=>{
          const yt=yardToY(hole.hazard.end)
          const yb=yardToY(hole.hazard.start)
          const cx=yardToX((hole.hazard.start+hole.hazard.end)/2)
          const halfH=(yb-yt)/2
          const halfW=10
          const waterPath=`M ${cx},${yt}
            C ${cx+halfW+3},${yt+2} ${cx+halfW+4},${yb-halfH*0.3} ${cx+halfW},${yb}
            C ${cx+halfW-3},${yb+2} ${cx-halfW+3},${yb+2} ${cx-halfW},${yb}
            C ${cx-halfW-4},${yb-halfH*0.3} ${cx-halfW-3},${yt+2} ${cx},${yt} Z`
          return <>
            {!imageUrl && <>
              <path d={waterPath} fill="#1d4ed8" opacity={0.85}/>
              <path d={waterPath} fill="none" stroke="#3b82f6" strokeWidth={0.8} opacity={0.5}/>
              <ellipse cx={cx} cy={(yt+yb)/2} rx={halfW*0.5} ry={halfH*0.25} fill="none" stroke="rgba(147,197,253,0.3)" strokeWidth={0.5}/>
            </>}
            <text x={cx} y={(yt+yb)/2+1.5} fontSize={iconFs} fill="rgba(255,255,255,0.7)" textAnchor="middle" fontWeight="bold">💧</text>
          </>
        })()}

        {/* Max range indicator */}
        {maxRangePos !== undefined && maxRangePos < hole.distance && (()=>{
          const {x:mx,y:my} = yardToSVG(maxRangePos, hole.distance, hole.path)
          return (
            <g opacity={0.85}>
              <line x1={mx-12} y1={my} x2={mx+12} y2={my} stroke="#f97316" strokeWidth={1.2} strokeDasharray="2.5,2" strokeLinecap="round"/>
              <text x={mx+22} y={my+1.5} fontSize={iconFs} fill="#f97316" fontWeight="bold" textAnchor="start">max</text>
            </g>
          )
        })()}

        {/* Island green drop zone */}
        {!imageUrl && hole.isIsland && hole.dropZoneYards && (()=>{
          const dzPos = yardToSVG(hole.distance - hole.dropZoneYards, hole.distance, effectivePath)
          return (
            <g>
              <circle cx={dzPos.x} cy={dzPos.y} r={8} fill="#c8a96e" opacity={0.85}/>
              <circle cx={dzPos.x} cy={dzPos.y} r={5.5} fill="#16a34a" opacity={0.9}/>
              <text x={dzPos.x} y={dzPos.y+11.5} fontSize={3} fill="rgba(255,255,255,0.8)"
                textAnchor="middle" fontWeight="700" fontFamily="system-ui,sans-serif">DROP ZONE</text>
            </g>
          )
        })()}

        {/* Generated-course-only: tee box + big green circles */}
        {!imageUrl && (
          <g transform={`rotate(${endAngle}, ${teePos.x}, ${teePos.y})`}>
            <rect x={teePos.x-8} y={teePos.y-2} width={16} height={4} rx={1.5} fill="#4ade80" opacity={0.9}/>
          </g>
        )}
        {!imageUrl && <>
          {hole.isIsland && <circle cx={holePos.x} cy={holePos.y} r={17} fill="#c8a96e" opacity={0.7}/>}
          <circle cx={holePos.x} cy={holePos.y} r={11} fill="#16a34a"/>
          <circle cx={holePos.x} cy={holePos.y} r={8} fill="#22c55e" opacity={0.6}/>
        </>}

        {/* Flag — always shown so players know where the pin sits in the SVG */}
        <circle cx={holePos.x} cy={holePos.y} r={2.8} fill="#0a0f1e"/>
        <line x1={holePos.x} y1={holePos.y} x2={holePos.x} y2={holePos.y-17} stroke="rgba(255,255,255,0.7)" strokeWidth={0.7}/>
        <polygon points={`${holePos.x},${holePos.y-17} ${holePos.x+11},${holePos.y-13} ${holePos.x},${holePos.y-8}`} fill="#dc2626"/>


        {/* Swing animation */}
        {isAnimating&&(
          <g transform={`translate(${swingX+5},${swingY+2})`}>
            <line className="club-swing" x1={0} y1={0} x2={11} y2={-22} stroke="rgba(255,220,100,0.9)" strokeWidth={1.5} strokeLinecap="round"/>
          </g>
        )}

        {/* Ball trail */}
        {isAnimating&&(
          <circle cx={finalBallX} cy={ballY+ballR*2.5} rx={ballR*0.6} ry={ballR*0.25} fill="rgba(255,255,255,0.15)"/>
        )}

        {/* Opponent ball */}
        {oppBallPos!==undefined&&(()=>{
          const {x:ox,y:oy}=yardToSVG(oppBallPos,hole.distance,effectivePath)
          return(<>
            <ellipse cx={ox} cy={oy+ballR*0.6} rx={ballR} ry={ballR*0.4} fill="rgba(0,0,0,0.3)"/>
            <circle cx={ox} cy={oy} r={ballR} fill={oppBallColor??'#ef4444'}/>
          </>)
        })()}

        {/* My ball */}
        <ellipse cx={finalBallX} cy={ballY+ballR*0.6} rx={ballR} ry={ballR*0.4} fill="rgba(0,0,0,0.3)"/>
        <circle cx={finalBallX} cy={ballY} r={ballR} fill={myBallColor??'white'}/>
        {isAnimating&&(
          <circle cx={finalBallX} cy={ballY} r={ballR*1.4} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.8}/>
        )}

        {/* Distance labels — dark pill so they read on any background */}
        {hole.hazard && !hole.isIsland && displayBallPos <= hole.distance && (()=>{
          const distToNear = Math.round(hole.hazard.start - ballTeePosForLabels)
          const distToFar  = Math.round(hole.hazard.end   - ballTeePosForLabels)
          if(distToFar <= 0) return null
          if(!imageUrl) {
            const cx  = yardToX((hole.hazard.start + hole.hazard.end) / 2)
            const yt  = yardToY(hole.hazard.end)
            const yb  = yardToY(hole.hazard.start)
            const fs  = labelFs * 0.65
            return (
              <g>
                <text x={cx-13} y={yt+1.5} fontSize={fs} fill="#93c5fd" textAnchor="end" fontWeight="bold">{distToFar}</text>
                {distToNear > 0 && <text x={cx-13} y={yb+1.5} fontSize={fs} fill="#93c5fd" textAnchor="end" fontWeight="bold">{distToNear}</text>}
              </g>
            )
          }
          const cx = yardToX((hole.hazard.start + hole.hazard.end) / 2)
          const cy = yardToY((hole.hazard.start + hole.hazard.end) / 2)
          const lx = Math.max(16, Math.min(84, cx))
          if(distToNear <= 0) return (
            <g>
              <rect x={lx-bHalf} y={cy-bSingle/2} width={bHalf*2} height={bSingle} rx={2} fill="rgba(0,0,0,0.72)"/>
              <text x={lx} y={cy+3} fontSize={labelFs} fill="#93c5fd" textAnchor="middle" fontWeight="bold">💧 In water</text>
            </g>
          )
          return (
            <g>
              <rect x={lx-bHalf} y={cy-bDouble/2} width={bHalf*2} height={bDouble} rx={2} fill="rgba(0,0,0,0.72)"/>
              <text x={lx} y={cy-2} fontSize={labelFs} fill="#93c5fd" textAnchor="middle" fontWeight="bold">
                <tspan x={lx} dy="0">{distToFar}</tspan>
                <tspan x={lx} dy="9">{distToNear}</tspan>
              </text>
            </g>
          )
        })()}
        {displayBallPos <= hole.distance && hole.bunkers.map((b,i)=>{
          const distToNear = Math.round(b.start - ballTeePosForLabels)
          const distToFar  = Math.round(b.end   - ballTeePosForLabels)
          if(distToFar <= 0 || ballTeePosForLabels >= b.start) return null
          const sideLeft = b.start % 20 < 10
          const midPos   = yardToSVG((b.start + b.end) / 2, hole.distance, effectivePath)
          if(!imageUrl) {
            const ellipseRy = 3.5
            const topY = midPos.y - ellipseRy
            const botY = midPos.y + ellipseRy
            const cx   = midPos.x
            const tx   = sideLeft ? cx-13 : cx+13
            const anchor = sideLeft ? 'end' : 'start'
            const fs   = labelFs * 0.65
            return (
              <g key={i}>
                <text x={tx} y={topY+1.5} fontSize={fs} fill="#fcd34d" textAnchor={anchor} fontWeight="bold">{distToFar}</text>
                <text x={tx} y={botY+1.5} fontSize={fs} fill="#fcd34d" textAnchor={anchor} fontWeight="bold">{distToNear}</text>
              </g>
            )
          }
          const lx = Math.max(16, Math.min(84, midPos.x + (sideLeft ? -16 : 16)))
          return (
            <g key={i}>
              <rect x={lx-bHalf} y={midPos.y-bDouble/2} width={bHalf*2} height={bDouble} rx={2} fill="rgba(0,0,0,0.72)"/>
              <text x={lx} y={midPos.y-2} fontSize={labelFs} fill="#fcd34d" textAnchor="middle" fontWeight="bold">
                <tspan x={lx} dy="0">{distToFar}</tspan>
                <tspan x={lx} dy="9">{distToNear}</tspan>
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Scorecard ──────────────────────────────────────────────────────────────────

function ScoreCell({score,par}:{score:number;par:number}){
  const diff=score-par
  const s={display:'flex',alignItems:'center',justifyContent:'center',width:18,height:18,fontSize:10,fontWeight:900,color:'white'}
  if(diff<=-2) return(
    <div style={{...s,borderRadius:'50%',border:'2px solid #22c55e',outline:'2px solid #22c55e',outlineOffset:'2px'}}>{score}</div>
  )
  if(diff===-1) return(
    <div style={{...s,borderRadius:'50%',background:'#22c55e',color:'#0a0f1e'}}>{score}</div>
  )
  if(diff===0) return(
    <div style={{...s}}>{score}</div>
  )
  if(diff===1) return(
    <div style={{...s,background:'#ef4444',borderRadius:3}}>{score}</div>
  )
  return(
    <div style={{...s,background:'#ef4444',borderRadius:3,outline:'2px solid #ef4444',outlineOffset:'2px'}}>{score}</div>
  )
}

function Scorecard({holes,scores,currentIdx}:{
  holes:Hole[];scores:(number|null)[];currentIdx:number
}){
  const col=(i:number)=>({width:26,textAlign:'center' as const,flexShrink:0,background:i===currentIdx?'rgba(220,38,38,0.15)':'transparent',borderRadius:4,padding:'2px 0'})
  return(
    <div style={{padding:'8px 0',overflowX:'auto'}}>
      <div style={{display:'flex',alignItems:'stretch',gap:4,minWidth:'max-content'}}>

        {/* Label column */}
        <div style={{width:32,display:'flex',flexDirection:'column',gap:4,justifyContent:'space-around',paddingTop:2}}>
          <div style={{fontSize:8,fontWeight:800,color:'rgba(255,255,255,0.3)',textAlign:'right',paddingRight:4,height:16,lineHeight:'16px'}}>Hole</div>
          <div style={{fontSize:8,fontWeight:800,color:'rgba(255,255,255,0.3)',textAlign:'right',paddingRight:4,height:16,lineHeight:'16px'}}>Par</div>
          <div style={{fontSize:8,fontWeight:800,color:'rgba(255,255,255,0.3)',textAlign:'right',paddingRight:4,height:18,lineHeight:'18px'}}>Score</div>
        </div>

        {/* Hole columns */}
        {holes.map((h,i)=>(
          <div key={i} style={col(i)}>
            <div style={{fontSize:10,fontWeight:700,color:'white',height:16,lineHeight:'16px'}}>{h.number}</div>
            <div style={{fontSize:10,fontWeight:700,color:'white',height:16,lineHeight:'16px'}}>{h.par}</div>
            <div style={{height:18,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {scores[i]==null
                ? <div style={{width:4,height:4,borderRadius:'50%',background:'rgba(255,255,255,0.15)'}}/>
                : <ScoreCell score={scores[i]!} par={h.par}/>
              }
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}

// ── Player input row ───────────────────────────────────────────────────────────

function PlayerInputRow({idx,value,confirmed,suggestions,onChange,onConfirm,onClear}:{
  idx:number;value:string;confirmed:boolean;suggestions:string[]
  onChange:(v:string)=>void;onConfirm:(n:string)=>void;onClear:()=>void
}){
  return(
    <div style={{position:'relative'}}>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <input
          type="text"
          placeholder={idx===0?'Player 1 (required)':`Player ${idx+1} (optional)`}
          value={value} onChange={e=>onChange(e.target.value)} autoComplete="off"
          style={{flex:1,background:confirmed?'rgba(34,197,94,0.12)':'#1e2d4a',border:`1.5px solid ${confirmed?'rgba(34,197,94,0.4)':'transparent'}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontWeight:700,color:'white',fontFamily:'inherit'}}
        />
        {(value||confirmed)&&(
          <button onClick={onClear} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:16,cursor:'pointer',padding:'4px 6px',lineHeight:1}}>×</button>
        )}
      </div>
      {suggestions.length>0&&(
        <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#1e2d4a',borderRadius:8,marginTop:2,boxShadow:'0 4px 20px rgba(0,0,0,0.6)',overflow:'hidden'}}>
          {suggestions.map(name=>(
            <div key={name} onMouseDown={()=>onConfirm(name)}
              style={{padding:'9px 12px',fontSize:13,fontWeight:700,color:'white',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)'}}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(220,38,38,0.2)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shot result panel ──────────────────────────────────────────────────────────

function ShotResultPanel({result,club,remaining,onContinue,isBunker}:{
  result:ShotResult;club:ClubType;remaining:number;onContinue:()=>void;isBunker:boolean
}){
  const {total,breakdown,isOOB,isHoled,isGimme,penaltyReason,waterDropRemaining}=result
  const overshoot=total-remaining
  const isWater = isOOB && waterDropRemaining !== undefined

  const headline = isWater   ? '💧 Water Hazard!'
    : isOOB                  ? '🚫 Out of Bounds'
    : isBunker               ? '🏖️ In the Bunker!'
    : isHoled                ? '⛳ In the Hole!'
    : isGimme                ? '🤝 Gimme!'
    : overshoot>0            ? `${total} yds — past flag`
    : `${total} yds`

  const headlineColor = (isOOB&&!isWater)?'#ef4444':isWater?'#60a5fa':isBunker?'#f59e0b':(isHoled||isGimme)?'#22c55e':'white'

  const subtext = isOOB    ? `${penaltyReason}`
    : isBunker             ? `Ball in sand trap — answer a question to continue`
    : isHoled              ? 'Perfect — holed out!'
    : isGimme              ? `${Math.abs(overshoot) || remaining - total} yds away — tap in conceded`
    : overshoot>0          ? `${overshoot} yds past the flag — playing from other side`
    : `${remaining-total} yds remaining`

  const btnLabel = isWater?'Take Drop →':isOOB?'Retake Shot →':isBunker?'Face the Bunker Question →':(isHoled||isGimme)?'Finish Hole →':'Next Shot →'

  return(
    <div style={{flex:1,background:'#1e2d4a',borderRadius:12,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:22,fontWeight:900,color:headlineColor}}>{headline}</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:3}}>{subtext}</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        {breakdown.map(b=>(
          <div key={b.name} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span style={{fontWeight:700,color:'rgba(255,255,255,0.65)'}}>{b.name}</span>
            <span style={{fontWeight:800,color:'white'}}>{b.value}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:900,color:'white',borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:7,marginTop:2}}>
          <span>Total</span><span>{total} yds</span>
        </div>
      </div>
      <button onClick={onContinue} style={{background:isOOB?'#7f1d1d':isBunker?'#92400e':'#dc2626',color:'white',border:'none',borderRadius:8,padding:'11px 0',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
        {btnLabel}
      </button>
    </div>
  )
}

// Per-hole photo rotation for Pebble Beach (degrees). Add entries as needed.
const PEBBLE_PHOTO_ROTATIONS: Record<number, number> = {}

// Tee and green positions per hole as [xFrac, yFrac] (0–1) of the aerial image.
// Derived by image analysis (brightness-cluster detection on pre-rotated 600×1560 portraits).
const HOLE_POSITIONS: Record<number, {teeFrac:[number,number]; greenFrac:[number,number]}> = {
  1:  {teeFrac:[0.48,0.86], greenFrac:[0.47,0.17]},
  2:  {teeFrac:[0.44,0.84], greenFrac:[0.43,0.12]},
  3:  {teeFrac:[0.24,0.88], greenFrac:[0.37,0.19]},
  4:  {teeFrac:[0.36,0.88], greenFrac:[0.33,0.22]},
  5:  {teeFrac:[0.27,0.89], greenFrac:[0.38,0.16]},
  6:  {teeFrac:[0.38,0.90], greenFrac:[0.28,0.08]},
  7:  {teeFrac:[0.38,0.73], greenFrac:[0.42,0.25]},
  8:  {teeFrac:[0.43,0.86], greenFrac:[0.28,0.13]},
  9:  {teeFrac:[0.26,0.87], greenFrac:[0.28,0.11]},
 10:  {teeFrac:[0.33,0.86], greenFrac:[0.25,0.14]},
 11:  {teeFrac:[0.52,0.87], greenFrac:[0.43,0.11]},
 12:  {teeFrac:[0.38,0.80], greenFrac:[0.37,0.22]},
 13:  {teeFrac:[0.46,0.87], greenFrac:[0.42,0.12]},
 14:  {teeFrac:[0.58,0.92], greenFrac:[0.45,0.12]},
 15:  {teeFrac:[0.40,0.86], greenFrac:[0.38,0.12]},
 16:  {teeFrac:[0.37,0.88], greenFrac:[0.28,0.09]},
 17:  {teeFrac:[0.44,0.76], greenFrac:[0.44,0.21]},
 18:  {teeFrac:[0.35,0.83], greenFrac:[0.35,0.09]},
}
function fracToSVG(frac:[number,number]):{x:number;y:number}{
  return {x:frac[0]*100, y:frac[1]*260}
}

// ── Setup screen ───────────────────────────────────────────────────────────────

const REAL_COURSES = [
  { id:'pebble-beach', name:'Pebble Beach Golf Links', available:true },
  { id:'st-andrews',   name:'St Andrews — Old Course',  available:false },
  { id:'augusta',      name:'Augusta National',          available:false },
  { id:'royal-birkdale',name:'Royal Birkdale',           available:false },
]

function SetupScreen({courseMode,setCourseMode,selectedCourse,setSelectedCourse,numHoles,setNumHoles,tee,setTee,onStart,onH2H,onJoin}:{
  courseMode:'random'|'real'; setCourseMode:(m:'random'|'real')=>void
  selectedCourse:string; setSelectedCourse:(c:string)=>void
  numHoles:number; setNumHoles:(n:any)=>void
  tee:Tee; setTee:(t:Tee)=>void; onStart:()=>void; onH2H:()=>void; onJoin:()=>void
}){
  const [mode,setMode] = useState<'solo'|'h2h'>('solo')
  const TEE_OPTIONS: {value:Tee;label:string;sub:string;color:string;ring:string}[] = [
    {value:'Red',  label:'Easy',  sub:'Red tees',  color:'#dc2626', ring:'rgba(220,38,38,0.4)'},
    {value:'White',label:'Medium',sub:'White tees',color:'#9ca3af', ring:'rgba(156,163,175,0.4)'},
    {value:'Blue', label:'Hard',  sub:'Blue tees', color:'#3b82f6', ring:'rgba(59,130,246,0.4)'},
  ]
  return(
    <div style={{minHeight:'calc(100dvh - 56px)',background:'#0a0f1e',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24,fontFamily:"'DM Sans',sans-serif",padding:'16px 24px'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');*{box-sizing:border-box;}`}</style>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:30,fontWeight:900,color:'white',letterSpacing:'-0.5px'}}>Football Golf</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:6,lineHeight:1.5}}>
          Name PL players to hit the green.<br/>Their combined stat = your shot distance.
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{width:'100%',maxWidth:300,background:'#111827',borderRadius:12,padding:4,display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {([['solo','Single Player'],['h2h','Head to Head']] as const).map(([val,label])=>(
          <button key={val} onClick={()=>setMode(val)} style={{background:mode===val?'#1e2d4a':'transparent',color:mode===val?'white':'rgba(255,255,255,0.4)',border:'none',borderRadius:9,padding:'10px 0',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
            {label}
          </button>
        ))}
      </div>

      {/* Course mode toggle */}
      <div style={{width:'100%',maxWidth:300}}>
        <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,textAlign:'center'}}>Course Type</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <button onClick={()=>setCourseMode('random')}
            style={{background:courseMode==='random'?'rgba(220,38,38,0.15)':'#1e2d4a',color:'white',border:`2px solid ${courseMode==='random'?'#dc2626':'transparent'}`,borderRadius:10,padding:'12px 8px',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:900}}>🎲 Random</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2}}>New layout each game</div>
          </button>
          <button disabled style={{background:'#1e2d4a',color:'rgba(255,255,255,0.25)',border:'2px solid transparent',borderRadius:10,padding:'12px 8px',cursor:'default',fontFamily:'inherit',textAlign:'center',opacity:0.5}}>
            <div style={{fontSize:14,fontWeight:900}}>🏌️ Real Course</div>
            <div style={{fontSize:10,marginTop:2}}>Coming Soon</div>
          </button>
        </div>
      </div>

      {/* Real course dropdown */}
      {courseMode==='real'&&(
        <div style={{width:'100%',maxWidth:300}}>
          <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,textAlign:'center'}}>Select Course</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {REAL_COURSES.map(({id,name,available})=>(
              <button key={id} onClick={()=>available&&setSelectedCourse(id)} disabled={!available}
                style={{background:selectedCourse===id?'rgba(74,222,128,0.1)':'#1e2d4a',color:available?'white':'rgba(255,255,255,0.3)',border:`2px solid ${selectedCourse===id?'#4ade80':'transparent'}`,borderRadius:10,padding:'11px 14px',cursor:available?'pointer':'default',fontFamily:'inherit',transition:'all 0.15s',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:13,fontWeight:700}}>{name}</span>
                {!available&&<span style={{fontSize:10,color:'rgba(255,255,255,0.25)',fontWeight:700}}>Coming Soon</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tee selector — real courses only */}
      {courseMode==='real'&&(
        <div style={{width:'100%',maxWidth:300}}>
          <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,textAlign:'center'}}>Select Tee</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {TEE_OPTIONS.map(({value,label,sub,color,ring})=>(
              <button key={value} onClick={()=>setTee(value)}
                style={{background:tee===value?`${color}22`:'#1e2d4a',color:'white',border:`2px solid ${tee===value?color:'transparent'}`,borderRadius:10,padding:'12px 4px',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',textAlign:'center',boxShadow:tee===value?`0 0 12px ${ring}`:'none'}}>
                <div style={{fontSize:14,fontWeight:900,color:tee===value?color:'white'}}>{label}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginTop:2}}>{sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Holes */}
      <div style={{width:'100%',maxWidth:300}}>
        <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,textAlign:'center'}}>How many holes?</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {([3,6,9,18] as const).map(n=>(
            <button key={n} onClick={()=>setNumHoles(n)} style={{background:numHoles===n?'#dc2626':'#1e2d4a',color:'white',border:'none',borderRadius:10,padding:'16px 0',fontSize:20,fontWeight:900,cursor:'pointer',fontFamily:'inherit',transition:'background 0.15s'}}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {mode==='solo'
        ? <button onClick={onStart} style={{background:'#dc2626',color:'white',border:'none',borderRadius:12,padding:'14px 52px',fontSize:16,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}}>
            Tee Off →
          </button>
        : <div style={{display:'flex',alignItems:'center',gap:10,width:'100%',maxWidth:300}}>
            <button onClick={onH2H} style={{flex:1,background:'#dc2626',color:'white',border:'none',borderRadius:12,padding:'14px 0',fontSize:14,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}}>
              Create Room
            </button>
            <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.3)'}}>or</div>
            <button onClick={onJoin} style={{flex:1,background:'#1e2d4a',color:'white',border:'none',borderRadius:12,padding:'14px 0',fontSize:14,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}}>
              Join Room
            </button>
          </div>
      }
    </div>
  )
}

// ── Done screen ────────────────────────────────────────────────────────────────

type LeaderboardEntry = { username: string; holes: number; strokes: number; vs_par: number }

function vsParLabel(n: number) { return n === 0 ? 'E' : n > 0 ? `+${n}` : String(n) }

function DoneScreen({holes,scores,numHoles,onRestart}:{holes:Hole[];scores:number[];numHoles:number;onRestart:()=>void}){
  const totalStrokes = scores.reduce((s,n)=>s+n,0)
  const totalPar     = holes.reduce((s,h)=>s+h.par,0)
  const vsPar        = totalStrokes - totalPar
  const vsParColor   = vsPar<0?'#22c55e':vsPar>0?'#ef4444':'white'

  const [name,setName]               = useState('')
  const [submitted,setSubmitted]     = useState(false)
  const [saving,setSaving]           = useState(false)
  const [saveError,setSaveError]     = useState('')
  const [leaderboard,setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [lbLoading,setLbLoading]     = useState(true)
  const [lbError,setLbError]         = useState('')

  useEffect(()=>{
    fetch(`/api/golf-leaderboard?holes=${numHoles}`)
      .then(r=>r.json())
      .then(d=>{ if(d.error) setLbError(d.error); else setLeaderboard(d.leaderboard??[]) })
      .catch(e=>setLbError(String(e)))
      .finally(()=>setLbLoading(false))
  },[numHoles])

  async function saveScore(){
    if(!name.trim()||saving) return
    setSaving(true)
    setSaveError('')
    try{
      const res = await fetch('/api/golf-leaderboard',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:name.trim(),holes:numHoles,strokes:totalStrokes,vs_par:vsPar}),
      })
      const data = await res.json()
      if(data.error) setSaveError(data.error)
      else { setLeaderboard(data.leaderboard??[]); setSubmitted(true) }
    }catch(e){ setSaveError(String(e)) }
    setSaving(false)
  }

  return(
    <div style={{minHeight:'100dvh',background:'#0a0f1e',display:'flex',flexDirection:'column',alignItems:'center',gap:20,fontFamily:"'DM Sans',sans-serif",padding:'28px 20px 40px',overflowY:'auto'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');*{box-sizing:border-box;}`}</style>

      {/* Score */}
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Final Score · {numHoles} Holes</div>
        <div style={{fontSize:72,fontWeight:900,color:vsParColor,lineHeight:1}}>{vsParLabel(vsPar)}</div>
        <div style={{fontSize:14,color:'rgba(255,255,255,0.4)',marginTop:4}}>{totalStrokes} strokes · Par {totalPar}</div>
      </div>

      {/* Hole breakdown */}
      <div style={{width:'100%',maxWidth:340,background:'#111827',borderRadius:12,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'36px 1fr 1fr 1fr',padding:'7px 12px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          {['Hole','Par','Score','+/−'].map(h=>(
            <div key={h} style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{h}</div>
          ))}
        </div>
        {holes.map((h,i)=>{
          const s=scores[i]??0; const diff=s-h.par
          return(
            <div key={i} style={{display:'grid',gridTemplateColumns:'36px 1fr 1fr 1fr',padding:'6px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.5)'}}>{h.number}</div>
              <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.5)'}}>{h.par}</div>
              <div style={{fontSize:12,fontWeight:800,color:'white'}}>{s}</div>
              <div style={{fontSize:12,fontWeight:800,color:diff<0?'#22c55e':diff>0?'#ef4444':'rgba(255,255,255,0.4)'}}>{vsParLabel(diff)}</div>
            </div>
          )
        })}
      </div>

      {/* Save score */}
      {!submitted ? (
        <div style={{width:'100%',maxWidth:340,display:'flex',gap:8}}>
          <input
            value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&saveScore()}
            placeholder="Your name"
            maxLength={20}
            style={{flex:1,background:'#1e2d4a',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'11px 14px',fontSize:14,fontWeight:700,color:'white',fontFamily:'inherit'}}
          />
          <button onClick={saveScore} disabled={!name.trim()||saving}
            style={{background:name.trim()&&!saving?'#dc2626':'#1e2d4a',color:'white',border:'none',borderRadius:10,padding:'11px 18px',fontSize:14,fontWeight:800,cursor:name.trim()?'pointer':'default',fontFamily:'inherit',transition:'background 0.2s'}}>
            {saving?'…':'Save'}
          </button>
        </div>
      ) : (
        <div style={{fontSize:13,fontWeight:700,color:'#22c55e'}}>✓ Score saved</div>
      )}
      {saveError&&<div style={{fontSize:11,color:'#ef4444',textAlign:'center',maxWidth:300}}>{saveError}</div>}

      {/* Leaderboard */}
      <div style={{width:'100%',maxWidth:340}}>
        <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>{numHoles}-Hole Leaderboard</div>
        {lbLoading ? (
          <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',textAlign:'center',padding:'16px 0'}}>Loading…</div>
        ) : lbError ? (
          <div style={{fontSize:11,color:'#ef4444',textAlign:'center',padding:'16px 0'}}>{lbError}</div>
        ) : leaderboard.length===0 ? (
          <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',textAlign:'center',padding:'16px 0'}}>No scores yet — be the first!</div>
        ) : (
          <div style={{background:'#111827',borderRadius:12,overflow:'hidden'}}>
            {leaderboard.map((e,i)=>{
              const isMe = submitted && e.username===name.trim() && e.vs_par===vsPar && e.strokes===totalStrokes
              return(
                <div key={i} style={{display:'grid',gridTemplateColumns:'28px 1fr auto auto',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)',background:isMe?'rgba(220,38,38,0.08)':'transparent'}}>
                  <div style={{fontSize:11,fontWeight:800,color:i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#cd7c3c':'rgba(255,255,255,0.3)'}}>{i+1}</div>
                  <div style={{fontSize:13,fontWeight:700,color:isMe?'white':'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.username}</div>
                  <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.4)',marginRight:10}}>{e.strokes} str</div>
                  <div style={{fontSize:13,fontWeight:900,color:e.vs_par<0?'#22c55e':e.vs_par>0?'#ef4444':'white',minWidth:28,textAlign:'right'}}>{vsParLabel(e.vs_par)}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={onRestart} style={{background:'#dc2626',color:'white',border:'none',borderRadius:12,padding:'13px 48px',fontSize:15,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}}>
        Play Again
      </button>
    </div>
  )
}

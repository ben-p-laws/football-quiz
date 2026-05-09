'use client'
import { useState, useEffect, useRef } from 'react'
import NavBar from '@/components/NavBar'

// ── Categories ───────────────────────────────────────────────────────────────

const TOP_NATIONS: { code: string; label: string }[] = [
  { code:'ENG', label:'English' },   { code:'FRA', label:'French' },
  { code:'IRL', label:'Irish' },     { code:'SCO', label:'Scottish' },
  { code:'WAL', label:'Welsh' },     { code:'ESP', label:'Spanish' },
  { code:'NED', label:'Dutch' },     { code:'BRA', label:'Brazilian' },
  { code:'POR', label:'Portuguese' },{ code:'NOR', label:'Norwegian' },
  { code:'DEN', label:'Danish' },    { code:'ARG', label:'Argentine' },
  { code:'NIR', label:'N. Irish' },  { code:'BEL', label:'Belgian' },
  { code:'GER', label:'German' },    { code:'NGA', label:'Nigerian' },
  { code:'JAM', label:'Jamaican' },  { code:'SWE', label:'Swedish' },
  { code:'ITA', label:'Italian' },   { code:'USA', label:'American' },
  { code:'SEN', label:'Senegalese' },{ code:'AUS', label:'Australian' },
  { code:'CIV', label:"Ivorian" },   { code:'CZE', label:'Czech' },
  { code:'SRB', label:'Serbian' },   { code:'CMR', label:'Cameroonian' },
  { code:'GHA', label:'Ghanaian' },  { code:'SUI', label:'Swiss' },
  { code:'CRO', label:'Croatian' },  { code:'ISL', label:'Icelandic' },
]

const TOP_CLUBS: string[] = [
  'Tottenham Hotspur','Manchester United','Everton','Chelsea','Arsenal',
  'Liverpool','West Ham United','Newcastle United','Aston Villa','Manchester City',
  'Southampton','Fulham','Crystal Palace','Leicester City','Sunderland',
  'Blackburn Rovers','Middlesbrough','Leeds United','Wolves','West Bromwich Albion',
]

type StatKey = 'goals'|'assists'|'goals_assists'|'appearances'|'yellow_cards'|'clean_sheets'
type Category = { key: StatKey; label: string; clubFilter?: string; natFilter?: string; seasonFilter?: string }
type ClubType='driver'|'iron'|'wedge'|'putter'

// >150 yds: long-range stats only. <=150 yds: all 5.
const LONG_STATS:  StatKey[] = ['goals','goals_assists','appearances']
const SHORT_STATS: StatKey[] = ['goals','assists','goals_assists','appearances','yellow_cards']

const STAT_LABEL: Record<StatKey,string> = {
  goals:'Goals', assists:'Assists', goals_assists:'Goals + Assists',
  appearances:'Appearances', yellow_cards:'Yellow Cards', clean_sheets:'Clean Sheets',
}

function pickCategory(remaining: number, usedLabels: Set<string>, recentFilters: string[]): Category {
  const recentSet = new Set(recentFilters)
  const stats = remaining > 150 ? LONG_STATS : SHORT_STATS

  // Up to 60 attempts to find a pool slot + stat combo that satisfies both constraints.
  // Constraint 1: country/club not in recentFilters (last 10 shots).
  // Constraint 2: exact label not already used this round.
  for (let attempt = 0; attempt < 60; attempt++) {
    const pick = Math.floor(Math.random() * 51)

    let natFilter: string | undefined
    let clubFilter: string | undefined
    let labelFn: (statLabel: string) => string

    if (pick < 30) {
      const { code, label } = TOP_NATIONS[pick]
      if (recentSet.has(code)) continue
      natFilter = code
      labelFn = s => `${label} PL ${s}`
    } else if (pick < 50) {
      const clubName = TOP_CLUBS[pick - 30]
      if (recentSet.has(clubName)) continue
      clubFilter = clubName
      labelFn = s => `PL ${s} for ${clubName}`
    } else {
      labelFn = s => `All-time PL ${s}`
    }

    // Try stats in shuffled order to find one whose full label hasn't been used yet.
    const shuffled = [...stats].sort(() => Math.random() - 0.5)
    for (const key of shuffled) {
      const label = labelFn(STAT_LABEL[key])
      if (!usedLabels.has(label)) {
        return { key, label, ...(natFilter ? { natFilter } : {}), ...(clubFilter ? { clubFilter } : {}) }
      }
    }
    // All stats for this pool entry exhausted — try a different pool slot.
  }

  // Fallback: ignore constraints (round is nearly exhausted).
  const pick = Math.floor(Math.random() * 51)
  const key = stats[Math.floor(Math.random() * stats.length)]
  if (pick < 30) {
    const { code, label } = TOP_NATIONS[pick]
    return { key, label: `${label} PL ${STAT_LABEL[key]}`, natFilter: code }
  } else if (pick < 50) {
    const club = TOP_CLUBS[pick - 30]
    return { key, label: `PL ${STAT_LABEL[key]} for ${club}`, clubFilter: club }
  }
  return { key, label: `All-time PL ${STAT_LABEL[key]}` }
}

const BAD_LIE_SEASONS = ['2000-2001','2004-2005','2008-2009','2012-2013','2015-2016','2018-2019']

function pickBadLieCategory(season: string): Category {
  const keys: StatKey[] = ['goals','assists','yellow_cards']
  const key = keys[Math.floor(Math.random() * keys.length)]
  const [y1, y2] = season.split('-')
  const label = `${key==='goals'?'Goals':key==='assists'?'Assists':'Yellow Cards'} in ${y1.slice(2)}/${y2.slice(2)}`
  return { key, label, seasonFilter: season }
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
type Hole    = { number:number; par:number; distance:number; hazard:Hazard|null; bunkers:Bunker[]; path:HolePath }
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
      const distance = par===3 ? randBetween(160,240) : par===4 ? randBetween(320,380) : randBetween(430,500)
      let hazard: Hazard|null = null
      if (par===3) {
        const start = Math.round(distance*(0.60+Math.random()*0.12)/5)*5
        hazard = {start, end:start+20}
      } else if (par===5) {
        const start = randBetween(36,46)*5
        hazard = {start, end:start+30}
      } else {
        const fromHole = Math.round(randBetween(40,100)/5)*5
        hazard = {start:distance-fromHole, end:distance-fromHole+20}
      }
      const path = pathPool[holes.length % pathPool.length]
      const bunkers = generateBunkers(distance, hazard, 1)
      holes.push({number:holes.length+1, par, distance, hazard, bunkers, path})
    }
  }
  return holes
}

// Paths derived from Pebble Beach aerial images.
// Tee=pts[0] (y=148), green=pts[last] (y=17). 3pts=quadratic bezier, 4pts=cubic (S-curves).
const PEBBLE_BEACH: HoleDef[] = [
  // H1  — strong banana arc along ocean (right)
  { number:1,  par:4, yardages:{Blue:378,White:337,Red:310}, path:{pts:[{x:42,y:148},{x:84,y:83},{x:42,y:17}]},                                          hazardFrac:{startFrac:0.72,endFrac:0.87}, bunkerCount:2 },
  // H2  — straight inland, ocean cliff on one side
  { number:2,  par:5, yardages:{Blue:509,White:458,Red:358}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:null,                          bunkerCount:2 },
  // H3  — straight, tree-lined
  { number:3,  par:4, yardages:{Blue:397,White:340,Red:285}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:null,                          bunkerCount:3 },
  // H4  — straight, tree-lined
  { number:4,  par:4, yardages:{Blue:333,White:295,Red:197}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:null,                          bunkerCount:2 },
  // H5  — mild bend right (par 3)
  { number:5,  par:3, yardages:{Blue:189,White:134,Red:111}, path:{pts:[{x:46,y:148},{x:68,y:83},{x:46,y:17}]},                                           hazardFrac:null,                          bunkerCount:2 },
  // H6  — S-curve par 5: bends left then right
  { number:6,  par:5, yardages:{Blue:498,White:465,Red:420}, path:{pts:[{x:52,y:148},{x:26,y:112},{x:72,y:52},{x:52,y:17}]},                              hazardFrac:null,                          bunkerCount:2 },
  // H7  — straight, compact par 3 over ocean cliffs
  { number:7,  par:3, yardages:{Blue:107,White:94, Red:87},  path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:{startFrac:0.35,endFrac:0.78}, bunkerCount:2 },
  // H8  — straight along cliff, slight lean right
  { number:8,  par:4, yardages:{Blue:416,White:364,Red:349}, path:{pts:[{x:48,y:148},{x:60,y:83},{x:48,y:17}]},                                           hazardFrac:{startFrac:0.74,endFrac:0.90}, bunkerCount:2 },
  // H9  — strong bend left along the bay
  { number:9,  par:4, yardages:{Blue:483,White:436,Red:350}, path:{pts:[{x:58,y:148},{x:22,y:83},{x:58,y:17}]},                                           hazardFrac:{startFrac:0.65,endFrac:0.80}, bunkerCount:2 },
  // H10 — strong bend right (turn back inland)
  { number:10, par:4, yardages:{Blue:444,White:408,Red:338}, path:{pts:[{x:42,y:148},{x:76,y:83},{x:42,y:17}]},                                           hazardFrac:{startFrac:0.70,endFrac:0.85}, bunkerCount:2 },
  // H11 — straight along cliff
  { number:11, par:4, yardages:{Blue:370,White:338,Red:298}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:{startFrac:0.68,endFrac:0.83}, bunkerCount:2 },
  // H12 — straight par 3
  { number:12, par:3, yardages:{Blue:202,White:176,Red:126}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:null,                          bunkerCount:2 },
  // H13 — mild bend right
  { number:13, par:4, yardages:{Blue:401,White:370,Red:295}, path:{pts:[{x:46,y:148},{x:68,y:83},{x:46,y:17}]},                                           hazardFrac:null,                          bunkerCount:3 },
  // H14 — long straight par 5
  { number:14, par:5, yardages:{Blue:559,White:490,Red:446}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:null,                          bunkerCount:3 },
  // H15 — mild bend right
  { number:15, par:4, yardages:{Blue:393,White:338,Red:247}, path:{pts:[{x:46,y:148},{x:66,y:83},{x:46,y:17}]},                                           hazardFrac:null,                          bunkerCount:2 },
  // H16 — straight
  { number:16, par:4, yardages:{Blue:400,White:368,Red:312}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:null,                          bunkerCount:2 },
  // H17 — straight par 3 along cliff, lake in front of green
  { number:17, par:3, yardages:{Blue:182,White:166,Red:142}, path:{pts:[{x:50,y:148},{x:50,y:17}]},                                                       hazardFrac:{startFrac:0.62,endFrac:0.84}, bunkerCount:2 },
  // H18 — iconic arc along Stillwater Cove (strong bend left, mirror of H1)
  { number:18, par:5, yardages:{Blue:541,White:506,Red:454}, path:{pts:[{x:58,y:148},{x:18,y:83},{x:58,y:17}]},                                           hazardFrac:{startFrac:0.52,endFrac:0.67}, bunkerCount:3 },
]

function generateBunkers(distance: number, hazard: Hazard|null, count: number): Bunker[] {
  const bunkers: Bunker[] = []
  const PIN_BUFFER  = 15
  const HOLE_RANGE  = 100
  const minStart    = distance - HOLE_RANGE
  const maxStart    = distance - PIN_BUFFER - 10
  if (minStart >= maxStart) return bunkers
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const start = Math.round(randBetween(minStart, maxStart) / 5) * 5
      const end   = start + 10
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

function normSearch(s:string){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['''`]/g,'').toLowerCase()}

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
  const [playerInputs,setPlayerInputs]   = useState(['','',''])
  const [suggestions,setSuggestions]     = useState<string[][]>([[],[],[]])
  const [confirmedPlayers,setConfirmedPlayers] = useState<(string|null)[]>([null,null,null])
  const [shotResult,setShotResult]       = useState<ShotResult|null>(null)
  const [inputError,setInputError]       = useState('')
  const [allPlayerNames,setAllPlayerNames] = useState<string[]>([])
  const [playerData,setPlayerData]       = useState<Record<string,any>>({})
  const [namesLoading,setNamesLoading]   = useState(true)
  // Animation
  const [isAnimating,setIsAnimating]     = useState(false)
  const [animBallPos,setAnimBallPos]     = useState(0)   // yards from tee
  const [preAnimBallPos,setPreAnimBallPos] = useState(0) // ball pos before shot started (for swing graphic)
  const [arcOffset,setArcOffset]         = useState(0)   // lateral arc during flight
  const [pendingResult,setPendingResult] = useState<ShotResult|null>(null)
  const animFrameRef = useRef<number|null>(null)
  const oobDir       = useRef<0|1|-1>(0)
  const [bunkerQ,setBunkerQ]             = useState<BunkerQ|null>(null)
  const [bunkerLieResult,setBunkerLieResult] = useState<'good'|'bad'|null>(null)
  const [badLiePlayerData,setBadLiePlayerData] = useState<Record<string,{goals:number;assists:number;yellow_cards:number}>>({})
  const badLieSeason = useRef<string>('')
  const [pastPin,setPastPin]             = useState(false)
  const [holeResult,setHoleResult]       = useState<{label:string;color:string;diff:number}|null>(null)

  const normalisedNames = useRef<string[]>([])

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
    const s = BAD_LIE_SEASONS[Math.floor(Math.random()*BAD_LIE_SEASONS.length)]
    badLieSeason.current = s
    fetch(`/api/football-golf?season=${s}`).then(r=>r.json()).then(d=>setBadLiePlayerData(d.players||{})).catch(()=>{})
  },[])

  useEffect(()=>()=>{ if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current) },[])

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

  function nextPickedCategory(dist: number): Category {
    const cat = pickCategory(dist, usedLabels.current, recentFilters.current)
    usedLabels.current.add(cat.label)
    const f = cat.natFilter || cat.clubFilter
    if (f) recentFilters.current = [...recentFilters.current.slice(-9), f]
    return cat
  }

  function startGame(){
    const hs = courseMode === 'real' ? buildCourse(tee, numHoles) : generateHoles(numHoles)
    usedLabels.current    = new Set()
    recentFilters.current = []
    setHoles(hs)
    setScores(new Array(numHoles).fill(null))
    setHoleIdx(0)
    setRemaining(hs[0].distance)
    setStrokes(0)
    setShotResult(null)
    setPastPin(false)
    setQuestion(nextPickedCategory(hs[0].distance))
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
        setArcOffset(dir*eased*50)
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
          if(question.key==='goals')        value=p.goals
          else if(question.key==='assists') value=p.assists
          else if(question.key==='yellow_cards') value=p.yellow_cards
        }
      }else{
        const p=playerData[name]
        if(!p){ breakdown.push({name,value:0});continue }
        if(question.natFilter && p.nationality!==question.natFilter){ breakdown.push({name,value:0});continue }
        if(question.clubFilter){
          const cf=question.clubFilter
          if(question.key==='goals')              value=p.clubGoals[cf]||0
          else if(question.key==='assists')       value=p.clubAssists[cf]||0
          else if(question.key==='goals_assists') value=(p.clubGoals[cf]||0)+(p.clubAssists[cf]||0)
          else if(question.key==='appearances')   value=p.clubGames[cf]||0
          else if(question.key==='yellow_cards')  value=p.clubYellowCards[cf]||0
          else if(question.key==='clean_sheets')  value=p.clubCleanSheets[cf]||0
        }else{
          if(question.key==='goals')              value=p.goals
          else if(question.key==='assists')       value=p.assists
          else if(question.key==='goals_assists') value=p.goals+p.assists
          else if(question.key==='appearances')   value=p.games
          else if(question.key==='yellow_cards')  value=p.yellow_cards
          else if(question.key==='clean_sheets')  value=p.clean_sheets
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
      oobDir.current = Math.random()<0.5 ? 1 : -1
    }else{
      oobDir.current = 0
    }

    // Water hazard — only on approach (not when going back from past the pin)
    let waterDropRemaining: number|undefined
    if(!isOOB && !pastPin && currentHole.hazard){
      const approachPos = currentHole.distance - remaining
      const newPos = approachPos + total
      const {start,end} = currentHole.hazard
      if(newPos>=start && newPos<=end){
        isOOB=true
        const dropYards = start - 1  // just in front of the tee-side water edge
        waterDropRemaining = currentHole.distance - dropYards
        penaltyReason=`Water hazard! Drop at ${dropYards} yds from tee (+1 stroke)`
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
        setQuestion(nextPickedCategory(dist))
      }
    },3000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if(phase==='setup') return <><NavBar /><SetupScreen courseMode={courseMode} setCourseMode={setCourseMode} selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} numHoles={numHoles} setNumHoles={setNumHoles} tee={tee} setTee={setTee} onStart={startGame} /></>
  if(phase==='done')  return <><NavBar /><DoneScreen holes={holes} scores={scores as number[]} onRestart={()=>setPhase('setup')} /></>
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
        <div style={{position:'fixed',inset:0,zIndex:999,pointerEvents:'none'}}>
          <div className="hole-result-pop" style={{
            position:'absolute',top:'50%',left:'50%',
            transform:'translate(-50%,-50%)',
            textAlign:'center',
            background:'rgba(10,15,30,0.85)',
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
            <div style={{fontSize:20,fontWeight:700,color:'white',marginTop:8}}>
              {holeResult.diff===0?'E':holeResult.diff>0?`+${holeResult.diff}`:holeResult.diff}
            </div>
          </div>
        </div>
      )}
      <div style={{maxWidth:560,margin:'0 auto',width:'100%',padding:'0 20px'}}>
        <div style={{display:'flex',alignItems:'stretch'}}>

          {/* Left panel */}
          <div style={{flex:2,padding:'12px 8px 20px',display:'flex',flexDirection:'column',gap:10,minWidth:0}}>
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

            {/* Category */}
            {question&&(
              <div style={{background:'#1e2d4a',borderRadius:10,padding:'9px 12px'}}>
                <div style={{fontSize:16,fontWeight:800,color:'white',lineHeight:1.3}}>{question.label}</div>
              </div>
            )}

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
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,padding:'16px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Distance</div>
                <div style={{fontSize:52,fontWeight:900,color:'white',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>
                  {Math.abs(Math.round(animBallPos - preAnimBallPos))}
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.5)'}}>yards</div>
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
          </div>

          {/* Right panel — course — fixed height so animation in left panel never resizes it */}
          <div style={{flex:1,minWidth:0,height:400,alignSelf:'flex-start',display:'flex',flexDirection:'column',padding:'0 0 20px'}}>
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
    <div style={{background:'#2a1f00',border:'1px solid #f59e0b',borderRadius:12,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
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
    <div style={{background:good?'#0d2d1a':'#2a1400',border:`1px solid ${good?'#22c55e':'#f59e0b'}`,borderRadius:12,padding:'16px',display:'flex',flexDirection:'column',gap:10}}>
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

function CourseView({hole,displayBallPos,preAnimBallPos,arcOffset,isAnimating,strokes}:{
  hole:Hole; displayBallPos:number; preAnimBallPos:number; arcOffset:number; isAnimating:boolean; strokes:number
}){
  // displayBallPos is yards-from-tee; past-pin if > hole.distance
  const ballTeePosForLabels = Math.min(displayBallPos, hole.distance)
  const {x:ballX,y:ballY} = yardToSVG(displayBallPos, hole.distance, hole.path)
  const finalBallX = ballX + arcOffset
  const {x:swingX,y:swingY} = yardToSVG(preAnimBallPos, hole.distance, hole.path)

  const yardToY=(d:number)=>{ const {y}=yardToSVG(d,hole.distance,hole.path);return y }
  const yardToX=(d:number)=>{ const {x}=yardToSVG(d,hole.distance,hole.path);return x }

  const teePos  = yardToSVG(0, hole.distance, hole.path)
  const holePos = holeXY(hole.path)
  const endAngle = pathEndAngle(hole.path)
  const fairwayD = pathToD(hole.path.pts)

  return (
    <div style={{userSelect:'none',height:'100%',display:'flex',flexDirection:'column',borderRadius:28,overflow:'hidden'}}>
      <svg width="100%" viewBox="0 -10 100 165" preserveAspectRatio="xMidYMid slice" style={{display:'block',flex:1}}>
        <defs>
          <linearGradient id="fairway" x1="0" y1="12" x2="0" y2="152" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a4a1a"/>
            <stop offset="100%" stopColor="#2d6a2d"/>
          </linearGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c8a96e"/>
            <stop offset="100%" stopColor="#a8843e"/>
          </linearGradient>
        </defs>

        {/* Background rough */}
        <rect x={0} y={-10} width={100} height={165} fill="#0f2e0f" opacity={0.6}/>

{/* Fairway — smooth bezier stroke */}
        <path d={fairwayD} stroke="url(#fairway)" strokeWidth={24} fill="none" strokeLinecap="butt"/>

        {/* Water hazard */}
        {hole.hazard&&(()=>{
          const yt=yardToY(hole.hazard.end)
          const yb=yardToY(hole.hazard.start)
          const cx=yardToX((hole.hazard.start+hole.hazard.end)/2)
          const halfH=(yb-yt)/2
          const halfW=10
          const waterPath=`M ${cx},${yt}
            C ${cx+halfW+3},${yt+2} ${cx+halfW+4},${yb-halfH*0.3} ${cx+halfW},${yb}
            C ${cx+halfW-3},${yb+2} ${cx-halfW+3},${yb+2} ${cx-halfW},${yb}
            C ${cx-halfW-4},${yb-halfH*0.3} ${cx-halfW-3},${yt+2} ${cx},${yt} Z`
          return(
            <>
              <path d={waterPath} fill="#1d4ed8" opacity={0.85}/>
              <path d={waterPath} fill="none" stroke="#3b82f6" strokeWidth={0.8} opacity={0.5}/>
              <ellipse cx={cx} cy={(yt+yb)/2} rx={halfW*0.5} ry={halfH*0.25} fill="none" stroke="rgba(147,197,253,0.3)" strokeWidth={0.5}/>
              <text x={cx} y={(yt+yb)/2+1.5} fontSize={4} fill="rgba(255,255,255,0.7)" textAnchor="middle" fontWeight="bold">💧</text>
            </>
          )
        })()}

        {/* Bunker sand traps */}
        {hole.bunkers.map((b,i)=>{
          const midYards = (b.start + b.end) / 2
          const midPos   = yardToSVG(midYards, hole.distance, hole.path)
          const sideX    = b.start % 20 < 10 ? midPos.x - 9 : midPos.x + 9
          return(
            <g key={i}>
              <ellipse cx={sideX} cy={midPos.y} rx={6} ry={3.5} fill="url(#sand)" opacity={0.85}/>
            </g>
          )
        })}

        {/* Water hazard distance label */}
        {hole.hazard && displayBallPos <= hole.distance && (()=>{
          const distToStart = Math.round(hole.hazard.start - ballTeePosForLabels)
          const distToEnd   = Math.round(hole.hazard.end   - ballTeePosForLabels)
          if(distToEnd <= 0) return null
          const cx = yardToX((hole.hazard.start + hole.hazard.end) / 2)
          const cy = yardToY((hole.hazard.start + hole.hazard.end) / 2)
          const labelX = cx > 50 ? cx - 14 : cx + 14
          if(distToStart <= 0) return (
            <text x={labelX} y={cy+1.5} fontSize={4.5} fill="#93c5fd" textAnchor="middle" fontWeight="bold" style={{fontFamily:'inherit'}}>💧 In water</text>
          )
          return (
            <text x={labelX} y={cy-1} fontSize={4.5} fill="#93c5fd" textAnchor="middle" fontWeight="bold" style={{fontFamily:'inherit'}}>
              <tspan x={labelX} dy="0">💧 {distToStart}</tspan>
              <tspan x={labelX} dy="5.5">–{distToEnd}yd</tspan>
            </text>
          )
        })()}

        {/* Bunker distance labels */}
        {displayBallPos <= hole.distance && hole.bunkers.map((b,i)=>{
          const midYards = (b.start + b.end) / 2
          const midPos   = yardToSVG(midYards, hole.distance, hole.path)
          const sideX    = b.start % 20 < 10 ? midPos.x - 9 : midPos.x + 9
          const distToStart = Math.round(b.start - ballTeePosForLabels)
          const distToEnd   = Math.round(b.end   - ballTeePosForLabels)
          if(distToEnd <= 0 || ballTeePosForLabels >= b.start) return null
          const labelX = sideX > 50 ? sideX - 11 : sideX + 11
          return (
            <text key={i} x={labelX} y={midPos.y-1} fontSize={4.5} fill="#fcd34d" textAnchor="middle" fontWeight="bold" style={{fontFamily:'inherit'}}>
              <tspan x={labelX} dy="0">🏖️ {distToStart}</tspan>
              <tspan x={labelX} dy="5.5">–{distToEnd}yd</tspan>
            </text>
          )
        })}

        {/* Tee box — rotated to sit across the fairway */}
        <g transform={`rotate(${endAngle}, ${teePos.x}, ${teePos.y})`}>
          <rect x={teePos.x-8} y={teePos.y-2} width={16} height={4} rx={1.5} fill="#4ade80" opacity={0.9}/>
        </g>

        {/* Green — circular so pin is in the centre */}
        <circle cx={holePos.x} cy={holePos.y} r={11} fill="#16a34a"/>
        <circle cx={holePos.x} cy={holePos.y} r={8} fill="#22c55e" opacity={0.6}/>

        {/* Hole cup — centre of the green */}
        <circle cx={holePos.x} cy={holePos.y} r={1.8} fill="#0a0f1e"/>
        {/* Flag */}
        <line x1={holePos.x} y1={holePos.y} x2={holePos.x} y2={holePos.y-11} stroke="rgba(255,255,255,0.7)" strokeWidth={0.7}/>
        <polygon points={`${holePos.x},${holePos.y-11} ${holePos.x+7},${holePos.y-8} ${holePos.x},${holePos.y-5}`} fill="#dc2626"/>

        {/* Golf club swing animation at ball's starting position */}
        {isAnimating&&(
          <g transform={`translate(${swingX+3},${swingY+1})`}>
            <line className="club-swing" x1={0} y1={0} x2={7} y2={-14} stroke="rgba(255,220,100,0.9)" strokeWidth={1.5} strokeLinecap="round"/>
          </g>
        )}

        {/* Ball trail when animating */}
        {isAnimating&&(
          <circle cx={finalBallX} cy={ballY+8} rx={2} ry={0.8} fill="rgba(255,255,255,0.15)"/>
        )}

        {/* Ball shadow */}
        <ellipse cx={finalBallX} cy={ballY+2} rx={3} ry={1} fill="rgba(0,0,0,0.3)"/>
        {/* Ball */}
        <circle cx={finalBallX} cy={ballY} r={3.2} fill="white"/>
        {isAnimating&&(
          <circle cx={finalBallX} cy={ballY} r={4.5} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.8}/>
        )}
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
    <div style={{background:'#1e2d4a',borderRadius:12,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
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

// ── Setup screen ───────────────────────────────────────────────────────────────

const REAL_COURSES = [
  { id:'pebble-beach', name:'Pebble Beach Golf Links', available:true },
  { id:'st-andrews',   name:'St Andrews — Old Course',  available:false },
  { id:'augusta',      name:'Augusta National',          available:false },
  { id:'royal-birkdale',name:'Royal Birkdale',           available:false },
]

function SetupScreen({courseMode,setCourseMode,selectedCourse,setSelectedCourse,numHoles,setNumHoles,tee,setTee,onStart}:{
  courseMode:'random'|'real'; setCourseMode:(m:'random'|'real')=>void
  selectedCourse:string; setSelectedCourse:(c:string)=>void
  numHoles:number; setNumHoles:(n:any)=>void
  tee:Tee; setTee:(t:Tee)=>void; onStart:()=>void
}){
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

      {/* Course mode toggle */}
      <div style={{width:'100%',maxWidth:300}}>
        <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,textAlign:'center'}}>Course Type</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <button onClick={()=>setCourseMode('random')}
            style={{background:courseMode==='random'?'rgba(220,38,38,0.15)':'#1e2d4a',color:'white',border:`2px solid ${courseMode==='random'?'#dc2626':'transparent'}`,borderRadius:10,padding:'12px 8px',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:900}}>🎲 Random</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2}}>New layout each game</div>
          </button>
          <button disabled
            style={{background:'#1e2d4a',color:'rgba(255,255,255,0.3)',border:'2px solid transparent',borderRadius:10,padding:'12px 8px',cursor:'default',fontFamily:'inherit',textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:900}}>🏌️ Real Course</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:2}}>Coming Soon</div>
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

      <button onClick={onStart} style={{background:'#dc2626',color:'white',border:'none',borderRadius:12,padding:'14px 52px',fontSize:16,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}}>
        Tee Off →
      </button>
    </div>
  )
}

// ── Done screen ────────────────────────────────────────────────────────────────

function DoneScreen({holes,scores,onRestart}:{holes:Hole[];scores:number[];onRestart:()=>void}){
  const totalStrokes=scores.reduce((s,n)=>s+n,0)
  const totalPar=holes.reduce((s,h)=>s+h.par,0)
  const vsPar=totalStrokes-totalPar
  const vsParStr=vsPar===0?'Even':vsPar>0?`+${vsPar}`:String(vsPar)
  const vsParColor=vsPar<0?'#22c55e':vsPar>0?'#ef4444':'white'
  return(
    <div style={{minHeight:'100dvh',background:'#0a0f1e',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24,fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');*{box-sizing:border-box;}`}</style>
      <div style={{fontSize:48}}>⛳</div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Final Score</div>
        <div style={{fontSize:76,fontWeight:900,color:vsParColor,lineHeight:1}}>{vsParStr}</div>
        <div style={{fontSize:15,color:'rgba(255,255,255,0.4)',marginTop:6}}>{totalStrokes} strokes · Par {totalPar}</div>
      </div>
      <div style={{width:'100%',maxWidth:340,background:'#111827',borderRadius:12,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'36px 1fr 1fr 1fr',padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          {['Hole','Par','Score','+/−'].map(h=>(
            <div key={h} style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{h}</div>
          ))}
        </div>
        {holes.map((h,i)=>{
          const s=scores[i]??0
          const diff=s-h.par
          return(
            <div key={i} style={{display:'grid',gridTemplateColumns:'36px 1fr 1fr 1fr',padding:'7px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.5)'}}>{h.number}</div>
              <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.5)'}}>{h.par}</div>
              <div style={{fontSize:12,fontWeight:800,color:'white'}}>{s}</div>
              <div style={{fontSize:12,fontWeight:800,color:diff<0?'#22c55e':diff>0?'#ef4444':'rgba(255,255,255,0.4)'}}>{diff===0?'E':diff>0?`+${diff}`:diff}</div>
            </div>
          )
        })}
      </div>
      <button onClick={onRestart} style={{background:'#dc2626',color:'white',border:'none',borderRadius:12,padding:'14px 52px',fontSize:16,fontWeight:900,cursor:'pointer',fontFamily:'inherit'}}>
        Play Again
      </button>
    </div>
  )
}

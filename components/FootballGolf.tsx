'use client'
import { useState, useEffect, useRef } from 'react'
import NavBar from '@/components/NavBar'

// ── Categories ───────────────────────────────────────────────────────────────

const CLUBS_LIST = [
  'Arsenal','Chelsea','Liverpool','Manchester United','Manchester City',
  'Tottenham Hotspur','Everton','Aston Villa','Newcastle United','West Ham United',
  'Leicester City','Blackburn Rovers','Leeds United','Southampton','Middlesbrough',
]

const NAT_LIST = [
  { code:'ENG', label:'English' },{ code:'FRA', label:'French' },
  { code:'ESP', label:'Spanish' },{ code:'IRL', label:'Irish' },
  { code:'SCO', label:'Scottish' },{ code:'WAL', label:'Welsh' },
  { code:'NED', label:'Dutch' },  { code:'GER', label:'German' },
  { code:'POR', label:'Portuguese' },{ code:'ARG', label:'Argentine' },
  { code:'BRA', label:'Brazilian' },{ code:'BEL', label:'Belgian' },
  { code:'SEN', label:'Senegalese' },{ code:'NOR', label:'Norwegian' },
]

type StatKey = 'goals'|'assists'|'appearances'|'yellow_cards'|'clean_sheets'
type Category = { key: StatKey; label: string; clubFilter?: string; natFilter?: string; seasonFilter?: string }

const ALL_TIME: Category[] = [
  { key:'goals',        label:'All-time PL Goals' },
  { key:'assists',      label:'All-time PL Assists' },
  { key:'appearances',  label:'All-time PL Appearances' },
  { key:'clean_sheets', label:'All-time PL Clean Sheets' },
  { key:'yellow_cards', label:'All-time PL Yellow Cards' },
]
const CLUB_CATS: Category[] = CLUBS_LIST.flatMap(club=>[
  { key:'goals',        label:`PL Goals for ${club}`,       clubFilter:club },
  { key:'assists',      label:`PL Assists for ${club}`,     clubFilter:club },
  { key:'appearances',  label:`PL Appearances for ${club}`, clubFilter:club },
  { key:'clean_sheets', label:`PL Clean Sheets for ${club}`,clubFilter:club },
  { key:'yellow_cards', label:`PL Yellow Cards for ${club}`,clubFilter:club },
])
const NAT_CATS: Category[] = NAT_LIST.flatMap(({code,label})=>[
  { key:'goals',       label:`${label} PL Goals`,       natFilter:code },
  { key:'assists',     label:`${label} PL Assists`,     natFilter:code },
  { key:'appearances', label:`${label} PL Appearances`, natFilter:code },
  { key:'yellow_cards',label:`${label} PL Yellow Cards`,natFilter:code },
])

const BAD_LIE_SEASONS = ['2000-2001','2004-2005','2008-2009','2012-2013','2015-2016','2018-2019']

function pickBadLieCategory(season: string): Category {
  const keys: StatKey[] = ['goals','assists','yellow_cards']
  const key = keys[Math.floor(Math.random() * keys.length)]
  const [y1, y2] = season.split('-')
  const label = `${key==='goals'?'Goals':key==='assists'?'Assists':'Yellow Cards'} in ${y1.slice(2)}/${y2.slice(2)}`
  return { key, label, seasonFilter: season }
}

// Pick a category, excluding already-used labels this round
function pickCategory(remaining: number, usedLabels: string[]): Category {
  let pool: Category[]
  if (remaining > 200) {
    pool = [...ALL_TIME, ...ALL_TIME, ...NAT_CATS.filter(c=>c.key==='goals'||c.key==='appearances')]
  } else if (remaining >= 80) {
    pool = [...ALL_TIME, ...CLUB_CATS, ...NAT_CATS]
  } else {
    pool = [...CLUB_CATS, ...CLUB_CATS, ...NAT_CATS]
  }
  const usedSet = new Set(usedLabels)
  const filtered = pool.filter(c => !usedSet.has(c.label))
  const src = filtered.length > 0 ? filtered : pool
  return src[Math.floor(Math.random() * src.length)]
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

// bend-right: tee bottom-left (20,148) → bend middle-right (80,75) → green top-left (20,17)  [C shape opening right]
// bend-left:  tee bottom-right (80,148) → bend middle-left (20,75) → green top-right (80,17) [C shape opening left]
// straight:   tee bottom-center (50,148) → green top-center (50,17)
type HoleShape = 'straight'|'bend-left'|'bend-right'

function yardToSVG(yards: number, total: number, shape: HoleShape): { x:number; y:number } {
  const p = Math.max(0, yards / total)
  switch (shape) {
    case 'bend-right':
      if (p <= 0.5) return { x: 20 + 120*p,   y: 148 - 146*p }
      else          return { x: 140 - 120*p,  y: 133 - 116*p }
    case 'bend-left':
      if (p <= 0.5) return { x: 80 - 120*p,   y: 148 - 146*p }
      else          return { x: -40 + 120*p,  y: 133 - 116*p }
    default:        return { x: 50,             y: 148 - 131*p }
  }
}

function holeXY(shape: HoleShape): { x:number; y:number } {
  return yardToSVG(1, 1, shape)
}

// ── Hole generation ────────────────────────────────────────────────────────────

type Hazard = { start:number; end:number }
type Bunker = { start:number; end:number }
type Hole   = { number:number; par:number; distance:number; hazard:Hazard|null; bunkers:Bunker[]; shape:HoleShape }

function randBetween(min:number,max:number){ return min+Math.floor(Math.random()*(max-min+1)) }

function shuffle<T>(arr:T[]):T[]{
  const a=[...arr]
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]] }
  return a
}

const ALL_SHAPES: HoleShape[] = ['straight','bend-left','bend-right']

function generateBunkers(distance: number, hazard: Hazard|null, count: number): Bunker[] {
  const bunkers: Bunker[] = []
  const PIN_BUFFER  = 15   // no bunker within 15 yds of pin
  const HOLE_RANGE  = 100  // bunkers only within 100 yds of hole
  const minStart    = distance - HOLE_RANGE
  const maxStart    = distance - PIN_BUFFER - 10
  if (minStart >= maxStart) return bunkers  // hole too short to place bunkers
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const start = Math.round(randBetween(minStart, maxStart) / 5) * 5
      const end   = start + 10
      // No overlap with water (keep 10 yds clear)
      if (hazard && start < hazard.end + 10 && end > hazard.start - 10) continue
      // No overlap with other bunkers (keep 20 yds clear)
      if (bunkers.some(b => start < b.end + 20 && end > b.start - 20)) continue
      bunkers.push({ start, end })
      break
    }
  }
  return bunkers
}

function generateHoles(count:3|6|9|18):Hole[]{
  const holes:Hole[]=[]
  const groups=count/3
  const shapePool = shuffle([...ALL_SHAPES,...ALL_SHAPES,...ALL_SHAPES,...ALL_SHAPES])

  for(let g=0;g<groups;g++){
    for(const par of shuffle([3,4,5])){
      const distance=par===3?randBetween(160,240):par===4?randBetween(320,380):randBetween(430,500)
      let hazard:Hazard|null=null
      if(par===3){
        const start=Math.round(distance*(0.60+Math.random()*0.12)/5)*5
        hazard={start,end:start+20}
      }else if(par===5){
        const start=randBetween(36,46)*5
        hazard={start,end:start+30}
      }else{
        const fromHole=Math.round(randBetween(40,100)/5)*5
        const start=distance-fromHole
        hazard={start,end:start+20}
      }
      const bunkerCount = 1
      const bunkers = generateBunkers(distance, hazard, bunkerCount)
      const shape=shapePool[holes.length%shapePool.length]
      holes.push({number:holes.length+1,par,distance,hazard,bunkers,shape})
    }
  }
  return holes
}

// ── Club types ─────────────────────────────────────────────────────────────────

type ClubType='driver'|'iron'|'wedge'|'putter'

function getClub(remaining:number):ClubType{
  if(remaining>260)  return 'driver'
  if(remaining>=120) return 'iron'
  if(remaining>20)   return 'wedge'
  return 'putter'
}

const CLUB_RANGES:Record<ClubType,[number,number]>={driver:[250,300],iron:[120,260],wedge:[20,119],putter:[0,50]}
const CLUB_LABEL:Record<ClubType,string>={driver:'Driver',iron:'Iron',wedge:'Wedge',putter:'Putter'}

// ── Types ──────────────────────────────────────────────────────────────────────

type ShotResult={
  total:number; breakdown:{name:string;value:number}[]
  isOOB:boolean; isHoled:boolean
  isInBunker:boolean; penaltyReason:string
}

function normSearch(s:string){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['''`]/g,'').toLowerCase()}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FootballGolf(){
  const [phase,setPhase]                 = useState<'setup'|'playing'|'done'>('setup')
  const [numHoles,setNumHoles]           = useState<3|6|9|18>(9)
  const [holes,setHoles]                 = useState<Hole[]>([])
  const [holeIdx,setHoleIdx]             = useState(0)
  const [remaining,setRemaining]         = useState(0)
  const [strokes,setStrokes]             = useState(0)
  const [scores,setScores]               = useState<(number|null)[]>([])
  const [question,setQuestion]           = useState<Category|null>(null)
  const [usedLabels,setUsedLabels]       = useState<string[]>([])
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
  const [arcOffset,setArcOffset]         = useState(0)   // lateral arc during flight
  const [pendingResult,setPendingResult] = useState<ShotResult|null>(null)
  const animFrameRef = useRef<number|null>(null)
  const [bunkerQ,setBunkerQ]             = useState<BunkerQ|null>(null)
  const [bunkerLieResult,setBunkerLieResult] = useState<'good'|'bad'|null>(null)
  const [badLiePlayerData,setBadLiePlayerData] = useState<Record<string,{goals:number;assists:number;yellow_cards:number}>>({})
  const badLieSeason = useRef<string>('')
  const [pastPin,setPastPin]             = useState(false)

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

  function startGame(){
    const hs=generateHoles(numHoles)
    setHoles(hs)
    setScores(new Array(numHoles).fill(null))
    setHoleIdx(0)
    setRemaining(hs[0].distance)
    setStrokes(0)
    setShotResult(null)
    setPastPin(false)
    setUsedLabels([])
    const firstCat=pickCategory(hs[0].distance,[])
    setQuestion(firstCat)
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
    setPendingResult(result)
    setAnimBallPos(fromPos)
    setArcOffset(0)
    const startTime = performance.now()
    const duration  = 1100
    const tick = (now:number)=>{
      const t     = Math.min(1,(now-startTime)/duration)
      const eased = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2
      setAnimBallPos(fromPos+(toPos-fromPos)*eased)
      setArcOffset(Math.sin(Math.PI*eased)*7)
      if(t<1){
        animFrameRef.current=requestAnimationFrame(tick)
      }else{
        setIsAnimating(false)
        setArcOffset(0)
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
          if(question.key==='goals')        value=p.clubGoals[cf]||0
          else if(question.key==='assists') value=p.clubAssists[cf]||0
          else if(question.key==='appearances') value=p.clubGames[cf]||0
          else if(question.key==='yellow_cards') value=p.clubYellowCards[cf]||0
          else if(question.key==='clean_sheets') value=p.clubCleanSheets[cf]||0
        }else{
          if(question.key==='goals')        value=p.goals
          else if(question.key==='assists') value=p.assists
          else if(question.key==='appearances') value=p.games
          else if(question.key==='yellow_cards') value=p.yellow_cards
          else if(question.key==='clean_sheets') value=p.clean_sheets
        }
      }
      breakdown.push({name,value})
      total+=value
    }

    let isOOB=false
    let penaltyReason=''

    // Club max exceeded
    if(total>clubMax){
      isOOB=true
      penaltyReason=`Exceeded ${CLUB_LABEL[club]} max of ${clubMax} yds`
    }

    // Water hazard — only on approach (not when going back from past the pin)
    if(!isOOB && !pastPin && currentHole.hazard){
      // ballPos for approach = hole.distance - remaining (absolute tee-side position)
      const approachPos = currentHole.distance - remaining
      const newPos = approachPos + total
      const {start,end} = currentHole.hazard
      if(newPos>=start && newPos<=end){
        isOOB=true
        penaltyReason=`Water hazard! Ball landed in lake (${start}–${end} yds from tee)`
      }
    }

    const overshoot = total - remaining     // positive = went past hole (or back past on pastPin side)

    // More than 20 yards past hole = OOB (only on approach; when pastPin, overshoot means going back past the original approach side)
    if(!isOOB && overshoot>20){
      isOOB=true
      penaltyReason=`${overshoot} yds past the flag — out of bounds!`
    }

    // Gimme: within 5 yards of pin (either short or slightly past) = auto-holed, costs the shot
    const isHoled = !isOOB && Math.abs(total - remaining) <= 5

    // Bunker: ball lands in one of this hole's bunker zones (approach side only)
    const approachPosNow = currentHole.distance - remaining  // tee-relative position before shot
    const approachPosNew = approachPosNow + total             // where ball lands (tee-relative)
    const wasInBunker = !pastPin && currentHole.bunkers.some(b => approachPosNow >= b.start && approachPosNow <= b.end)
    const isInBunker  = !isOOB && !isHoled && !pastPin && !wasInBunker &&
      currentHole.bunkers.some(b => approachPosNew >= b.start && approachPosNew <= b.end)

    const result:ShotResult={ total,breakdown,isOOB,isHoled,isInBunker,penaltyReason }

    // Animation: when pastPin ball flies BACK toward hole (decreasing absolute pos)
    const toPos = pastPin
      ? (isOOB ? ballPos - clubMax : ballPos - total)   // going back
      : (isOOB && penaltyReason.includes('past')
          ? currentHole.distance + Math.min(overshoot, 35)
          : Math.min(ballPos + total, currentHole.distance + 20))

    animateShot(ballPos, toPos, result)
  }

  function advanceFromResult(){
    if(!shotResult||!currentHole) return
    const penaltyStrokes = shotResult.isOOB ? 1 : 0
    const newStrokes=strokes+1+penaltyStrokes

    const newLabel=question?.label
    const newUsed=newLabel ? [...usedLabels, newLabel] : usedLabels

    const lieResult = bunkerLieResult
    setBunkerLieResult(null)

    function nextCat(dist: number): Category {
      if (lieResult === 'bad') return pickBadLieCategory(badLieSeason.current)
      return pickCategory(dist, newUsed)
    }

    if(shotResult.isOOB){
      setStrokes(newStrokes)
      setShotResult(null)
      setBunkerQ(null)
      const cat=nextCat(remaining)
      setUsedLabels([...newUsed,cat.label])
      setQuestion(cat)
      resetInputs()
      return
    }

    if(shotResult.isHoled){
      setUsedLabels(newUsed)
      finishHole(newStrokes)
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
    const cat=nextCat(newRemaining)
    setUsedLabels([...newUsed,cat.label])
    setQuestion(cat)
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
    if(holeIdx+1>=holes.length){
      setPhase('done')
    }else{
      const nextIdx=holeIdx+1
      setHoleIdx(nextIdx)
      const dist=holes[nextIdx].distance
      setRemaining(dist)
      setPastPin(false)
      setStrokes(0)
      // Reset used labels per hole? No — keep them across the whole round for true no-repeat
      const cat=pickCategory(dist,usedLabels)
      setUsedLabels(prev=>[...prev,cat.label])
      setQuestion(cat)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if(phase==='setup') return <><NavBar /><SetupScreen numHoles={numHoles} setNumHoles={setNumHoles} onStart={startGame} /></>
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
      `}</style>
      <NavBar />
      <div style={{maxWidth:520,margin:'0 auto',width:'100%'}}>
        <Scorecard holes={holes} scores={scores} currentIdx={holeIdx} vsParStr={vsParStr} vsPar={vsPar} />
        <div style={{display:'flex',alignItems:'stretch'}}>

          {/* Left panel */}
          <div style={{flex:3,padding:'12px 14px 20px',display:'flex',flexDirection:'column',gap:10,minWidth:0}}>
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
                      {inBunker && <span style={{color:'#f59e0b'}}> · ⛺ In bunker</span>}
                    </div>
                    {/* Water — own line */}
                    {currentHole.hazard && !pastPin && (()=>{
                      const distToStart = currentHole.hazard.start - approachPos
                      const distToEnd   = currentHole.hazard.end   - approachPos
                      if(distToEnd <= 0) return null
                      if(distToStart <= 0) return <div style={{fontSize:13,fontWeight:700,color:'#f87171'}}>💧 In water zone</div>
                      return <div style={{fontSize:13,fontWeight:700,color:'#60a5fa'}}>💧 Water: {distToStart}–{distToEnd} yds ahead</div>
                    })()}
                    {/* Bunker — own line */}
                    {!pastPin && !inBunker && currentHole.bunkers.map((b,i)=>{
                      const distToStart = b.start - approachPos
                      const distToEnd   = b.end   - approachPos
                      if(distToEnd <= 0 || approachPos >= b.start) return null
                      return <div key={i} style={{fontSize:13,fontWeight:700,color:'#f59e0b'}}>⛺ Bunker: {distToStart}–{distToEnd} yds ahead</div>
                    })}
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
                <div style={{fontSize:9,fontWeight:800,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Category</div>
                <div style={{fontSize:13,fontWeight:800,color:'white',lineHeight:1.3}}>{question.label}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:3}}>Up to 3 players — combined stat = shot distance</div>
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
            ) : remaining <= 5 ? (
              <GimmePanel remaining={remaining} onAccept={() => finishHole(strokes + 1)} />
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

          {/* Right panel — course */}
          <div style={{flex:1,minWidth:0}}>
            <CourseView
              hole={currentHole}
              displayBallPos={displayPos}
              arcOffset={arcOffset}
              isAnimating={isAnimating}
              strokes={strokes}
            />
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
        <div style={{fontSize:10,fontWeight:800,color:'#f59e0b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>⛺ Sand Trap — Answer to play on</div>
        <div style={{fontSize:13,fontWeight:800,color:'white',lineHeight:1.4}}>{bq.q}</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:3}}>Wrong answer = +1 penalty stroke</div>
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

function CourseView({hole,displayBallPos,arcOffset,isAnimating,strokes}:{
  hole:Hole; displayBallPos:number; arcOffset:number; isAnimating:boolean; strokes:number
}){
  const {x:ballX,y:ballY} = yardToSVG(displayBallPos, hole.distance, hole.shape)
  const finalBallX = ballX + arcOffset

  const yardToY=(d:number)=>{ const {y}=yardToSVG(d,hole.distance,hole.shape);return y }
  const yardToX=(d:number)=>{ const {x}=yardToSVG(d,hole.distance,hole.shape);return x }

  const teePos  = yardToSVG(0,           hole.distance, hole.shape)
  const holePos = holeXY(hole.shape)

  // Build fairway path based on shape
  // bend-right: tee bottom-left (20,148), bend middle-right (80,75), green top-left (20,17)
  //   inner (concave) edge: (-9,-8) from seg1 centerline, (-8,+9) from seg2 centerline
  //   outer (convex) edge: (+9,+8) from seg1 centerline, (+8,-9) from seg2 centerline
  // bend-left: mirror of bend-right across x=50
  const fairwayPath = (()=>{
    switch(hole.shape){
      case 'bend-right':
        return 'M 11,140 L 71,67 L 72,84 L 12,26 L 28,8 L 88,66 L 89,83 L 29,152 Z'
      case 'bend-left':
        return 'M 89,140 L 29,67 L 28,84 L 88,26 L 72,8 L 12,66 L 11,83 L 71,152 Z'
      default: // straight
        return null
    }
  })()

  // Bunker SVG positions — computed from actual bunker yard positions

  return (
    <div style={{userSelect:'none',height:'100%',display:'flex',flexDirection:'column'}}>
      <svg width="100%" viewBox="0 3 100 152" preserveAspectRatio="xMidYMid slice" style={{display:'block',flex:1}}>
        <defs>
          <linearGradient id="fairway" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a4a1a"/>
            <stop offset="100%" stopColor="#2d6a2d"/>
          </linearGradient>
          <linearGradient id="rough" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f2e0f"/>
            <stop offset="100%" stopColor="#1a3d1a"/>
          </linearGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c8a96e"/>
            <stop offset="100%" stopColor="#a8843e"/>
          </linearGradient>
        </defs>

        {/* Background rough */}
        <rect x={0} y={0} width={100} height={155} fill="#0f2e0f" opacity={0.6}/>

        {/* Fairway */}
        {fairwayPath ? (
          <path d={fairwayPath} fill="url(#fairway)"/>
        ) : (
          <rect x={38} y={12} width={24} height={140} rx={3} fill="url(#fairway)"/>
        )}

        {/* Water hazard — organic shape */}
        {hole.hazard&&(()=>{
          const yt=yardToY(hole.hazard.end)
          const yb=yardToY(hole.hazard.start)
          const cx=yardToX((hole.hazard.start+hole.hazard.end)/2)
          const halfH=(yb-yt)/2
          const halfW=10
          // Organic blob path
          const waterPath=`M ${cx},${yt}
            C ${cx+halfW+3},${yt+2} ${cx+halfW+4},${yb-halfH*0.3} ${cx+halfW},${yb}
            C ${cx+halfW-3},${yb+2} ${cx-halfW+3},${yb+2} ${cx-halfW},${yb}
            C ${cx-halfW-4},${yb-halfH*0.3} ${cx-halfW-3},${yt+2} ${cx},${yt} Z`
          return(
            <>
              <path d={waterPath} fill="#1d4ed8" opacity={0.85}/>
              <path d={waterPath} fill="none" stroke="#3b82f6" strokeWidth={0.8} opacity={0.5}/>
              {/* Ripple lines */}
              <ellipse cx={cx} cy={(yt+yb)/2} rx={halfW*0.5} ry={halfH*0.25} fill="none" stroke="rgba(147,197,253,0.3)" strokeWidth={0.5}/>
              <text x={cx} y={(yt+yb)/2+1.5} fontSize={4} fill="rgba(255,255,255,0.7)" textAnchor="middle" fontWeight="bold">💧</text>
            </>
          )
        })()}

        {/* Bunker sand traps at their actual positions */}
        {hole.bunkers.map((b,i)=>{
          const midYards = (b.start + b.end) / 2
          const midPos   = yardToSVG(midYards, hole.distance, hole.shape)
          // Alternate left/right of fairway centre
          const sideX = i % 2 === 0 ? midPos.x - 8 : midPos.x + 8
          return(
            <g key={i}>
              <ellipse cx={sideX} cy={midPos.y} rx={6} ry={3.5} fill="url(#sand)" opacity={0.85}/>
            </g>
          )
        })}

        {/* Tee box */}
        <rect x={teePos.x-8} y={teePos.y-1} width={16} height={5} rx={2} fill="#4ade80" opacity={0.9}/>

        {/* Green */}
        <ellipse cx={holePos.x} cy={holePos.y+5} rx={13} ry={7} fill="#16a34a"/>
        <ellipse cx={holePos.x} cy={holePos.y+5} rx={10} ry={5} fill="#22c55e" opacity={0.6}/>

        {/* Hole cup */}
        <circle cx={holePos.x} cy={holePos.y+3} r={1.8} fill="#0a0f1e"/>
        {/* Flag */}
        <line x1={holePos.x} y1={holePos.y+3} x2={holePos.x} y2={holePos.y-8} stroke="rgba(255,255,255,0.7)" strokeWidth={0.7}/>
        <polygon points={`${holePos.x},${holePos.y-8} ${holePos.x+7},${holePos.y-5} ${holePos.x},${holePos.y-2}`} fill="#dc2626"/>

        {/* Yardage markers */}
        <text x={34} y={18} fontSize={4.5} fill="rgba(255,255,255,0.3)" fontWeight="bold" textAnchor="end">0</text>
        <text x={34} y={152} fontSize={4.5} fill="rgba(255,255,255,0.3)" fontWeight="bold" textAnchor="end">{hole.distance}</text>

        {/* Golf club swing animation near tee */}
        {isAnimating&&(
          <g transform={`translate(${teePos.x+3},${teePos.y+1})`}>
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
      <div style={{textAlign:'center',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',fontFamily:"'DM Sans',sans-serif",padding:'4px 4px 8px'}}>
        H{hole.number} · P{hole.par}<br/>{hole.distance}y · S{strokes+1}
      </div>
    </div>
  )
}

// ── Scorecard ──────────────────────────────────────────────────────────────────

function Scorecard({holes,scores,currentIdx,vsParStr,vsPar}:{
  holes:Hole[];scores:(number|null)[];currentIdx:number;vsParStr:string;vsPar:number
}){
  const vsParColor=vsPar<0?'#22c55e':vsPar>0?'#ef4444':'white'
  return(
    <div style={{background:'#111827',padding:'8px 12px',overflowX:'auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,minWidth:'max-content'}}>
        <div style={{width:22,fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.3)',textAlign:'center'}}>H</div>
        {holes.map((h,i)=>(
          <div key={i} style={{width:26,textAlign:'center',borderRadius:4,padding:'2px 0',background:i===currentIdx?'rgba(220,38,38,0.2)':'transparent'}}>
            <div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.3)'}}>P{h.par}</div>
            <div style={{fontSize:13,fontWeight:800,color:scores[i]==null?'rgba(255,255,255,0.18)':scores[i]!<h.par?'#22c55e':scores[i]!>h.par?'#ef4444':'white'}}>
              {scores[i]??'·'}
            </div>
          </div>
        ))}
        <div style={{marginLeft:6,paddingLeft:6,borderLeft:'1px solid rgba(255,255,255,0.1)',textAlign:'center'}}>
          <div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.3)'}}>TOT</div>
          <div style={{fontSize:15,fontWeight:900,color:vsParColor}}>{vsParStr}</div>
        </div>
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
  const {total,breakdown,isOOB,isHoled,penaltyReason}=result
  const overshoot=total-remaining

  // Gimme = holed but ball didn't go exactly in (within 5 yds either side)
  const isGimme = isHoled && overshoot !== 0
  const headline = isOOB    ? '🚫 Out of Bounds'
    : isBunker              ? '⛺ In the Bunker!'
    : isGimme               ? '🤝 Gimme!'
    : isHoled               ? '⛳ In the Hole!'
    : overshoot>0           ? `${total} yds — past flag`
    : `${total} yds`

  const headlineColor = isOOB?'#ef4444':isBunker?'#f59e0b':isHoled?'#22c55e':'white'

  const subtext = isOOB    ? `${penaltyReason} · +1 stroke penalty`
    : isBunker             ? `Ball in sand trap — answer a question to continue`
    : isGimme && overshoot<0 ? `${remaining-total} yds short — tap in conceded`
    : isGimme              ? `${overshoot} yds past flag — tap in conceded`
    : isHoled              ? 'Holed out!'
    : overshoot>0          ? `${overshoot} yds past the flag — playing from other side`
    : `${remaining-total} yds remaining`

  const btnLabel = isOOB?'Retake Shot →':isBunker?'Face the Bunker Question →':isHoled?'Next Hole →':'Next Shot →'

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

function SetupScreen({numHoles,setNumHoles,onStart}:{numHoles:number;setNumHoles:(n:any)=>void;onStart:()=>void}){
  return(
    <div style={{minHeight:'100dvh',background:'#0a0f1e',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:32,fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&display=swap');*{box-sizing:border-box;}`}</style>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48}}>⛳</div>
        <div style={{fontSize:30,fontWeight:900,color:'white',marginTop:10,letterSpacing:'-0.5px'}}>Football Golf</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:6,lineHeight:1.5}}>
          Name PL players to hit the green.<br/>Their combined stat = your shot distance.
        </div>
      </div>
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

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TEAM_NORM: Record<string, string> = {
  'Manchester Utd':  'Manchester United',
  'QPR':             'Queens Park Rangers',
  'Sheffield Weds':  'Sheffield Wednesday',
  'Brighton':        'Brighton & Hove Albion',
  'West Brom':       'West Bromwich Albion',
}
const normTeam = (t: string) => TEAM_NORM[t] ?? t

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function fetchAll(columns: string): Promise<any[]> {
  const supabase = getClient()
  const rows: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('player_seasons')
      .select(columns)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

type Answer = {
  player:      string
  display:     string
  value:       string
  rawValue:    number
  nationality: string
  team:        string
}

type Quiz = {
  key:         string
  label:       string
  description: string
  unit:        string
  answers:     Answer[]
}

type PlayerAgg = {
  name:         string
  games:        number
  goals:        number
  assists:      number
  cleanSheets:  number
  yellowCards:  number
  natFreq:      Record<string, number>
  teamFreq:     Record<string, number>
  clubGames:    Record<string, number>
  clubGoals:    Record<string, number>
  clubAssists:  Record<string, number>
}

function lastWord(name: string): string {
  const parts = name.trim().split(' ')
  return parts[parts.length - 1]
}

function mostCommon(freq: Record<string, number>): string {
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

function fmtNat(raw: string): string {
  const parts = raw.trim().split(/\s+/)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^[A-Z]{2,4}$/.test(parts[i])) return parts[i]
  }
  return raw
}

function makeAnswer(p: PlayerAgg, value: number, fmtVal?: (v: number) => string): Answer {
  return {
    player:      lastWord(p.name),
    display:     p.name,
    value:       fmtVal ? fmtVal(value) : value.toLocaleString(),
    rawValue:    value,
    nationality: fmtNat(mostCommon(p.natFreq)),
    team:        mostCommon(p.teamFreq),
  }
}

function top10(entries: Array<{ p: PlayerAgg; v: number }>, minV = 1, fmtVal?: (v: number) => string): Answer[] {
  return entries
    .filter(x => x.v >= minV)
    .sort((a, b) => b.v - a.v)
    .slice(0, 10)
    .map(x => makeAnswer(x.p, x.v, fmtVal))
}

const fmtP90 = (v: number) => v.toFixed(2)

let cache: { data: any; time: number } | null = null
const CACHE_TTL = 3_600_000

async function buildData() {
  if (cache && Date.now() - cache.time < CACHE_TTL) return cache.data

  const rows = await fetchAll('name_display,games,goals,assists,gk_clean_sheets,cards_yellow,nationality,teams_played_for')

  const players: Record<string, PlayerAgg> = {}

  for (const row of rows) {
    const name = row.name_display as string
    if (!players[name]) players[name] = {
      name, games: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0,
      natFreq: {}, teamFreq: {}, clubGames: {}, clubGoals: {}, clubAssists: {},
    }
    const p = players[name]
    const g  = Number(row.games)           || 0
    const gl = Number(row.goals)           || 0
    const as = Number(row.assists)         || 0
    const cs = Number(row.gk_clean_sheets) || 0
    const yc = Number(row.cards_yellow)    || 0
    p.games       += g
    p.goals       += gl
    p.assists     += as
    p.cleanSheets += cs
    p.yellowCards += yc

    if (row.nationality) {
      const code = fmtNat(row.nationality)
      p.natFreq[code] = (p.natFreq[code] || 0) + 1
    }

    const teams = String(row.teams_played_for || '')
      .split(',').map(t => normTeam(t.trim())).filter(t => t && t !== '2 Teams')

    for (const team of teams) {
      p.teamFreq[team] = (p.teamFreq[team] || 0) + g
    }
    if (teams.length === 1) {
      p.clubGames[teams[0]]   = (p.clubGames[teams[0]] || 0) + g
      p.clubGoals[teams[0]]   = (p.clubGoals[teams[0]] || 0) + gl
      p.clubAssists[teams[0]] = (p.clubAssists[teams[0]] || 0) + as
    }
  }

  const all = Object.values(players)

  const quizzes: Quiz[] = []

  // ── All-time ─────────────────────────────────────────────────────────────
  quizzes.push({ key: 'all_apps',         label: 'All-Time Appearances',  description: 'Top 10 PL appearance makers of all time',             unit: 'apps',         answers: top10(all.map(p => ({ p, v: p.games       }))) })
  quizzes.push({ key: 'all_goals',        label: 'All-Time Goals',        description: 'Top 10 PL goalscorers of all time',                   unit: 'goals',        answers: top10(all.map(p => ({ p, v: p.goals       }))) })
  quizzes.push({ key: 'all_assists',      label: 'All-Time Assists',      description: 'Top 10 PL assist providers of all time',              unit: 'assists',      answers: top10(all.map(p => ({ p, v: p.assists     }))) })
  quizzes.push({ key: 'all_clean_sheets', label: 'All-Time Clean Sheets', description: 'Top 10 PL goalkeepers by career clean sheets',        unit: 'clean sheets', answers: top10(all.map(p => ({ p, v: p.cleanSheets }))) })
  quizzes.push({ key: 'all_yellow_cards', label: 'All-Time Yellow Cards', description: 'Top 10 most-booked PL players of all time',           unit: 'yellow cards', answers: top10(all.map(p => ({ p, v: p.yellowCards }))) })
  quizzes.push({ key: 'all_goals_p90',   label: 'All-Time Goals per 90', description: 'Top 10 PL goals-per-90 (min. 5 goals)',               unit: 'per 90',       answers: top10(all.filter(p => p.goals >= 5 && p.games > 0).map(p => ({ p, v: p.goals / p.games })), 0.01, fmtP90) })

  // ── By nationality ────────────────────────────────────────────────────────
  const NATIONALITIES: { nat: string; label: string }[] = [
    { nat: 'ENG', label: 'English'     },
    { nat: 'FRA', label: 'French'      },
    { nat: 'ESP', label: 'Spanish'     },
    { nat: 'IRL', label: 'Irish'       },
    { nat: 'WAL', label: 'Welsh'       },
    { nat: 'SCO', label: 'Scottish'    },
    { nat: 'NED', label: 'Dutch'       },
    { nat: 'NOR', label: 'Norwegian'   },
    { nat: 'GER', label: 'German'      },
    { nat: 'POR', label: 'Portuguese'  },
    { nat: 'DEN', label: 'Danish'      },
    { nat: 'SWE', label: 'Swedish'     },
    { nat: 'ARG', label: 'Argentine'   },
    { nat: 'BRA', label: 'Brazilian'   },
    { nat: 'BEL', label: 'Belgian'     },
    { nat: 'ITA', label: 'Italian'     },
    { nat: 'CIV', label: 'Ivorian'     },
    { nat: 'NGA', label: 'Nigerian'    },
    { nat: 'SEN', label: 'Senegalese'  },
    { nat: 'GHA', label: 'Ghanaian'    },
    { nat: 'AUS', label: 'Australian'  },
  ]

  for (const { nat, label } of NATIONALITIES) {
    const pool = all.filter(p => mostCommon(p.natFreq) === nat)
    const apps  = top10(pool.map(p => ({ p, v: p.games })))
    const goals = top10(pool.map(p => ({ p, v: p.goals })))
    const slug  = nat.toLowerCase().replace(/[^a-z]/g, '_')
    if (apps.length  >= 10) quizzes.push({ key: `${slug}_apps`,  label: `${label} — Appearances`, description: `Top 10 ${label} players by PL appearances`,  unit: 'apps',  answers: apps  })
    if (goals.length >= 10) quizzes.push({ key: `${slug}_goals`, label: `${label} — Goals`,       description: `Top 10 ${label} PL goalscorers`,              unit: 'goals', answers: goals })
  }

  // ── By club ───────────────────────────────────────────────────────────────
  const CLUBS: { name: string; short: string }[] = [
    { name: 'Arsenal',               short: 'Arsenal'      },
    { name: 'Chelsea',               short: 'Chelsea'      },
    { name: 'Liverpool',             short: 'Liverpool'    },
    { name: 'Manchester City',       short: 'Man City'     },
    { name: 'Manchester United',     short: 'Man Utd'      },
    { name: 'Tottenham Hotspur',     short: 'Spurs'        },
    { name: 'Everton',               short: 'Everton'      },
    { name: 'Aston Villa',           short: 'Aston Villa'  },
    { name: 'Newcastle United',      short: 'Newcastle'    },
    { name: 'West Ham United',       short: 'West Ham'     },
    { name: 'Leicester City',        short: 'Leicester'    },
    { name: 'Blackburn Rovers',      short: 'Blackburn'    },
    { name: 'Leeds United',          short: 'Leeds'        },
    { name: 'Southampton',           short: 'Southampton'  },
    { name: 'Middlesbrough',         short: 'Middlesbrough'},
  ]

  for (const { name, short } of CLUBS) {
    const apps  = top10(all.map(p => ({ p, v: p.clubGames[name] || 0 })))
    const goals = top10(all.map(p => ({ p, v: p.clubGoals[name] || 0 })))
    const slug  = name.toLowerCase().replace(/[^a-z]/g, '_')
    if (apps.length  >= 10) quizzes.push({ key: `${slug}_apps`,  label: `${short} — Appearances`, description: `Top 10 players by PL appearances for ${name}`, unit: 'apps',  answers: apps  })
    if (goals.length >= 10) quizzes.push({ key: `${slug}_goals`, label: `${short} — Goals`,       description: `Top 10 PL goalscorers for ${name}`,           unit: 'goals', answers: goals })
  }

  const allPlayers = [...new Set(all.map(p => p.name))]

  const data = { quizzes, allPlayers, players }
  cache = { data, time: Date.now() }
  return data
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const isCustom  = searchParams.get('custom') === '1'
  const customStat = searchParams.get('stat')  || 'apps'
  const customClub = searchParams.get('club')  || ''
  const customNat  = searchParams.get('nat')   || ''

  try {
    const { quizzes, allPlayers, players } = await buildData()

    if (isCustom) {
      const all = Object.values(players as Record<string, PlayerAgg>)
      let pool = customNat ? all.filter(p => mostCommon(p.natFreq) === customNat) : all

      const clubStats = ['apps', 'goals', 'assists']
      const useClub   = customClub && clubStats.includes(customStat)

      let answers: Answer[]
      if (useClub) {
        answers = top10(pool.map(p => ({
          p,
          v: customStat === 'goals'   ? (p.clubGoals[customClub] || 0)
           : customStat === 'assists' ? (p.clubAssists[customClub] || 0)
           :                            (p.clubGames[customClub] || 0),
        })))
      } else {
        answers = top10(pool.map(p => {
          let v: number
          if      (customStat === 'goals')        v = p.goals
          else if (customStat === 'assists')       v = p.assists
          else if (customStat === 'clean_sheets')  v = p.cleanSheets
          else if (customStat === 'yellow_cards')  v = p.yellowCards
          else if (customStat === 'goals_p90')     v = (p.goals >= 5 && p.games > 0) ? p.goals / p.games : 0
          else                                     v = p.games
          return { p, v }
        }), 0, customStat === 'goals_p90' ? fmtP90 : undefined)
      }

      const statLabel = customStat === 'goals' ? 'Goals' : customStat === 'assists' ? 'Assists'
        : customStat === 'clean_sheets' ? 'Clean Sheets' : customStat === 'yellow_cards' ? 'Yellow Cards'
        : customStat === 'goals_p90' ? 'Goals per 90' : 'Appearances'
      const unit = customStat === 'goals' ? 'goals' : customStat === 'assists' ? 'assists'
        : customStat === 'clean_sheets' ? 'clean sheets' : customStat === 'yellow_cards' ? 'yellow cards'
        : customStat === 'goals_p90' ? 'per 90' : 'apps'
      const parts     = ['Custom']
      if (customNat)  parts.push(customNat)
      if (customClub) parts.push(customClub)
      parts.push(statLabel)

      return NextResponse.json({
        custom: { key: 'custom', label: parts.join(' — '), description: 'Custom quiz', unit, answers },
        _allPlayers: allPlayers,
      })
    }

    return NextResponse.json({ quizzes, _allPlayers: allPlayers })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

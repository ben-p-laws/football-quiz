// Shared types and helpers used by FootballGolf component and golf-simulate API

export type ClubType = 'driver' | 'iron' | 'wedge' | 'putter'

export type CompScope = 'league' | 'cl' | 'both'

export type FilterKind = 'nat' | 'club' | 'cc' | 'cont' | 'all' | 'letter' | 'comp' | 'club_euro'

export type FilterSpec =
  | { k: 'all' }
  | { k: 'nat'; code: string; label?: string }
  | { k: 'club'; name: string }
  | { k: 'cont'; name: string }
  | { k: 'cc'; continent: string; club: string }
  | { k: 'letter'; letter: string }
  | { k: 'comp'; comp: string }
  | { k: 'club_euro'; name: string; scope: CompScope; comp: string }

export const CLUB_THRESHOLD: Record<ClubType, number> = { driver: 250, iron: 150, wedge: 50, putter: 10 }

export function cacheKeyFor(stat: string, f: FilterSpec): string {
  if (f.k === 'all')       return `${stat}::`
  if (f.k === 'nat')       return `${stat}:${f.code}:`
  if (f.k === 'club')      return `${stat}::${f.name}`
  if (f.k === 'cont')      return `${stat}:cont:${f.name}`
  if (f.k === 'letter')    return `${stat}:letter:${f.letter}`
  if (f.k === 'comp')      return `${stat}::comp:${f.comp}`
  if (f.k === 'club_euro') return `${stat}::${f.name}:${f.scope}`
  return `${stat}:cont:${f.continent}:${f.club}`
}

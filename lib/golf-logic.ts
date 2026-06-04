// Shared types and helpers used by FootballGolf component and golf-simulate API

export type ClubType = 'driver' | 'iron' | 'wedge' | 'putter'

export type FilterKind = 'nat' | 'club' | 'cc' | 'cont' | 'all'

export type FilterSpec =
  | { k: 'all' }
  | { k: 'nat'; code: string; label?: string }
  | { k: 'club'; name: string }
  | { k: 'cont'; name: string }
  | { k: 'cc'; continent: string; club: string }

export const CLUB_THRESHOLD: Record<ClubType, number> = { driver: 250, iron: 150, wedge: 50, putter: 10 }

export function cacheKeyFor(stat: string, f: FilterSpec): string {
  if (f.k === 'all')  return `${stat}::`
  if (f.k === 'nat')  return `${stat}:${f.code}:`
  if (f.k === 'club') return `${stat}::${f.name}`
  if (f.k === 'cont') return `${stat}:cont:${f.name}`
  return `${stat}:cont:${f.continent}:${f.club}`
}

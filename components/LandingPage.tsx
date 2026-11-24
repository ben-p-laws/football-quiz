'use client'

import { useRouter } from 'next/navigation'
import s from './LandingPage.module.css'

const GAMES = [
  { name: 'Minimise',                    desc: 'Assign each player to their best Premier League stat',    route: '/minimise' },
  { name: 'Around the World in 80 Goals',desc: 'Navigate the world map using your football knowledge',    route: '/around-the-world' },
  { name: 'Perfect 10',                  desc: 'Draft the perfect player — one stat per round',           route: '/perfect10' },
  { name: 'Stat Clash',                  desc: 'Find the player closest to a Premier League stat target', route: '/stat-clash' },
  { name: 'FPL Draft',                   desc: 'Draft the ultimate FPL XI, one player per round',         route: '/fpl-draft' },
  { name: 'Casino',                      desc: 'Use football trivia to build your stack',                  route: '/blackjack' },
  { name: 'Footy Countdown',             desc: 'Letters, numbers and conundrum — seven rounds',           route: '/countdown' },
  { name: 'Grid',                        desc: 'Find a Premier League player for each row and column',    route: '/grid' },
  { name: 'Teammates',                   desc: 'Find the player from their Premier League teammates',     route: '/teammates' },
  { name: 'Tenable',                     desc: 'Build your own top 10 quiz',                              route: '/tenables' },
  { name: 'Bingo',                       desc: 'Fill the football achievement grid',                      route: '/bingo' },
  { name: 'Population Circle',           desc: 'Estimate the population inside the circle on the map',   route: '/geo/circle',     geo: true },
  { name: 'Population Challenge',        desc: 'Find the city closest in population to the target',      route: '/geo/challenge',  geo: true },
  { name: 'Population Guesser',          desc: 'Find the mystery city using population clues',           route: '/geo/population', geo: true },
] as const

export default function LandingPage() {
  const router = useRouter()

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div className={s.lp}>

        {/* ── Wordmark ──────────────────────────────────────────── */}
        <div className={s.wordmark}>
          Top<em>Bins</em>
        </div>

        {/* ── Featured game ─────────────────────────────────────── */}
        <section className={s.feat}>
          <div className={s.featPill}><span className={s.featDot}></span>Trending game</div>
          <div className={s.featName}>Football Golf</div>
          <p className={s.featDesc}>Golf, played with football stats. Pick up to three players per shot, challenge your friends.</p>
          <button className={s.btnPlay} onClick={() => router.push('/football-golf')}>
            Play Football Golf →
          </button>
        </section>

        {/* ── All games ─────────────────────────────────────────── */}
        <div className={s.secRow}>
          <span className={s.secLabel}>All games</span>
          <span className={s.secMeta}>{GAMES.length + 1} games</span>
        </div>

        {GAMES.map(game => (
          <div key={game.route} className={s.gameRow} role="button" tabIndex={0}
            onClick={() => router.push(game.route)}
            onKeyDown={e => { if (e.key === 'Enter') router.push(game.route) }}>
            <div className={s.gameBody}>
              <div className={s.gameNameRow}>
                <span className={s.gameName}>{game.name}</span>
                {'geo' in game && <span className={s.chipGeo}>GEO</span>}
              </div>
              <div className={s.gameDesc}>{game.desc}</div>
            </div>
            <span className={s.gameArrow}>›</span>
          </div>
        ))}

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer>
          <div className={s.footer}>
            <span className={s.footerWord}>TopBins</span>
            <nav className={s.footerLinks} aria-label="Footer navigation">
              <a href="/football-golf">Football Golf</a>
              <a href="/around-the-world">Around the World</a>
              <a href="/geo/circle">Population Circle</a>
            </nav>
          </div>
        </footer>

      </div>
    </>
  )
}

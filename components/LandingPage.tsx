'use client'

import { useRouter } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'
import s from './LandingPage.module.css'

type Game = { name: string; desc: string; route: string; hue: number; icon: ReactNode; tag?: string }

// 24×24 line icons, drawn with currentColor
const I = {
  minimise: <><path d="M4 5h16M7 10h10M10 15h4"/><path d="M12 18v3m-2-2 2 2 2-2"/></>,
  globe: <><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z"/></>,
  ten: <><path d="M12 2.8 20.2 7v10L12 21.2 3.8 17V7z"/><path d="M8.6 9.4 10 8.5v7M13.8 8.5h1.4a1.4 1.4 0 0 1 1.4 1.4v4.2a1.4 1.4 0 0 1-1.4 1.4h-1.4a1.4 1.4 0 0 1-1.4-1.4V9.9a1.4 1.4 0 0 1 1.4-1.4z"/></>,
  clash: <><path d="m5 4 6 6M4 9l5-5M19 4l-6 6M20 9l-5-5"/><path d="M12 13v8M8.5 17.5h7"/></>,
  shirt: <><path d="M8.5 3.5 4 6l1.5 4L8 9v11.5h8V9l2.5 1L20 6l-4.5-2.5c-.6 1.4-1.9 2.3-3.5 2.3S9.1 4.9 8.5 3.5z"/></>,
  cards: <><rect x="4" y="6" width="10" height="14" rx="1.6" transform="rotate(-8 9 13)"/><rect x="10" y="4" width="10" height="14" rx="1.6" transform="rotate(8 15 11)"/><path d="m15 8.5-1.6 2.3 1.6 2.3 1.6-2.3z"/></>,
  clock: <><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.8h5M12 2.8v2.7"/></>,
  grid: <><rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/></>,
  team: <><circle cx="8.5" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 19.5c.5-3.2 2.6-5 5.5-5s5 1.8 5.5 5M14 14.6c.6-.2 1.3-.3 2-.3 2.5 0 4.2 1.6 4.6 4.6"/></>,
  ladder: <><path d="M4 5h3M4 12h3M4 19h3"/><path d="M10 5h10M10 12h7M10 19h4"/></>,
  bingo: <><rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="12" cy="16" r="1.6"/><path d="M12 3.5v17M3.5 12h17" opacity=".45"/></>,
  circle: <><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2.3"/><circle cx="12" cy="11" r="10" strokeDasharray="2 3" opacity=".5"/></>,
  city: <><path d="M3 20.5h18M5 20.5V10l4-2v12.5M9 20.5V5h6v15.5M15 20.5V9h4v11.5"/><path d="M11.3 8.5h1.4M11.3 12h1.4M11.3 15.5h1.4"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 10.5h5M10.5 8v5"/></>,
}

const SECTIONS: { title: string; blurb: string; games: Game[] }[] = [
  {
    title: 'Premier League brain-teasers',
    blurb: 'Stats, squads and stories since 1992',
    games: [
      { name: 'Grid',       desc: 'Find a Premier League player for each row and column', route: '/grid',       hue: 145, icon: I.grid,     tag: 'Daily' },
      { name: 'Minimise',   desc: 'Assign each player to their best Premier League stat', route: '/minimise',   hue: 200, icon: I.minimise },
      { name: 'Stat Clash', desc: 'Find the player closest to a Premier League stat target', route: '/stat-clash', hue: 25, icon: I.clash },
      { name: 'Teammates',  desc: 'Find the player from their Premier League teammates',  route: '/teammates',  hue: 265, icon: I.team },
      { name: 'Tenable',    desc: 'Build your own top 10 quiz',                           route: '/tenables',   hue: 330, icon: I.ladder },
      { name: 'Bingo',      desc: 'Fill the football achievement grid',                   route: '/bingo',      hue: 95,  icon: I.bingo },
    ],
  },
  {
    title: 'Draft & build',
    blurb: 'Pick smart, one round at a time',
    games: [
      { name: 'Perfect 10', desc: 'Draft the perfect player — one stat per round',   route: '/perfect10', hue: 55,  icon: I.ten },
      { name: 'FPL Draft',  desc: 'Draft the ultimate FPL XI, one player per round', route: '/fpl-draft', hue: 160, icon: I.shirt },
    ],
  },
  {
    title: 'Arcade',
    blurb: 'Quick-fire games with a twist',
    games: [
      { name: 'Around the World in 80 Goals', desc: 'Navigate the world map using your football knowledge', route: '/around-the-world', hue: 220, icon: I.globe },
      { name: 'Casino',          desc: 'Use football trivia to build your stack',       route: '/blackjack', hue: 0,   icon: I.cards },
      { name: 'Footy Countdown', desc: 'Letters, numbers and conundrum — seven rounds', route: '/countdown', hue: 285, icon: I.clock },
    ],
  },
  {
    title: 'Geography',
    blurb: 'Not football — just as addictive',
    games: [
      { name: 'Population Circle',    desc: 'Estimate the population inside the circle on the map', route: '/geo/circle',     hue: 190, icon: I.circle },
      { name: 'Population Challenge', desc: 'Find the city closest in population to the target',    route: '/geo/challenge',  hue: 235, icon: I.city },
      { name: 'Population Guesser',   desc: 'Find the mystery city using population clues',         route: '/geo/population', hue: 175, icon: I.search },
    ],
  },
]

const TOTAL = SECTIONS.reduce((n, sec) => n + sec.games.length, 1)

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const go = (route: string) => router.push(route)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div className={s.lp}>

        {/* ── Wordmark ──────────────────────────────────────────── */}
        <header className={s.top}>
          <div className={s.wordmark}>Top<em>Bins</em></div>
          <span className={s.topMeta}>{TOTAL} free games</span>
        </header>

        {/* ── Featured game ─────────────────────────────────────── */}
        <section className={s.feat} onClick={() => go('/football-golf')}>
          <div className={s.featArt} aria-hidden="true">
            <img src="/holes/augusta/hole_12.png?v=21" alt="" className={s.featHole} />
          </div>
          <div className={s.featBody}>
            <div className={s.featPill}><span className={s.featDot}></span>Trending game</div>
            <h1 className={s.featName}>Football<br />Golf</h1>
            <p className={s.featDesc}>Golf, played with football stats. Pick up to three players per shot, challenge your friends.</p>
            <div className={s.courses}>
              {[['augusta', 'Augusta'], ['pebble-beach', 'Pebble Beach'], ['wii-golf', 'Wii Golf']].map(([slug, label]) => (
                <span key={slug} className={s.course}>
                  <img src={`/course-logos/${slug}.png`} alt="" />{label}
                </span>
              ))}
            </div>
            <button className={s.btnPlay} onClick={e => { e.stopPropagation(); go('/football-golf') }}>
              Tee off →
            </button>
          </div>

          {/* Desktop-only gameplay preview (real numbers from player_seasons) */}
          <div className={s.preview} aria-hidden="true">
            <div className={s.pvHole}>Hole 12 · Par 3 · 155 yds</div>
            <div className={s.pvQ}>Premier League goals by Spanish players</div>
            {[['Fernando Torres', 85], ['David Silva', 60]].map(([n, g]) => (
              <div key={n} className={s.pvPick}><span>{n}</span><b>{g}</b></div>
            ))}
            <div className={s.pvPick + ' ' + s.pvEmpty}><span>Player 3 (optional)</span></div>
            <div className={s.pvResult}>
              <span className={s.pvBar}><i style={{ width: '94%' }} /></span>
              <span>145 yds · <em>on the green</em> ⛳</span>
            </div>
          </div>
        </section>

        {/* ── Game sections ─────────────────────────────────────── */}
        {SECTIONS.map(sec => (
          <section key={sec.title} className={s.section}>
            <div className={s.secHead}>
              <h2 className={s.secTitle}>{sec.title}</h2>
              <span className={s.secBlurb}>{sec.blurb}</span>
            </div>
            <div className={s.cards}>
              {sec.games.map(game => (
                <div key={game.route} className={s.card} role="button" tabIndex={0}
                  style={{ '--h': game.hue } as CSSProperties}
                  onClick={() => go(game.route)}
                  onKeyDown={e => { if (e.key === 'Enter') go(game.route) }}>
                  <span className={s.tile}><Icon>{game.icon}</Icon></span>
                  <div className={s.cardBody}>
                    <div className={s.cardNameRow}>
                      <span className={s.cardName}>{game.name}</span>
                      {game.tag && <span className={s.tag}>{game.tag}</span>}
                    </div>
                    <div className={s.cardDesc}>{game.desc}</div>
                  </div>
                  <span className={s.arrow}>›</span>
                </div>
              ))}
            </div>
          </section>
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

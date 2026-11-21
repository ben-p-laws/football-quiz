'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import NavBar from './NavBar'
import s from './LandingPage.module.css'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ComposableMap, Geographies, Geography } = require('react-simple-maps')

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const ATW_COMPLETED = new Set(['620', '724'])
const ATW_CURRENT   = '250'
const ATW_UPCOMING  = new Set(['276', '616'])

export default function LandingPage() {
  const router  = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      <NavBar />

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Chivo:wght@400;700;900&display=swap');`}</style>

      <div className={s.lp}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className={s.hero}>
          <h1>Know your football?</h1>
          <p className={s.lead}>Eight daily quiz games to settle it.</p>
          <button className={s.btnEmber} onClick={() => router.push('/football-golf')}>
            Play today
          </button>
        </section>

        {/* ── Featured games ───────────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.sectionHead}>Featured</h2>
          <div className={s.featured}>

            {/* Football Golf */}
            <div className={s.gameCard} role="button" tabIndex={0}
              onClick={() => router.push('/football-golf')}
              onKeyDown={e => { if (e.key === 'Enter') router.push('/football-golf') }}>
              <div className={s.cardHead}>
                <div className={s.cardTitle}>Football Golf</div>
                <div className={s.cardDesc}>Pick up to 3 players based on the stat</div>
              </div>
              <div className={s.cardPreview}>
                <img src="/screenshots/screen-football-golf-gameplay.png?v=2" alt="Football Golf gameplay" className={s.cardImg} />
              </div>
              <div className={s.cardCta}>Play Football Golf</div>
            </div>

            {/* Minimise */}
            <div className={s.gameCard} role="button" tabIndex={0}
              onClick={() => router.push('/minimise')}
              onKeyDown={e => { if (e.key === 'Enter') router.push('/minimise') }}>
              <div className={s.cardHead}>
                <div className={s.cardTitle}>Minimise</div>
                <div className={s.cardDesc}>Assign each player to their best PL stat category</div>
              </div>
              <div className={s.cardPreview}>
                <div className={s.catGrid}>
                  <div className={`${s.cat} ${s.catEmpty}`}>
                    <div className={s.catLabel}>Most Goals</div>
                  </div>
                  <div className={`${s.cat} ${s.catAcid}`}>
                    <div className={s.catLabel}>Most Assists</div>
                    <div className={s.catPlayer}>Fàbregas</div>
                  </div>
                  <div className={`${s.cat} ${s.catAcid}`}>
                    <div className={s.catLabel}>Appearances</div>
                    <div className={s.catPlayer}>Milner</div>
                  </div>
                  <div className={`${s.cat} ${s.catEmpty}`}>
                    <div className={s.catLabel}>Pens Scored</div>
                  </div>
                  <div className={`${s.cat} ${s.catEmpty}`}>
                    <div className={s.catLabel}>Oldest Player</div>
                  </div>
                  <div className={`${s.cat} ${s.catEmber}`}>
                    <div className={s.catLabel}>Yellow Cards</div>
                    <div className={s.catPlayer}>Cattermole</div>
                  </div>
                </div>
              </div>
              <div className={s.cardCta}>Play Minimise</div>
            </div>

            {/* Around the World */}
            <div className={s.gameCard} role="button" tabIndex={0}
              onClick={() => router.push('/around-the-world')}
              onKeyDown={e => { if (e.key === 'Enter') router.push('/around-the-world') }}>
              <div className={s.cardHead}>
                <div className={s.cardTitle}>Around the World in 80 Goals</div>
                <div className={s.cardDesc}>Navigate the world map using your football knowledge</div>
              </div>
              <div className={s.cardPreview}>
                <div className={s.mapWell} aria-hidden="true">
                  {mounted && (
                    <ComposableMap
                      projectionConfig={{ scale: 1400, center: [6, 46] }}
                      style={{ width: '100%', height: '100%', display: 'block' }}
                    >
                      <Geographies geography={GEO_URL}>
                        {({ geographies }: { geographies: any[] }) =>
                          geographies.map((geo: any) => {
                            const n = String(Number(geo.id))
                            const fill   = ATW_COMPLETED.has(n) ? 'rgba(136,220,100,0.32)'
                                         : n === ATW_CURRENT    ? 'rgba(245,158,11,0.30)'
                                         : ATW_UPCOMING.has(n)  ? 'rgba(59,130,246,0.22)'
                                         : '#1a2d45'
                            const stroke = ATW_COMPLETED.has(n) ? '#5fba40'
                                         : n === ATW_CURRENT    ? '#f59e0b'
                                         : ATW_UPCOMING.has(n)  ? '#5b8fd4'
                                         : '#2e4a6a'
                            return (
                              <Geography key={geo.rsmKey} geography={geo}
                                tabIndex={-1}
                                fill={fill} stroke={stroke} strokeWidth={0.5}
                                style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                              />
                            )
                          })
                        }
                      </Geographies>
                    </ComposableMap>
                  )}
                </div>
              </div>
              <div className={s.cardCta}>Play Around the World</div>
            </div>

          </div>
        </section>

        <hr className={s.rule} />

        {/* ── More games ───────────────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.sectionHead}>More games</h2>
          <div className={s.more}>
            {[
              { name: 'Bingo',           desc: 'Fill the achievement grid',                   route: '/bingo' },
              { name: 'Stat Clash',      desc: 'Find the player closest to a PL stat target', route: '/stat-clash' },
              { name: 'Casino',          desc: 'Use football trivia to build your stack',      route: '/blackjack' },
              { name: 'Footy Countdown', desc: 'Letters, numbers and conundrum — 7 rounds',   route: '/countdown' },
              { name: 'Grid',            desc: 'Find a PL player for each row and column',    route: '/grid' },
              { name: 'Teammates',       desc: 'Find the player from their PL teammates',     route: '/teammates' },
              { name: 'Tenable',         desc: 'Build your own top 10 quiz',                  route: '/tenables' },
            ].map(game => (
              <div key={game.route} className={s.gameSm} role="button" tabIndex={0}
                onClick={() => router.push(game.route)}
                onKeyDown={e => { if (e.key === 'Enter') router.push(game.route) }}>
                <div className={s.gameSmBody}>
                  <div className={s.gameSmTitle}>{game.name}</div>
                  <div className={s.gameSmDesc}>{game.desc}</div>
                </div>
                <div className={s.gameSmCta}>Play {game.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
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

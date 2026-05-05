'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavBar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    router.prefetch('/')
    router.prefetch('/bingo')
    router.prefetch('/tenables')
    router.prefetch('/stat-clash')
    router.prefetch('/minimise')
    router.prefetch('/countdown')
    router.prefetch('/teammates')
    router.prefetch('/grid')
  }, [router])

  const links = [
    { label: 'Games',      href: '/' },
    { label: 'Bingo',      href: '/bingo' },
    { label: 'Tenable',    href: '/tenables' },
    { label: 'Stat Clash', href: '/stat-clash' },
    { label: 'Minimise',   href: '/minimise' },
    { label: 'Countdown',  href: '/countdown' },
    { label: 'Teammates',  href: '/teammates' },
    { label: 'Grid',       href: '/grid' },
  ]

  function navigate(href: string) {
    setMenuOpen(false)
    router.push(href)
  }

  return (
    <nav style={{ background: '#0a0f1e', borderBottom: '1px solid #1e2d4a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 100 }}>
      <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        {/* Top-corner goal logo */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="7" fill="#0a0f1e"/>
          {/* Crossbar flush across top */}
          <rect x="0" y="0" width="28" height="4" fill="#e2e8f0"/>
          {/* Right upright starts below crossbar — flush at corner */}
          <rect x="24" y="4" width="4" height="28" fill="#e2e8f0"/>
          {/* Net verticals */}
          <line x1="4"  y1="4" x2="2"  y2="32" stroke="#334155" strokeWidth="0.8"/>
          <line x1="9"  y1="4" x2="7"  y2="32" stroke="#334155" strokeWidth="0.8"/>
          <line x1="14" y1="4" x2="12" y2="32" stroke="#334155" strokeWidth="0.8"/>
          <line x1="19" y1="4" x2="17" y2="32" stroke="#334155" strokeWidth="0.8"/>
          {/* Net horizontals */}
          <line x1="0" y1="9"  x2="24" y2="9"  stroke="#334155" strokeWidth="0.8"/>
          <line x1="0" y1="14" x2="24" y2="14" stroke="#334155" strokeWidth="0.8"/>
          <line x1="0" y1="19" x2="24" y2="19" stroke="#334155" strokeWidth="0.8"/>
          <line x1="0" y1="24" x2="24" y2="24" stroke="#334155" strokeWidth="0.8"/>
          {/* Ball */}
          <circle cx="17" cy="15" r="6.2" fill="white"/>
          {/* Red glow */}
          <circle cx="17" cy="15" r="7.2" fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.5"/>
          {/* Champions League-style stars — 3 large, clipped to ball */}
          <defs>
            <clipPath id="ball-clip">
              <circle cx="17" cy="15" r="6.1"/>
            </clipPath>
            <path id="cl-star" d="M0,-4 L0.95,-1.31 L3.8,-1.24 L1.53,0.5 L2.35,3.24 L0,1.6 L-2.35,3.24 L-1.53,0.5 L-3.8,-1.24 L-0.95,-1.31 Z" fill="#dc2626"/>
          </defs>
          <g clipPath="url(#ball-clip)">
            <use href="#cl-star" transform="translate(16.5,12.5)"/>
            <use href="#cl-star" transform="translate(13,17.5)"/>
            <use href="#cl-star" transform="translate(21,17.5)"/>
          </g>
        </svg>
        <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
          Top<span style={{ color: '#dc2626' }}>Bins</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: '24px' }} className="desktop-nav">
        {links.map(({ label, href }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <span key={label} onClick={() => navigate(href)}
              style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: active ? 'white' : '#8899bb', borderBottom: active ? '2px solid #dc2626' : '2px solid transparent', paddingBottom: '2px' }}>
              {label}
            </span>
          )
        })}
      </div>

      <button
        onClick={() => setMenuOpen(v => !v)}
        className="mobile-menu-btn"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'none', flexDirection: 'column', gap: 5 }}
      >
        <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#dc2626' : 'white', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
        <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'transparent' : 'white', transition: 'all 0.2s' }} />
        <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#dc2626' : 'white', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
      </button>

      {menuOpen && (
        <div className="mobile-dropdown" style={{ position: 'absolute', top: 56, left: 0, right: 0, background: '#111827', borderBottom: '1px solid #1e2d4a', zIndex: 200 }}>
          {links.map(({ label, href }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <div key={label} onClick={() => navigate(href)}
                style={{ padding: '14px 24px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', color: active ? 'white' : '#8899bb', borderLeft: active ? '3px solid #dc2626' : '3px solid transparent', borderBottom: '1px solid #1e2d4a' }}>
                {label}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 500px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}

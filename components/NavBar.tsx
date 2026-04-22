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
  }, [router])

  const links = [
    { label: 'Games',      href: '/' },
    { label: 'Bingo',      href: '/bingo' },
    { label: 'Tenable',    href: '/tenables' },
    { label: 'Stat Clash', href: '/stat-clash' },
    { label: 'Minimise',   href: '/minimise' },
  ]

  function navigate(href: string) {
    setMenuOpen(false)
    router.push(href)
  }

  return (
    <nav style={{ background: '#0a0f1e', borderBottom: '1px solid #1e2d4a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 100 }}>
      <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        {/* Top-corner goal logo: zoomed into the top-right corner of a goal with a ball hitting the net */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Sky/background */}
          <rect width="32" height="32" rx="7" fill="#0a0f1e"/>
          {/* Goal post - right upright (just the left edge visible, post runs full height on right) */}
          <rect x="24" y="0" width="4" height="32" fill="#e2e8f0"/>
          {/* Goal crossbar - runs across the top */}
          <rect x="0" y="4" width="28" height="4" fill="#e2e8f0"/>
          {/* Net lines - vertical */}
          <line x1="6"  y1="8" x2="4"  y2="32" stroke="#334155" strokeWidth="0.8"/>
          <line x1="11" y1="8" x2="9"  y2="32" stroke="#334155" strokeWidth="0.8"/>
          <line x1="16" y1="8" x2="14" y2="32" stroke="#334155" strokeWidth="0.8"/>
          <line x1="21" y1="8" x2="19" y2="32" stroke="#334155" strokeWidth="0.8"/>
          {/* Net lines - horizontal */}
          <line x1="0" y1="13" x2="24" y2="13" stroke="#334155" strokeWidth="0.8"/>
          <line x1="0" y1="18" x2="24" y2="18" stroke="#334155" strokeWidth="0.8"/>
          <line x1="0" y1="23" x2="24" y2="23" stroke="#334155" strokeWidth="0.8"/>
          <line x1="0" y1="28" x2="24" y2="28" stroke="#334155" strokeWidth="0.8"/>
          {/* Ball - nestled in top-right corner of the net */}
          <circle cx="17" cy="15" r="6" fill="white"/>
          {/* Ball pentagon patches */}
          <path d="M17 10 L19.5 12 L18.5 15 L15.5 15 L14.5 12 Z" fill="#1e293b"/>
          <path d="M22.5 13 L20.5 11.5 L21 14.5 Z" fill="#1e293b"/>
          <path d="M22.8 16.5 L20.5 15.5 L21 18 Z" fill="#1e293b"/>
          <path d="M13 17.5 L14.5 15.5 L12 15 Z" fill="#1e293b"/>
          <path d="M14 11 L12.5 13 L14 15 Z" fill="#1e293b"/>
          {/* Red glow/flash behind ball to show it's just hit the net */}
          <circle cx="17" cy="15" r="7" fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.6"/>
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
              style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: active ? 'white' : '#8899bb', borderBottom: active ? '2px solid #f97316' : '2px solid transparent', paddingBottom: '2px' }}>
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
        <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#f97316' : 'white', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
        <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'transparent' : 'white', transition: 'all 0.2s' }} />
        <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#f97316' : 'white', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
      </button>

      {menuOpen && (
        <div className="mobile-dropdown" style={{ position: 'absolute', top: 56, left: 0, right: 0, background: '#111827', borderBottom: '1px solid #1e2d4a', zIndex: 200 }}>
          {links.map(({ label, href }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <div key={label} onClick={() => navigate(href)}
                style={{ padding: '14px 24px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', color: active ? 'white' : '#8899bb', borderLeft: active ? '3px solid #f97316' : '3px solid transparent', borderBottom: '1px solid #1e2d4a' }}>
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

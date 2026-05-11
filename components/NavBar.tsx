'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const LINKS = [
  { label: 'Games',                href: '/' },
  { label: 'Bingo',                href: '/bingo' },
  { label: 'Tenable',              href: '/tenables' },
  { label: 'Stat Clash',           href: '/stat-clash' },
  { label: 'Minimise',             href: '/minimise' },
  { label: 'Countdown',            href: '/countdown' },
  { label: 'Teammates',            href: '/teammates' },
  { label: 'Grid',                 href: '/grid' },
  { label: 'Football Golf',        href: '/football-golf' },
  { label: 'Around the World',     href: '/around-the-world' },
]

const LOGO = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="#0a0f1e"/>
    <rect x="0" y="0" width="28" height="4" fill="#e2e8f0"/>
    <rect x="24" y="4" width="4" height="28" fill="#e2e8f0"/>
    <line x1="4"  y1="4" x2="2"  y2="32" stroke="#334155" strokeWidth="0.8"/>
    <line x1="9"  y1="4" x2="7"  y2="32" stroke="#334155" strokeWidth="0.8"/>
    <line x1="14" y1="4" x2="12" y2="32" stroke="#334155" strokeWidth="0.8"/>
    <line x1="19" y1="4" x2="17" y2="32" stroke="#334155" strokeWidth="0.8"/>
    <line x1="0" y1="9"  x2="24" y2="9"  stroke="#334155" strokeWidth="0.8"/>
    <line x1="0" y1="14" x2="24" y2="14" stroke="#334155" strokeWidth="0.8"/>
    <line x1="0" y1="19" x2="24" y2="19" stroke="#334155" strokeWidth="0.8"/>
    <line x1="0" y1="24" x2="24" y2="24" stroke="#334155" strokeWidth="0.8"/>
    <circle cx="17" cy="15" r="6.2" fill="white"/>
    <circle cx="17" cy="15" r="7.2" fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.5"/>
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
)

export default function NavBar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    LINKS.forEach(({ href }) => router.prefetch(href))
  }, [router])

  function navigate(href: string) {
    setMenuOpen(false)
    router.push(href)
  }

  const active = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <>
      {/* ── Top bar ── */}
      <nav style={{ background: '#0a0f1e', borderBottom: '1px solid #1e2d4a', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 100 }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          {LOGO}
          <span style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
            Top<span style={{ color: '#dc2626' }}>Bins</span>
          </span>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="tb-burger"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexDirection: 'column', gap: 5 }}
        >
          <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#dc2626' : 'white', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'transparent' : 'white', transition: 'all 0.2s' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#dc2626' : 'white', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={{ position: 'absolute', top: 56, left: 0, right: 0, background: '#111827', borderBottom: '1px solid #1e2d4a', zIndex: 200 }}>
            {LINKS.map(({ label, href }) => (
              <div key={href} onClick={() => navigate(href)}
                style={{ padding: '14px 24px', fontSize: 15, fontWeight: 500, cursor: 'pointer', color: active(href) ? 'white' : '#8899bb', borderLeft: active(href) ? '3px solid #dc2626' : '3px solid transparent', borderBottom: '1px solid #1e2d4a' }}>
                {label}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── Desktop sidebar ── */}
      <aside className="tb-sidebar" style={{ position: 'fixed', top: 56, left: 0, width: 180, height: 'calc(100vh - 56px)', background: '#0a0f1e', borderRight: '1px solid #1e2d4a', overflowY: 'auto', zIndex: 90, paddingTop: 8 }}>
        {LINKS.map(({ label, href }) => (
          <div key={href} onClick={() => navigate(href)} className="tb-sidebar-link"
            style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: active(href) ? 700 : 400, color: active(href) ? 'white' : '#8899bb', borderLeft: `3px solid ${active(href) ? '#dc2626' : 'transparent'}`, background: active(href) ? 'rgba(220,38,38,0.06)' : 'transparent' }}>
            {label}
          </div>
        ))}
      </aside>

      <style>{`
        .tb-burger { display: none; }
        .tb-sidebar { display: block; }
        .tb-sidebar-link:hover { color: white !important; background: rgba(255,255,255,0.04) !important; }
        @media (max-width: 900px) {
          .tb-sidebar { display: none !important; }
          .tb-burger  { display: flex !important; }
        }
      `}</style>
    </>
  )
}

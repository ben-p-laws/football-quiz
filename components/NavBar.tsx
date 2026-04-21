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
      <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
          Top<span style={{ color: '#f97316' }}>Bins</span>
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

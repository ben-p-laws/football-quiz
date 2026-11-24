'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function NavBar() {
  const router   = useRouter()
  const pathname = usePathname()

  // Landing page has its own wordmark — nav chrome only earns its place inside a game
  if (pathname === '/') return null

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <nav style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        background: '#0a0f1e',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 20px',
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 0',
            fontFamily: "'Instrument Sans', ui-sans-serif, sans-serif",
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,.3)', fontWeight: 400, lineHeight: 1 }}>←</span>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em', color: 'white', lineHeight: 1 }}>
            Top<span style={{ color: '#f97316' }}>Bins</span>
          </span>
        </button>
      </nav>
    </>
  )
}

'use client'

import { useRouter, usePathname } from 'next/navigation'
import Wordmark from './Wordmark'

export default function NavBar() {
  const router   = useRouter()
  const pathname = usePathname()

  if (pathname === '/') return null

  return (
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
          gap: 8,
          padding: '8px 0',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Back to TopBins home"
      >
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,.3)', fontWeight: 400, lineHeight: 1 }}>←</span>
        <Wordmark size={20} />
      </button>
    </nav>
  )
}

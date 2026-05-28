import NavBar from '@/components/NavBar'
import Link from 'next/link'

export const metadata = { title: 'Casino – TopBins' }

const GAMES = [
  {
    label: 'Blackjack',
    icon: '🃏',
    href: '/blackjack/play',
    desc: 'Beat the dealer with football stats',
    live: true,
  },
  {
    label: 'Poker',
    icon: '♠️',
    href: null,
    desc: null,
    live: false,
  },
  {
    label: 'Roulette',
    icon: '🎡',
    href: '/blackjack/roulette',
    desc: 'Find players to match the wheel',
    live: true,
  },
  {
    label: 'Craps',
    icon: '🎲',
    href: null,
    desc: null,
    live: false,
  },
]

export default function CasinoLobbyPage() {
  return (
    <>
      <NavBar />
      <main style={{ minHeight: 'calc(100dvh - 56px)', background: '#0a0f1e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 12, color: '#f59e0b', letterSpacing: 4, fontWeight: 700, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
        <h1 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 6px', letterSpacing: -1 }}>
          Topbins <span style={{ color: '#f59e0b' }}>Casino</span>
        </h1>
        <p style={{ color: '#8899bb', margin: '0 0 36px', fontSize: 13 }}>Choose your game</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 480 }}>
          {GAMES.map(game => {
            const card = (
              <div style={{
                background: game.live ? 'linear-gradient(135deg,#111827,#1e2d4a)' : '#0d1424',
                border: `1px solid ${game.live ? '#1e3a5f' : '#3d5270'}`,
                borderRadius: 16,
                padding: '28px 20px',
                textAlign: 'center',
                opacity: game.live ? 1 : 0.65,
                cursor: game.live ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: game.live ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
                position: 'relative' as const,
                height: '100%',
                boxSizing: 'border-box' as const,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>{game.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{game.label}</div>
                {game.desc && <div style={{ fontSize: 11, color: '#8899bb', lineHeight: 1.4 }}>{game.desc}</div>}
                {!game.live && (
                  <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6b7fa3' }}>COMING SOON</div>
                )}
              </div>
            )

            return game.href ? (
              <Link key={game.label} href={game.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                className="casino-tile">
                {card}
              </Link>
            ) : (
              <div key={game.label} style={{ display: 'block' }}>{card}</div>
            )
          })}
        </div>

        <style>{`
          .casino-tile > div:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 32px rgba(245,158,11,0.2) !important;
            border-color: #f59e0b !important;
          }
        `}</style>
      </main>
    </>
  )
}

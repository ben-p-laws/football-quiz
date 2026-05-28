import NavBar from '@/components/NavBar'
import Roulette from '@/components/Roulette'

export const metadata = { title: 'Roulette – TopBins Casino' }

export default function RoulettePage() {
  return (
    <>
      <NavBar />
      <main style={{ minHeight: 'calc(100dvh - 56px)', background: '#0a0f1e' }}>
        <Roulette />
      </main>
    </>
  )
}

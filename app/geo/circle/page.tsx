import type { Metadata } from 'next'
import PopulationCircle from '@/components/geo/PopulationCircle'

export const metadata: Metadata = {
  title: 'Population Circle — TopBins',
  description: 'Estimate the population inside the circle. One daily puzzle, plus free play.',
  twitter: { card: 'summary_large_image' },
}

export default function CirclePage() {
  return <PopulationCircle />
}

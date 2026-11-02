import type { Metadata } from 'next'
import PopulationGuesser from '@/components/geo/PopulationGuesser'

export const metadata: Metadata = {
  title: 'Population Guesser — TopBins',
  description: 'Find the mystery city using population clues. Guess cities and use the rank feedback to narrow it down.',
  twitter: { card: 'summary_large_image' },
}

export default function PopulationPage() {
  return <PopulationGuesser />
}

import type { Metadata } from 'next'
import PopulationGuesser from '@/components/geo/PopulationGuesser'

export const metadata: Metadata = {
  title: 'Population Guesser — TopBins',
  description: 'Find the mystery city using population clues. Guess cities, track their rank, and narrow it down.',
  openGraph: {
    title: 'Population Guesser — TopBins',
    description: 'Find the mystery city using population clues. Guess cities, track their rank, and narrow it down.',
    url: 'https://www.topbinsfooty.com/geo/population',
    siteName: 'TopBins',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Population Guesser — TopBins',
    description: 'Find the mystery city using population clues. Guess cities, track their rank, and narrow it down.',
  },
}

export default function PopulationPage() {
  return <PopulationGuesser />
}

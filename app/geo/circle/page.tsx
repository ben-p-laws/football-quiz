import type { Metadata } from 'next'
import PopulationCircle from '@/components/geo/PopulationCircle'

export const metadata: Metadata = {
  title: 'Population Circle — TopBins',
  description: 'A daily geography puzzle. Estimate the population inside the circle on the map. One puzzle per day, plus free play.',
  openGraph: {
    title: 'Population Circle — TopBins',
    description: 'A daily geography puzzle. Estimate the population inside the circle on the map.',
    url: 'https://www.topbinsfooty.com/geo/circle',
    siteName: 'TopBins',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Population Circle — TopBins',
    description: 'A daily geography puzzle. Estimate the population inside the circle on the map.',
  },
}

export default function CirclePage() {
  return <PopulationCircle />
}

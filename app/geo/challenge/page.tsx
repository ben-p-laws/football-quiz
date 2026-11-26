import type { Metadata } from 'next'
import ChallengeMode from '@/components/geo/ChallengeMode'
import { OG_IMAGE } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Population Challenge — TopBins',
  description: '10 rounds, one guess each. Find the city closest in population to the target. Lowest total rank wins.',
  openGraph: {
    images: [OG_IMAGE],
    title: 'Population Challenge — TopBins',
    description: '10 rounds, one guess each. Find the city closest in population to the target. Lowest total rank wins.',
    url: 'https://www.topbinsfooty.com/geo/challenge',
    siteName: 'TopBins',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    images: [OG_IMAGE],
    card: 'summary_large_image',
    title: 'Population Challenge — TopBins',
    description: '10 rounds, one guess each. Find the city closest in population to the target. Lowest total rank wins.',
  },
}

export default function ChallengePage() {
  return <ChallengeMode />
}

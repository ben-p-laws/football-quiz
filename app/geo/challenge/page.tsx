import type { Metadata } from 'next'
import ChallengeMode from '@/components/geo/ChallengeMode'

export const metadata: Metadata = {
  title: 'Population Challenge — TopBins',
  description: '10 rounds, one guess each. Find the city closest in population to the target. Lowest total rank wins.',
  twitter: { card: 'summary_large_image' },
}

export default function ChallengePage() {
  return <ChallengeMode />
}

import type { Metadata } from 'next'
import FplDraftGame from '@/components/fpl-draft/FplDraftGame'
import { OG_IMAGE } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Ultimate FPL Draft | TopBins Footy',
  description: 'Draft the ultimate FPL XI, one player per round, formation rules apply. How high can you score?',
  openGraph: {
    images: [OG_IMAGE],
    title: 'Ultimate FPL Draft | TopBins Footy',
    description: 'Draft the ultimate FPL XI, one player per round, formation rules apply. How high can you score?',
  },
  twitter: {
    images: [OG_IMAGE],
    card: 'summary_large_image',
    title: 'Ultimate FPL Draft | TopBins Footy',
    description: 'Draft the ultimate FPL XI, one player per round, formation rules apply. How high can you score?',
  },
}

export default function Page() {
  return <FplDraftGame />
}

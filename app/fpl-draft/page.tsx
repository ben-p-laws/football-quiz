import type { Metadata } from 'next'
import FplDraftGame from '@/components/fpl-draft/FplDraftGame'

export const metadata: Metadata = {
  title: 'Ultimate FPL Draft | TopBins Footy',
  description: 'Draft the ultimate FPL XI, one player per round, formation rules apply. How high can you score?',
  openGraph: {
    title: 'Ultimate FPL Draft | TopBins Footy',
    description: 'Draft the ultimate FPL XI, one player per round, formation rules apply. How high can you score?',
    images: [{ url: '/api/fpl-draft-og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ultimate FPL Draft | TopBins Footy',
    description: 'Draft the ultimate FPL XI, one player per round, formation rules apply. How high can you score?',
    images: ['/api/fpl-draft-og'],
  },
}

export default function Page() {
  return <FplDraftGame />
}

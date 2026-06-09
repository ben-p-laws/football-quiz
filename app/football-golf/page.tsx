import FootballGolf from "@/components/FootballGolf"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Football Golf — Top Bins",
  openGraph: {
    title: "Football Golf — Top Bins",
    description: "Pick players to set the distance. Can you reach the pin in par?",
    images: [{ url: '/api/golf-og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/api/golf-og'],
  },
}

export default function Page() {
  return <FootballGolf />
}

import FootballGolf from "@/components/FootballGolf"
import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/og'

export const metadata: Metadata = {
  title: "Football Golf — Top Bins",
  openGraph: {
    images: [OG_IMAGE],
    title: "Football Golf — Top Bins",
    description: "Pick players to set the distance. Can you reach the pin in par?",
  },
  twitter: {
    images: [OG_IMAGE],
    card: 'summary_large_image',
  },
}

export default function Page() {
  return <FootballGolf />
}

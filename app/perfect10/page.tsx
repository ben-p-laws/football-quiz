import Perfect10 from "@/components/Perfect10"
import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/og'

export const metadata: Metadata = {
  title: "Perfect 10 — Top Bins",
  openGraph: {
    images: [OG_IMAGE],
    title: "Perfect 10 — Top Bins",
    description: "Can you draft the perfect player?",
  },
  twitter: {
    images: [OG_IMAGE],
    card: 'summary_large_image',
  },
}

export default function Page() {
  return <Perfect10 />
}

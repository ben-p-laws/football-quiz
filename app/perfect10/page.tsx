import Perfect10 from "@/components/Perfect10"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Perfect 10 — Top Bins",
  openGraph: {
    title: "Perfect 10 — Top Bins",
    description: "Can you draft the perfect player?",
    images: [{ url: '/api/perfect10-og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/api/perfect10-og'],
  },
}

export default function Page() {
  return <Perfect10 />
}

import Perfect10 from "@/components/Perfect10"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Perfect 10 — Top Bins",
  openGraph: {
    title: "Perfect 10 — Top Bins",
    description: "Spin 10 players. Assign each to a category. Chase the perfect 1000.",
  },
}

export default function Page() {
  return <Perfect10 />
}

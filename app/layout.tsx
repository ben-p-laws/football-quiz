import type { Metadata } from "next";
import { Inter, Instrument_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TopBins — Premier League knowledge games",
  description: "Replayable football knowledge games for PL fans. Football Golf, Around the World, Stat Clash, Minimise, Bingo, Grid and more.",
  metadataBase: new URL('https://www.topbinsfooty.com'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  themeColor: '#E3232C',
  openGraph: {
    title: "TopBins — Premier League knowledge games",
    description: "Replayable football knowledge games for PL fans. Football Golf, Around the World, Stat Clash, Minimise, Bingo, Grid and more.",
    url: 'https://www.topbinsfooty.com',
    siteName: 'TopBins',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TopBins — Premier League knowledge games',
    description: 'Replayable football knowledge games for PL fans.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  );
}

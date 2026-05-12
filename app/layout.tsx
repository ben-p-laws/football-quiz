import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TopBins — Premier League knowledge games",
  description: "Replayable football knowledge games for PL fans. Football Golf, Around the World, Stat Clash, Minimise, Bingo, Grid and more.",
  metadataBase: new URL('https://www.topbinsfooty.com'),
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  );
}

'use client'

import { useState, useEffect } from 'react'

const W = 800, H = 450

// Module-level topology cache — fetched once
let _topo: any = null

type Props = { lat: number; lng: number; radiusKm: number }

const COUNTRY_LABELS: [string, number, number][] = [
  ['United States', -98.0, 38.9], ['Canada', -96.8, 56.1], ['Mexico', -102.5, 23.9],
  ['Brazil', -51.9, -14.2], ['Argentina', -64.0, -34.0], ['Colombia', -74.3, 4.6],
  ['Peru', -75.0, -9.2], ['Chile', -71.5, -35.7], ['Venezuela', -66.6, 8.0],
  ['United Kingdom', -1.5, 52.5], ['Ireland', -8.0, 53.2], ['France', 2.3, 46.2],
  ['Spain', -3.7, 40.4], ['Portugal', -8.2, 39.4], ['Germany', 10.5, 51.2],
  ['Italy', 12.6, 42.8], ['Netherlands', 5.3, 52.1], ['Belgium', 4.5, 50.5],
  ['Poland', 19.1, 51.9], ['Ukraine', 31.2, 48.4], ['Sweden', 15.0, 62.0],
  ['Norway', 8.5, 60.5], ['Finland', 25.7, 61.9], ['Denmark', 10.0, 56.0],
  ['Switzerland', 8.2, 46.8], ['Austria', 14.5, 47.5], ['Romania', 24.9, 45.9],
  ['Turkey', 35.2, 38.9], ['Greece', 21.8, 39.1], ['Russia', 60.0, 55.0],
  ['Kazakhstan', 66.9, 48.0], ['China', 104.0, 35.0], ['India', 78.9, 20.6],
  ['Japan', 138.3, 36.5], ['South Korea', 127.8, 35.9], ['Indonesia', 113.9, -0.8],
  ['Pakistan', 69.3, 30.4], ['Bangladesh', 90.4, 23.7], ['Vietnam', 108.3, 14.1],
  ['Thailand', 101.0, 15.9], ['Philippines', 122.0, 12.0], ['Saudi Arabia', 45.1, 23.9],
  ['Iran', 53.7, 32.7], ['Iraq', 44.4, 33.2], ['Egypt', 30.1, 26.8],
  ['Morocco', -7.1, 31.8], ['Algeria', 2.6, 28.0], ['Libya', 17.2, 26.3],
  ['Sudan', 30.2, 16.0], ['Ethiopia', 40.5, 9.1], ['Nigeria', 8.1, 9.1],
  ['DR Congo', 24.0, -2.9], ['Tanzania', 34.9, -6.4], ['Kenya', 37.9, 0.0],
  ['South Africa', 25.0, -29.0], ['Australia', 133.0, -27.0], ['New Zealand', 173.5, -41.0],
]

const CITIES: [string, number, number][] = [
  ['New York', -74.0, 40.7], ['Los Angeles', -118.2, 34.1], ['Chicago', -87.6, 41.8],
  ['Houston', -95.4, 29.8], ['Miami', -80.2, 25.8], ['Atlanta', -84.4, 33.7],
  ['Seattle', -122.3, 47.6], ['Boston', -71.1, 42.4], ['Washington DC', -77.0, 38.9],
  ['Dallas', -96.8, 32.8], ['Phoenix', -112.1, 33.4], ['Denver', -104.9, 39.7],
  ['Toronto', -79.4, 43.7], ['Montreal', -73.6, 45.5], ['Vancouver', -123.1, 49.3],
  ['Mexico City', -99.1, 19.4], ['Guadalajara', -103.3, 20.7],
  ['London', -0.1, 51.5], ['Birmingham', -1.9, 52.5], ['Manchester', -2.2, 53.5],
  ['Glasgow', -4.3, 55.9], ['Paris', 2.3, 48.9], ['Lyon', 4.8, 45.8],
  ['Marseille', 5.4, 43.3], ['Madrid', -3.7, 40.4], ['Barcelona', 2.2, 41.4],
  ['Lisbon', -9.1, 38.7], ['Berlin', 13.4, 52.5], ['Hamburg', 10.0, 53.6],
  ['Munich', 11.6, 48.1], ['Frankfurt', 8.7, 50.1], ['Rome', 12.5, 41.9],
  ['Milan', 9.2, 45.5], ['Naples', 14.3, 40.8], ['Amsterdam', 4.9, 52.4],
  ['Brussels', 4.4, 50.8], ['Vienna', 16.4, 48.2], ['Zurich', 8.5, 47.4],
  ['Warsaw', 21.0, 52.2], ['Kyiv', 30.5, 50.5], ['Stockholm', 18.1, 59.3],
  ['Oslo', 10.7, 59.9], ['Copenhagen', 12.6, 55.7], ['Helsinki', 25.0, 60.2],
  ['Athens', 23.7, 37.9], ['Istanbul', 29.0, 41.0], ['Bucharest', 26.1, 44.4],
  ['Budapest', 19.1, 47.5], ['Prague', 14.5, 50.1], ['Belgrade', 20.5, 44.8],
  ['Moscow', 37.6, 55.8], ['Saint Petersburg', 30.3, 59.9],
  ['Cairo', 31.2, 30.1], ['Casablanca', -7.6, 33.6], ['Lagos', 3.4, 6.5],
  ['Kinshasa', 15.3, -4.3], ['Johannesburg', 28.0, -26.2], ['Cape Town', 18.4, -33.9],
  ['Nairobi', 36.8, -1.3], ['Addis Ababa', 38.7, 9.0],
  ['Delhi', 77.2, 28.7], ['Mumbai', 72.9, 19.1], ['Bangalore', 77.6, 13.0],
  ['Kolkata', 88.4, 22.6], ['Karachi', 67.0, 24.9], ['Dhaka', 90.4, 23.7],
  ['Bangkok', 100.5, 13.8], ['Ho Chi Minh City', 106.7, 10.8], ['Hanoi', 105.9, 21.0],
  ['Manila', 121.0, 14.6], ['Jakarta', 106.8, -6.2], ['Singapore', 103.8, 1.4],
  ['Kuala Lumpur', 101.7, 3.1], ['Tokyo', 139.7, 35.7], ['Osaka', 135.5, 34.7],
  ['Seoul', 127.0, 37.6], ['Beijing', 116.4, 39.9], ['Shanghai', 121.5, 31.2],
  ['Guangzhou', 113.3, 23.1], ['Shenzhen', 114.1, 22.5], ['Chengdu', 104.1, 30.7],
  ['Tehran', 51.4, 35.7], ['Baghdad', 44.4, 33.3], ['Riyadh', 46.7, 24.7],
  ['Dubai', 55.3, 25.2], ['Sydney', 151.2, -33.9], ['Melbourne', 145.0, -37.8],
  ['São Paulo', -46.6, -23.5], ['Rio de Janeiro', -43.2, -22.9],
  ['Buenos Aires', -58.4, -34.6], ['Lima', -77.0, -12.1], ['Bogotá', -74.1, 4.7],
  ['Santiago', -70.7, -33.5],
]

type MapData = {
  countryPaths: string[]
  labels: { text: string; x: number; y: number; country: boolean }[]
  cities: { name: string; x: number; y: number }[]
}

export default function CircleMapView({ lat, lng, radiusKm }: Props) {
  const [map, setMap] = useState<MapData | null>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { geoAzimuthalEquidistant, geoPath } = require('d3-geo')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { feature } = require('topojson-client')

    const scale = (160 * 6371) / radiusKm
    const proj = geoAzimuthalEquidistant()
      .translate([W / 2, H / 2])
      .rotate([-lng, -lat, 0])
      .scale(scale)

    function inView(x: number, y: number) {
      return x > -20 && x < W + 20 && y > -20 && y < H + 20
    }

    function build(topo: any) {
      const countries = feature(topo, topo.objects.countries)
      const pathGen = geoPath(proj)

      const countryPaths: string[] = countries.features
        .map((f: any) => pathGen(f) ?? '')
        .filter(Boolean)

      const labels = [
        ...COUNTRY_LABELS.map(([text, lon, latD]) => {
          const p = proj([lon, latD]) as [number, number] | null
          return p && inView(p[0], p[1]) ? { text, x: p[0], y: p[1], country: true } : null
        }),
      ].filter(Boolean) as MapData['labels']

      const cities = CITIES.map(([name, lon, latD]) => {
        const p = proj([lon, latD]) as [number, number] | null
        return p && inView(p[0], p[1]) ? { name, x: p[0], y: p[1] } : null
      }).filter(Boolean) as MapData['cities']

      setMap({ countryPaths, labels, cities })
    }

    if (_topo) {
      build(_topo)
    } else {
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then(r => r.json())
        .then(topo => { _topo = topo; build(topo) })
        .catch(console.error)
    }
  }, [lat, lng, radiusKm])

  const scale = (160 * 6371) / radiusKm
  const countryFs = Math.max(10, Math.min(16, 9_000 / scale))
  const cityFs    = Math.max(8,  Math.min(13, 7_000 / scale))
  const dotR      = Math.max(1,  Math.min(3,  2_000 / scale))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'inherit' }}>
      <rect width={W} height={H} fill="#04101f" />

      {map?.countryPaths.map((d, i) => (
        <path key={i} d={d} fill="#1a2d45" stroke="#3a6090" strokeWidth={0.8} />
      ))}

      {map?.labels.map(({ text, x, y }) => (
        <text key={text} x={x} y={y}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(180,210,255,0.5)" fontSize={countryFs}
          fontFamily="system-ui, -apple-system, sans-serif" fontWeight={700}
          letterSpacing="0.06em" style={{ userSelect: 'none' as const }}
        >{text.toUpperCase()}</text>
      ))}

      {map?.cities.map(({ name, x, y }) => (
        <g key={name} style={{ userSelect: 'none' as const }}>
          <circle cx={x} cy={y} r={dotR} fill="rgba(255,255,255,0.7)" />
          <text x={x} y={y + dotR + cityFs * 0.9}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)" fontSize={cityFs}
            fontFamily="system-ui, -apple-system, sans-serif"
          >{name}</text>
        </g>
      ))}

      <circle cx={W / 2} cy={H / 2} r={160}
        fill="rgba(220,38,38,0.1)" stroke="#dc2626"
        strokeWidth={2.5} strokeDasharray="8 4"
      />
    </svg>
  )
}

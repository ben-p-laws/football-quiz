'use client'

import { useMemo } from 'react'
import { geoCircle } from 'd3-geo'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ComposableMap, Geographies, Geography, Marker } = require('react-simple-maps')

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

type Props = { lat: number; lng: number; radiusKm: number }

// [name, lon, lat]
const COUNTRY_LABELS: [string, number, number][] = [
  ['United States', -98.0, 38.9],
  ['Canada', -96.8, 56.1],
  ['Mexico', -102.5, 23.9],
  ['Brazil', -51.9, -14.2],
  ['Argentina', -64.0, -34.0],
  ['Colombia', -74.3, 4.6],
  ['Peru', -75.0, -9.2],
  ['Venezuela', -66.6, 8.0],
  ['Chile', -71.5, -35.7],
  ['Bolivia', -64.9, -16.3],
  ['United Kingdom', -1.5, 52.5],
  ['Ireland', -8.0, 53.2],
  ['France', 2.3, 46.2],
  ['Spain', -3.7, 40.4],
  ['Portugal', -8.2, 39.4],
  ['Germany', 10.5, 51.2],
  ['Italy', 12.6, 42.8],
  ['Netherlands', 5.3, 52.1],
  ['Belgium', 4.5, 50.5],
  ['Poland', 19.1, 51.9],
  ['Ukraine', 31.2, 48.4],
  ['Sweden', 15.0, 62.0],
  ['Norway', 8.5, 60.5],
  ['Finland', 25.7, 61.9],
  ['Denmark', 10.0, 56.0],
  ['Switzerland', 8.2, 46.8],
  ['Austria', 14.5, 47.5],
  ['Romania', 24.9, 45.9],
  ['Turkey', 35.2, 38.9],
  ['Greece', 21.8, 39.1],
  ['Russia', 60.0, 55.0],
  ['Kazakhstan', 66.9, 48.0],
  ['China', 104.0, 35.0],
  ['India', 78.9, 20.6],
  ['Japan', 138.3, 36.5],
  ['South Korea', 127.8, 35.9],
  ['Indonesia', 113.9, -0.8],
  ['Pakistan', 69.3, 30.4],
  ['Bangladesh', 90.4, 23.7],
  ['Vietnam', 108.3, 14.1],
  ['Thailand', 101.0, 15.9],
  ['Philippines', 122.0, 12.0],
  ['Saudi Arabia', 45.1, 23.9],
  ['Iran', 53.7, 32.7],
  ['Iraq', 44.4, 33.2],
  ['Egypt', 30.1, 26.8],
  ['Morocco', -7.1, 31.8],
  ['Algeria', 2.6, 28.0],
  ['Libya', 17.2, 26.3],
  ['Sudan', 30.2, 16.0],
  ['Ethiopia', 40.5, 9.1],
  ['Nigeria', 8.1, 9.1],
  ['DR Congo', 24.0, -2.9],
  ['Tanzania', 34.9, -6.4],
  ['Kenya', 37.9, 0.0],
  ['South Africa', 25.0, -29.0],
  ['Australia', 133.0, -27.0],
  ['New Zealand', 173.5, -41.0],
]

// [name, lon, lat] — major world cities
const CITIES: [string, number, number][] = [
  ['New York', -74.0, 40.7],
  ['Los Angeles', -118.2, 34.1],
  ['Chicago', -87.6, 41.8],
  ['Houston', -95.4, 29.8],
  ['Phoenix', -112.1, 33.4],
  ['Philadelphia', -75.2, 40.0],
  ['San Antonio', -98.5, 29.4],
  ['San Diego', -117.2, 32.7],
  ['Dallas', -96.8, 32.8],
  ['Miami', -80.2, 25.8],
  ['Atlanta', -84.4, 33.7],
  ['Seattle', -122.3, 47.6],
  ['Boston', -71.1, 42.4],
  ['Washington DC', -77.0, 38.9],
  ['Denver', -104.9, 39.7],
  ['Las Vegas', -115.1, 36.2],
  ['Portland', -122.7, 45.5],
  ['Minneapolis', -93.3, 44.9],
  ['Detroit', -83.1, 42.3],
  ['Nashville', -86.8, 36.2],
  ['Toronto', -79.4, 43.7],
  ['Montreal', -73.6, 45.5],
  ['Vancouver', -123.1, 49.3],
  ['Mexico City', -99.1, 19.4],
  ['Guadalajara', -103.3, 20.7],
  ['Monterrey', -100.3, 25.7],
  ['London', -0.1, 51.5],
  ['Birmingham', -1.9, 52.5],
  ['Manchester', -2.2, 53.5],
  ['Leeds', -1.5, 53.8],
  ['Glasgow', -4.3, 55.9],
  ['Paris', 2.3, 48.9],
  ['Lyon', 4.8, 45.8],
  ['Marseille', 5.4, 43.3],
  ['Madrid', -3.7, 40.4],
  ['Barcelona', 2.2, 41.4],
  ['Seville', -5.9, 37.4],
  ['Valencia', -0.4, 39.5],
  ['Lisbon', -9.1, 38.7],
  ['Porto', -8.6, 41.2],
  ['Berlin', 13.4, 52.5],
  ['Hamburg', 10.0, 53.6],
  ['Munich', 11.6, 48.1],
  ['Frankfurt', 8.7, 50.1],
  ['Cologne', 6.9, 50.9],
  ['Rome', 12.5, 41.9],
  ['Milan', 9.2, 45.5],
  ['Naples', 14.3, 40.8],
  ['Turin', 7.7, 45.1],
  ['Amsterdam', 4.9, 52.4],
  ['Rotterdam', 4.5, 51.9],
  ['Brussels', 4.4, 50.8],
  ['Vienna', 16.4, 48.2],
  ['Zurich', 8.5, 47.4],
  ['Warsaw', 21.0, 52.2],
  ['Krakow', 19.9, 50.1],
  ['Kyiv', 30.5, 50.5],
  ['Stockholm', 18.1, 59.3],
  ['Oslo', 10.7, 59.9],
  ['Copenhagen', 12.6, 55.7],
  ['Helsinki', 25.0, 60.2],
  ['Athens', 23.7, 37.9],
  ['Istanbul', 29.0, 41.0],
  ['Ankara', 32.9, 39.9],
  ['Bucharest', 26.1, 44.4],
  ['Budapest', 19.1, 47.5],
  ['Prague', 14.5, 50.1],
  ['Belgrade', 20.5, 44.8],
  ['Moscow', 37.6, 55.8],
  ['Saint Petersburg', 30.3, 59.9],
  ['Novosibirsk', 82.9, 55.0],
  ['Yekaterinburg', 60.6, 56.8],
  ['Cairo', 31.2, 30.1],
  ['Alexandria', 30.0, 31.2],
  ['Casablanca', -7.6, 33.6],
  ['Algiers', 3.1, 36.7],
  ['Tunis', 10.2, 36.8],
  ['Lagos', 3.4, 6.5],
  ['Kano', 8.5, 12.0],
  ['Ibadan', 3.9, 7.4],
  ['Kinshasa', 15.3, -4.3],
  ['Johannesburg', 28.0, -26.2],
  ['Cape Town', 18.4, -33.9],
  ['Durban', 31.0, -29.9],
  ['Nairobi', 36.8, -1.3],
  ['Addis Ababa', 38.7, 9.0],
  ['Khartoum', 32.5, 15.6],
  ['Dar es Salaam', 39.3, -6.8],
  ['Delhi', 77.2, 28.7],
  ['Mumbai', 72.9, 19.1],
  ['Bangalore', 77.6, 13.0],
  ['Kolkata', 88.4, 22.6],
  ['Chennai', 80.3, 13.1],
  ['Hyderabad', 78.5, 17.4],
  ['Karachi', 67.0, 24.9],
  ['Lahore', 74.3, 31.6],
  ['Dhaka', 90.4, 23.7],
  ['Yangon', 96.2, 16.9],
  ['Bangkok', 100.5, 13.8],
  ['Ho Chi Minh City', 106.7, 10.8],
  ['Hanoi', 105.9, 21.0],
  ['Manila', 121.0, 14.6],
  ['Jakarta', 106.8, -6.2],
  ['Singapore', 103.8, 1.4],
  ['Kuala Lumpur', 101.7, 3.1],
  ['Tokyo', 139.7, 35.7],
  ['Osaka', 135.5, 34.7],
  ['Nagoya', 136.9, 35.2],
  ['Yokohama', 139.6, 35.4],
  ['Seoul', 127.0, 37.6],
  ['Busan', 129.1, 35.1],
  ['Beijing', 116.4, 39.9],
  ['Shanghai', 121.5, 31.2],
  ['Guangzhou', 113.3, 23.1],
  ['Shenzhen', 114.1, 22.5],
  ['Chengdu', 104.1, 30.7],
  ['Wuhan', 114.3, 30.6],
  ['Chongqing', 106.5, 29.6],
  ['Tianjin', 117.2, 39.1],
  ['Xi\'an', 108.9, 34.3],
  ['Tehran', 51.4, 35.7],
  ['Baghdad', 44.4, 33.3],
  ['Riyadh', 46.7, 24.7],
  ['Jeddah', 39.2, 21.5],
  ['Dubai', 55.3, 25.2],
  ['Abu Dhabi', 54.4, 24.5],
  ['Kabul', 69.2, 34.5],
  ['Tashkent', 69.3, 41.3],
  ['Sydney', 151.2, -33.9],
  ['Melbourne', 145.0, -37.8],
  ['Brisbane', 153.0, -27.5],
  ['Perth', 115.9, -32.0],
  ['Auckland', 174.8, -36.9],
  ['São Paulo', -46.6, -23.5],
  ['Rio de Janeiro', -43.2, -22.9],
  ['Brasília', -47.9, -15.8],
  ['Buenos Aires', -58.4, -34.6],
  ['Lima', -77.0, -12.1],
  ['Bogotá', -74.1, 4.7],
  ['Santiago', -70.7, -33.5],
  ['Caracas', -66.9, 10.5],
]

export default function CircleMapView({ lat, lng, radiusKm }: Props) {
  // Scale so the circle fills ~40% of the 800px canvas width
  // For geoEqualEarth: r_px ≈ radiusKm/6371 × scale, target r_px ≈ 160
  const scale = useMemo(
    () => Math.min((160 * 6371) / radiusKm, 25_000),
    [radiusKm]
  )

  const circleGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: geoCircle().center([lng, lat]).radius(radiusKm / 111.32).precision(1)(),
    }],
  }), [lat, lng, radiusKm])

  // Font sizes relative to SVG viewBox (800×600)
  const countryFontSize = Math.max(4, Math.min(11, 7_000 / scale))
  const cityFontSize    = Math.max(3, Math.min(9,  5_000 / scale))
  const cityDotR        = Math.max(0.8, Math.min(2.5, 1500 / scale))

  return (
    <div style={{ width: '100%', height: '100%', background: '#04101f', borderRadius: 'inherit' }}>
      <ComposableMap
        projectionConfig={{ scale, center: [lng, lat] }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Country fills — exact ATW colours */}
        <Geographies geography={GEO_URL}>
          {({ geographies }: any) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1a2d45"
                stroke="#2e4a6a"
                strokeWidth={0.6}
                style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
              />
            ))
          }
        </Geographies>

        {/* Country name labels */}
        {COUNTRY_LABELS.map(([name, lon, labelLat]) => (
          <Marker key={`country-${name}`} coordinates={[lon, labelLat]}>
            <text
              textAnchor="middle"
              y={countryFontSize / 3}
              fill="rgba(180,210,255,0.35)"
              fontSize={countryFontSize}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight={700}
              letterSpacing="0.07em"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {name.toUpperCase()}
            </text>
          </Marker>
        ))}

        {/* City dots + names */}
        {CITIES.map(([name, lon, cityLat]) => (
          <Marker key={`city-${name}`} coordinates={[lon, cityLat]}>
            <circle r={cityDotR} fill="rgba(255,255,255,0.55)" />
            <text
              textAnchor="middle"
              y={cityFontSize + cityDotR + 1}
              fill="rgba(255,255,255,0.45)"
              fontSize={cityFontSize}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight={500}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {name}
            </text>
          </Marker>
        ))}

        {/* Circle overlay */}
        <Geographies geography={circleGeoJSON}>
          {({ geographies }: any) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="rgba(220,38,38,0.12)"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="8 4"
                style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  )
}

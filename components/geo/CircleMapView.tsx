'use client'

import { useMemo } from 'react'
import { geoCircle } from 'd3-geo'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ComposableMap, Geographies, Geography, Marker } = require('react-simple-maps')

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

type Props = { lat: number; lng: number; radiusKm: number }

// Country name labels — [name, lon, lat]
const LABELS: [string, number, number][] = [
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
  ['Sweden', 15.0, 62.0],
  ['Norway', 8.5, 60.5],
  ['Finland', 25.7, 61.9],
  ['Denmark', 10.0, 56.0],
  ['Switzerland', 8.2, 46.8],
  ['Austria', 14.5, 47.5],
  ['Romania', 24.9, 45.9],
  ['Ukraine', 31.2, 48.4],
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
  ['Myanmar', 96.9, 19.0],
  ['Philippines', 122.0, 12.0],
  ['Saudi Arabia', 45.1, 23.9],
  ['Iran', 53.7, 32.7],
  ['Iraq', 44.4, 33.2],
  ['Syria', 38.5, 35.0],
  ['Egypt', 30.1, 26.8],
  ['Morocco', -7.1, 31.8],
  ['Algeria', 2.6, 28.0],
  ['Libya', 17.2, 26.3],
  ['Nigeria', 8.1, 9.1],
  ['Ethiopia', 40.5, 9.1],
  ['DR Congo', 24.0, -2.9],
  ['Tanzania', 34.9, -6.4],
  ['Kenya', 37.9, 0.0],
  ['South Africa', 25.0, -29.0],
  ['Australia', 133.0, -27.0],
  ['New Zealand', 173.5, -41.0],
]

export default function CircleMapView({ lat, lng, radiusKm }: Props) {
  const scale = useMemo(
    () => Math.min(1_274_200 / radiusKm, 25_000),
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

  const fontSize = Math.max(5, Math.min(13, 10_000 / scale))

  return (
    <div style={{ width: '100%', height: '100%', background: '#040d1a', borderRadius: 'inherit' }}>
      <ComposableMap
        projectionConfig={{ scale, center: [lng, lat] }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* World country borders */}
        <Geographies geography={GEO_URL}>
          {({ geographies }: any) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#162035"
                stroke="#2d4a7a"
                strokeWidth={0.5}
                style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
              />
            ))
          }
        </Geographies>

        {/* Country name labels */}
        {LABELS.map(([name, lon, labelLat]) => (
          <Marker key={name} coordinates={[lon, labelLat]}>
            <text
              textAnchor="middle"
              y={fontSize / 3}
              fill="rgba(255,255,255,0.3)"
              fontSize={fontSize}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight={700}
              letterSpacing="0.06em"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {name.toUpperCase()}
            </text>
          </Marker>
        ))}

        {/* Circle overlay from GeoJSON */}
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

'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Props = { lat: number; lng: number; radiusKm: number }

function FitBounds({ lat, lng, radiusKm }: Props) {
  const map = useMap()
  useEffect(() => {
    import('leaflet').then(L => {
      const center = L.latLng(lat, lng)
      const circle = L.circle(center, { radius: radiusKm * 1000 })
      map.fitBounds(circle.getBounds(), { padding: [30, 30] })
    })
  }, [lat, lng, radiusKm, map])
  return null
}

export default function CircleMapView({ lat, lng, radiusKm }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={5}
      style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        subdomains="abcd"
      />
      <Circle
        center={[lat, lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.15, weight: 2 }}
      />
      <FitBounds lat={lat} lng={lng} radiusKm={radiusKm} />
    </MapContainer>
  )
}

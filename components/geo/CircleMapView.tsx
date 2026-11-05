'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Props = { lat: number; lng: number; radiusKm: number }

/** Compute a zoom level so the circle fills ~70% of a ~350px tall container. */
function circleZoom(lat: number, radiusKm: number): number {
  const cosLat = Math.cos((lat * Math.PI) / 180)
  const zoom = Math.log2((350 * 0.35 * 360 * 111.32) / (256 * cosLat * radiusKm))
  return Math.max(1, Math.min(17, Math.round(zoom)))
}

const btnStyle: React.CSSProperties = {
  width: 32, height: 32, background: 'rgba(17,24,39,0.85)', border: '1px solid #1e2d4a',
  borderRadius: 6, color: 'white', fontSize: 16, fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function ZoomControls({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  return (
    <div style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button style={btnStyle} onClick={() => map.setView([lat, lng], map.getZoom() + 1)}>+</button>
      <button style={btnStyle} onClick={() => map.setView([lat, lng], map.getZoom() - 1)}>−</button>
      <button style={{ ...btnStyle, fontSize: 13 }} onClick={() => map.setView([lat, lng], zoom, { animate: true })}>↺</button>
    </div>
  )
}

function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map])
  return null
}

export default function CircleMapView({ lat, lng, radiusKm }: Props) {
  const zoom = circleZoom(lat, radiusKm)
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
      zoomControl={false}
      attributionControl={false}
    >
      <style>{`.leaflet-tile-pane { filter: invert(1) brightness(0.85) saturate(0.15) hue-rotate(180deg); }`}</style>
      <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
      <Circle
        center={[lat, lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.15, weight: 2 }}
      />
      <InvalidateOnMount />
      <ZoomControls lat={lat} lng={lng} zoom={zoom} />
    </MapContainer>
  )
}

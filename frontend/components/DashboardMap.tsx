'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { api } from '@/lib/api'

// Fix default marker icons for Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const corridor: [number, number][] = [
  [21.054, 86.515], // Bhadrak
  [20.945, 86.13],  // Jajpur Keonjhar Road
  [21.1, 85.9],
]

export default function DashboardMap() {
  const [trains, setTrains] = useState<any[]>([])

  useEffect(() => {
    api.trainsLive().then((t) => setTrains(t.slice(0, 12))).catch(() => {})
  }, [])

  const points = trains.length
    ? trains.filter((t) => t.latitude && t.longitude).map((t) => ({ id: t.train_number, lat: t.latitude, lng: t.longitude, status: t.status }))
    : [
        { id: 'TR-PSG-01', lat: 21.0, lng: 86.4, status: 'On Time' },
        { id: 'TR-PSG-02', lat: 20.95, lng: 86.2, status: 'Delayed' },
        { id: 'TR-FRT-01', lat: 20.98, lng: 86.3, status: 'On Time' },
      ]

  return (
    <MapContainer center={[20.99, 86.3]} zoom={10} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={corridor} color="#4f46e5" weight={4} />
      {points.map((train) => (
        <Marker key={train.id} position={[train.lat, train.lng]}>
          <Popup>{train.id} – {train.status}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

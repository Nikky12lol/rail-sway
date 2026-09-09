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

const stations = [
  { name: 'Bhadrak', lat: 21.054, lng: 86.515 },
  { name: 'Jajpur Keonjhar Rd', lat: 20.945, lng: 86.13 },
]

export default function DashboardMap() {
  const [trains, setTrains] = useState<any[]>([])

  useEffect(() => {
    api.trainsLive().then((t) => setTrains(t.slice(0, 12))).catch(() => {})
  }, [])

  // Scheduled corridor positions from the timetable — NOT live GPS.
  const points = trains.length
    ? trains.filter((t) => t.latitude && t.longitude).map((t) => ({ id: t.train_number, lat: t.latitude, lng: t.longitude, status: t.status, kind: 'train' as const }))
    : [
        { id: 'TR-PSG-01', lat: 21.0, lng: 86.4, status: 'scheduled (demo)', kind: 'train' as const },
        { id: 'TR-PSG-02', lat: 20.95, lng: 86.2, status: 'scheduled (demo)', kind: 'train' as const },
        { id: 'TR-FRT-01', lat: 20.98, lng: 86.3, status: 'scheduled (demo)', kind: 'train' as const },
      ]

  return (
    <MapContainer center={[20.99, 86.3]} zoom={10} style={{ height: '100%', width: '100%' }} attributionControl={false}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <Polyline positions={corridor} color="#6366f1" weight={3} />
      {stations.map((s) => (
        <Marker key={s.name} position={[s.lat, s.lng]}>
          <Popup><b>{s.name}</b><br />Section station</Popup>
        </Marker>
      ))}
      {points.map((train) => (
        <Marker key={train.id} position={[train.lat, train.lng]}>
          <Popup>{train.id} — {train.status}<br /><i>Scheduled position, not live GPS</i></Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

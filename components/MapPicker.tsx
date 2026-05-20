import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface MapPickerProps {
  lat: number
  lng: number
  onLocationChange: (lat: number, lng: number, address?: string) => void
}

function LocationMarker({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null)

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setPosition([lat, lng])
      onLocationChange(lat, lng)
    },
  })

  return position === null ? null : (
    <Marker position={position} icon={icon} />
  )
}

export default function MapPicker({ lat, lng, onLocationChange }: MapPickerProps) {
  const [center] = useState<[number, number]>([lat, lng])

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-gray-300 relative">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationChange={onLocationChange} />
        {lat && lng && (
          <Marker position={[lat, lng]} icon={icon} />
        )}
      </MapContainer>
      <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-xl shadow text-sm font-medium flex items-center gap-2 z-[1000]">
        <MapPin className="w-4 h-4 text-emerald-600" />
        Click on the map to set pickup location
      </div>
      <div className="absolute bottom-4 right-4 bg-white text-xs px-3 py-1 rounded-lg shadow z-[1000]">
        Zamboanga City
      </div>
    </div>
  )
}

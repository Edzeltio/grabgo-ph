import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

interface BookingMapProps {
  lat: number
  lng: number
  address?: string
  status?: string
}

export default function BookingMap({ lat, lng, address, status }: BookingMapProps) {
  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-purple-200 relative mt-3">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={icon}>
          <Popup>{address || 'Pickup location'}</Popup>
        </Marker>
      </MapContainer>
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-xs font-semibold text-purple-700 flex items-center gap-1.5 z-[1000]">
        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        {status === 'in_progress' ? 'Collector on the way' : 'Pickup location'}
      </div>
    </div>
  )
}

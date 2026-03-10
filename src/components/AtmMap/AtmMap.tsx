import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { Icon } from 'leaflet'
import type { Atm } from '../../types/atm'
import styles from './AtmMap.module.scss'

import 'leaflet/dist/leaflet.css'

interface AtmMapProps {
  userLat: number
  userLon: number
  atms: Atm[]
}

const userIcon = new Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
})

const atmIcon = new Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/248/248936.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

export const AtmMap = ({ userLat, userLon, atms }: AtmMapProps) => {
  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={[userLat, userLon]}
        zoom={15}
        className={styles.map}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <Marker position={[userLat, userLon]} icon={userIcon}>
          <Popup>Вы здесь</Popup>
        </Marker>

        <Circle
          center={[userLat, userLon]}
          radius={2000}
          pathOptions={{ fillOpacity: 0.1, color: 'blue' }}
        />

        {atms.map((atm) => (
          <Marker key={atm.id} position={[atm.lat, atm.lon]} icon={atmIcon}>
            <Popup>
              <div className={styles.popup}>
                <strong>{atm.operator || 'Банкомат'}</strong>
                {atm.name && <div>{atm.name}</div>}
                {atm.address && <div>{atm.address}</div>}
                {atm.distance && <div>~{atm.distance}м</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

import { useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { Icon, divIcon } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Atm } from '../../types'
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

// Создать кастомную иконку с цветом подсветки
const createColoredAtmIcon = (color: string) => {
  const iconHtml = renderToStaticMarkup(
    <div
      style={{
        width: '30px',
        height: '30px',
        backgroundColor: color,
        borderRadius: '50%',
        border: '3px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
      }}
    >
      🏧
    </div>
  )

  return divIcon({
    html: iconHtml,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

// Компонент кнопки возврата к местоположению
const LocationButton = ({ userLat, userLon }: { userLat: number; userLon: number }) => {
  const map = useMap()

  const handleClick = () => {
    map.setView([userLat, userLon], 15)
  }

  return (
    <button
      className={styles.locationButton}
      onClick={handleClick}
      title="Моё местоположение"
    >
      📍
    </button>
  )
}

// Создать ссылку на маршрут
const createRouteUrl = (lat: number, lon: number): string => {
  // Google Maps
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}

export const AtmMap = ({ userLat, userLon, atms }: AtmMapProps) => {
  const mapRef = useRef(null)

  // Все банкоматы показываем синим цветом (убрали разделение по валютам)
  const atmColor = '#3b82f6'

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        ref={mapRef}
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
          <Marker
            key={atm.id}
            position={[atm.lat, atm.lon]}
            icon={createColoredAtmIcon(atmColor)}
          >
            <Popup>
              <div className={styles.popup}>
                <strong>{atm.operator || 'Банкомат'}</strong>
                {atm.name && <div>{atm.name}</div>}
                {atm.address && <div>{atm.address}</div>}
                {atm.distance && <div>~{atm.distance}м</div>}

                <a
                  href={createRouteUrl(atm.lat, atm.lon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.routeButton}
                >
                  🚗 Проложить маршрут
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        <LocationButton userLat={userLat} userLon={userLon} />
      </MapContainer>
    </div>
  )
}

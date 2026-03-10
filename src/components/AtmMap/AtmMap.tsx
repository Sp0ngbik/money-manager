import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { Icon, divIcon, latLng, latLngBounds } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Atm } from '../../types'
import styles from './AtmMap.module.scss'

import 'leaflet/dist/leaflet.css'

interface AtmMapProps {
  userLat: number
  userLon: number
  atms: Atm[]
  radius: number
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

// Компонент для автоматического подстраивания карты под круг
const CircleBoundsController = ({
  userLat,
  userLon,
  radius,
}: {
  userLat: number
  userLon: number
  radius: number
}) => {
  const map = useMap()

  useEffect(() => {
    // Рассчитываем bounds для круга с отступами
    // Добавляем 20% к радиусу для padding
    const paddingRadius = radius * 1.2
    
    // Приблизительно: 1 градус = 111 км
    const deltaLat = paddingRadius / 111000 // метры в градусы
    const deltaLng = paddingRadius / (111000 * Math.cos((userLat * Math.PI) / 180))

    const bounds = latLngBounds(
      latLng(userLat - deltaLat, userLon - deltaLng),
      latLng(userLat + deltaLat, userLon + deltaLng)
    )

    // Плавно перемещаем карту с анимацией 1.5 секунды
    map.flyToBounds(bounds, {
      duration: 1.5,
      easeLinearity: 0.25,
    })
  }, [radius, userLat, userLon, map])

  return null
}

// Компонент кнопки возврата к местоположению
const LocationButton = ({
  userLat,
  userLon,
  radius,
}: {
  userLat: number
  userLon: number
  radius: number
}) => {
  const map = useMap()

  const handleClick = () => {
    // Рассчитываем bounds как в CircleBoundsController
    const paddingRadius = radius * 1.2
    const deltaLat = paddingRadius / 111000
    const deltaLng = paddingRadius / (111000 * Math.cos((userLat * Math.PI) / 180))

    const bounds = latLngBounds(
      latLng(userLat - deltaLat, userLon - deltaLng),
      latLng(userLat + deltaLat, userLon + deltaLng)
    )

    map.flyToBounds(bounds, {
      duration: 1,
      easeLinearity: 0.25,
    })
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
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}

export const AtmMap = ({ userLat, userLon, atms, radius }: AtmMapProps) => {
  const mapRef = useRef(null)
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

        <CircleBoundsController
          userLat={userLat}
          userLon={userLon}
          radius={radius}
        />

        <Marker position={[userLat, userLon]} icon={userIcon}>
          <Popup>Вы здесь</Popup>
        </Marker>

        <Circle
          center={[userLat, userLon]}
          radius={radius}
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
                  <span className={styles.routeIcon}>🚗</span>
                  <span className={styles.routeText}>Проложить маршрут</span>
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        <LocationButton
          userLat={userLat}
          userLon={userLon}
          radius={radius}
        />
      </MapContainer>
    </div>
  )
}

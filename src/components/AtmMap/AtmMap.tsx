import { useRef, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { Icon, divIcon, latLng, latLngBounds } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Atm } from '../../types'
import { getBankRates, type ConversionRates } from '../../services/currencyConversionApi'
import styles from './AtmMap.module.scss'

import 'leaflet/dist/leaflet.css'

interface AtmMapProps {
  userLat: number
  userLon: number
  atms: Atm[]
  radius: number
}

// Кэш для курсов банков
const ratesCache = new Map<string, { rates: ConversionRates; timestamp: number }>()
const RATES_CACHE_DURATION = 1000 * 60 * 5 // 5 минут

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
    const paddingRadius = radius * 1.2
    const deltaLat = paddingRadius / 111000
    const deltaLng = paddingRadius / (111000 * Math.cos((userLat * Math.PI) / 180))

    const bounds = latLngBounds(
      latLng(userLat - deltaLat, userLon - deltaLng),
      latLng(userLat + deltaLat, userLon + deltaLng)
    )

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

// Хук для определения мобильной версии
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Компонент popup с курсами валют
const AtmPopup = ({ atm }: { atm: Atm }) => {
  const [rates, setRates] = useState<ConversionRates | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const loadRates = async () => {
      if (!atm.operator) {
        setLoading(false)
        return
      }

      // Проверяем кэш
      const cached = ratesCache.get(atm.operator)
      if (cached && Date.now() - cached.timestamp < RATES_CACHE_DURATION) {
        setRates(cached.rates)
        setLoading(false)
        return
      }

      try {
        const bankRates = await getBankRates(atm.operator)
        ratesCache.set(atm.operator, { rates: bankRates, timestamp: Date.now() })
        setRates(bankRates)
      } catch (error) {
        console.error('Error loading rates for popup:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRates()
  }, [atm.operator])

  // Компактный вид для мобильной версии
  if (isMobile && !isExpanded) {
    return (
      <div className={styles.popupCompact}>
        <div className={styles.popupHeader}>
          <strong>{atm.operator || 'Банкомат'}</strong>
          {atm.distance && <span className={styles.distance}>~{atm.distance}м</span>}
        </div>
        <button 
          className={styles.expandButton}
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(true)
          }}
        >
          Подробнее →
        </button>
      </div>
    )
  }

  return (
    <div className={styles.popup}>
      {isMobile && (
        <button 
          className={styles.collapseButton}
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(false)
          }}
        >
          ← Скрыть
        </button>
      )}
      <strong>{atm.operator || 'Банкомат'}</strong>
      {atm.name && <div>{atm.name}</div>}
      {atm.address && <div>{atm.address}</div>}
      {atm.distance && <div>~{atm.distance}м</div>}

      {/* Курсы валют */}
      <div className={styles.ratesSection}>
        <div className={styles.ratesTitle}>💱 Курсы валют</div>
        {loading ? (
          <div className={styles.ratesLoading}>Загрузка...</div>
        ) : rates ? (
          <div className={styles.ratesList}>
            <div className={styles.rateItem}>
              <span className={styles.rateLabel}>USD → BYN:</span>
              <span className={styles.rateValue}>{rates['USD-BYN'].rate.toFixed(3)}</span>
            </div>
            <div className={styles.rateItem}>
              <span className={styles.rateLabel}>USD → RUB:</span>
              <span className={styles.rateValue}>{rates['USD-RUB'].rate.toFixed(2)}</span>
            </div>
            <div className={styles.rateSource}>
              Источник: {rates['USD-BYN'].source}
            </div>
          </div>
        ) : (
          <div className={styles.noRates}>Нет данных о курсах</div>
        )}
      </div>

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
  )
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
              <AtmPopup atm={atm} />
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

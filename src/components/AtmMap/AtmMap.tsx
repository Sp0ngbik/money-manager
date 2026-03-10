import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { Icon, divIcon } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Atm, CurrencyCode } from '../../types'
import { useAtmCurrencyConversion } from '../../hooks/useAtmCurrencyConversion'
import styles from './AtmMap.module.scss'

import 'leaflet/dist/leaflet.css'

interface AtmMapProps {
  userLat: number
  userLon: number
  atms: Atm[]
  selectedCurrency: CurrencyCode
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

export const AtmMap = ({ userLat, userLon, atms, selectedCurrency }: AtmMapProps) => {
  const { atmsWithConversion, loading: conversionLoading, error: conversionError } =
    useAtmCurrencyConversion(atms, selectedCurrency)

  return (
    <div className={styles.mapContainer}>
      {conversionLoading && (
        <div className={styles.loadingOverlay}>Загрузка курсов валют...</div>
      )}
      {conversionError && (
        <div className={styles.errorOverlay}>{conversionError}</div>
      )}

      <MapContainer center={[userLat, userLon]} zoom={15} className={styles.map}>
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

        {atmsWithConversion.map((atm) => {
          const supportedCount = atm.supportedCurrencies?.length || 0
          const color = atm.supportedCurrencies?.includes(selectedCurrency)
            ? '#10b981' // Зеленый - поддерживает текущую валюту
            : supportedCount >= 2
              ? '#f59e0b' // Желтый - поддерживает другие валюты
              : '#ef4444' // Красный - мало валют

          return (
            <Marker
              key={atm.id}
              position={[atm.lat, atm.lon]}
              icon={createColoredAtmIcon(color)}
            >
              <Popup>
                <div className={styles.popup}>
                  <strong>{atm.operator || 'Банкомат'}</strong>
                  {atm.name && <div>{atm.name}</div>}
                  {atm.address && <div>{atm.address}</div>}
                  {atm.distance && <div>~{atm.distance}м</div>}

                  <hr className={styles.divider} />

                  <div className={styles.currencies}>
                    <strong>Поддерживаемые валюты:</strong>
                    <div>{atm.supportedCurrencies?.join(', ') || 'USD, BYN, RUB'}</div>
                  </div>

                  {atm.conversionRates && atm.conversionRates.length > 0 && (
                    <div className={styles.conversionRates}>
                      <strong>Курсы конверсии:</strong>
                      {atm.conversionRates.map((rate) => (
                        <div key={rate.pair} className={styles.rate}>
                          {rate.label}: {rate.rate.toFixed(4)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

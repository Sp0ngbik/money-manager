import { useEffect, useReducer, useCallback } from 'react'
import { fetchConversionRates, getRateSource, type ConversionRates } from '../../services/currencyConversionApi'
import type { Atm } from '../../types'
import styles from './BankRatesTable.module.scss'

interface BankRatesTableProps {
  atms: Atm[]
  radius: number
}

interface BankWithRates {
  name: string
  distance: number
  rates: ConversionRates
}

interface State {
  banks: BankWithRates[]
  loading: boolean
  error: string | null
  ratesData: ConversionRates | null
}

type Action =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: BankWithRates[]; rates: ConversionRates }
  | { type: 'ERROR'; payload: string }

const initialState: State = {
  banks: [],
  loading: false,
  error: null,
  ratesData: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null }
    case 'SUCCESS':
      return {
        banks: action.payload,
        loading: false,
        error: null,
        ratesData: action.rates,
      }
    case 'ERROR':
      return { ...state, loading: false, error: action.payload, ratesData: null }
    default:
      return state
  }
}

// Получить уникальные банки (по operator), отсортированные по расстоянию
const getUniqueBanks = (atms: Atm[]): Atm[] => {
  const seen = new Set<string>()
  return atms
    .filter((atm) => {
      const key = atm.operator || 'Неизвестный банк'
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (a.distance || 0) - (b.distance || 0))
    .slice(0, 10)
}

const formatRate = (rate: number): string => {
  return rate.toFixed(4)
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const BankRatesTable = ({ atms, radius }: BankRatesTableProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadRates = useCallback(async () => {
    if (atms.length === 0) {
      dispatch({ type: 'SUCCESS', payload: [], rates: {} as ConversionRates })
      return
    }

    dispatch({ type: 'LOADING' })

    try {
      const conversionRates = await fetchConversionRates()
      const uniqueBanks = getUniqueBanks(atms)

      const banksWithRates: BankWithRates[] = uniqueBanks.map((atm) => ({
        name: atm.operator || 'Банкомат',
        distance: atm.distance || 0,
        rates: conversionRates,
      }))

      dispatch({ type: 'SUCCESS', payload: banksWithRates, rates: conversionRates })
    } catch {
      dispatch({ type: 'ERROR', payload: 'Не удалось загрузить курсы валют' })
    }
  }, [atms])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRates()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadRates])

  const radiusKm = radius / 1000

  if (state.loading) {
    return <div className={styles.loading}>Загрузка курсов валют...</div>
  }

  if (state.error) {
    return <div className={styles.error}>{state.error}</div>
  }

  if (state.banks.length === 0 || !state.ratesData) {
    return null
  }

  const source = getRateSource(state.ratesData)
  const lastUpdated = state.ratesData['USD-BYN'].lastUpdated
  const isOfficial = state.ratesData['USD-BYN'].isOfficial

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            Курсы валют в радиусе {radiusKm} км
          </h3>
          <div className={styles.sourceInfo}>
            <span className={isOfficial ? styles.sourceOfficial : styles.sourceFallback}>
              {isOfficial ? '✓ ' : '⚠ '}
              Источник: {source}
            </span>
            {lastUpdated && (
              <span className={styles.lastUpdated}>
                Обновлено: {formatTime(lastUpdated)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Банк</th>
              <th className={styles.colDistance}>Расст.</th>
              <th className={styles.colRate}>BYN→USD</th>
              <th className={styles.colRate}>USD→BYN</th>
              <th className={styles.colRate}>BYN→RUB</th>
              <th className={styles.colRate}>RUB→BYN</th>
            </tr>
          </thead>
          <tbody>
            {state.banks.map((bank) => (
              <tr key={bank.name}>
                <td className={styles.bankName}>{bank.name}</td>
                <td className={styles.colDistance}>{bank.distance}м</td>
                <td className={styles.rate}>{formatRate(bank.rates['BYN-USD'].rate)}</td>
                <td className={styles.rate}>{formatRate(bank.rates['USD-BYN'].rate)}</td>
                <td className={styles.rate}>{formatRate(bank.rates['BYN-RUB'].rate)}</td>
                <td className={styles.rate}>{formatRate(bank.rates['RUB-BYN'].rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useEffect, useReducer, useCallback } from 'react'
import { fetchConversionRates } from '../../services/currencyConversionApi'
import type { Atm } from '../../types'
import styles from './BankRatesTable.module.scss'

interface BankRatesTableProps {
  atms: Atm[]
  radius: number
}

interface BankWithRates {
  name: string
  distance: number
  rates: {
    'BYN-USD': number
    'USD-BYN': number
    'BYN-RUB': number
    'RUB-BYN': number
  }
}

interface State {
  banks: BankWithRates[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: BankWithRates[] }
  | { type: 'ERROR'; payload: string }

const initialState: State = {
  banks: [],
  loading: false,
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null }
    case 'SUCCESS':
      return { banks: action.payload, loading: false, error: null }
    case 'ERROR':
      return { ...state, loading: false, error: action.payload }
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

export const BankRatesTable = ({ atms, radius }: BankRatesTableProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadRates = useCallback(async () => {
    if (atms.length === 0) {
      dispatch({ type: 'SUCCESS', payload: [] })
      return
    }

    dispatch({ type: 'LOADING' })

    try {
      const conversionRates = await fetchConversionRates()
      const uniqueBanks = getUniqueBanks(atms)

      const banksWithRates: BankWithRates[] = uniqueBanks.map((atm) => ({
        name: atm.operator || 'Банкомат',
        distance: atm.distance || 0,
        rates: {
          'BYN-USD': conversionRates['BYN-USD'],
          'USD-BYN': conversionRates['USD-BYN'],
          'BYN-RUB': conversionRates['BYN-RUB'],
          'RUB-BYN': conversionRates['RUB-BYN'],
        },
      }))

      dispatch({ type: 'SUCCESS', payload: banksWithRates })
    } catch {
      dispatch({ type: 'ERROR', payload: 'Не удалось загрузить курсы валют' })
    }
  }, [atms])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  const radiusKm = radius / 1000

  if (state.loading) {
    return <div className={styles.loading}>Загрузка курсов валют...</div>
  }

  if (state.error) {
    return <div className={styles.error}>{state.error}</div>
  }

  if (state.banks.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        Курсы валют банков в радиусе {radiusKm} км (топ-{state.banks.length})
      </h3>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Банк</th>
              <th>Расстояние</th>
              <th>BYN→USD</th>
              <th>USD→BYN</th>
              <th>BYN→RUB</th>
              <th>RUB→BYN</th>
            </tr>
          </thead>
          <tbody>
            {state.banks.map((bank) => (
              <tr key={bank.name}>
                <td className={styles.bankName}>{bank.name}</td>
                <td>{bank.distance}м</td>
                <td className={styles.rate}>{formatRate(bank.rates['BYN-USD'])}</td>
                <td className={styles.rate}>{formatRate(bank.rates['USD-BYN'])}</td>
                <td className={styles.rate}>{formatRate(bank.rates['BYN-RUB'])}</td>
                <td className={styles.rate}>{formatRate(bank.rates['RUB-BYN'])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

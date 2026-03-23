import { useEffect, useReducer, useCallback } from 'react'
import type { Atm, CurrencyCode } from '../types'
import {
  fetchConversionRates,
  getBankRates,
  type ConversionRates,
} from '../services/currencyConversionApi'

type AtmWithConversion = Atm & {
  conversionRates?: Array<{
    pair: string
    rate: number
    label: string
  }>
  rateSource?: string
}

interface UseAtmCurrencyConversionState {
  atmsWithConversion: AtmWithConversion[]
  conversionRates: ConversionRates | null
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: { atms: AtmWithConversion[]; rates: ConversionRates } }
  | { type: 'ERROR'; payload: string }

const initialState: UseAtmCurrencyConversionState = {
  atmsWithConversion: [],
  conversionRates: null,
  loading: false,
  error: null,
}

function reducer(
  state: UseAtmCurrencyConversionState,
  action: Action
): UseAtmCurrencyConversionState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null }
    case 'SUCCESS':
      return {
        ...state,
        atmsWithConversion: action.payload.atms,
        conversionRates: action.payload.rates,
        loading: false,
        error: null,
      }
    case 'ERROR':
      return { ...state, loading: false, error: action.payload }
    default:
      return state
  }
}

// Моковые данные о поддерживаемых валютах
const getMockSupportedCurrencies = (operator?: string): CurrencyCode[] => {
  const allCurrencies: CurrencyCode[] = ['BYN', 'USD', 'RUB']

  if (!operator) return allCurrencies

  const lowerOperator = operator.toLowerCase()

  if (
    lowerOperator.includes('беларус') ||
    lowerOperator.includes('белагро') ||
    lowerOperator.includes('белинвест') ||
    lowerOperator.includes('бпс') ||
    lowerOperator.includes('белгазпром') ||
    lowerOperator.includes('альфа') ||
    lowerOperator.includes('втб') ||
    lowerOperator.includes('сбер') ||
    lowerOperator.includes('мтбанк') ||
    lowerOperator.includes('mtbank') ||
    lowerOperator.includes('приор') ||
    lowerOperator.includes('техно') ||
    lowerOperator.includes('статус') ||
    lowerOperator.includes('бсб') ||
    lowerOperator.includes('ррб') ||
    lowerOperator.includes('паритет') ||
    lowerOperator.includes('евро')
  ) {
    return allCurrencies
  }

  if (
    lowerOperator.includes('citibank') ||
    lowerOperator.includes('deutsche') ||
    lowerOperator.includes('unicredit')
  ) {
    return ['USD']
  }

  return allCurrencies
}

export const getAtmHighlightColor = (
  atm: Atm,
  selectedCurrency: CurrencyCode
): string => {
  const supported = atm.supportedCurrencies || getMockSupportedCurrencies(atm.operator)

  if (supported.includes(selectedCurrency)) {
    return '#10b981'
  } else if (supported.length >= 2) {
    return '#f59e0b'
  } else {
    return '#ef4444'
  }
}

export const useAtmCurrencyConversion = (
  atms: Atm[],
  selectedCurrency: CurrencyCode
) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadConversionData = useCallback(async () => {
    if (atms.length === 0) return

    dispatch({ type: 'LOADING' })

    try {
      const baseRates = await fetchConversionRates()

      const atmsWithConversion: AtmWithConversion[] = await Promise.all(
        atms.map(async (atm) => {
          const supportedCurrencies = getMockSupportedCurrencies(atm.operator)
          const bankRates = await getBankRates(atm.operator || 'Банкомат')
          const conversionRates: Array<{ pair: string; rate: number; label: string }> = []

          supportedCurrencies.forEach((currency) => {
            if (currency !== selectedCurrency) {
              const pairKey = `${selectedCurrency}-${currency}` as keyof ConversionRates
              const rate = bankRates[pairKey]
              if (rate) {
                conversionRates.push({
                  pair: pairKey,
                  rate: rate.rate,
                  label: `${selectedCurrency} → ${currency}`,
                })
              }
            }
          })

          return {
            ...atm,
            supportedCurrencies,
            conversionRates,
            rateSource: bankRates['USD-BYN'].source,
          }
        })
      )

      dispatch({
        type: 'SUCCESS',
        payload: { atms: atmsWithConversion, rates: baseRates },
      })
    } catch {
      dispatch({ type: 'ERROR', payload: 'Не удалось загрузить курсы валют' })
    }
  }, [atms, selectedCurrency])

  useEffect(() => {
    loadConversionData()
  }, [loadConversionData])

  return {
    ...state,
    refresh: loadConversionData,
  }
}

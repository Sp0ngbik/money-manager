import { useEffect, useReducer, useCallback } from 'react'
import type { Atm, CurrencyCode } from '../types'
import { fetchConversionRates, type ConversionRates } from '../services/currencyConversionApi'

type AtmWithConversion = Atm & {
  conversionRates?: Array<{
    pair: string
    rate: number
    label: string
  }>
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

// Моковые данные о поддерживаемых валютах (так как Overpass API не дает эту инфу)
const getMockSupportedCurrencies = (operator?: string): CurrencyCode[] => {
  const allCurrencies: CurrencyCode[] = ['BYN', 'USD', 'RUB']

  // Если оператор неизвестен - считаем что поддерживает все валюты
  if (!operator) return allCurrencies

  const lowerOperator = operator.toLowerCase()

  // Белорусские банки обычно поддерживают все валюты
  if (
    lowerOperator.includes('беларус') ||
    lowerOperator.includes('белагро') ||
    lowerOperator.includes('белинвест') ||
    lowerOperator.includes('бпс') ||
    lowerOperator.includes('белгазпром') ||
    lowerOperator.includes('альфа') ||
    lowerOperator.includes('втб') ||
    lowerOperator.includes('сбер')
  ) {
    return allCurrencies
  }

  // Иностранные банки могут поддерживать только USD
  if (
    lowerOperator.includes('citibank') ||
    lowerOperator.includes('deutsche') ||
    lowerOperator.includes('unicredit')
  ) {
    return ['USD']
  }

  // По умолчанию - все валюты
  return allCurrencies
}

// Определить цвет подсветки банкомата
export const getAtmHighlightColor = (
  atm: Atm,
  selectedCurrency: CurrencyCode
): string => {
  const supported = atm.supportedCurrencies || getMockSupportedCurrencies(atm.operator)

  if (supported.includes(selectedCurrency)) {
    // Поддерживает текущую валюту - зеленый
    return '#10b981'
  } else if (supported.length >= 2) {
    // Поддерживает много валют но не текущую - желтый
    return '#f59e0b'
  } else {
    // Поддерживает мало валют - красный
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
      const rates = await fetchConversionRates()

      // Добавляем моковые валюты и актуальные курсы конверсии к каждому банкомату
      const atmsWithConversion: AtmWithConversion[] = atms.map((atm) => {
        const supportedCurrencies = getMockSupportedCurrencies(atm.operator)

        // Формируем актуальные пары конверсии только для валют, поддерживаемых банкоматом
        const conversionRates: Array<{ pair: string; rate: number; label: string }> = []

        // Для каждой поддерживаемой валюты (кроме выбранной) добавляем конверсию
        supportedCurrencies.forEach((currency) => {
          if (currency !== selectedCurrency) {
            const pairKey = `${selectedCurrency}-${currency}` as keyof ConversionRates
            const rate = rates[pairKey]
            if (typeof rate === 'number') {
              conversionRates.push({
                pair: pairKey,
                rate,
                label: `${selectedCurrency} → ${currency}`,
              })
            }
          }
        })

        return {
          ...atm,
          supportedCurrencies,
          conversionRates,
        }
      })

      dispatch({
        type: 'SUCCESS',
        payload: { atms: atmsWithConversion, rates },
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

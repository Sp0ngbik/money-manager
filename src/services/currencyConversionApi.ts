import type { CurrencyCode } from '../types'

const CACHE_KEY = 'currencyConversionCache'
const CACHE_DURATION = 1000 * 60 * 60 // 1 час (было 24 часа)

export interface ConversionRates {
  'BYN-USD': number
  'BYN-RUB': number
  'USD-BYN': number
  'USD-RUB': number
  'RUB-BYN': number
  'RUB-USD': number
  lastUpdated: Date
}

interface CacheData {
  rates: ConversionRates
  timestamp: number
}

// Получить кэшированные курсы
const getCachedRates = (): ConversionRates | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CacheData = JSON.parse(cached)
    const now = Date.now()

    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return {
      ...data.rates,
      lastUpdated: new Date(data.rates.lastUpdated),
    }
  } catch {
    return null
  }
}

// Сохранить курсы в кэш
const cacheRates = (rates: ConversionRates): void => {
  try {
    const data: CacheData = {
      rates,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore localStorage errors
  }
}

// Получить курс BYN из НБРБ
const fetchBYNRate = async (): Promise<number> => {
  try {
    const response = await fetch('https://api.nbrb.by/exrates/rates/USD?parammode=2')
    if (!response.ok) throw new Error('Failed to fetch BYN rate')

    const data = await response.json()
    return data.Cur_OfficialRate
  } catch (error) {
    console.warn('Failed to fetch BYN rate:', error)
    return 3.25 // Fallback
  }
}

// Получить курс RUB из ЦБ РФ
const fetchRUBRate = async (): Promise<number> => {
  try {
    const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js')
    if (!response.ok) throw new Error('Failed to fetch RUB rate')

    const data = await response.json()
    return data.Valute.USD.Value
  } catch (error) {
    console.warn('Failed to fetch RUB rate:', error)
    return 92.5 // Fallback
  }
}

// Загрузить курсы конверсии
export const fetchConversionRates = async (): Promise<ConversionRates> => {
  const cached = getCachedRates()
  if (cached) {
    return cached
  }

  try {
    const [bynRate, rubRate] = await Promise.all([fetchBYNRate(), fetchRUBRate()])

    // Рассчитываем все пары конверсии
    const rates: ConversionRates = {
      'BYN-USD': 1 / bynRate, // 1 BYN = X USD
      'BYN-RUB': rubRate / bynRate, // 1 BYN = X RUB
      'USD-BYN': bynRate, // 1 USD = X BYN
      'USD-RUB': rubRate, // 1 USD = X RUB
      'RUB-BYN': bynRate / rubRate, // 1 RUB = X BYN
      'RUB-USD': 1 / rubRate, // 1 RUB = X USD
      lastUpdated: new Date(),
    }

    cacheRates(rates)
    return rates
  } catch (error) {
    console.error('Failed to fetch conversion rates:', error)
    // Fallback rates
    return {
      'BYN-USD': 0.3077,
      'BYN-RUB': 28.46,
      'USD-BYN': 3.25,
      'USD-RUB': 92.5,
      'RUB-BYN': 0.0351,
      'RUB-USD': 0.0108,
      lastUpdated: new Date(),
    }
  }
}

// Получить курсы для отображения в зависимости от выбранной валюты
export const getConversionPairs = (
  selectedCurrency: CurrencyCode
): Array<{ pair: string; rate: number; label: string }> => {
  const pairs: Record<CurrencyCode, Array<{ pair: string; label: string }>> = {
    BYN: [
      { pair: 'BYN-USD', label: 'BYN → USD' },
      { pair: 'BYN-RUB', label: 'BYN → RUB' },
    ],
    RUB: [
      { pair: 'RUB-BYN', label: 'RUB → BYN' },
      { pair: 'RUB-USD', label: 'RUB → USD' },
    ],
    USD: [
      { pair: 'USD-BYN', label: 'USD → BYN' },
      { pair: 'USD-RUB', label: 'USD → RUB' },
    ],
  }

  return pairs[selectedCurrency].map(({ pair, label }) => ({
    pair,
    rate: 0, // Будет заполнено после загрузки
    label,
  }))
}

// Форматировать курс для отображения
export const formatConversionRate = (rate: number, pair: string): string => {
  const [from, to] = pair.split('-')
  return `1 ${from} = ${rate.toFixed(4)} ${to}`
}

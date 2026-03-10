import type { CurrencyCode } from '../types'

const CACHE_KEY = 'currencyConversionCache_v2'
const CACHE_DURATION = 1000 * 60 * 5 // 5 минут для более актуальных данных

export interface ConversionRate {
  rate: number
  source: string
  lastUpdated: Date
  isOfficial: boolean
}

export interface ConversionRates {
  'BYN-USD': ConversionRate
  'BYN-RUB': ConversionRate
  'USD-BYN': ConversionRate
  'USD-RUB': ConversionRate
  'RUB-BYN': ConversionRate
  'RUB-USD': ConversionRate
}

interface CacheData {
  rates: ConversionRates
  timestamp: number
}

// Источники данных
const SOURCES = {
  NBRB: 'НБРБ (Нацбанк РБ)',
  CBR: 'ЦБ РФ',
  FALLBACK: 'Fallback (устаревшие данные)',
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
      'BYN-USD': { ...data.rates['BYN-USD'], lastUpdated: new Date(data.rates['BYN-USD'].lastUpdated) },
      'BYN-RUB': { ...data.rates['BYN-RUB'], lastUpdated: new Date(data.rates['BYN-RUB'].lastUpdated) },
      'USD-BYN': { ...data.rates['USD-BYN'], lastUpdated: new Date(data.rates['USD-BYN'].lastUpdated) },
      'USD-RUB': { ...data.rates['USD-RUB'], lastUpdated: new Date(data.rates['USD-RUB'].lastUpdated) },
      'RUB-BYN': { ...data.rates['RUB-BYN'], lastUpdated: new Date(data.rates['RUB-BYN'].lastUpdated) },
      'RUB-USD': { ...data.rates['RUB-USD'], lastUpdated: new Date(data.rates['RUB-USD'].lastUpdated) },
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

// Retry logic для fetch
const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<Response> => {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response
  } catch (error) {
    if (retries > 0) {
      console.log(`[API] Retrying ${url}... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchWithRetry(url, retries - 1, delay * 2)
    }
    throw error
  }
}

// Получить курс BYN из НБРБ
const fetchBYNRate = async (): Promise<{ rate: number; source: string }> => {
  try {
    console.log('[API] Fetching BYN rate from NBRB...')
    const response = await fetchWithRetry('https://api.nbrb.by/exrates/rates/USD?parammode=2')
    const data = await response.json()
    const rate = data.Cur_OfficialRate
    console.log('[API] ✓ BYN rate fetched:', rate, 'BYN per 1 USD')
    return { rate, source: SOURCES.NBRB }
  } catch (error) {
    console.error('[API] ✗ Failed to fetch BYN rate:', error)
    console.warn('[API] Using fallback BYN rate: 3.25')
    return { rate: 3.25, source: SOURCES.FALLBACK }
  }
}

// Получить курс RUB из ЦБ РФ
const fetchRUBRate = async (): Promise<{ rate: number; source: string }> => {
  try {
    console.log('[API] Fetching RUB rate from CBR...')
    const response = await fetchWithRetry('https://www.cbr-xml-daily.ru/daily_json.js')
    const data = await response.json()
    const rate = data.Valute.USD.Value
    console.log('[API] ✓ RUB rate fetched:', rate, 'RUB per 1 USD')
    return { rate, source: SOURCES.CBR }
  } catch (error) {
    console.error('[API] ✗ Failed to fetch RUB rate:', error)
    console.warn('[API] Using fallback RUB rate: 92.5')
    return { rate: 92.5, source: SOURCES.FALLBACK }
  }
}

// Создать объект курса
const createRate = (rate: number, source: string): ConversionRate => ({
  rate,
  source,
  lastUpdated: new Date(),
  isOfficial: source !== SOURCES.FALLBACK,
})

// Загрузить курсы конверсии
export const fetchConversionRates = async (): Promise<ConversionRates> => {
  const cached = getCachedRates()
  if (cached) {
    console.log('[API] Using cached rates')
    return cached
  }

  console.log('[API] Fetching fresh rates...')

  try {
    const [bynData, rubData] = await Promise.all([fetchBYNRate(), fetchRUBRate()])

    // Определяем общий источник
    const allOfficial = bynData.source !== SOURCES.FALLBACK && rubData.source !== SOURCES.FALLBACK
    const source = allOfficial 
      ? `${SOURCES.NBRB} / ${SOURCES.CBR}` 
      : bynData.source === SOURCES.FALLBACK && rubData.source === SOURCES.FALLBACK
        ? SOURCES.FALLBACK
        : `${bynData.source === SOURCES.FALLBACK ? SOURCES.CBR : SOURCES.NBRB} (частично)`

    // Рассчитываем все пары конверсии
    const rates: ConversionRates = {
      'BYN-USD': createRate(1 / bynData.rate, source),
      'BYN-RUB': createRate(rubData.rate / bynData.rate, source),
      'USD-BYN': createRate(bynData.rate, source),
      'USD-RUB': createRate(rubData.rate, source),
      'RUB-BYN': createRate(bynData.rate / rubData.rate, source),
      'RUB-USD': createRate(1 / rubData.rate, source),
    }

    cacheRates(rates)
    console.log('[API] Rates cached successfully')
    return rates
  } catch (error) {
    console.error('[API] Critical error fetching rates:', error)
    const source = SOURCES.FALLBACK
    
    return {
      'BYN-USD': createRate(0.3077, source),
      'BYN-RUB': createRate(28.46, source),
      'USD-BYN': createRate(3.25, source),
      'USD-RUB': createRate(92.5, source),
      'RUB-BYN': createRate(0.0351, source),
      'RUB-USD': createRate(0.0108, source),
    }
  }
}

// Получить источник данных
export const getRateSource = (rates: ConversionRates): string => {
  return rates['USD-BYN'].source
}

// Проверить, являются ли данные актуальными
export const areRatesFresh = (rates: ConversionRates): boolean => {
  return rates['USD-BYN'].isOfficial
}

// Получить время последнего обновления
export const getLastUpdateTime = (rates: ConversionRates): Date => {
  return rates['USD-BYN'].lastUpdated
}

// Получить курсы для отображения в зависимости от выбранной валюты
export const getConversionPairs = (
  rates: ConversionRates,
  selectedCurrency: CurrencyCode
): Array<{ pair: string; rate: number; label: string }> => {
  const pairs: Record<CurrencyCode, Array<{ pair: keyof ConversionRates; label: string }>> = {
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
    rate: rates[pair].rate,
    label,
  }))
}

// Форматировать курс для отображения
export const formatConversionRate = (rate: number, pair: string): string => {
  const [from, to] = pair.split('-')
  return `1 ${from} = ${rate.toFixed(4)} ${to}`
}

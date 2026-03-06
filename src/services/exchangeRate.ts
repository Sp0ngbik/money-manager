import type { ExchangeRates } from '../types'

const CACHE_KEY = 'exchangeRatesCache'
const CACHE_DURATION = 1000 * 60 * 60

const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  BYN: 3.25,
  RUB: 92.5,
  lastUpdated: new Date(),
}

interface CacheData {
  rates: ExchangeRates
  timestamp: number
}

const getCachedRates = (): ExchangeRates | null => {
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

const cacheRates = (rates: ExchangeRates): void => {
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

const fetchBYNRate = async (): Promise<number> => {
  try {
    const response = await fetch('https://api.nbrb.by/exrates/rates/USD?parammode=2')
    if (!response.ok) throw new Error('Failed to fetch BYN rate')
    
    const data = await response.json()
    return data.Cur_OfficialRate
  } catch (error) {
    console.warn('Failed to fetch BYN rate, using fallback:', error)
    return FALLBACK_RATES.BYN
  }
}

const fetchRUBRate = async (): Promise<number> => {
  try {
    const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js')
    if (!response.ok) throw new Error('Failed to fetch RUB rate')
    
    const data = await response.json()
    const usdRate = data.Valute.USD.Value
    return usdRate
  } catch (error) {
    console.warn('Failed to fetch RUB rate, using fallback:', error)
    return FALLBACK_RATES.RUB
  }
}

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const cached = getCachedRates()
  if (cached) {
    return cached
  }

  try {
    const [bynRate, rubRate] = await Promise.all([
      fetchBYNRate(),
      fetchRUBRate(),
    ])

    const rates: ExchangeRates = {
      USD: 1,
      BYN: bynRate,
      RUB: rubRate,
      lastUpdated: new Date(),
    }

    cacheRates(rates)
    return rates
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return FALLBACK_RATES
  }
}

export const formatUSD = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export const formatBYN = (amount: number): string => {
  return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Br`
}

export const formatRUB = (amount: number): string => {
  return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
}

export const convertAmount = (
  amountUSD: number,
  targetCurrency: 'BYN' | 'RUB',
  rates: ExchangeRates
): number => {
  return Math.round(amountUSD * rates[targetCurrency])
}

export const getFormatter = (currency: 'BYN' | 'RUB') => {
  return currency === 'BYN' ? formatBYN : formatRUB
}

import type { CurrencyCode } from '../types'

// Типы для курсов валют
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

// Типы для API Тинькофф
interface TinkoffRate {
  category: string
  fromCurrency: {
    code: number
    name: string
    strCode: string
  }
  toCurrency: {
    code: number
    name: string
    strCode: string
  }
  buy: number
  sell: number
}

interface TinkoffResponse {
  trackingId: string
  resultCode: string
  payload: {
    lastUpdate: {
      milliseconds: number
    }
    rates: TinkoffRate[]
  }
}

// Кэш
const CACHE_KEY = 'currencyConversionCache_v2'
const CACHE_DURATION = 1000 * 60 * 30 // 30 минут

// Получить кэшированные курсы
const getCachedRates = (): ConversionRates | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data = JSON.parse(cached)
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
    const data = { rates, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore localStorage errors
  }
}

// Получить курсы от Тинькофф
const fetchTinkoffRates = async (): Promise<Partial<ConversionRates> | null> => {
  try {
    const response = await fetch('https://www.tinkoff.ru/api/v1/currency_rates/')
    if (!response.ok) throw new Error('Tinkoff API error')

    const data: TinkoffResponse = await response.json()
    const rates = data.payload.rates

    // Находим курсы для ATM операций
    const usdToRub = rates.find(
      (r) => r.category === 'ATMCashoutRateGroup' && r.fromCurrency.name === 'USD' && r.toCurrency.name === 'RUB'
    )

    if (!usdToRub) return null

    return {
      'USD-RUB': {
        rate: usdToRub.sell, // Продажа USD (покупаем за RUB)
        source: 'Тинькофф Банк',
        lastUpdated: new Date(data.payload.lastUpdate.milliseconds),
        isOfficial: false,
      },
      'RUB-USD': {
        rate: 1 / usdToRub.buy, // Покупка USD (продаем RUB)
        source: 'Тинькофф Банк',
        lastUpdated: new Date(data.payload.lastUpdate.milliseconds),
        isOfficial: false,
      },
    }
  } catch (error) {
    console.error('Error fetching Tinkoff rates:', error)
    return null
  }
}

// Получить официальные курсы (НБРБ + ЦБ РФ)
const fetchOfficialRates = async (): Promise<ConversionRates> => {
  try {
    const [bynResponse, rubResponse] = await Promise.all([
      fetch('https://api.nbrb.by/exrates/rates/USD?parammode=2'),
      fetch('https://www.cbr-xml-daily.ru/daily_json.js'),
    ])

    if (!bynResponse.ok || !rubResponse.ok) {
      throw new Error('Failed to fetch official rates')
    }

    const bynData = await bynResponse.json()
    const rubData = await rubResponse.json()

    const bynRate = bynData.Cur_OfficialRate
    const rubRate = rubData.Valute.USD.Value

    const now = new Date()

    return {
      'BYN-USD': { rate: 1 / bynRate, source: 'НБРБ', lastUpdated: now, isOfficial: true },
      'BYN-RUB': { rate: rubRate / bynRate, source: 'НБРБ/ЦБ РФ', lastUpdated: now, isOfficial: true },
      'USD-BYN': { rate: bynRate, source: 'НБРБ', lastUpdated: now, isOfficial: true },
      'USD-RUB': { rate: rubRate, source: 'ЦБ РФ', lastUpdated: now, isOfficial: true },
      'RUB-BYN': { rate: bynRate / rubRate, source: 'НБРБ/ЦБ РФ', lastUpdated: now, isOfficial: true },
      'RUB-USD': { rate: 1 / rubRate, source: 'ЦБ РФ', lastUpdated: now, isOfficial: true },
    }
  } catch (error) {
    console.error('Error fetching official rates:', error)
    // Fallback rates
    const now = new Date()
    return {
      'BYN-USD': { rate: 0.3426, source: 'Fallback', lastUpdated: now, isOfficial: false },
      'BYN-RUB': { rate: 26.87, source: 'Fallback', lastUpdated: now, isOfficial: false },
      'USD-BYN': { rate: 2.9189, source: 'Fallback', lastUpdated: now, isOfficial: false },
      'USD-RUB': { rate: 78.74, source: 'Fallback', lastUpdated: now, isOfficial: false },
      'RUB-BYN': { rate: 0.0372, source: 'Fallback', lastUpdated: now, isOfficial: false },
      'RUB-USD': { rate: 0.0127, source: 'Fallback', lastUpdated: now, isOfficial: false },
    }
  }
}

// Основная функция получения курсов
export const fetchConversionRates = async (): Promise<ConversionRates> => {
  // Проверяем кэш
  const cached = getCachedRates()
  if (cached) {
    console.log('Using cached conversion rates')
    return cached
  }

  console.log('Fetching fresh conversion rates...')

  // Получаем официальные курсы
  const officialRates = await fetchOfficialRates()

  // Пробуем получить курсы Тинькофф
  const tinkoffRates = await fetchTinkoffRates()

  // Если Тинькофф доступен, обновляем USD-RUB пары
  const finalRates: ConversionRates = {
    ...officialRates,
    ...(tinkoffRates || {}),
  }

  // Сохраняем в кэш
  cacheRates(finalRates)

  return finalRates
}

// Получить курсы для конкретного банка
export const getBankRates = async (bankName: string): Promise<ConversionRates> => {
  const baseRates = await fetchConversionRates()
  const lowerBankName = bankName.toLowerCase()

  // Для Тинькофф возвращаем реальные курсы
  if (lowerBankName.includes('тинькофф') || lowerBankName.includes('tinkoff')) {
    const tinkoffRates = await fetchTinkoffRates()
    if (tinkoffRates?.['USD-RUB']) {
      return {
        ...baseRates,
        ...tinkoffRates,
      }
    }
  }

  // Для других банков добавляем спред к официальным курсам
  // Спред зависит от "крупности" банка
  let spread = 0.02 // 2% по умолчанию

  if (
    lowerBankName.includes('беларусбанк') ||
    lowerBankName.includes('сбер') ||
    lowerBankName.includes('альфа') ||
    lowerBankName.includes('втб')
  ) {
    spread = 0.015 // 1.5% для крупных банков
  } else if (
    lowerBankName.includes('техно') ||
    lowerBankName.includes('статус') ||
    lowerBankName.includes('бсб')
  ) {
    spread = 0.025 // 2.5% для мелких банков
  }

  // Применяем спред к официальным курсам
  const now = new Date()
  return {
    'BYN-USD': {
      rate: baseRates['BYN-USD'].rate * (1 - spread),
      source: `${bankName} (≈${(spread * 100).toFixed(1)}%)`,
      lastUpdated: now,
      isOfficial: false,
    },
    'BYN-RUB': {
      rate: baseRates['BYN-RUB'].rate * (1 - spread),
      source: `${bankName} (≈${(spread * 100).toFixed(1)}%)`,
      lastUpdated: now,
      isOfficial: false,
    },
    'USD-BYN': {
      rate: baseRates['USD-BYN'].rate * (1 + spread),
      source: `${bankName} (≈${(spread * 100).toFixed(1)}%)`,
      lastUpdated: now,
      isOfficial: false,
    },
    'USD-RUB': {
      rate: baseRates['USD-RUB'].rate * (1 + spread),
      source: `${bankName} (≈${(spread * 100).toFixed(1)}%)`,
      lastUpdated: now,
      isOfficial: false,
    },
    'RUB-BYN': {
      rate: baseRates['RUB-BYN'].rate * (1 - spread),
      source: `${bankName} (≈${(spread * 100).toFixed(1)}%)`,
      lastUpdated: now,
      isOfficial: false,
    },
    'RUB-USD': {
      rate: baseRates['RUB-USD'].rate * (1 - spread),
      source: `${bankName} (≈${(spread * 100).toFixed(1)}%)`,
      lastUpdated: now,
      isOfficial: false,
    },
  }
}

// Получить источник данных
export const getRateSource = (rates: ConversionRates): string => {
  return rates['USD-BYN'].source
}

// Проверить, являются ли данные официальными
export const areRatesOfficial = (rates: ConversionRates): boolean => {
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

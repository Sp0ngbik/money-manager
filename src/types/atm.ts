import type { CurrencyCode } from './index'

export interface Atm {
  id: string
  lat: number
  lon: number
  name?: string
  operator?: string
  address?: string
  distance?: number
  supportedCurrencies?: CurrencyCode[] // Валюты, поддерживаемые банкоматом
}

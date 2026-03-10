import type { Atm } from '../types/atm'

interface OverpassElement {
  id: number
  lat: number
  lon: number
  tags?: {
    name?: string
    operator?: string
    'addr:street'?: string
    'addr:housenumber'?: string
  }
}

interface OverpassResponse {
  elements: OverpassElement[]
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000
  const toRad = (value: number): number => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Fetch с таймаутом
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout = 15000
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Retry logic
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> => {
  try {
    return await fetchWithTimeout(url, options, 15000)
  } catch (error) {
    if (retries > 0) {
      console.log(`[ATM API] Retry attempt... (${retries} left)`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, retries - 1, delay * 1.5)
    }
    throw error
  }
}

export const fetchNearbyAtms = async (
  lat: number,
  lon: number,
  radius = 2000,
  signal?: AbortSignal
): Promise<Atm[]> => {
  const query = `
    [out:json];
    node["amenity"="atm"](around:${radius},${lat},${lon});
    out body;
  `

  console.log(`[ATM API] Fetching ATMs for radius ${radius}m at ${lat},${lon}`)

  try {
    const response = await fetchWithRetry(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        body: query,
        signal,
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data: OverpassResponse = await response.json()
    console.log(`[ATM API] Found ${data.elements.length} ATMs`)

    const atms = data.elements.map((element): Atm => {
      const address = element.tags?.['addr:street']
        ? `${element.tags['addr:street']} ${element.tags['addr:housenumber'] || ''}`.trim()
        : undefined

      return {
        id: element.id.toString(),
        lat: element.lat,
        lon: element.lon,
        name: element.tags?.name,
        operator: element.tags?.operator,
        address,
        distance: Math.round(calculateDistance(lat, lon, element.lat, element.lon)),
      }
    })

    const sortedAtms = atms.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    console.log(`[ATM API] Returning ${sortedAtms.length} sorted ATMs`)

    return sortedAtms
  } catch (error) {
    console.error('[ATM API] Error fetching ATMs:', error)
    // Возвращаем пустой массив вместо ошибки, чтобы не ломать UI
    return []
  }
}

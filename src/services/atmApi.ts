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

export const fetchNearbyAtms = async (
  lat: number,
  lon: number,
  radius = 2000
): Promise<Atm[]> => {
  const query = `
    [out:json];
    node["amenity"="atm"](around:${radius},${lat},${lon});
    out body;
  `

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  })

  if (!response.ok) {
    throw new Error('Failed to fetch ATMs')
  }

  const data: OverpassResponse = await response.json()

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

  return atms.sort((a, b) => (a.distance || 0) - (b.distance || 0))
}

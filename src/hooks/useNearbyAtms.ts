import { useEffect, useRef, useReducer, useCallback } from 'react'
import type { Atm } from '../types/atm'
import { fetchNearbyAtms } from '../services/atmApi'

interface UseNearbyAtmsState {
  atms: Atm[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'RESET' }
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: Atm[] }
  | { type: 'ERROR'; payload: string }

const initialState: UseNearbyAtmsState = {
  atms: [],
  loading: false,
  error: null,
}

function reducer(state: UseNearbyAtmsState, action: Action): UseNearbyAtmsState {
  switch (action.type) {
    case 'RESET':
      return initialState
    case 'LOADING':
      return { ...state, loading: true, error: null }
    case 'SUCCESS':
      return { atms: action.payload, loading: false, error: null }
    case 'ERROR':
      return { atms: [], loading: false, error: action.payload }
    default:
      return state
  }
}

export const useNearbyAtms = (
  latitude: number | null,
  longitude: number | null,
  radius: number = 2000
): UseNearbyAtmsState & { reload: () => void } => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const lastParamsRef = useRef<{ lat: number; lon: number; radius: number } | null>(null)

  const loadAtms = useCallback(() => {
    if (latitude === null || longitude === null) {
      dispatch({ type: 'RESET' })
      return
    }

    // Проверяем, изменились ли параметры
    if (
      lastParamsRef.current &&
      lastParamsRef.current.lat === latitude &&
      lastParamsRef.current.lon === longitude &&
      lastParamsRef.current.radius === radius
    ) {
      return
    }

    lastParamsRef.current = { lat: latitude, lon: longitude, radius }

    dispatch({ type: 'LOADING' })

    fetchNearbyAtms(latitude, longitude, radius)
      .then((atms) => {
        // Фильтруем банкоматы, оставляя только те, что в пределах радиуса
        const filteredAtms = atms.filter((atm) => {
          const distance = atm.distance || 0
          return distance <= radius
        })
        dispatch({ type: 'SUCCESS', payload: filteredAtms })
      })
      .catch(() => {
        dispatch({ type: 'ERROR', payload: 'Не удалось загрузить банкоматы' })
      })
  }, [latitude, longitude, radius])

  useEffect(() => {
    loadAtms()
  }, [loadAtms])

  return { ...state, reload: loadAtms }
}

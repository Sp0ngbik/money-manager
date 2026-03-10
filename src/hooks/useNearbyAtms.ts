import { useEffect, useRef, useReducer } from 'react'
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
  longitude: number | null
): UseNearbyAtmsState => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (latitude === null || longitude === null) {
      dispatch({ type: 'RESET' })
      return
    }

    // Проверяем, изменились ли координаты
    if (
      lastCoordsRef.current &&
      lastCoordsRef.current.lat === latitude &&
      lastCoordsRef.current.lon === longitude
    ) {
      return
    }

    lastCoordsRef.current = { lat: latitude, lon: longitude }

    dispatch({ type: 'LOADING' })

    fetchNearbyAtms(latitude, longitude)
      .then((atms) => {
        dispatch({ type: 'SUCCESS', payload: atms })
      })
      .catch(() => {
        dispatch({ type: 'ERROR', payload: 'Не удалось загрузить банкоматы' })
      })
  }, [latitude, longitude])

  return state
}

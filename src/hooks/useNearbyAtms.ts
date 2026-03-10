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
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadingRef = useRef(false)

  const loadAtms = useCallback(async () => {
    if (latitude === null || longitude === null) {
      dispatch({ type: 'RESET' })
      return
    }

    // Отменяем предыдущий запрос если он есть
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Создаем новый AbortController
    abortControllerRef.current = new AbortController()

    // Если уже загружаем - не начинаем новую загрузку
    if (isLoadingRef.current) {
      console.log('[useNearbyAtms] Already loading, skipping...')
      return
    }

    isLoadingRef.current = true
    dispatch({ type: 'LOADING' })

    try {
      console.log(`[useNearbyAtms] Loading ATMs for radius ${radius}m`)
      const atms = await fetchNearbyAtms(
        latitude,
        longitude,
        radius,
        abortControllerRef.current.signal
      )
      
      // Проверяем не был ли запрос отменен
      if (!abortControllerRef.current.signal.aborted) {
        console.log(`[useNearbyAtms] Loaded ${atms.length} ATMs`)
        dispatch({ type: 'SUCCESS', payload: atms })
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[useNearbyAtms] Request was aborted')
        return
      }
      
      console.error('[useNearbyAtms] Error:', error)
      dispatch({ type: 'ERROR', payload: 'Не удалось загрузить банкоматы' })
    } finally {
      isLoadingRef.current = false
    }
  }, [latitude, longitude, radius])

  useEffect(() => {
    loadAtms()

    // Cleanup при размонтировании или изменении зависимостей
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadAtms])

  return { ...state, reload: loadAtms }
}

import { useEffect, useRef, useReducer, useCallback } from 'react'
import type { Atm } from '../types/atm'
import { fetchNearbyAtms } from '../services/atmApi'

interface UseNearbyAtmsState {
  atms: Atm[]
  loading: boolean
  error: string | null
  isRateLimited: boolean
}

type Action =
  | { type: 'RESET' }
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: Atm[] }
  | { type: 'ERROR'; payload: string; isRateLimited?: boolean }
  | { type: 'RATE_LIMITED' }

const initialState: UseNearbyAtmsState = {
  atms: [],
  loading: false,
  error: null,
  isRateLimited: false,
}

function reducer(state: UseNearbyAtmsState, action: Action): UseNearbyAtmsState {
  switch (action.type) {
    case 'RESET':
      return initialState
    case 'LOADING':
      return { ...state, loading: true, error: null, isRateLimited: false }
    case 'SUCCESS':
      return { atms: action.payload, loading: false, error: null, isRateLimited: false }
    case 'ERROR':
      return { 
        atms: [], 
        loading: false, 
        error: action.payload,
        isRateLimited: action.isRateLimited || false 
      }
    case 'RATE_LIMITED':
      return { ...state, loading: false, isRateLimited: true }
    default:
      return state
  }
}

// Кеш для банкоматов (30 минут)
const CACHE_KEY_PREFIX = 'atmCache_'
const CACHE_DURATION = 1000 * 60 * 30 // 30 минут

const getCacheKey = (lat: number, lon: number, radius: number): string => {
  // Округляем координаты для кеша (чтобы не создавать слишком много ключей)
  const roundedLat = Math.round(lat * 100) / 100
  const roundedLon = Math.round(lon * 100) / 100
  return `${CACHE_KEY_PREFIX}${roundedLat}_${roundedLon}_${radius}`
}

const getCachedAtms = (lat: number, lon: number, radius: number): Atm[] | null => {
  try {
    const key = getCacheKey(lat, lon, radius)
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

const cacheAtms = (lat: number, lon: number, radius: number, atms: Atm[]): void => {
  try {
    const key = getCacheKey(lat, lon, radius)
    localStorage.setItem(key, JSON.stringify({ data: atms, timestamp: Date.now() }))
  } catch {
    // Ignore localStorage errors
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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadAtms = useCallback(async () => {
    if (latitude === null || longitude === null) {
      dispatch({ type: 'RESET' })
      return
    }

    // Проверяем кеш сначала
    const cached = getCachedAtms(latitude, longitude, radius)
    if (cached) {
      console.log(`[useNearbyAtms] Using cached ATMs for radius ${radius}m`)
      dispatch({ type: 'SUCCESS', payload: cached })
      return
    }

    // Отменяем предыдущий таймер debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce: ждем 1.5 секунды после последнего изменения
    debounceTimerRef.current = setTimeout(async () => {
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
          // Сохраняем в кеш
          cacheAtms(latitude, longitude, radius, atms)
          dispatch({ type: 'SUCCESS', payload: atms })
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[useNearbyAtms] Request was aborted')
          return
        }
        
        // Проверяем на 429 ошибку
        if (error instanceof Error && error.message.includes('429')) {
          console.error('[useNearbyAtms] Rate limited (429)')
          dispatch({ 
            type: 'ERROR', 
            payload: 'Слишком много запросов. Подождите 10-15 секунд и попробуйте снова.',
            isRateLimited: true 
          })
        } else {
          console.error('[useNearbyAtms] Error:', error)
          dispatch({ type: 'ERROR', payload: 'Не удалось загрузить банкоматы' })
        }
      } finally {
        isLoadingRef.current = false
      }
    }, 1500) // 1.5 секунды debounce

    // Cleanup для debounce timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [latitude, longitude, radius])

  useEffect(() => {
    loadAtms()

    // Cleanup при размонтировании или изменении зависимостей
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadAtms])

  return { ...state, reload: loadAtms }
}

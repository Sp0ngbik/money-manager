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

const getCacheKey = (lat: number, lon: number): string => {
  // Округляем координаты для кеша (чтобы не создавать слишком много ключей)
  const roundedLat = Math.round(lat * 100) / 100
  const roundedLon = Math.round(lon * 100) / 100
  return `${CACHE_KEY_PREFIX}${roundedLat}_${roundedLon}`
}

interface CachedData {
  data: Atm[]
  radius: number
  timestamp: number
}

const getCachedAtms = (lat: number, lon: number): CachedData | null => {
  try {
    const key = getCacheKey(lat, lon)
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const parsed: CachedData = JSON.parse(cached)
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const cacheAtms = (lat: number, lon: number, radius: number, atms: Atm[]): void => {
  // Не кешируем пустые результаты (ошибки API)
  if (atms.length === 0) return
  
  try {
    const key = getCacheKey(lat, lon)
    localStorage.setItem(key, JSON.stringify({ data: atms, radius, timestamp: Date.now() }))
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

    // Проверяем кеш сначала (умное кеширование с нарастанием радиуса)
    const cached = getCachedAtms(latitude, longitude)
    if (cached) {
      if (cached.radius >= radius) {
        // В кеше уже есть данные для большего или равного радиуса - фильтруем
        const filteredAtms = cached.data.filter(atm => (atm.distance || 0) <= radius)
        console.log(`[useNearbyAtms] Using cached ATMs (cached radius: ${cached.radius}m, requested: ${radius}m, filtered: ${filteredAtms.length})`)
        dispatch({ type: 'SUCCESS', payload: filteredAtms })
        return
      }
      // В кеше данные для меньшего радиуса - будем расширять
      console.log(`[useNearbyAtms] Cache has smaller radius (${cached.radius}m), expanding to ${radius}m`)
    }

    // Отменяем предыдущий таймер debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce: ждем 500 мс после последнего изменения (быстрая реакция + защита API)
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
          
          // Объединяем с кешем если он есть (умное кеширование)
          let finalAtms = atms
          if (cached && cached.radius < radius && cached.data.length > 0) {
            // Объединяем старые и новые данные, удаляем дубликаты
            const existingIds = new Set(atms.map(a => a.id))
            const uniqueOldAtms = cached.data.filter(a => !existingIds.has(a.id))
            finalAtms = [...atms, ...uniqueOldAtms]
            console.log(`[useNearbyAtms] Merged with cache: ${finalAtms.length} total ATMs`)
          }
          
          // Сохраняем в кеш только если получили данные
          cacheAtms(latitude, longitude, radius, finalAtms)
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
    }, 500) // 500 мс debounce (быстрая реакция + защита API)

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

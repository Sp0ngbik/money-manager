import { useEffect, useRef, useState, useCallback } from 'react'

interface GeolocationResult {
  latitude: number | null
  longitude: number | null
  loading: boolean
  error: string | null
}

const STORAGE_KEY = 'lastLocation'

interface StoredLocation {
  latitude: number
  longitude: number
  timestamp: number
}

const getStoredLocation = (): StoredLocation | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as StoredLocation
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

const saveLocation = (latitude: number, longitude: number): void => {
  try {
    const location: StoredLocation = {
      latitude,
      longitude,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
  } catch {
    // Ignore storage errors
  }
}

export const useGeolocation = (): GeolocationResult => {
  const [result, setResult] = useState<GeolocationResult>(() => {
    // Проверяем поддержку геолокации
    if (!navigator.geolocation) {
      // Пробуем получить из localStorage
      const stored = getStoredLocation()
      if (stored) {
        return {
          latitude: stored.latitude,
          longitude: stored.longitude,
          loading: false,
          error: null,
        }
      }
      return {
        latitude: null,
        longitude: null,
        loading: false,
        error: 'Местоположение не найдено',
      }
    }
    return {
      latitude: null,
      longitude: null,
      loading: true,
      error: null,
    }
  })

  const hasRequestedRef = useRef(false)

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords
    saveLocation(latitude, longitude)
    setResult({
      latitude,
      longitude,
      loading: false,
      error: null,
    })
  }, [])

  const handleError = useCallback(() => {
    const stored = getStoredLocation()
    if (stored) {
      setResult({
        latitude: stored.latitude,
        longitude: stored.longitude,
        loading: false,
        error: null,
      })
    } else {
      setResult({
        latitude: null,
        longitude: null,
        loading: false,
        error: 'Местоположение не найдено',
      })
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation || hasRequestedRef.current) {
      return
    }

    hasRequestedRef.current = true

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [handleSuccess, handleError])

  return result
}

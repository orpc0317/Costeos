import { useEffect, useState } from 'react'

/**
 * useDebounce — retarda la propagación de un valor hasta que el usuario
 * deja de cambiar el input durante `delay` milisegundos.
 *
 * Uso: const debouncedQuery = useDebounce(searchQuery, 400)
 * → Solo lanza efectos/queries cuando el usuario deja de escribir 400ms.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

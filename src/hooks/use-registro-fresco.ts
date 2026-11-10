'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Al abrir un modal en Ver, vuelve a leer ese registro (y lo que el action
 * resuelva con él) y pinta el resultado. No toca `mode`.
 * Editar queda bloqueado mientras la lectura no termina, para no guardar
 * un registroVersion viejo.
 */
export function useRegistroFresco<T extends { id: number }>(opts: {
  open: boolean
  mode: string
  registro?: T
  obtener: (id: number) => Promise<T | null>
  onActualizado?: (row: T) => void
  aplicar: (row: T) => void
}) {
  const { open, mode, registro, obtener, onActualizado, aplicar } = opts
  const [ficha, setFicha] = useState<T | undefined>(registro)
  const [lecturaDe, setLecturaDe] = useState<number | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const aplicarRef = useRef(aplicar)
  aplicarRef.current = aplicar
  const obtenerRef = useRef(obtener)
  obtenerRef.current = obtener
  const onRef = useRef(onActualizado)
  onRef.current = onActualizado
  const registroRef = useRef(registro)
  registroRef.current = registro

  useEffect(() => {
    if (!open) {
      setLecturaDe(null)
      return
    }
    const actual = registroRef.current
    setFicha(actual)
    if (!actual?.id) return
    let activo = true
    obtenerRef.current(actual.id)
      .then((fresco) => {
        if (!activo || !fresco) return
        if (modeRef.current !== 'view') return
        setFicha(fresco)
        aplicarRef.current(fresco)
        onRef.current?.(fresco)
      })
      .finally(() => {
        if (activo) setLecturaDe(actual.id)
      })
    return () => { activo = false }
  }, [open])

  const cargando = Boolean(open && registro?.id && lecturaDe !== registro.id)
  return { ficha: ficha ?? registro, cargando }
}

export function reemplazarFila<T extends { id: number }>(rows: T[], row: T): T[] {
  const idx = rows.findIndex((r) => r.id === row.id)
  if (idx < 0) return rows
  const next = rows.slice()
  next[idx] = row
  return next
}

'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UI_THEME } from '@/lib/theme'
import { CATALOGO_ICONOS, IconoDibujo, etiquetaIcono, nombreIcono } from '@/lib/iconos'

interface IconoPickerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  viewMode?: boolean
}

export function IconoPicker({ id, value, onChange, disabled = false, viewMode = false }: IconoPickerProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [montado, setMontado] = useState(false)
  const [estilo, setEstilo] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const canonico = nombreIcono(value)
  const etiqueta = canonico ? etiquetaIcono(canonico) : value.trim()

  useEffect(() => { setMontado(true) }, [])

  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase().replace(/[\s_]+/g, '-')
    if (!q) return CATALOGO_ICONOS
    return CATALOGO_ICONOS.filter((nombre) => nombre.includes(q) || etiquetaIcono(nombre).toLowerCase().includes(busqueda.trim().toLowerCase()))
  }, [busqueda])

  const visibles = coincidencias

  const recalcular = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const ancho = 360
    const alto = 360
    const abrirAbajo = rect.bottom + alto <= window.innerHeight || rect.top < alto
    const left = Math.min(rect.left, window.innerWidth - ancho - 8)
    setEstilo({
      position: 'fixed',
      left: Math.max(8, left),
      width: ancho,
      zIndex: 9999,
      ...(abrirAbajo
        ? { top: rect.bottom + 4 }
        : { bottom: window.innerHeight - rect.top + 4 }),
    })
  }, [])

  useEffect(() => {
    if (!abierto) {
      setBusqueda('')
      return
    }
    recalcular()
    window.addEventListener('scroll', recalcular, true)
    window.addEventListener('resize', recalcular)
    return () => {
      window.removeEventListener('scroll', recalcular, true)
      window.removeEventListener('resize', recalcular)
    }
  }, [abierto, recalcular])

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const elegir = (nombre: string) => {
    onChange(nombre)
    setAbierto(false)
  }

  const panel = (
    <div
      ref={panelRef}
      style={estilo}
      className="rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
    >
      <div className={UI_THEME.select.searchArea}>
        <div className="relative">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            className={UI_THEME.select.searchInput}
            placeholder="Buscar icono"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 border-b">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => elegir('')}
        >
          Sin icono
        </button>
        <span className="text-[11px] text-muted-foreground">{coincidencias.length}</span>
      </div>
      {visibles.length === 0 ? (
        <div className={UI_THEME.select.emptyState}>No se encontraron iconos.</div>
      ) : (
        <div className="grid grid-cols-6 gap-1 p-2 max-h-80 overflow-y-auto">
          {visibles.map((nombre) => (
            <button
              key={nombre}
              type="button"
              title={etiquetaIcono(nombre)}
              onClick={() => elegir(nombre)}
              className={cn(
                'flex aspect-square items-center justify-center rounded-md hover:bg-accent',
                canonico === nombre && 'bg-accent ring-2 ring-primary',
              )}
            >
              <IconoDibujo nombre={nombre} className="h-7 w-7" />
            </button>
          ))}
        </div>
      )}
      <p className="px-2 py-1.5 text-center text-[10px] text-muted-foreground border-t">
        Dibujos de game-icons.net, CC BY 3.0
      </p>
    </div>
  )

  return (
    <div className="relative w-full">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-disabled={disabled || undefined}
        data-view-mode={viewMode || undefined}
        onClick={(e) => {
          if (disabled) { e.preventDefault(); return }
          if (!abierto) recalcular()
          setAbierto((prev) => !prev)
        }}
        className={cn(
          UI_THEME.forms.inputBase,
          'flex w-full min-w-0 items-center justify-between text-left',
          !etiqueta && 'text-muted-foreground',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <IconoDibujo nombre={canonico} className="h-4 w-4 shrink-0" />
          <span className="truncate">{etiqueta || 'Elegir icono'}</span>
        </span>
        {!viewMode && <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />}
      </button>
      {abierto && montado && createPortal(panel, document.body)}
    </div>
  )
}

"use client"

/**
 * SearchableSelect — Combobox con búsqueda integrada.
 *
 * ⚠️  PORTAL OBLIGATORIO
 * El dropdown se renderiza via createPortal en document.body con position:fixed,
 * lo que garantiza que NUNCA es recortado por un ancestro con overflow:hidden /
 * overflow-y:auto (modales, paneles con scroll, tablas).
 * Esta es la técnica estándar de React Select, Radix UI y shadcn/ui.
 *
 * API pública — sin breaking changes:
 *   options, value, onChange, placeholder, className, disabled, error,
 *   autoFocus, id, searchable, maxRenderOptions, onSearchChange
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, CheckIcon, SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UI_THEME } from '@/lib/theme'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
  id?: string
  searchable?: boolean
  maxRenderOptions?: number
  /** Callback extra invocado con cada cambio del texto de búsqueda.
   *  Útil para disparar búsquedas asíncronas desde el componente padre. */
  onSearchChange?: (query: string) => void
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  className,
  disabled = false,
  error = false,
  autoFocus = false,
  id,
  searchable = true,
  maxRenderOptions = 50,
  onSearchChange,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const buttonRef  = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // El portal solo existe en el cliente — evitar mismatch de hidratación
  useEffect(() => { setMounted(true) }, [])

  const selectedOption = options.find(opt => opt.value === value)

  const filteredOptions = options
    .filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, maxRenderOptions)

  // ── Posicionamiento ──────────────────────────────────────────────────────
  /** Calcula posición fixed exactamente debajo (o arriba) del botón trigger */
  const recalcPosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const dropMaxH = 240 // max-h-60 = 15rem ≈ 240px
    // Abrir hacia abajo si hay espacio; hacia arriba en caso contrario
    const openDown = rect.bottom + dropMaxH <= vh || rect.top < dropMaxH
    setDropdownStyle({
      position: 'fixed',
      left:  rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openDown
        ? { top:    rect.bottom + 2 }
        : { bottom: vh - rect.top + 2 }),
    })
  }, [])

  // Recalcular al abrir y en cada scroll / resize del viewport
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      return
    }
    recalcPosition()
    window.addEventListener('scroll', recalcPosition, true)
    window.addEventListener('resize', recalcPosition)
    return () => {
      window.removeEventListener('scroll', recalcPosition, true)
      window.removeEventListener('resize', recalcPosition)
    }
  }, [isOpen, recalcPosition])

  // ── Click fuera ─────────────────────────────────────────────────────────
  // El dropdown está en document.body (fuera del árbol del componente),
  // por lo que no podemos usar un solo containerRef — usamos dos refs.
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // ── AutoFocus ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoFocus && !disabled && buttonRef.current) {
      setTimeout(() => buttonRef.current?.focus(), 10)
    }
  }, [autoFocus, disabled])

  // ── Dropdown (renderizado via portal) ────────────────────────────────────
  const dropdownEl = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={UI_THEME.select.dropdown}
    >
      {searchable && (
        <div className={UI_THEME.select.searchArea}>
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              className={UI_THEME.select.searchInput}
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                onSearchChange?.(e.target.value)
              }}
              autoFocus
            />
          </div>
        </div>
      )}

      <div className="p-1">
        {filteredOptions.length === 0 ? (
          <div className={UI_THEME.select.emptyState}>
            No se encontraron resultados.
          </div>
        ) : (
          filteredOptions.map((opt) => (
            <div
              key={opt.value}
              className={cn(
                UI_THEME.select.optionItem,
                value === opt.value ? UI_THEME.select.optionItemSelected : ""
              )}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
            >
              {value === opt.value && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <CheckIcon className="h-4 w-4" />
                </span>
              )}
              <span className="truncate">{opt.label}</span>
            </div>
          ))
        )}

        {/* Aviso cuando la lista está truncada */}
        {options.filter(opt =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        ).length > maxRenderOptions && (
          <div className="py-2 text-center text-xs text-muted-foreground border-t mt-1">
            Mostrando primeros {maxRenderOptions} resultados. Continúa escribiendo para buscar...
          </div>
        )}
      </div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={cn("relative w-full", className)}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        aria-disabled={disabled}
        autoFocus={autoFocus}
        onClick={(e) => {
          if (disabled) { e.preventDefault(); return }
          if (!isOpen) recalcPosition()
          setIsOpen(prev => !prev)
        }}
        className={cn(
          UI_THEME.forms.inputBase,
          "flex w-full min-w-0 items-center justify-between shadow-sm ring-offset-background aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
          !selectedOption && "text-muted-foreground",
          error && "border-red-400 focus:ring-red-400 focus-visible:ring-red-400"
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </button>

      {/* Portal: el dropdown vive en document.body, escapa cualquier overflow */}
      {isOpen && mounted && createPortal(dropdownEl, document.body)}
    </div>
  )
}

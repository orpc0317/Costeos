'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Filter, Search, X, ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { UI_THEME } from '@/lib/theme'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ListFilterState = {
  mode: 'list'
  values: string[]
}

export type AdvancedConditionType =
  | 'contains' | 'not_contains'
  | 'equals'   | 'not_equals'
  | 'starts'   | 'ends'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'empty'    | 'not_empty'

export type AdvancedFilterState = {
  mode: 'advanced'
  condition: AdvancedConditionType
  value: string
}

export type ColumnFilterValue = ListFilterState | AdvancedFilterState | undefined

// ─── Función de filtro para TanStack Table ────────────────────────────────────

export function columnFilterFn(
  row: any,
  columnId: string,
  filterValue: ColumnFilterValue,
): boolean {
  if (!filterValue) return true

  // Obtener el valor de la celda como string
  const colDef = row.getAllCells().find((c: any) => c.column.id === columnId)?.column.columnDef as any
  let raw: any
  if (typeof colDef?.accessorFn === 'function') {
    raw = colDef.accessorFn(row.original, 0)
  } else if (colDef?.accessorKey) {
    raw = row.original?.[colDef.accessorKey]
  } else {
    raw = row.original?.[columnId]
  }
  const cell = String(raw ?? '').toLowerCase()

  if (filterValue.mode === 'list') {
    if (filterValue.values.length === 0) return true
    return filterValue.values.some(v => v.toLowerCase() === cell)
  }

  // Modo avanzado
  const val = filterValue.value.toLowerCase()
  switch (filterValue.condition) {
    case 'contains':     return cell.includes(val)
    case 'not_contains': return !cell.includes(val)
    case 'equals':       return cell === val
    case 'not_equals':   return cell !== val
    case 'starts':       return cell.startsWith(val)
    case 'ends':         return cell.endsWith(val)
    case 'empty':        return cell === ''
    case 'not_empty':    return cell !== ''
    case 'gt':  return parseFloat(cell) >  parseFloat(val)
    case 'gte': return parseFloat(cell) >= parseFloat(val)
    case 'lt':  return parseFloat(cell) <  parseFloat(val)
    case 'lte': return parseFloat(cell) <= parseFloat(val)
    default:    return true
  }
}

// ─── Labels de condiciones ────────────────────────────────────────────────────

const CONDITIONS: { value: AdvancedConditionType; label: string; needsInput: boolean }[] = [
  { value: 'contains',     label: 'Contiene',              needsInput: true  },
  { value: 'not_contains', label: 'No contiene',           needsInput: true  },
  { value: 'equals',       label: 'Es igual a',            needsInput: true  },
  { value: 'not_equals',   label: 'No es igual a',         needsInput: true  },
  { value: 'starts',       label: 'Empieza con',           needsInput: true  },
  { value: 'ends',         label: 'Termina con',           needsInput: true  },
  { value: 'gt',           label: 'Es mayor que',          needsInput: true  },
  { value: 'gte',          label: 'Es mayor o igual a',    needsInput: true  },
  { value: 'lt',           label: 'Es menor que',          needsInput: true  },
  { value: 'lte',          label: 'Es menor o igual a',    needsInput: true  },
  { value: 'empty',        label: 'Está vacío',            needsInput: false },
  { value: 'not_empty',    label: 'No está vacío',         needsInput: false },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface ColumnFilterPopoverProps {
  uniqueValues: string[]
  filterValue: ColumnFilterValue
  onChange: (value: ColumnFilterValue) => void
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ColumnFilterPopover({
  uniqueValues,
  filterValue,
  onChange,
}: ColumnFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'list' | 'advanced'>('list')
  const [search, setSearch] = useState('')
  const [advCondition, setAdvCondition] = useState<AdvancedConditionType>('contains')
  const [advValue, setAdvValue] = useState('')
  const [opOpen, setOpOpen] = useState(false)
  /** null = todos los valores marcados (sin filtro de lista). */
  const [draftValues, setDraftValues] = useState<string[] | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const hasFilter = !!filterValue && (
    filterValue.mode === 'list'
      ? true
      : filterValue.value !== '' || filterValue.condition === 'empty' || filterValue.condition === 'not_empty'
  )

  // ── Sincronizar estado avanzado con filterValue al abrir ───────────────────
  useEffect(() => {
    if (!open) return
    setSearch('')
    setOpOpen(false)
    if (filterValue?.mode === 'advanced') {
      setTab('advanced')
      setAdvCondition(filterValue.condition)
      setAdvValue(filterValue.value)
      setDraftValues(null)
    } else if (filterValue?.mode === 'list') {
      setTab('list')
      setDraftValues(filterValue.values)
    } else {
      setTab('list')
      setDraftValues(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Posicionamiento del panel ──────────────────────────────────────────────
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const panelW = 288
    const left = Math.min(r.left, window.innerWidth - panelW - 8)
    setPos({ top: r.bottom + 4, left: Math.max(8, left) })
  }, [])

  useEffect(() => {
    if (open) {
      calcPos()
      window.addEventListener('scroll', calcPos, true)
      window.addEventListener('resize', calcPos)
    }
    return () => {
      window.removeEventListener('scroll', calcPos, true)
      window.removeEventListener('resize', calcPos)
    }
  }, [open, calcPos])

  // ── Cerrar al hacer clic fuera ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Lista filtrada por búsqueda ────────────────────────────────────────────
  const filtered = uniqueValues.filter(v =>
    v.toLowerCase().includes(search.toLowerCase())
  )

  // null = todos marcados. El checklist refleja el borrador, no el filtro ya aplicado.
  const isChecked = (val: string) => draftValues === null || draftValues.includes(val)
  const allSelected = filtered.length > 0 && filtered.every(isChecked)
  const someSelected = filtered.some(isChecked) && !allSelected
  const selectedCount = draftValues === null ? uniqueValues.length : draftValues.length

  const toggleAll = () => {
    if (allSelected) {
      const base = draftValues === null ? uniqueValues : draftValues
      setDraftValues(base.filter(v => !filtered.includes(v)))
      return
    }
    const base = draftValues === null ? uniqueValues : draftValues
    const merged = Array.from(new Set([...base, ...filtered]))
    setDraftValues(merged.length >= uniqueValues.length ? null : merged)
  }

  const toggleValue = (val: string) => {
    const current = draftValues === null ? [...uniqueValues] : [...draftValues]
    const next = current.includes(val)
      ? current.filter(v => v !== val)
      : [...current, val]
    setDraftValues(next.length >= uniqueValues.length ? null : next)
  }

  const applyList = () => {
    if (draftValues === null || draftValues.length >= uniqueValues.length) {
      onChange(undefined)
    } else {
      onChange({ mode: 'list', values: draftValues })
    }
    setOpen(false)
  }

  // ── Aplicar filtro avanzado ────────────────────────────────────────────────
  const applyAdvanced = () => {
    const needsInput = CONDITIONS.find(c => c.value === advCondition)?.needsInput ?? true
    if (needsInput && advValue.trim() === '') {
      onChange(undefined)
    } else {
      onChange({ mode: 'advanced', condition: advCondition, value: advValue.trim() })
    }
    setOpen(false)
  }

  const clearFilter = () => {
    onChange(undefined)
    setDraftValues(null)
    setSearch('')
    setAdvValue('')
    setAdvCondition('contains')
    setOpOpen(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const selectedCondition = CONDITIONS.find(c => c.value === advCondition)!

  const footer = (
    <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-2 py-1.5">
      <button
        type="button"
        onClick={clearFilter}
        disabled={!hasFilter}
        className="text-[11px] font-normal text-sky-700 hover:underline disabled:text-slate-400 disabled:no-underline"
      >
        Limpiar
      </button>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-6 rounded-sm border border-slate-300 bg-white px-2.5 text-[11px] font-normal text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={tab === 'list' ? applyList : applyAdvanced}
          className="h-6 rounded-sm bg-sky-700 px-2.5 text-[11px] font-normal text-white hover:bg-sky-800"
        >
          Aceptar
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'shrink-0 rounded-sm p-0.5 transition-colors',
          hasFilter
            ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        )}
        title={hasFilter ? 'Filtro activo — clic para editar' : 'Filtrar columna'}
      >
        <Filter className="h-3 w-3" />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ top: pos.top, left: pos.left, width: 288, zIndex: 9999 }}
          className={cn('fixed text-slate-700 shadow-md', UI_THEME.table.container)}
        >
          <div className="flex border-b border-slate-200 bg-white">
            {(['list', 'advanced'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-normal transition-colors',
                  tab === t
                    ? 'border-b-2 border-sky-700 text-sky-800'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )}
              >
                {t === 'list' ? 'Lista' : 'Avanzado'}
              </button>
            ))}
          </div>

          {tab === 'list' && (
            <div>
              <div className="border-b border-slate-200 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-6 text-xs font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {filtered.length > 0 && (
                <label className="flex h-7 cursor-pointer select-none items-center gap-2 border-b border-slate-200 px-2 hover:bg-sky-50">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    className="size-3.5 rounded-[2px]"
                  />
                  <span className="text-xs font-normal text-slate-600">
                    (Seleccionar todo){search ? ` (${filtered.length})` : ''}
                  </span>
                </label>
              )}

              <div className="max-h-52 overflow-y-auto py-0.5">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-xs font-normal text-slate-400">Sin resultados</p>
                ) : (
                  filtered.map(val => {
                    const checked = isChecked(val)
                    return (
                      <label
                        key={val}
                        className="flex h-7 cursor-pointer select-none items-center gap-2 px-2 text-xs font-normal text-slate-700 hover:bg-sky-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleValue(val)}
                          className="size-3.5 rounded-[2px]"
                        />
                        <span className="truncate">{val}</span>
                      </label>
                    )
                  })
                )}
              </div>

              <div className="border-t border-slate-100 px-2 py-1 text-[11px] font-normal text-slate-400">
                {selectedCount} de {uniqueValues.length}
              </div>
              {footer}
            </div>
          )}

          {tab === 'advanced' && (
            <div>
              <div className="space-y-2 p-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpOpen(o => !o)}
                    className="flex h-7 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700 hover:border-slate-300"
                  >
                    <span className="truncate">{selectedCondition.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                  {opOpen && (
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                      {CONDITIONS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => { setAdvCondition(c.value); setOpOpen(false) }}
                          className={cn(
                            'flex h-7 w-full items-center px-2 text-left text-xs font-normal hover:bg-sky-50',
                            c.value === advCondition ? 'bg-sky-100 text-sky-900' : 'text-slate-700'
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCondition.needsInput && (
                  <input
                    autoFocus
                    value={advValue}
                    onChange={e => setAdvValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyAdvanced()}
                    placeholder={
                      advCondition === 'gt' || advCondition === 'gte' ||
                      advCondition === 'lt' || advCondition === 'lte'
                        ? 'Número...' : 'Texto...'
                    }
                    className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                )}

                {filterValue?.mode === 'advanced' && (
                  <p className="rounded-sm bg-sky-50 px-2 py-1 text-[11px] font-normal text-sky-800">
                    Activo: {CONDITIONS.find(c => c.value === filterValue.condition)?.label}
                    {filterValue.value ? ` "${filterValue.value}"` : ''}
                  </p>
                )}
              </div>
              {footer}
            </div>
          )}
        </div>
      )}
    </>
  )
}

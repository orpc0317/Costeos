'use client';

import React, { useState, useMemo } from 'react'
import {
  Plus, Trash2, Edit2, X, Check,
  ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { NumericInput } from '@/components/ui/numeric-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field-error'
import { cn } from '@/lib/utils'
import type { ItemRow, DetalleComboInput } from '@/lib/types/items'

interface ComboTabProps {
  combos: DetalleComboInput[]
  setCombos: React.Dispatch<React.SetStateAction<DetalleComboInput[]>>
  todosItems: ItemRow[]
  comboItemsMap?: Map<number, string>
  itemId?: number
  isEditing: boolean
  mode: 'view' | 'edit'
}

// ─── Helpers de detección de ciclos (sin cambios) ─────────────────────────────

function getSubitemsTransitivos(
  itemId: number,
  todosItems: ItemRow[],
  visitados: Set<number> = new Set()
): Set<number> {
  if (visitados.has(itemId)) return visitados
  visitados.add(itemId)
  const item = todosItems.find((i) => i.id === itemId)
  for (const combo of item?.combosPrincipal ?? []) {
    getSubitemsTransitivos(combo.productoSecundarioId, todosItems, visitados)
  }
  return visitados
}

function detectarCiclo(itemId: number, subItemId: number, todosItems: ItemRow[]): boolean {
  const transitivosDelSub = getSubitemsTransitivos(subItemId, todosItems)
  return transitivosDelSub.has(itemId)
}

function getSubitemsDeExpansion(
  subItemId: number,
  combosActuales: DetalleComboInput[],
  todosItems: ItemRow[]
): DetalleComboInput[] {
  const subItem = todosItems.find((i) => i.id === subItemId)
  if (!subItem?.combosPrincipal?.length) return []
  const idsActuales = new Set(combosActuales.map((c) => c.productoSecundarioId))
  return subItem.combosPrincipal
    .filter((c) => !idsActuales.has(c.productoSecundarioId))
    .map((c) => ({
      productoSecundarioId: c.productoSecundarioId,
      nuevoCantidad:        c.nuevoCantidad,
      nuevoIncluido:        Boolean(c.nuevoIncluido),
      nuevoRequerido:       Boolean(c.nuevoRequerido),
      renovacionCantidad:   c.renovacionCantidad,
      renovacionIncluido:   Boolean(c.renovacionIncluido),
      renovacionRequerido:  Boolean(c.renovacionRequerido),
    }))
}

// ─── Árbol pre-calculado (patrón Costeador) ────────────────────────────────────

/**
 * Nodo del árbol de combo — incluye hijos ya resueltos recursivamente.
 * El árbol se pre-calcula una sola vez con buildComboTree() y se renderiza
 * sin lookups adicionales durante el render (igual que ComboDisponible en el Costeador).
 */
type ComboTreeItem = {
  productoSecundarioId: number
  nombre: string
  nuevoCantidad: number
  nuevoIncluido: boolean
  nuevoRequerido: boolean
  renovacionCantidad: number
  renovacionIncluido: boolean
  renovacionRequerido: boolean
  hijos: ComboTreeItem[]
}

type ComboEntry = {
  productoSecundarioId: number | string
  nuevoCantidad: number
  nuevoIncluido: boolean | number
  nuevoRequerido: boolean | number
  renovacionCantidad: number
  renovacionIncluido: boolean | number
  renovacionRequerido: boolean | number
}

function buildComboTree(
  entries: ComboEntry[],
  allItems: ItemRow[],
  getLabel: (id: number) => string,
  visited: Set<number> = new Set()
): ComboTreeItem[] {
  return entries
    .map((entry): ComboTreeItem | null => {
      const id = Number(entry.productoSecundarioId)
      if (visited.has(id)) return null                // protección anti-ciclos
      const nextVisited = new Set(visited).add(id)
      const item = allItems.find(i => i.id === id)
      return {
        productoSecundarioId: id,
        nombre:              getLabel(id),
        nuevoCantidad:       entry.nuevoCantidad,
        nuevoIncluido:       Boolean(entry.nuevoIncluido),
        nuevoRequerido:      Boolean(entry.nuevoRequerido),
        renovacionCantidad:  entry.renovacionCantidad,
        renovacionIncluido:  Boolean(entry.renovacionIncluido),
        renovacionRequerido: Boolean(entry.renovacionRequerido),
        hijos: item?.combosPrincipal?.length
          ? buildComboTree(item.combosPrincipal, allItems, getLabel, nextVisited)
          : [],
      }
    })
    .filter((n): n is ComboTreeItem => n !== null)
}

// ─── TreeGuide — sangría con líneas punteadas (igual al Costeador) ────────────

function TreeGuide({ depth }: { depth: number }) {
  if (depth === 0) return null
  return (
    <span className="flex items-center shrink-0" style={{ width: depth * 20 }}>
      {Array.from({ length: depth - 1 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-5 shrink-0 border-l border-dashed border-slate-200 self-stretch"
        />
      ))}
      <span className="inline-flex items-center shrink-0 w-5">
        <span className="w-5 border-t border-dashed border-slate-300" />
      </span>
    </span>
  )
}

// ─── Form defaults ─────────────────────────────────────────────────────────────

const defaultForm = {
  productoSecundarioId: '',
  nuevoCantidad: 0,
  nuevoIncluido: false,
  nuevoRequerido: false,
  renovacionCantidad: 0,
  renovacionIncluido: false,
  renovacionRequerido: false,
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function ComboTab({
  combos,
  setCombos,
  todosItems,
  comboItemsMap,
  itemId,
  isEditing,
  mode,
}: ComboTabProps) {
  const [form, setForm]               = useState(defaultForm)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors]  = useState<Record<string, string>>({})
  const [expandedIds, setExpandedIds]  = useState<Set<number>>(new Set())

  const isReadOnly = mode === 'view' || !isEditing

  // ── Labels ───────────────────────────────────────────────────────────────────

  const getItemLabel = (id: number) => {
    if (comboItemsMap?.has(id)) return comboItemsMap.get(id)!
    const it = todosItems.find((i) => i.id === id)
    return it ? it.descripcion : `Item ${id}`
  }

  // ── Árbol pre-calculado (patrón Costeador) ───────────────────────────────────
  // Se recalcula solo cuando cambian combos o todosItems.
  // No hay lookups durante el render — igual que combosDisponibles en ComboTab.tsx del Costeador.

  const comboTree = useMemo(
    () => buildComboTree(combos, todosItems, getItemLabel, new Set(itemId !== undefined ? [itemId] : [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [combos, todosItems, itemId, comboItemsMap]
  )

  // ── Opciones del selector de items ──────────────────────────────────────────

  const opcionesItems = useMemo(() => {
    const usedIds = combos.map(c => c.productoSecundarioId)
    const excludeIds = new Set(usedIds)
    if (editingIndex !== null) excludeIds.delete(combos[editingIndex].productoSecundarioId)
    return todosItems
      .filter((i) => i.id !== itemId && !excludeIds.has(i.id))
      .map((i) => ({ value: String(i.id), label: i.descripcion }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [todosItems, itemId, combos, editingIndex])

  // ── Handlers del formulario ──────────────────────────────────────────────────

  const handleSaveForm = () => {
    if (!form.productoSecundarioId) return
    const subItemId = Number(form.productoSecundarioId)
    const errors: Record<string, string> = {}

    if (itemId !== undefined && subItemId === itemId) {
      errors.productoSecundarioId = 'Un item no puede ser subitem de si mismo.'
      setFieldErrors(errors); return
    }
    if (editingIndex === null && itemId !== undefined && detectarCiclo(itemId, subItemId, todosItems)) {
      errors.productoSecundarioId = 'No se puede agregar este item: generaria una referencia circular en el combo.'
      setFieldErrors(errors); return
    }
    if (editingIndex === null && combos.some((c) => c.productoSecundarioId === subItemId)) {
      errors.productoSecundarioId = 'Este item ya esta en el combo. Edita la fila existente para ajustar la cantidad.'
      setFieldErrors(errors); return
    }

    const hasNuevoChecks = form.nuevoIncluido || form.nuevoRequerido
    const hasRenoChecks  = form.renovacionIncluido || form.renovacionRequerido
    const hasNuevoQty    = form.nuevoCantidad > 0
    const hasRenoQty     = form.renovacionCantidad > 0
    if (hasNuevoChecks && !hasNuevoQty) errors.nuevoCantidad = 'Cantidad debe ser mayor a 0.'
    if (hasRenoChecks  && !hasRenoQty)  errors.renovacionCantidad = 'Cantidad debe ser mayor a 0.'
    if (!hasNuevoChecks && !hasRenoChecks && !hasNuevoQty && !hasRenoQty)
      errors.nuevoCantidad = 'Cantidad debe ser mayor a 0.'
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

    setFieldErrors({})
    const newData: DetalleComboInput = {
      productoSecundarioId: subItemId,
      nuevoCantidad:        form.nuevoCantidad,
      nuevoIncluido:        form.nuevoIncluido,
      nuevoRequerido:       form.nuevoRequerido,
      renovacionCantidad:   form.renovacionCantidad,
      renovacionIncluido:   form.renovacionIncluido,
      renovacionRequerido:  form.renovacionRequerido,
    }
    if (editingIndex !== null) {
      setCombos((prev) => { const next = [...prev]; next[editingIndex] = newData; return next })
    } else {
      setCombos((prev) => [...prev, newData])
    }
    setForm(defaultForm)
    setEditingIndex(null)
  }

  const handleCancelEdit = () => { setForm(defaultForm); setEditingIndex(null); setFieldErrors({}) }
  const handleEditClick  = (idx: number) => {
    const item = combos[idx]
    setForm({
      productoSecundarioId: String(item.productoSecundarioId),
      nuevoCantidad:        item.nuevoCantidad,
      nuevoIncluido:        item.nuevoIncluido,
      nuevoRequerido:       item.nuevoRequerido,
      renovacionCantidad:   item.renovacionCantidad,
      renovacionIncluido:   item.renovacionIncluido,
      renovacionRequerido:  item.renovacionRequerido,
    })
    setEditingIndex(idx); setFieldErrors({})
  }
  const handleRemove = (idx: number) => {
    setCombos((prev) => prev.filter((_, i) => i !== idx))
    if (editingIndex === idx) handleCancelEdit()
    else if (editingIndex !== null && idx < editingIndex) setEditingIndex(editingIndex - 1)
  }

  // ── Expand / Collapse ────────────────────────────────────────────────────────

  const toggleExpand = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })

  /** Recolecta todos los IDs con hijos del árbol pre-calculado */
  const getAllExpandableIds = (nodes: ComboTreeItem[]): number[] => {
    const ids: number[] = []
    const collect = (n: ComboTreeItem) => {
      if (n.hijos.length > 0) { ids.push(n.productoSecundarioId); n.hijos.forEach(collect) }
    }
    nodes.forEach(collect)
    return ids
  }

  const expandableIds = useMemo(() => getAllExpandableIds(comboTree), [comboTree])
  const allExpanded   = expandableIds.length > 0 && expandableIds.every(id => expandedIds.has(id))

  const expandAll   = () => setExpandedIds(new Set(expandableIds))
  const collapseAll = () => setExpandedIds(new Set())

  // ── Helpers de display ───────────────────────────────────────────────────────

  const renderCheckIcon = (checked: boolean) =>
    checked ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>

  // ── Render recursivo del árbol (patrón Costeador: trabaja sobre ComboTreeItem pre-calculado) ──

  const renderComboRow = (
    node: ComboTreeItem,
    depth: number,
    idx: number | null,   // índice en combos[] — solo para filas raíz (depth=0)
  ): React.ReactNode => {
    const tieneHijos  = node.hijos.length > 0
    const isExpanded  = expandedIds.has(node.productoSecundarioId)
    const isEditingThisRow = idx !== null && editingIndex === idx

    return (
      <React.Fragment key={`row-${depth}-${node.productoSecundarioId}`}>
        <tr
          className={cn(
            'border-t transition-colors hover:bg-slate-50',
            isEditingThisRow && 'bg-blue-50/50',
            depth > 0 && 'bg-slate-50/20',
          )}
        >
          {/* Columna ID — solo en filas raíz */}
          {depth === 0 ? (
            <td className="p-3 w-[80px]">
              <span className="font-mono text-sm text-slate-500">{node.productoSecundarioId}</span>
            </td>
          ) : (
            <td className="w-[80px]" />
          )}

          {/* Nombre con TreeGuide y chevron expand/collapse */}
          <td className="p-2 border-l">
            <div className="flex items-center gap-1 min-w-0">
              <TreeGuide depth={depth} />

              {tieneHijos ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(node.productoSecundarioId)}
                  title={isExpanded ? 'Colapsar sub-combo' : 'Expandir sub-combo'}
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown  className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}

              <span
                className={cn(
                  'font-medium leading-tight min-w-0 truncate',
                  depth === 0 ? 'text-slate-700 text-sm' : 'text-slate-500 text-xs',
                )}
                title={node.nombre}
              >
                {node.nombre}
              </span>
            </div>
          </td>

          {/* Datos Nuevo */}
          <td className="p-3 text-center border-l text-sm">
            {node.nuevoCantidad || <span className="text-slate-300">0</span>}
          </td>
          <td className="p-3 text-center">{renderCheckIcon(node.nuevoIncluido)}</td>
          <td className="p-3 text-center">{renderCheckIcon(node.nuevoRequerido)}</td>

          {/* Datos Renovacion */}
          <td className="p-3 text-center border-l text-sm">
            {node.renovacionCantidad || <span className="text-slate-300">0</span>}
          </td>
          <td className="p-3 text-center">{renderCheckIcon(node.renovacionIncluido)}</td>
          <td className="p-3 text-center">{renderCheckIcon(node.renovacionRequerido)}</td>

          {/* Acciones — solo en filas raíz y modo edición */}
          {!isReadOnly && (
            <td className="p-2 text-center border-l">
              {depth === 0 && idx !== null ? (
                <div className="flex items-center justify-center gap-1">
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleEditClick(idx)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemove(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </td>
          )}
        </tr>

        {/* Hijos — renderizado recursivo cuando el nodo está expandido */}
        {tieneHijos && isExpanded && node.hijos.map(hijo =>
          renderComboRow(hijo, depth + 1, null)
        )}
      </React.Fragment>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 h-full">

      {/* Formulario de agregar/editar (solo en modo edición) */}
      {!isReadOnly && (
        <div className="shrink-0 flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <Label>Item <span className="text-red-500">*</span></Label>
            <SearchableSelect
              options={opcionesItems}
              value={form.productoSecundarioId}
              onChange={(val) => {
                setForm({ ...form, productoSecundarioId: val })
                if (fieldErrors.productoSecundarioId)
                  setFieldErrors((prev) => ({ ...prev, productoSecundarioId: '' }))
              }}
              placeholder="Seleccionar item para el combo..."
              error={!!fieldErrors.productoSecundarioId}
            />
            <FieldError message={fieldErrors.productoSecundarioId} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Bloque Nuevo */}
            <div className="flex flex-col bg-white p-3 rounded-md border shadow-sm gap-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nuevo</h4>
              <div className="flex flex-row items-start gap-6">
                <div className="flex flex-col gap-1.5 w-28 shrink-0">
                  <Label>Cantidad</Label>
                  <NumericInput
                    value={form.nuevoCantidad}
                    onChange={(v) => {
                      const qty = v ?? 0
                      setForm((prev) => {
                        const next = { ...prev, nuevoCantidad: qty }
                        if (qty === 0) { next.nuevoIncluido = false; next.nuevoRequerido = false }
                        return next
                      })
                    }}
                    className={`h-8 ${fieldErrors.nuevoCantidad ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <FieldError message={fieldErrors.nuevoCantidad} />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <label className={`flex items-center gap-2 cursor-pointer select-none ${form.nuevoRequerido ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Checkbox checked={form.nuevoIncluido} disabled={form.nuevoRequerido}
                      onCheckedChange={(c) => setForm({ ...form, nuevoIncluido: c === true })} />
                    <span className="text-sm font-normal">Incluido</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox checked={form.nuevoRequerido}
                      onCheckedChange={(c) => {
                        const isReq = c === true
                        setForm((prev) => ({ ...prev, nuevoRequerido: isReq, ...(isReq ? { nuevoIncluido: true } : {}) }))
                      }} />
                    <span className="text-sm font-normal">Requerido</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bloque Renovacion */}
            <div className="flex flex-col bg-white p-3 rounded-md border shadow-sm gap-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Renovacion</h4>
              <div className="flex flex-row items-start gap-6">
                <div className="flex flex-col gap-1.5 w-28 shrink-0">
                  <Label>Cantidad</Label>
                  <NumericInput
                    value={form.renovacionCantidad}
                    onChange={(v) => {
                      const qty = v ?? 0
                      setForm((prev) => {
                        const next = { ...prev, renovacionCantidad: qty }
                        if (qty === 0) { next.renovacionIncluido = false; next.renovacionRequerido = false }
                        return next
                      })
                    }}
                    className={`h-8 ${fieldErrors.renovacionCantidad ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <FieldError message={fieldErrors.renovacionCantidad} />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <label className={`flex items-center gap-2 cursor-pointer select-none ${form.renovacionRequerido ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Checkbox checked={form.renovacionIncluido} disabled={form.renovacionRequerido}
                      onCheckedChange={(c) => setForm({ ...form, renovacionIncluido: c === true })} />
                    <span className="text-sm font-normal">Incluido</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox checked={form.renovacionRequerido}
                      onCheckedChange={(c) => {
                        const isReq = c === true
                        setForm((prev) => ({ ...prev, renovacionRequerido: isReq, ...(isReq ? { renovacionIncluido: true } : {}) }))
                      }} />
                    <span className="text-sm font-normal">Requerido</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {editingIndex !== null && (
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            )}
            <Button type="button" onClick={handleSaveForm} disabled={!form.productoSecundarioId}>
              {editingIndex !== null
                ? <><Check className="w-4 h-4 mr-2" /> Actualizar</>
                : <><Plus  className="w-4 h-4 mr-2" /> Agregar</>}
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de sub-items con árbol expandible */}
      <div className="flex-1 overflow-auto border rounded-md min-h-[250px] shadow-sm">
        {combos.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8 text-center bg-slate-50/50">
            No hay items agregados al combo. Utiliza el formulario superior para agregar.
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b">
              <tr>
                <th rowSpan={2} className="font-medium p-3 align-bottom border-b w-[80px]">ID</th>
                <th rowSpan={2} className="font-medium p-3 align-bottom border-b border-l">
                  <div className="flex items-center gap-2">
                    <span>Nombre</span>
                    {expandableIds.length > 0 && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={expandAll}
                          disabled={allExpanded}
                          title="Expandir todos los sub-combos"
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronsUpDown className="h-3 w-3" /> Todo
                        </button>
                        <button
                          type="button"
                          onClick={collapseAll}
                          disabled={expandedIds.size === 0}
                          title="Colapsar todos los sub-combos"
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronsDownUp className="h-3 w-3" /> Colapsar
                        </button>
                      </div>
                    )}
                  </div>
                </th>
                <th colSpan={3} className="font-medium p-1.5 text-center border-l border-b bg-slate-200/50">Nuevo</th>
                <th colSpan={3} className="font-medium p-1.5 text-center border-l border-b bg-slate-200/50">Renovacion</th>
                {!isReadOnly && <th rowSpan={2} className="p-3 w-[80px] text-center border-l align-bottom border-b">Acciones</th>}
              </tr>
              <tr>
                <th className="font-medium p-2 text-center border-l w-[90px] text-xs">Cantidad</th>
                <th className="font-medium p-2 text-center w-[90px] text-xs">Incluido</th>
                <th className="font-medium p-2 text-center w-[90px] text-xs">Requerido</th>
                <th className="font-medium p-2 text-center border-l w-[90px] text-xs">Cantidad</th>
                <th className="font-medium p-2 text-center w-[90px] text-xs">Incluido</th>
                <th className="font-medium p-2 text-center w-[90px] text-xs">Requerido</th>
              </tr>
            </thead>
            <tbody>
              {comboTree.map((node, idx) => renderComboRow(node, 0, idx))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
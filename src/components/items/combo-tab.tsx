import React, { useState } from 'react'
import { Plus, Trash2, Edit2, X, Check, GitBranch } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
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
  itemId?: number // El ID del ítem actual si estamos editando, para excluirlo
  isEditing: boolean
  mode: 'view' | 'edit'
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones de validación de combos (puras, sin efectos secundarios)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el conjunto de IDs de TODOS los subitems del combo de un ítem,
 * de forma recursiva (cierre transitivo). Incluye el propio ítem en el conjunto.
 * Usa un Set de visitados para evitar bucles infinitos ante datos corruptos.
 */
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

/**
 * Regla de Oro: detecta si agregar `subItemId` al combo de `itemId` crearía
 * una referencia circular.
 * Un ciclo ocurre cuando `itemId` está en el cierre transitivo del combo de `subItemId`.
 */
function detectarCiclo(
  itemId: number,
  subItemId: number,
  todosItems: ItemRow[]
): boolean {
  const transitivosDelSub = getSubitemsTransitivos(subItemId, todosItems)
  return transitivosDelSub.has(itemId)
}

/**
 * Expansión transitiva: devuelve todos los DetalleComboInput directos del
 * subitem seleccionado que aún NO están en el combo actual del ítem principal.
 * Solo expande UN nivel (los directos de B), no recursivo, para mantener
 * control explícito del usuario sobre la grilla.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Componente: árbol de combos para el Popover
// ─────────────────────────────────────────────────────────────────────────────

interface ComboTreeNodeProps {
  itemId: number
  todosItems: ItemRow[]
  depth: number
  visitados: Set<number>
}

/** Renderiza recursivamente el árbol de combos de un ítem dado. */
function ComboTreeNode({ itemId, todosItems, depth, visitados }: ComboTreeNodeProps) {
  const item = todosItems.find((i) => i.id === itemId)
  const subitems = item?.combosPrincipal ?? []
  if (subitems.length === 0) return null

  return (
    <ul className={cn('space-y-1', depth > 0 && 'ml-4 border-l border-slate-200 pl-2.5 mt-1')}>
      {subitems.map((sub) => {
        const subItem = todosItems.find((i) => i.id === sub.productoSecundarioId)
        const tieneCombo = (subItem?.combosPrincipal?.length ?? 0) > 0
        // Protección anti-ciclo al renderizar
        const yaVisitado = visitados.has(sub.productoSecundarioId)
        const nextVisitados = new Set(visitados).add(sub.productoSecundarioId)

        return (
          <li key={sub.productoSecundarioId} className="text-xs">
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-400 shrink-0">
                {depth === 0 ? '•' : '◦'}
              </span>
              <span className={cn(
                'font-medium leading-tight',
                depth === 0 ? 'text-slate-700' : 'text-slate-500'
              )}>
                {subItem?.descripcion ?? `Ítem ${sub.productoSecundarioId}`}
              </span>
              {/* Cantidades compactas */}
              {sub.nuevoCantidad > 0 && (
                <span className="ml-auto shrink-0 text-[10px] text-slate-400 tabular-nums">
                  N:{sub.nuevoCantidad}
                </span>
              )}
              {sub.renovacionCantidad > 0 && (
                <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">
                  R:{sub.renovacionCantidad}
                </span>
              )}
              {tieneCombo && !yaVisitado && (
                <GitBranch className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
              )}
            </div>
            {/* Expandir subitems del subitem (recursivo), con protección anti-ciclo */}
            {tieneCombo && !yaVisitado && (
              <ComboTreeNode
                itemId={sub.productoSecundarioId}
                todosItems={todosItems}
                depth={depth + 1}
                visitados={nextVisitados}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface ComboTreePopoverProps {
  itemId: number
  itemLabel: string
  todosItems: ItemRow[]
}

/**
 * Badge "COMBO" + Popover que muestra el árbol completo de subitems.
 * Solo se renderiza si el ítem tiene subitems en su combo.
 */
function ComboTreePopover({ itemId, itemLabel, todosItems }: ComboTreePopoverProps) {
  const item = todosItems.find((i) => i.id === itemId)
  const tieneCombo = (item?.combosPrincipal?.length ?? 0) > 0
  if (!tieneCombo) return null

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5',
          'bg-indigo-50 text-indigo-600 border border-indigo-200',
          'text-[10px] font-semibold uppercase tracking-wide leading-none',
          'hover:bg-indigo-100 cursor-pointer transition-colors',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
        )}
        aria-label={`Ver combo de ${itemLabel}`}
      >
        <GitBranch className="h-2.5 w-2.5" />
        COMBO
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="right" sideOffset={8} align="start" className="isolate z-50">
          <Popover.Popup
            className={cn(
              'w-64 max-h-72 overflow-y-auto rounded-lg border border-slate-200',
              'bg-white shadow-xl shadow-slate-900/10',
              'p-3 origin-(--transform-origin)',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            )}
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Combo
                </span>
              </div>
              <Popover.Close
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-3 w-3" />
              </Popover.Close>
            </div>

            {/* Nombre del ítem raíz */}
            <p className="text-[11px] text-slate-500 mb-2 leading-tight truncate" title={itemLabel}>
              {itemLabel}
            </p>

            {/* Árbol */}
            <ComboTreeNode
              itemId={itemId}
              todosItems={todosItems}
              depth={0}
              visitados={new Set([itemId])}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

const defaultForm = {
  productoSecundarioId: '',
  nuevoCantidad: 0,
  nuevoIncluido: false,
  nuevoRequerido: false,
  renovacionCantidad: 0,
  renovacionIncluido: false,
  renovacionRequerido: false,
}

export function ComboTab({ combos, setCombos, todosItems, itemId, isEditing, mode }: ComboTabProps) {
  const [form, setForm] = useState(defaultForm)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isReadOnly = mode === 'view' || !isEditing

  const opcionesItems = React.useMemo(() => {
    // Si estamos editando, excluimos todos los items que ya están en la grilla,
    // EXCEPTO el ítem que estamos editando actualmente.
    const usedIds = combos.map(c => c.productoSecundarioId)
    const excludeIds = new Set(usedIds)
    if (editingIndex !== null) {
      excludeIds.delete(combos[editingIndex].productoSecundarioId)
    }

    return todosItems
      .filter((i) => i.id !== itemId && !excludeIds.has(i.id))
      .map((i) => ({
        value: String(i.id),
        label: i.descripcion,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [todosItems, itemId, combos, editingIndex])

  const handleSaveForm = () => {
    if (!form.productoSecundarioId) return

    const subItemId = Number(form.productoSecundarioId)
    const errors: Record<string, string> = {}

    // ── REGLA 1: Auto-referencia ──────────────────────────────────────────────
    // Un ítem no puede ser subítem de sí mismo.
    if (itemId !== undefined && subItemId === itemId) {
      errors.productoSecundarioId = 'Un ítem no puede ser subítem de sí mismo.'
      setFieldErrors(errors)
      return
    }

    // ── REGLA DE ORO: Anti-ciclo ──────────────────────────────────────────────
    // Solo aplica al agregar (no al editar el mismo subitem), y requiere que
    // conozcamos el itemId del ítem principal.
    if (editingIndex === null && itemId !== undefined) {
      if (detectarCiclo(itemId, subItemId, todosItems)) {
        errors.productoSecundarioId =
          'No se puede agregar este ítem: generaría una referencia circular en el combo.'
        setFieldErrors(errors)
        return
      }
    }

    // ── REGLA: Sin duplicados ─────────────────────────────────────────────────
    // Un subítem solo puede aparecer una vez. Si se necesita ajustar la
    // cantidad, el usuario debe editar la fila existente.
    if (editingIndex === null && combos.some((c) => c.productoSecundarioId === subItemId)) {
      errors.productoSecundarioId =
        'Este ítem ya está en el combo. Edita la fila existente para ajustar la cantidad.'
      setFieldErrors(errors)
      return
    }

    // ── Validaciones de cantidades y checkboxes ───────────────────────────────
    const hasNuevoChecks = form.nuevoIncluido || form.nuevoRequerido
    const hasRenoChecks = form.renovacionIncluido || form.renovacionRequerido
    const hasNuevoQty = form.nuevoCantidad > 0
    const hasRenoQty = form.renovacionCantidad > 0

    // Si hay checkbox marcado, debe haber cantidad > 0
    if (hasNuevoChecks && !hasNuevoQty) {
      errors.nuevoCantidad = 'Cantidad debe ser mayor a 0.'
    }
    if (hasRenoChecks && !hasRenoQty) {
      errors.renovacionCantidad = 'Cantidad debe ser mayor a 0.'
    }

    // Debe haber al menos información en uno de los dos bloques
    if (!hasNuevoChecks && !hasRenoChecks && !hasNuevoQty && !hasRenoQty) {
      errors.nuevoCantidad = 'Cantidad debe ser mayor a 0.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    const newData: DetalleComboInput = {
      productoSecundarioId: subItemId,
      nuevoCantidad: form.nuevoCantidad,
      nuevoIncluido: form.nuevoIncluido,
      nuevoRequerido: form.nuevoRequerido,
      renovacionCantidad: form.renovacionCantidad,
      renovacionIncluido: form.renovacionIncluido,
      renovacionRequerido: form.renovacionRequerido,
    }

    if (editingIndex !== null) {
      // Edición: solo actualizar la fila correspondiente
      setCombos((prev) => {
        const next = [...prev]
        next[editingIndex] = newData
        return next
      })
    } else {
      // Opción B: solo se agrega el subítem seleccionado.
      // Los subitems de su combo se "entienden" implícitamente y se resolverán
      // en el módulo de Costeos al momento de armar el costeo.
      setCombos((prev) => [...prev, newData])
    }

    setForm(defaultForm)
    setEditingIndex(null)
  }

  const handleCancelEdit = () => {
    setForm(defaultForm)
    setEditingIndex(null)
    setFieldErrors({})
  }

  const handleEditClick = (idx: number) => {
    const item = combos[idx]
    setForm({
      productoSecundarioId: String(item.productoSecundarioId),
      nuevoCantidad: item.nuevoCantidad,
      nuevoIncluido: item.nuevoIncluido,
      nuevoRequerido: item.nuevoRequerido,
      renovacionCantidad: item.renovacionCantidad,
      renovacionIncluido: item.renovacionIncluido,
      renovacionRequerido: item.renovacionRequerido,
    })
    setEditingIndex(idx)
    setFieldErrors({})
  }

  const handleRemove = (idx: number) => {
    setCombos((prev) => prev.filter((_, i) => i !== idx))
    if (editingIndex === idx) {
      handleCancelEdit()
    } else if (editingIndex !== null && idx < editingIndex) {
      setEditingIndex(editingIndex - 1)
    }
  }

  const getItemLabel = (id: number) => {
    const it = todosItems.find((i) => i.id === id)
    return it ? it.descripcion : String(id)
  }

  const renderCheckIcon = (checked: boolean) => {
    return checked ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* ── FORMULARIO (Master) ── */}
      {!isReadOnly && (
        <div className="shrink-0 flex flex-col gap-4 pb-2">
          
          {/* Ítem */}
          <div className="flex flex-col gap-1.5">
            <Label>Ítem <span className="text-red-500">*</span></Label>
            <SearchableSelect
              options={opcionesItems}
              value={form.productoSecundarioId}
              onChange={(val) => {
                setForm({ ...form, productoSecundarioId: val })
                if (fieldErrors.productoSecundarioId) {
                  setFieldErrors((prev) => ({ ...prev, productoSecundarioId: '' }))
                }
              }}
              placeholder="Seleccionar ítem para el combo..."
              error={!!fieldErrors.productoSecundarioId}
            />
            <FieldError message={fieldErrors.productoSecundarioId} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Grupo NUEVO */}
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
                        if (qty === 0) {
                          next.nuevoIncluido = false
                          next.nuevoRequerido = false
                        }
                        return next
                      })
                    }}
                    className={`h-8 ${fieldErrors.nuevoCantidad ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <FieldError message={fieldErrors.nuevoCantidad} />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="form-n-inc"
                      checked={form.nuevoIncluido}
                      disabled={form.nuevoRequerido}
                      onCheckedChange={(c) => setForm({ ...form, nuevoIncluido: c === true })}
                    />
                    <Label htmlFor="form-n-inc" className={`font-normal cursor-pointer ${form.nuevoRequerido ? 'opacity-50' : ''}`}>Incluido</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="form-n-req"
                      checked={form.nuevoRequerido}
                      onCheckedChange={(c) => {
                        const isReq = c === true
                        setForm((prev) => ({
                          ...prev,
                          nuevoRequerido: isReq,
                          ...(isReq ? { nuevoIncluido: true } : {})
                        }))
                      }}
                    />
                    <Label htmlFor="form-n-req" className="font-normal cursor-pointer">Requerido</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Grupo RENOVACION */}
            <div className="flex flex-col bg-white p-3 rounded-md border shadow-sm gap-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Renovación</h4>
              <div className="flex flex-row items-start gap-6">
                <div className="flex flex-col gap-1.5 w-28 shrink-0">
                  <Label>Cantidad</Label>
                  <NumericInput
                    value={form.renovacionCantidad}
                    onChange={(v) => {
                      const qty = v ?? 0
                      setForm((prev) => {
                        const next = { ...prev, renovacionCantidad: qty }
                        if (qty === 0) {
                          next.renovacionIncluido = false
                          next.renovacionRequerido = false
                        }
                        return next
                      })
                    }}
                    className={`h-8 ${fieldErrors.renovacionCantidad ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <FieldError message={fieldErrors.renovacionCantidad} />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="form-r-inc"
                      checked={form.renovacionIncluido}
                      disabled={form.renovacionRequerido}
                      onCheckedChange={(c) => setForm({ ...form, renovacionIncluido: c === true })}
                    />
                    <Label htmlFor="form-r-inc" className={`font-normal cursor-pointer ${form.renovacionRequerido ? 'opacity-50' : ''}`}>Incluido</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="form-r-req"
                      checked={form.renovacionRequerido}
                      onCheckedChange={(c) => {
                        const isReq = c === true
                        setForm((prev) => ({
                          ...prev,
                          renovacionRequerido: isReq,
                          ...(isReq ? { renovacionIncluido: true } : {})
                        }))
                      }}
                    />
                    <Label htmlFor="form-r-req" className="font-normal cursor-pointer">Requerido</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {editingIndex !== null && (
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            )}
            <Button type="button" onClick={handleSaveForm} disabled={!form.productoSecundarioId}>
              {editingIndex !== null ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> Actualizar
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Agregar
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── GRILLA (Detail) ── */}
      <div className="flex-1 overflow-auto border rounded-md min-h-[250px] shadow-sm">
        {combos.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8 text-center bg-slate-50/50">
            No hay ítems agregados al combo. Utiliza el formulario superior para añadir.
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b">
              <tr>
                <th rowSpan={2} className="font-medium p-3 align-bottom border-b">Ítem</th>
                <th colSpan={3} className="font-medium p-1.5 text-center border-l border-b bg-slate-200/50">Nuevo</th>
                <th colSpan={3} className="font-medium p-1.5 text-center border-l border-b bg-slate-200/50">Renovación</th>
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
            <tbody className="divide-y">
              {combos.map((combo, idx) => {
                const isEditingThisRow = editingIndex === idx
                return (
                  <tr
                    key={combo.productoSecundarioId}
                    className={`hover:bg-slate-50 transition-colors ${
                      isEditingThisRow ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-slate-700 leading-tight" title={getItemLabel(combo.productoSecundarioId)}>
                          {getItemLabel(combo.productoSecundarioId)}
                        </span>
                        <ComboTreePopover
                          itemId={combo.productoSecundarioId}
                          itemLabel={getItemLabel(combo.productoSecundarioId)}
                          todosItems={todosItems}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center border-l">
                      {combo.nuevoCantidad}
                    </td>
                    <td className="p-3 text-center">
                      {renderCheckIcon(combo.nuevoIncluido)}
                    </td>
                    <td className="p-3 text-center">
                      {renderCheckIcon(combo.nuevoRequerido)}
                    </td>
                    <td className="p-3 text-center border-l">
                      {combo.renovacionCantidad}
                    </td>
                    <td className="p-3 text-center">
                      {renderCheckIcon(combo.renovacionIncluido)}
                    </td>
                    <td className="p-3 text-center">
                      {renderCheckIcon(combo.renovacionRequerido)}
                    </td>
                    {!isReadOnly && (
                      <td className="p-2 text-center border-l">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEditClick(idx)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemove(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

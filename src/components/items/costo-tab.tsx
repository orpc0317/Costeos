'use client'

import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Plus, Trash2, DollarSign, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { FieldError } from '@/components/ui/field-error'
import { listarCostosItem, agregarCostoItem, eliminarCostoItem } from '@/app/actions/items'
import type { ItemCostoInput, ItemCostoRow } from '@/lib/types/items'
import { UI_THEME } from '@/lib/theme'

export type CostoBorrador = ItemCostoInput & { localId: number }

interface CostoTabProps {
  itemId: number
  mode: 'view' | 'edit'
  /**
   * El item guardado aun no es Manual. Agregar y quitar no tocan la base:
   * se confirman solo cuando el modal guarda el item como Manual.
   */
  diferido?: boolean
  borrador?: CostoBorrador[]
  onBorradorChange?: (rows: CostoBorrador[]) => void
  refresco?: number
  /** La pestaña Costo está visible. Al activarse, Fecha Vigencia vuelve al día local del navegador. */
  activa?: boolean
}

export function fechaHoyNavegador(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

function formatFecha(fechaStr: string): string {
  // fechaStr viene en YYYY-MM-DD
  const [year, month, day] = fechaStr.split('-')
  return `${day}/${month}/${year}`
}

function formatFechaHora(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

export function CostoTab({
  itemId,
  mode,
  diferido = false,
  borrador = [],
  onBorradorChange,
  refresco = 0,
  activa = true,
}: CostoTabProps) {
  const [costos, setCostos] = useState<ItemCostoRow[]>([])
  const [cargando, setCargando] = useState(false)

  // Formulario de nuevo costo. Vacío hasta que la pestaña se activa en el navegador,
  // para no heredar la fecha UTC del render del servidor.
  const [fecha, setFecha] = useState('')

  useLayoutEffect(() => {
    if (!activa || mode !== 'edit') return
    setFecha(fechaHoyNavegador())
  }, [activa, mode])
  const [costo, setCosto] = useState<number | null>(null)
  const [costoDiferenciado, setCostoDiferenciado] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<number | null>(null)

  const cargarCostos = useCallback(async () => {
    setCargando(true)
    const lista = await listarCostosItem(itemId)
    setCostos(lista)
    setCargando(false)
  }, [itemId])

  useEffect(() => {
    cargarCostos()
  }, [cargarCostos, refresco])

  const handleAgregar = async () => {
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!fecha) errors.fecha = 'Requerido'
    if (!costo || costo <= 0) errors.costo = 'Ingrese un costo mayor que 0'
    if (costoDiferenciado != null && costoDiferenciado < 0) errors.costoDiferenciado = 'El costo diferenciado no puede ser negativo'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    const diferenciado = costoDiferenciado ?? 0

    if (diferido) {
      if (!fechaPosteriorA(fecha)) {
        setFieldErrors({ fecha: `La fecha debe ser posterior al ultimo costo registrado (${formatFecha(visibles[0].fecha)})` })
        return
      }
      onBorradorChange?.([
        ...borrador,
        { fecha, costo: costo!, costoDiferenciado: diferenciado, localId: -Date.now() },
      ])
      setFecha(fechaHoyNavegador())
      setCosto(null)
      setCostoDiferenciado(null)
      setFieldErrors({})
      return
    }

    setGuardando(true)
    const res = await agregarCostoItem(itemId, { fecha, costo: costo!, costoDiferenciado: diferenciado })
    setGuardando(false)

    if (!res.ok) {
      if (res.field) {
        setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
      } else {
        setGlobalError(res.error)
      }
    } else {
      setCostos(res.data!)
      setFecha(fechaHoyNavegador())
      setCosto(null)
      setCostoDiferenciado(null)
      setFieldErrors({})
    }
  }

  const handleEliminar = async (id: number) => {
    if (diferido) {
      if (id < 0) onBorradorChange?.(borrador.filter(b => b.localId !== id))
      return
    }
    setEliminando(id)
    setGlobalError(null)
    const res = await eliminarCostoItem(id, itemId)
    setEliminando(null)
    if (!res.ok) {
      setGlobalError(res.error)
    } else {
      setCostos(res.data!)
    }
  }

  const pendientes: ItemCostoRow[] = borrador.map(b => ({
    id: b.localId,
    itemId,
    costo: b.costo,
    costoDiferenciado: b.costoDiferenciado,
    fecha: b.fecha,
    fechaAgrego: new Date(0),
    usuarioId: 0,
    usuarioNombre: 'Pendiente',
  }))

  const visibles = [...costos, ...pendientes].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const ultimoId = visibles.length > 0 ? visibles[0].id : null

  const fechaPosteriorA = (fechaNueva: string) => {
    if (visibles.length === 0) return true
    return fechaNueva > visibles[0].fecha
  }

  return (
    <div className="space-y-4">

      {/* ─── Panel de nuevo costo (solo en modo edicion) ─── */}
      {mode === 'edit' && (
        <div className={`rounded-lg p-4 space-y-3 ${UI_THEME.modal.segment}`}>
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Registrar Nuevo Costo
          </p>

          {globalError && (
            <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-2">
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {/* Fecha de vigencia */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="costo-fecha" className={UI_THEME.forms.labelBase}>
                Fecha Vigencia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="costo-fecha"
                type="date"
                value={fecha}
                onChange={e => {
                  setFecha(e.target.value)
                  if (fieldErrors.fecha) setFieldErrors(prev => { const n = { ...prev }; delete n.fecha; return n })
                }}
                className={UI_THEME.forms.inputBase}
                aria-invalid={!!fieldErrors.fecha}
              />
              <FieldError message={fieldErrors.fecha} />
            </div>

            {/* Costo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="costo-valor" className={UI_THEME.forms.labelBase}>
                Costo <span className="text-red-500">*</span>
              </Label>
              <NumericInput
                id="costo-valor"
                value={costo ?? undefined}
                onChange={v => {
                  setCosto(v ?? null)
                  if (fieldErrors.costo) setFieldErrors(prev => { const n = { ...prev }; delete n.costo; return n })
                }}
                className={UI_THEME.forms.inputBase}
                placeholder="0.0000"
                aria-invalid={!!fieldErrors.costo}
              />

              <FieldError message={fieldErrors.costo} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="costo-diferenciado" className={UI_THEME.forms.labelBase}>
                Costo Diferenciado
              </Label>
              <NumericInput
                id="costo-diferenciado"
                value={costoDiferenciado ?? undefined}
                onChange={v => {
                  setCostoDiferenciado(v ?? null)
                  if (fieldErrors.costoDiferenciado) setFieldErrors(prev => { const n = { ...prev }; delete n.costoDiferenciado; return n })
                }}
                className={UI_THEME.forms.inputBase}
                placeholder="0.0000"
                aria-invalid={!!fieldErrors.costoDiferenciado}
              />
              <FieldError message={fieldErrors.costoDiferenciado} />
            </div>
          </div>

          {diferido && (
            <p className="text-xs text-amber-700">
              Estos costos se guardan al guardar el item. Cancelar los descarta.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={guardando} onClick={handleAgregar}>
              {guardando ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Agregar</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Grid de costos registrados ─── */}
      {cargando ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Cargando costos...</span>
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-md">
          No hay costos registrados para este item.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-xs border-collapse text-left">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-28">Fecha Vigencia</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 w-32">Costo</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 w-36">Costo Diferenciado</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Registrado Por</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-36">Fecha Registro</th>
                {mode === 'edit' && <th className="w-12" />}
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-slate-100 [&>tr:hover]:bg-muted/40">
              {visibles.slice(0, 20).map((c) => (
                <tr key={c.id} className={`border-t transition-colors ${c.id === ultimoId ? '!bg-blue-50' : ''}`}>
                  <td className="px-3 py-2 font-mono font-medium text-slate-800">
                    {formatFecha(c.fecha)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                    {Number(c.costo).toLocaleString('es-GT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                    {Number(c.costoDiferenciado).toLocaleString('es-GT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {c.usuarioNombre ?? `Usuario ${c.usuarioId}`}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {c.id < 0 ? 'Pendiente' : formatFechaHora(c.fechaAgrego)}
                  </td>
                  {mode === 'edit' && (
                    <td className="px-2 py-1 text-center">
                      {c.id === ultimoId && !(diferido && c.id > 0) && (
                        <button
                          type="button"
                          onClick={() => handleEliminar(c.id)}
                          disabled={eliminando === c.id}
                          className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                          title="Eliminar ultimo costo"
                        >
                          {eliminando === c.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />
                          }
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visibles.length > 20 && (
        <p className="text-xs text-slate-400 text-center">
          Mostrando los ultimos 20 registros de {visibles.length} en total.
        </p>
      )}
    </div>
  )
}

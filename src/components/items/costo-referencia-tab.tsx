'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { FieldError } from '@/components/ui/field-error'
import { listarCostosRefItem, agregarCostoRefItem, eliminarCostoRefItem } from '@/app/actions/items'
import type { ItemCostoRefRow } from '@/lib/types/items'

interface CostoReferenciaTabProps {
  itemId: number
  mode: 'view' | 'edit'
  /** Descripción del ítem de referencia (para mostrar como campo informativo). */
  referenciaDescripcion: string | null | undefined
}

function formatFecha(fechaStr: string): string {
  const [year, month, day] = fechaStr.split('-')
  return `${day}/${month}/${year}`
}

function formatFechaHora(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function CostoReferenciaTab({ itemId, mode, referenciaDescripcion }: CostoReferenciaTabProps) {
  const [registros, setRegistros] = useState<ItemCostoRefRow[]>([])
  const [cargando, setCargando] = useState(false)

  // Formulario de nuevo registro
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [pct, setPct] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<number | null>(null)

  const cargarRegistros = useCallback(async () => {
    setCargando(true)
    const lista = await listarCostosRefItem(itemId)
    setRegistros(lista)
    setCargando(false)
  }, [itemId])

  useEffect(() => {
    cargarRegistros()
  }, [cargarRegistros])

  const handleAgregar = async () => {
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!fecha) errors.fecha = 'Requerido'
    if (!pct || pct <= 0) errors.pct = 'Ingrese un porcentaje mayor que 0'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setGuardando(true)
    const res = await agregarCostoRefItem(itemId, { fecha, pct: pct! })
    setGuardando(false)

    if (!res.ok) {
      if (res.field) {
        setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
      } else {
        setGlobalError(res.error)
      }
    } else {
      setRegistros(res.data!)
      setFecha(new Date().toISOString().slice(0, 10))
      setPct(null)
      setFieldErrors({})
    }
  }

  const handleEliminar = async (id: number) => {
    setEliminando(id)
    setGlobalError(null)
    const res = await eliminarCostoRefItem(id, itemId)
    setEliminando(null)
    if (!res.ok) {
      setGlobalError(res.error)
    } else {
      setRegistros(res.data!)
    }
  }

  const ultimoId = registros.length > 0 ? registros[0].id : null

  return (
    <div className="space-y-4">

      {/* ─── Ítem de Referencia (solo informativo) ─── */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
        <Link2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-700">Ítem Referencia</p>
          <p className="text-sm text-blue-900 font-medium truncate mt-0.5">
            {referenciaDescripcion ?? <span className="italic text-blue-400">No asignado</span>}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            El costo de este ítem se calcula como un porcentaje del costo vigente del ítem de referencia.
          </p>
        </div>
      </div>

      {/* ─── Panel de nuevo registro (solo en modo edición) ─── */}
      {mode === 'edit' && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            Registrar Nuevo Porcentaje
          </p>

          {globalError && (
            <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-2">
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Fecha de vigencia */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-fecha">
                Fecha Vigencia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ref-fecha"
                type="date"
                value={fecha}
                onChange={e => {
                  setFecha(e.target.value)
                  if (fieldErrors.fecha) setFieldErrors(prev => { const n = { ...prev }; delete n.fecha; return n })
                }}
                className="h-8 py-1"
                aria-invalid={!!fieldErrors.fecha}
              />
              <FieldError message={fieldErrors.fecha} />
            </div>

            {/* Porcentaje */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-pct">
                Porcentaje (%) <span className="text-red-500">*</span>
              </Label>
              <NumericInput
                id="ref-pct"
                value={pct ?? undefined}
                onChange={v => {
                  setPct(v ?? null)
                  if (fieldErrors.pct) setFieldErrors(prev => { const n = { ...prev }; delete n.pct; return n })
                }}
                className="h-8"
                placeholder="0.00"
                aria-invalid={!!fieldErrors.pct}
              />
              <FieldError message={fieldErrors.pct} />
            </div>
          </div>

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

      {/* ─── Grid de registros históricos ─── */}
      {cargando ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Cargando historial...</span>
        </div>
      ) : registros.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-md">
          No hay porcentajes registrados para este ítem.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-28">Fecha Vigencia</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 w-24">Porcentaje</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Registrado Por</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-36">Fecha Registro</th>
                {mode === 'edit' && <th className="w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registros.slice(0, 20).map((r) => (
                <tr key={r.id} className={r.id === ultimoId ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-2 font-mono font-medium text-slate-800">
                    {formatFecha(r.fecha)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                    {Number(r.pct).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.usuarioNombre ?? `Usuario ${r.usuarioId}`}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {formatFechaHora(r.fechaAgrego)}
                  </td>
                  {mode === 'edit' && (
                    <td className="px-2 py-1 text-center">
                      {r.id === ultimoId && (
                        <button
                          type="button"
                          onClick={() => handleEliminar(r.id)}
                          disabled={eliminando === r.id}
                          className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                          title="Eliminar último porcentaje"
                        >
                          {eliminando === r.id
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

      {registros.length > 20 && (
        <p className="text-xs text-slate-400 text-center">
          Mostrando los últimos 20 registros de {registros.length} en total.
        </p>
      )}
    </div>
  )
}

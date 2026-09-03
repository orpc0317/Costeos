'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, DollarSign, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { FieldError } from '@/components/ui/field-error'
import { listarCostosItem, agregarCostoItem, eliminarCostoItem } from '@/app/actions/items'
import type { ItemCostoRow } from '@/lib/types/items'

interface CostoTabProps {
  itemId: number
  mode: 'view' | 'edit'
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

export function CostoTab({ itemId, mode }: CostoTabProps) {
  const [costos, setCostos] = useState<ItemCostoRow[]>([])
  const [cargando, setCargando] = useState(false)

  // Formulario de nuevo costo
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [costo, setCosto] = useState<number | null>(null)
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
  }, [cargarCostos])

  const handleAgregar = async () => {
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!fecha) errors.fecha = 'Requerido'
    if (!costo || costo <= 0) errors.costo = 'Ingrese un costo mayor que 0'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setGuardando(true)
    const res = await agregarCostoItem(itemId, { fecha, costo: costo! })
    setGuardando(false)

    if (!res.ok) {
      if (res.field) {
        setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
      } else {
        setGlobalError(res.error)
      }
    } else {
      setCostos(res.data!)
      setFecha(new Date().toISOString().slice(0, 10))
      setCosto(null)
      setFieldErrors({})
    }
  }

  const handleEliminar = async (id: number) => {
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

  const ultimoId = costos.length > 0 ? costos[0].id : null

  return (
    <div className="space-y-4">

      {/* ─── Panel de nuevo costo (solo en modo edicion) ─── */}
      {mode === 'edit' && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Registrar Nuevo Costo
          </p>

          {globalError && (
            <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-2">
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Fecha de vigencia */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="costo-fecha">
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
                className="h-8 py-1"
                aria-invalid={!!fieldErrors.fecha}
              />
              <FieldError message={fieldErrors.fecha} />
            </div>

            {/* Costo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="costo-valor">
                Costo <span className="text-red-500">*</span>
              </Label>
              <NumericInput
                id="costo-valor"
                value={costo ?? undefined}
                onChange={v => {
                  setCosto(v)
                  if (fieldErrors.costo) setFieldErrors(prev => { const n = { ...prev }; delete n.costo; return n })
                }}
                decimals={4}
                className="h-8"
                placeholder="0.0000"
                aria-invalid={!!fieldErrors.costo}
              />
              <FieldError message={fieldErrors.costo} />
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

      {/* ─── Grid de costos registrados ─── */}
      {cargando ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Cargando costos...</span>
        </div>
      ) : costos.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-md">
          No hay costos registrados para este item.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-28">Fecha Vigencia</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 w-32">Costo</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Registrado Por</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-36">Fecha Registro</th>
                {mode === 'edit' && <th className="w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costos.slice(0, 20).map((c) => (
                <tr key={c.id} className={c.id === ultimoId ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-2 font-mono font-medium text-slate-800">
                    {formatFecha(c.fecha)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                    {Number(c.costo).toLocaleString('es-GT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {c.usuarioNombre ?? `Usuario ${c.usuarioId}`}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {formatFechaHora(c.fechaAgrego)}
                  </td>
                  {mode === 'edit' && (
                    <td className="px-2 py-1 text-center">
                      {c.id === ultimoId && (
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

      {costos.length > 20 && (
        <p className="text-xs text-slate-400 text-center">
          Mostrando los ultimos 20 registros de {costos.length} en total.
        </p>
      )}
    </div>
  )
}

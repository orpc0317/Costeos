'use client'

import React, { useEffect, useState } from 'react'
import { Loader2, Layers, Plus, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import { listarTiposCombosPorEmpresa } from '@/app/actions/tipos-combo'

export type ItemTipoComboAsoc = {
  tipoComboId:  number
  obligatorio:  boolean
}

interface TiposComboTabProps {
  empresaId: number
  value:     ItemTipoComboAsoc[]
  onChange:  (value: ItemTipoComboAsoc[]) => void
  mode:      'view' | 'edit'
}

export function TiposComboTab({ empresaId, value, onChange, mode }: TiposComboTabProps) {
  const [tipos, setTipos]     = useState<{ id: number; nombre: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [seleccion, setSeleccion] = useState<string>('')

  useEffect(() => {
    if (!empresaId) { setTipos([]); return }
    setLoading(true)
    listarTiposCombosPorEmpresa(empresaId)
      .then(data => {
        setTipos(data)
      })
      .finally(() => setLoading(false))
  }, [empresaId])

  // Opciones disponibles: solo los tipos que aún NO están en la lista
  const tiposDisponibles = tipos
    .filter(t => !value.some(v => v.tipoComboId === t.id))
    .map(t => ({ value: t.id.toString(), label: t.nombre }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const handleAgregar = () => {
    if (!seleccion) return
    const id = parseInt(seleccion, 10)
    if (value.some(v => v.tipoComboId === id)) return
    onChange([...value, { tipoComboId: id, obligatorio: false }])
    setSeleccion('')
  }

  const handleQuitar = (tipoComboId: number) => {
    onChange(value.filter(v => v.tipoComboId !== tipoComboId))
  }

  const handleObligatorio = (tipoComboId: number, checked: boolean) => {
    onChange(value.map(v => v.tipoComboId === tipoComboId ? { ...v, obligatorio: checked } : v))
  }

  const getNombre = (id: number) =>
    tipos.find(t => t.id === id)?.nombre ?? `ID ${id}`

  // ── Estado vacío ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando tipos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-1">

      {/* ── Selector para agregar ── */}
      {mode === 'edit' && (
        <div className="flex items-end gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <Label>Agregar Tipo Combo</Label>
            <SearchableSelect
              options={tiposDisponibles}
              value={seleccion}
              onChange={setSeleccion}
              placeholder={
                tiposDisponibles.length === 0
                  ? tipos.length === 0
                    ? 'No hay tipos configurados para esta empresa'
                    : 'Todos los tipos ya fueron agregados'
                  : 'Seleccionar tipo...'
              }
              disabled={tiposDisponibles.length === 0}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAgregar}
            disabled={!seleccion}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        </div>
      )}

      {/* ── Lista de tipos asociados ── */}
      {value.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
          <Layers className="h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">Sin tipos configurados</p>
          {mode === 'edit' && (
            <p className="text-xs text-center max-w-xs text-slate-400">
              Selecciona un Tipo Combo arriba y presiona <strong>Agregar</strong>.
            </p>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Tipo Combo</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600 w-28">Obligatorio</th>
                {mode === 'edit' && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {value.map(asoc => (
                <tr key={asoc.tipoComboId} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    {getNombre(asoc.tipoComboId)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={asoc.obligatorio}
                        onCheckedChange={checked => handleObligatorio(asoc.tipoComboId, checked as boolean)}
                        disabled={mode === 'view'}
                        id={`oblig-${asoc.tipoComboId}`}
                      />
                    </div>
                  </td>
                  {mode === 'edit' && (
                    <td className="px-2 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleQuitar(asoc.tipoComboId)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

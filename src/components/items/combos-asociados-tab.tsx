'use client'

import React, { useEffect, useState } from 'react'
import { Loader2, CheckSquare2, Square, Link2 } from 'lucide-react'
import { listarTiposComboRHPorEmpresa } from '@/app/actions/tipos-combo-rh'
import type { TipoComboRHRow } from '@/lib/types/tipos-combo-rh'
import { cn } from '@/lib/utils'

export type TipoComboRHAsociacion = {
  tipoComboRHId: number
  rol: 'NECESITA' | 'DISPONIBLE'
}

interface CombosAsociadosTabProps {
  /** ID de la empresa del ítem — para cargar los tipos de esa empresa */
  empresaId: number
  /** tipoItem del ítem principal: 3=Servicio(RH). Controla si se muestra sección NECESITA */
  tipoItem: number
  /** tipoProducto: 1=RH. Solo ítems tipo Servicio/tipoProducto=1 son verdaderamente RH */
  tipoProducto: number
  /** Asociaciones actuales del ítem */
  value: TipoComboRHAsociacion[]
  onChange: (value: TipoComboRHAsociacion[]) => void
  mode: 'view' | 'edit'
}

export function CombosAsociadosTab({
  empresaId,
  tipoItem,
  tipoProducto,
  value,
  onChange,
  mode,
}: CombosAsociadosTabProps) {
  const [tipos, setTipos] = useState<TipoComboRHRow[]>([])
  const [loading, setLoading] = useState(false)

  const esRH = tipoItem === 3 && tipoProducto === 1

  useEffect(() => {
    if (!empresaId) return
    setLoading(true)
    listarTiposComboRHPorEmpresa(empresaId)
      .then(setTipos)
      .finally(() => setLoading(false))
  }, [empresaId])

  const getAsoc = (tipoId: number, rol: 'NECESITA' | 'DISPONIBLE') =>
    value.some(a => a.tipoComboRHId === tipoId && a.rol === rol)

  const toggle = (tipoId: number, rol: 'NECESITA' | 'DISPONIBLE') => {
    if (mode === 'view') return
    const already = getAsoc(tipoId, rol)
    if (already) {
      onChange(value.filter(a => !(a.tipoComboRHId === tipoId && a.rol === rol)))
    } else {
      onChange([...value, { tipoComboRHId: tipoId, rol }])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando tipos...</span>
      </div>
    )
  }

  if (tipos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
        <Link2 className="h-8 w-8 opacity-40" />
        <p className="text-sm font-medium">Sin tipos configurados</p>
        <p className="text-xs text-center max-w-xs">
          No hay Tipos Combo RH activos para esta empresa. Configúralos desde el botón <strong>Tipos RH</strong> en la pantalla de Ítems.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-1">
      {/* ── Sección NECESITA (solo ítems RH) ── */}
      {esRH && (
        <section>
          <div className="flex items-center mb-3 min-h-[24px]">
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider border-l-2 border-indigo-500 pl-2 leading-none">
              Requiere selección en Costeo
            </h3>
            <div className="flex-1 border-t border-indigo-100 ml-3 mt-0.5" />
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Al agregar este ítem RH a un costeo, el sistema mostrará un selector para cada tipo marcado aquí.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {tipos.map(tipo => {
              const marcado = getAsoc(tipo.id, 'NECESITA')
              return (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => toggle(tipo.id, 'NECESITA')}
                  disabled={mode === 'view'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
                    marcado
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                    mode === 'view' && 'cursor-default opacity-70',
                  )}
                >
                  {marcado
                    ? <CheckSquare2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    : <Square className="h-4 w-4 text-slate-400 shrink-0" />
                  }
                  <span className="text-sm font-medium leading-tight">{tipo.nombre}</span>
                  {tipo.requerido && (
                    <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5">
                      REQ
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Sección DISPONIBLE ── */}
      <section>
        <div className="flex items-center mb-3 min-h-[24px]">
          <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider border-l-2 border-emerald-500 pl-2 leading-none">
            Disponible como opción de tipo
          </h3>
          <div className="flex-1 border-t border-emerald-100 ml-3 mt-0.5" />
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Marca los tipos para los que este ítem puede ser seleccionado en un costeo (ej. "esta camisa es una opción de Uniforme").
        </p>
        <div className="grid grid-cols-2 gap-2">
          {tipos.map(tipo => {
            const marcado = getAsoc(tipo.id, 'DISPONIBLE')
            return (
              <button
                key={tipo.id}
                type="button"
                onClick={() => toggle(tipo.id, 'DISPONIBLE')}
                disabled={mode === 'view'}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
                  marcado
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  mode === 'view' && 'cursor-default opacity-70',
                )}
              >
                {marcado
                  ? <CheckSquare2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  : <Square className="h-4 w-4 text-slate-400 shrink-0" />
                }
                <span className="text-sm font-medium leading-tight">{tipo.nombre}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

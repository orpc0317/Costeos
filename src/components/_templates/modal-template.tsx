/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  TEMPLATE DE MODAL ESTÁNDAR — PROYECTO COSTEOS                              ║
 * ║                                                                              ║
 * ║  USO: Copiar este archivo y reemplazar TODAS las ocurrencias de:             ║
 * ║    MiEntidad      → nombre de la entidad en PascalCase (ej: TipoCombo)      ║
 * ║    miEntidad      → nombre en camelCase (ej: tipoCombo)                     ║
 * ║    TABLA_DB       → nombre exacto de la tabla en MySQL (ej: costeos_tc)     ║
 * ║    EntidadIcon    → ícono canónico de la entidad (ej: Layers)               ║
 * ║    campo1/campo2  → campos reales del formulario                             ║
 * ║                                                                              ║
 * ║  PASOS:                                                                      ║
 * ║    1. Copiar a src/components/<entidad>/<entidad>-modal.tsx                  ║
 * ║    2. Reemplazar todos los placeholders con nombres reales                   ║
 * ║    3. Agregar/quitar campos del formulario dentro de TabsContent             ║
 * ║    4. Ajustar validaciones locales en handleSubmit                           ║
 * ║    5. Ejecutar el Pre-flight Checklist de AGENTS.md antes de terminar        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field-error'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
// TODO: reemplazar EntidadIcon con el ícono canónico de la entidad (fuente: sidebar)
import { EntidadIcon, Pencil, History, Trash2, Save, Loader2 } from 'lucide-react'
import { getEmpresasForUser } from '@/app/actions/erp'
import {
  crearMiEntidad,
  editarMiEntidad,
  eliminarMiEntidad,
  buscarMiEntidadSimilares,
} from '@/app/actions/mi-entidad' // TODO: ajustar import
import { normalizeText } from '@/lib/utils/text'
import { cn } from '@/lib/utils'
import type { MiEntidadRow } from '@/lib/types/mi-entidad' // TODO: ajustar import
import type { SimilarItem } from '@/lib/utils/similarity'

// ─── Props ────────────────────────────────────────────────────────────────────
// Patrón estándar: trigger (nodo React) + entidad opcional (null = modo crear)

interface MiEntidadModalProps {
  miEntidad?: MiEntidadRow | null
  trigger: React.ReactNode
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MiEntidadModal({ miEntidad, trigger }: MiEntidadModalProps) {
  const isEditing = !!miEntidad

  // ── Estado del modal ───────────────────────────────────────────────────────
  const [open, setOpen]                       = useState(false)
  const [historialOpen, setHistorialOpen]     = useState(false)
  const [mode, setMode]                       = useState<'view' | 'edit' | 'create'>('create')
  const [activeTab, setActiveTab]             = useState('general')
  const [initialMiEntidad, setInitialMiEntidad] = useState<MiEntidadRow | null>(null)

  // ── Campos del formulario ──────────────────────────────────────────────────
  // TODO: agregar un useState por campo del formulario
  const [empresaId, setEmpresaId] = useState('')
  const [campo1, setCampo1]       = useState('')
  // const [campo2, setCampo2]    = useState('')

  // ── Estado UI ──────────────────────────────────────────────────────────────
  const [empresas, setEmpresas]                   = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas]   = useState(false)
  const [loading, setLoading]                     = useState(false)
  const [fieldErrors, setFieldErrors]             = useState<Record<string, string>>({})
  const [globalError, setGlobalError]             = useState<string | null>(null)
  const [similares, setSimilares]                 = useState<SimilarItem[]>([])
  const [isPendingEliminar, startEliminar]        = useTransition()

  // ── Inicialización de modo y campos ───────────────────────────────────────
  // REGLA CRÍTICA: La inicialización SIEMPRE ocurre en handleOpenChange cuando
  // newOpen === true. NUNCA usar useEffect con deps en datos del registro o mode.
  // Ver AGENTS.md: "Bug Flash" y "Bug Modal sin datos".
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      const tc = miEntidad ?? null
      setInitialMiEntidad(tc)
      setMode(tc ? 'view' : 'create')
      resetFields(tc)
    }
    setOpen(newOpen)
  }

  function resetFields(tc: MiEntidadRow | null) {
    setEmpresaId(tc?.empresaId?.toString() ?? '')
    setCampo1(tc?.campo1 ?? '')
    // setCampo2(tc?.campo2 ?? '')
    setFieldErrors({})
    setGlobalError(null)
    setSimilares([])
    setActiveTab('general')
  }

  // ── Cargar empresas + reset defensivo (R22) ────────────────────────────────
  // REGLA R22: El useEffect([open]) TAMBIÉN resetea los campos como defensa
  // adicional, por si @base-ui/react no invoca onOpenChange en el trigger.
  // NUNCA tocar `mode` aquí — eso causaría el Bug Flash.
  useEffect(() => {
    if (!open) return

    // ✅ Reset defensivo de campos (sin tocar mode — R22)
    const tc = miEntidad ?? null
    setCampo1(tc?.campo1 ?? '')
    // setCampo2(tc?.campo2 ?? '')
    setEmpresaId(tc?.empresaId?.toString() ?? '')
    setFieldErrors({})
    setGlobalError(null)
    setSimilares([])
    setActiveTab('general')

    // Cargar empresas
    let active = true
    setCargandoEmpresas(true)
    getEmpresasForUser()
      .then(data => {
        if (!active) return
        const opts = data
          .map(e => ({ value: e.id.toString(), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(opts)
        // Auto-seleccionar primera empresa en modo crear
        if (!miEntidad && data.length > 0) {
          setEmpresaId(data[0].id.toString())
        }
      })
      .catch(() => { if (active) setGlobalError('Error al cargar empresas.') })
      .finally(() => { if (active) setCargandoEmpresas(false) })
    return () => { active = false }
  }, [open]) // Solo [open] — NUNCA dependencias de datos ni de mode

  // ── Guardado efectivo (sin verificación de similares) ─────────────────────
  async function doSave() {
    setLoading(true)
    setGlobalError(null)
    try {
      let result
      if (mode === 'edit' && initialMiEntidad) {
        result = await editarMiEntidad(initialMiEntidad.id, {
          campo1,
          // campo2,
          registroVersion: initialMiEntidad.registroVersion,
        })
      } else {
        result = await crearMiEntidad({
          empresaId: parseInt(empresaId, 10),
          campo1,
          // campo2,
        })
      }

      if (!result.ok) {
        if (result.field) {
          setFieldErrors(prev => ({ ...prev, [result.field!]: result.error }))
        } else {
          setGlobalError(result.error)
        }
        return
      }

      if (mode === 'edit' && result.data) {
        setInitialMiEntidad(result.data)
        resetFields(result.data)
        setMode('view')
      } else {
        setOpen(false)
      }
    } catch (err: any) {
      setGlobalError(err.message ?? 'Error inesperado del servidor.')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit con validación + R18 (anti-similares) ───────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSimilares([])

    // Validación local — construir errores sin limpiar fieldErrors previos.
    // REGLA: NO hacer setFieldErrors({}) al inicio. Preservar errores de lookups
    // externos que ya estén en fieldErrors. NUNCA mostrar errores con toast().
    const errors: Record<string, string> = {}
    if (!empresaId) errors.empresaId = 'Requerido'
    if (!campo1.trim()) errors.campo1 = 'Requerido'
    // if (!campo2.trim()) errors.campo2 = 'Requerido'
    setFieldErrors(prev => ({ ...prev, ...errors }))
    if (Object.keys(errors).length > 0) return

    // R18 — Verificar similares solo si el nombre cambió
    const campo1Norm     = normalizeText(campo1)
    const campo1Original = initialMiEntidad?.campo1 ?? ''
    const campo1Cambio   = !initialMiEntidad || campo1Norm !== campo1Original

    if (campo1Cambio) {
      const found = await buscarMiEntidadSimilares(
        campo1Norm,
        parseInt(empresaId, 10),
        initialMiEntidad?.id,
      )
      const exacto = found.find(s => s.pct === 100)
      if (exacto) {
        setFieldErrors(prev => ({ ...prev, campo1: `Ya existe un registro con este nombre: "${exacto.descripcion}"` }))
        return
      }
      if (found.length > 0) {
        setSimilares(found)
        return
      }
    }

    await doSave()
  }

  // ── Cancelar edición → volver a vista (sin cerrar modal) ──────────────────
  function handleCancelar() {
    if (mode === 'edit') {
      resetFields(initialMiEntidad)
      setMode('view')
    } else {
      setOpen(false)
    }
  }

  // ── Eliminar con OCC ───────────────────────────────────────────────────────
  function handleEliminar() {
    if (!initialMiEntidad) return
    startEliminar(async () => {
      const result = await eliminarMiEntidad(
        initialMiEntidad.id,
        initialMiEntidad.registroVersion,
      )
      if (result.ok) {
        setOpen(false)
      } else {
        setGlobalError(result.error)
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={trigger as React.ReactElement} />

        {/*
          DialogContent: altura fija + flex col + sin padding propio (p-4 sm:p-6)
          Ajustar sm:h-[Xpx] según cantidad de campos. Base: 420px para 2-3 campos.
        */}
        <DialogContent className="sm:max-w-[500px] h-[85vh] sm:h-[420px] flex flex-col p-4 sm:p-6 overflow-hidden">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {/* TODO: reemplazar EntidadIcon con el ícono canónico de la entidad */}
              <EntidadIcon className="w-5 h-5 text-slate-500" />
              {mode === 'create'
                ? 'Nueva Mi Entidad'
                : mode === 'edit'
                ? 'Editar Mi Entidad'
                : 'Detalle Mi Entidad'}
            </DialogTitle>
          </DialogHeader>

          {/* ── Error global ──────────────────────────────────────────────── */}
          {globalError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md border border-red-200 shrink-0">
              {globalError}
            </div>
          )}

          {/* ── Formulario con pestañas ────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-hidden flex flex-col pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">

              {/* TabsList: variant="line", mb-4 shrink-0, ícono en cada trigger */}
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  {/* TODO: reemplazar EntidadIcon con el ícono canónico de la entidad */}
                  <EntidadIcon className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                {/*
                  Agregar más TabsTrigger aquí si hay más pestañas.
                  Ejemplo:
                  <TabsTrigger value="detalle">
                    <Settings className="w-4 h-4 mr-2" />
                    Detalle
                  </TabsTrigger>
                */}
              </TabsList>

              {/* Área scrolleable */}
              <div className="flex-1 overflow-y-auto pr-2 pb-4">

                {/* ── Pestaña General ─────────────────────────────────────── */}
                <TabsContent value="general" className="mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                    {/* Empresa — select en crear, input deshabilitado en ver/editar */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="me-empresaId">
                        Empresa {mode === 'create' && <span className="text-red-500">*</span>}
                      </Label>
                      {mode === 'create' ? (
                        <>
                          <SearchableSelect
                            id="me-empresaId"
                            options={empresas}
                            value={empresaId}
                            onChange={v => {
                              setEmpresaId(v)
                              setFieldErrors(p => ({ ...p, empresaId: '' }))
                            }}
                            placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                            disabled={cargandoEmpresas}
                            error={!!fieldErrors.empresaId}
                            // searchable={false}  ← usar solo en listas cortas y predecibles
                            //                       (ej. < 8 opciones, lista fija)
                          />
                          <FieldError message={fieldErrors.empresaId} />
                        </>
                      ) : (
                        <Input
                          id="me-empresaId-readonly"
                          value={initialMiEntidad?.empresaNombre ?? ''}
                          disabled
                          className="bg-muted/50"
                        />
                      )}
                    </div>

                    {/*
                      ── Campo 1 (campo principal — generalmente el Nombre) ──
                      Ajustar col-span según layout. 1=mitad, 2=ancho completo.
                    */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="me-campo1">
                        Campo 1 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="me-campo1"
                        value={campo1}
                        onChange={e => {
                          setCampo1(e.target.value.toUpperCase())
                          setFieldErrors(p => ({ ...p, campo1: '' }))
                          if (similares.length > 0) setSimilares([])
                        }}
                        placeholder="Texto en mayúsculas"
                        className={cn('uppercase', fieldErrors.campo1 && 'border-red-500')}
                        disabled={mode === 'view'}
                        autoComplete="off"
                      />
                      <FieldError message={fieldErrors.campo1} />

                      {/* Panel de similares R18 — solo cuando hay resultados */}
                      {similares.length > 0 && mode !== 'view' && (
                        <div className="mt-1 rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                          <p className="text-xs font-semibold text-amber-800">
                            ⚠️ Se encontraron {similares.length} registro{similares.length > 1 ? 's' : ''} similar{similares.length > 1 ? 'es' : ''} — ¿Desea guardar de todas formas?
                          </p>
                          <ul className="space-y-1">
                            {similares.map(s => (
                              <li key={s.id} className="flex justify-between text-xs text-amber-900">
                                <span className="font-mono">{s.descripcion}</span>
                                <span className="font-bold ml-2 text-amber-700">{s.pct}%</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => { setSimilares([]); doSave() }}
                              className="text-xs bg-amber-700 text-white px-3 py-1 rounded hover:bg-amber-800 font-medium"
                            >
                              Sí, guardar de todas formas
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimilares([])}
                              className="text-xs text-amber-800 underline hover:text-amber-900"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/*
                      ── REGLAS PARA CAMPOS ADICIONALES ─────────────────────

                      ERRORES (NUNCA usar toast):
                      • Errores de campo → <FieldError message={fieldErrors.campo} />
                        Se coloca SIEMPRE debajo del input. NUNCA escribir el <p> directo.
                      • Errores globales (servidor/catch) → estado globalError mostrado
                        inline AL TOPE del formulario (ya incluido arriba).
                      • Al validar, usar: setFieldErrors(prev => ({ ...prev, ...errors }))
                        NO setFieldErrors(errors) — para preservar errores de lookups externos.

                      SELECTS (siempre <SearchableSelect>):
                      • Opciones de BD/ERP: .sort((a,b) => a.label.localeCompare(b.label))
                      • Auto-seleccionar primer registro (excepto búsquedas Cliente/Ítem)
                      • searchable={false} solo en listas cortas/fijas (< 8 opciones)
                      • Opciones hardcoded: Title Case ('Producto', 'No Aplica', 'Recurso Humano')
                        NUNCA ALL_CAPS ('PRODUCTO', 'NO_APLICA')

                      INPUTS NUMÉRICOS:
                      • NUNCA <input type="number"> — usar <NumericInput> de
                        src/components/ui/numeric-input.tsx

                      HISTORIAL (no mostrar datos de auditoría inline):
                      • NUNCA campos tipo "Creado:", "ID:", "Modificado:" en el modal
                      • El <HistorialDrawer> fuera del <Dialog> cubre toda la auditoría
                      • tabla= debe coincidir EXACTAMENTE con el nombre de tabla en MySQL

                      CAMPOS DESHABILITADOS PERMANENTES (autogenerados):
                      • disabled={true} + className="bg-muted/50"
                      • Ocultar al crear, deshabilitar al editar

                      Ejemplo de campo adicional:
                      <div className="flex flex-col gap-1.5 col-span-[1|2]">
                        <Label htmlFor="me-campo2">
                          Nombre Label <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="me-campo2"
                          value={campo2}
                          onChange={e => {
                            setCampo2(e.target.value)
                            setFieldErrors(p => ({ ...p, campo2: '' }))
                          }}
                          disabled={mode === 'view'}
                          autoComplete="off"
                        />
                        <FieldError message={fieldErrors.campo2} />
                      </div>
                    */}

                  </div>
                </TabsContent>

                {/*
                  Agregar más TabsContent aquí si hay más pestañas.
                  <TabsContent value="detalle" className="mt-0">
                    ...
                  </TabsContent>
                */}

              </div>
            </Tabs>

            {/* ── Footer fijo — CLASE EXACTA, no modificar ──────────────── */}
            <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">

              {/* Izquierda — Eliminar (solo en modo vista, registro existente) */}
              <div>
                {mode === 'view' && initialMiEntidad && (
                  <button
                    type="button"
                    onClick={handleEliminar}
                    disabled={isPendingEliminar}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    title="Eliminar registro"
                  >
                    {isPendingEliminar
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                    Eliminar
                  </button>
                )}
              </div>

              {/* Derecha — botones de acción según modo */}
              <div className="flex gap-2 justify-end">

                {/* Modo Vista → Historial (sky) + Editar */}
                {mode === 'view' && (
                  <>
                    {initialMiEntidad && (
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
                        onClick={() => setHistorialOpen(true)}
                      >
                        <History className="mr-2 h-4 w-4" /> Historial
                      </Button>
                    )}
                    <Button type="button" onClick={() => setMode('edit')}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                  </>
                )}

                {/* Modo Editar / Crear → Cancelar + Guardar */}
                {(mode === 'edit' || mode === 'create') && (
                  <>
                    {/* Cancelar: en edición vuelve a vista; en crear cierra */}
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelar}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={loading}>
                      {loading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                        : <><Save className="w-4 h-4 mr-2" />Guardar</>
                      }
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/*
        HistorialDrawer SIEMPRE fuera del <Dialog>, como hermano en el fragmento.
        tabla= debe coincidir EXACTAMENTE con el nombre de la tabla en MySQL/Prisma.
      */}
      {/* TODO antes de usar:
          - entidadTipo: nombre legible de la entidad (ej. "Tipo Combo")
          - tabla: nombre EXACTO de la tabla en MySQL (ej. "costeos_tipo_combo")
      */}
      {initialMiEntidad && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={initialMiEntidad.id}
          entidadTipo="Mi Entidad"
          tabla="TABLA_DB"
        />
      )}
    </>
  )
}

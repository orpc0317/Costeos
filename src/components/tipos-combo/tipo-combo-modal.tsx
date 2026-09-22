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
import { Layers, Pencil, History, Trash2, Save, Loader2 } from 'lucide-react'
import { getEmpresasForUser } from '@/app/actions/erp'
import {
  crearTipoCombo,
  editarTipoCombo,
  eliminarTipoCombo,
  buscarTipoComboSimilares,
} from '@/app/actions/tipos-combo'
import { normalizeText } from '@/lib/utils/text'
import { cn } from '@/lib/utils'
import { UI_THEME } from '@/lib/theme'
import type { TipoComboRow } from '@/lib/types/tipos-combo'
import type { SimilarItem } from '@/lib/utils/similarity'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TipoComboModalProps {
  tipoCombo?: TipoComboRow | null
  trigger: React.ReactNode
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TipoComboModal({ tipoCombo, trigger }: TipoComboModalProps) {
  const isEditing = !!tipoCombo

  const [open, setOpen]               = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [mode, setMode]               = useState<'view' | 'edit' | 'create'>('create')
  const [activeTab, setActiveTab]     = useState('general')

  // Estado del registro actual (snapshot al abrir)
  const [initialTipoCombo, setInitialTipoCombo] = useState<TipoComboRow | null>(null)

  // Campos del formulario
  const [empresaId, setEmpresaId] = useState('')
  const [nombre, setNombre]       = useState('')
  const [icono, setIcono]         = useState('')

  // Estado UI
  const [empresas, setEmpresas]               = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [fieldErrors, setFieldErrors]         = useState<Record<string, string>>({})
  const [globalError, setGlobalError]         = useState<string | null>(null)
  const [similares, setSimilares]             = useState<SimilarItem[]>([])
  const [isPendingEliminar, startTransitionEliminar] = useTransition()

  // ── Inicialización SIEMPRE en handleOpenChange ─────────────────────────────
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      const tc = tipoCombo ?? null
      setInitialTipoCombo(tc)
      setMode(tc ? 'view' : 'create')
      resetFields(tc)
    }
    setOpen(newOpen)
  }

  function resetFields(tc: TipoComboRow | null) {
    setEmpresaId(tc?.empresaId?.toString() ?? '')
    setNombre(tc?.nombre ?? '')
    setIcono(tc?.icono ?? '')
    setFieldErrors({})
    setGlobalError(null)
    setSimilares([])
    setActiveTab('general')
  }

  // ── Cargar empresas + reset defensivo al abrir (R22) ──────────────────────
  // IMPORTANTE: NO tocar `mode` aquí — eso causaría el Bug Flash (AGENTS.md R22).
  useEffect(() => {
    if (!open) return

    // Reset defensivo de campos (sin tocar mode — regla R22)
    const tc = tipoCombo ?? null
    setNombre(tc?.nombre ?? '')
    setIcono(tc?.icono ?? '')
    setEmpresaId(tc?.empresaId?.toString() ?? '')
    setFieldErrors({})
    setGlobalError(null)
    setSimilares([])
    setActiveTab('general')

    // Cargar lista de empresas
    let active = true
    setCargandoEmpresas(true)
    getEmpresasForUser()
      .then(data => {
        if (!active) return
        const opts = data
          .map(e => ({ value: e.id.toString(), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(opts)
        // Auto-seleccionar primera empresa solo en modo crear
        if (!tipoCombo && data.length > 0) {
          setEmpresaId(data[0].id.toString())
        }
      })
      .catch(() => { if (active) setGlobalError('Error al cargar empresas.') })
      .finally(() => { if (active) setCargandoEmpresas(false) })
    return () => { active = false }
  }, [open])

  // ── Guardado ───────────────────────────────────────────────────────────────
  async function doSave() {
    setLoading(true)
    setGlobalError(null)
    try {
      let result
      if (mode === 'edit' && initialTipoCombo) {
        result = await editarTipoCombo(initialTipoCombo.id, {
          nombre,
          icono: icono || null,
          registroVersion: initialTipoCombo.registroVersion,
        })
      } else {
        result = await crearTipoCombo({
          empresaId: parseInt(empresaId, 10),
          nombre,
          icono: icono || null,
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
        setInitialTipoCombo(result.data)
        resetFields(result.data)
        setMode('view')
      } else {
        setOpen(false)
      }
    } catch (err: any) {
      setGlobalError(err.message ?? 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSimilares([])

    // Validación local
    const errors: Record<string, string> = {}
    if (!empresaId) errors.empresaId = 'Requerido'
    if (!nombre.trim()) errors.nombre = 'Requerido'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    // R18 — Verificar similares solo si el nombre cambió
    const nombreNorm = normalizeText(nombre)
    const nombreOriginal = initialTipoCombo?.nombre ?? ''
    const nombreCambio = !initialTipoCombo || nombreNorm !== nombreOriginal

    if (nombreCambio) {
      const found = await buscarTipoComboSimilares(
        nombreNorm,
        parseInt(empresaId, 10),
        initialTipoCombo?.id,
      )
      const exacto = found.find(s => s.pct === 100)
      if (exacto) {
        setFieldErrors(prev => ({ ...prev, nombre: `Ya existe un tipo con este nombre: "${exacto.descripcion}"` }))
        return
      }
      if (found.length > 0) {
        setSimilares(found)
        return
      }
    }

    await doSave()
  }

  function handleCancelar() {
    if (mode === 'edit') {
      resetFields(initialTipoCombo)
      setMode('view')
    } else {
      setOpen(false)
    }
  }

  function handleEliminar() {
    if (!initialTipoCombo) return
    startTransitionEliminar(async () => {
      const result = await eliminarTipoCombo(initialTipoCombo.id, initialTipoCombo.registroVersion)
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

        <DialogContent className="sm:max-w-[500px] h-[85vh] sm:h-[440px] flex flex-col p-4 sm:p-6 overflow-hidden">
          {/* Header */}
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Layers className="w-5 h-5 text-slate-500" />
              {mode === 'create'
                ? 'Nuevo Tipo Combo'
                : mode === 'edit'
                ? 'Editar Tipo Combo'
                : 'Detalle Tipo Combo'}
            </DialogTitle>
          </DialogHeader>

          {/* Error global */}
          {globalError && (
            <div className={`${UI_THEME.forms.globalError} shrink-0`}>
              {globalError}
            </div>
          )}

          {/* Formulario con pestañas */}
          <form onSubmit={handleSubmit} noValidate className="flex-1 min-h-0 flex flex-col pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <Layers className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 pb-4">
                <TabsContent value="general" className="mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                    {/* Empresa — select en crear, deshabilitado en ver/editar */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="tc-empresaId">
                        Empresa {mode === 'create' && <span className="text-red-500">*</span>}
                      </Label>
                      {mode === 'create' ? (
                        <>
                          <SearchableSelect
                            id="tc-empresaId"
                            options={empresas}
                            value={empresaId}
                            onChange={v => { setEmpresaId(v); setFieldErrors(p => ({ ...p, empresaId: '' })) }}
                            placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                            disabled={cargandoEmpresas}
                            error={!!fieldErrors.empresaId}
                          />
                          <FieldError message={fieldErrors.empresaId} />
                        </>
                      ) : (
                        <Input
                          id="tc-empresaId"
                          value={initialTipoCombo?.empresaNombre ?? ''}
                          disabled
                          className="bg-muted/50"
                        />
                      )}
                    </div>

                    {/* Nombre */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="tc-nombre">
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="tc-nombre"
                        value={nombre}
                        onChange={e => {
                          setNombre(e.target.value.toUpperCase())
                          setFieldErrors(p => ({ ...p, nombre: '' }))
                          if (similares.length > 0) setSimilares([])
                        }}
                        placeholder="Ej: UNIFORME, EQUIPO SEGURIDAD"
                        className={cn('uppercase', fieldErrors.nombre ? 'border-red-500' : '')}
                        disabled={mode === 'view'}
                        autoComplete="off"
                      />
                      <FieldError message={fieldErrors.nombre} />

                      {/* Panel R18 — similares */}
                      {similares.length > 0 && mode !== 'view' && (
                        <div className={UI_THEME.forms.warningSimilar}>
                          <p className={UI_THEME.forms.warningSimilarTitle}>
                            ⚠️ Se encontraron {similares.length} tipo{similares.length > 1 ? 's' : ''} similar{similares.length > 1 ? 'es' : ''} — ¿Desea guardar de todas formas?
                          </p>
                          <ul className="space-y-1">
                            {similares.map(s => (
                              <li key={s.id} className={UI_THEME.forms.warningSimilarRow}>
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

                    {/* Icono (opcional) */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="tc-icono">
                        Icono{' '}
                        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="tc-icono"
                        value={icono}
                        onChange={e => setIcono(e.target.value)}
                        placeholder="Ej: shield, hard-hat, shirt"
                        disabled={mode === 'view'}
                        autoComplete="off"
                        className="font-mono text-sm"
                      />
                    </div>

                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer fijo */}
            <div className={UI_THEME.modal.footer}>
              {/* Izquierda — eliminar (solo en vista) */}
              <div>
                {mode === 'view' && initialTipoCombo && (
                  <button
                    type="button"
                    onClick={handleEliminar}
                    disabled={isPendingEliminar}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    title="Eliminar tipo combo"
                  >
                    {isPendingEliminar
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                    Eliminar
                  </button>
                )}
              </div>

              {/* Derecha — acciones */}
              <div className="flex gap-2 justify-end">
                {mode === 'view' && (
                  <>
                    {initialTipoCombo && (
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
                {(mode === 'edit' || mode === 'create') && (
                  <>
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

      {/* Historial fuera del Dialog */}
      {initialTipoCombo && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={initialTipoCombo.id}
          entidadTipo="Tipo Combo"
          tabla="costeos_tipo_combo"
        />
      )}
    </>
  )
}

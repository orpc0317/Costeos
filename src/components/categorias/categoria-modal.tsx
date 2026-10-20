'use client'
import React, { useState, useEffect } from 'react'
import { useEditClick } from '@/lib/use-edit-click'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { Tags, Check, Pencil, History, ArrowUpDown, X } from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { PrioridadModal } from '@/components/categorias/prioridad-modal'
import { crearCategoria, actualizarCategoria, buscarCategoriasSimilares } from '@/app/actions/categorias'
import type { SimilarItem } from '@/lib/utils/similarity'
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import { ModalHeading } from '@/components/ui/modal-heading'
import { esConflicto } from '@/lib/conflicto'
import { SegmentCard, SingleColumn, ViewField } from '@/components/ui/form-layout'
import type { PermisosPantalla } from '@/lib/permisos'
import type { CategoriaInput, CategoriaRow } from '@/lib/types/categorias'

interface CategoriaModalProps {
  categoria?: CategoriaRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  permisos?: PermisosPantalla
}

export function CategoriaModal({
  categoria,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  permisos,
}: CategoriaModalProps) {
  const puedeEditar = permisos?.modificar !== false
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen
  const [historialOpen, setHistorialOpen] = useState(false)
  const [prioridadOpen, setPrioridadOpen] = useState(false)

  const isEditing = !!categoria
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const { onEditMouseDown, onEditClick, blockAccidentalSubmit } = useEditClick(setMode)

  // Campos del formulario
  const [empresa, setEmpresa] = useState<string>('')
  const [nombre, setNombre] = useState('')

  // Datos externos
  const [empresas, setEmpresas] = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  // Estados de UI
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Detección de similares
  const [similares, setSimilares] = useState<SimilarItem[]>([])

  // Cargar empresas SOLO cuando abre el modal — nunca depende de datos del registro ni de `mode`
  useEffect(() => {
    if (!open) return
    setCargandoEmpresas(true)
    getEmpresasForUser()
      .then(data => {
        const opts = data
          .map(e => ({ value: e.id.toString(), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(opts)
      })
      .finally(() => setCargandoEmpresas(false))
  }, [open])

  const resetForm = (data?: CategoriaRow) => {
    setEmpresa(data?.empresaId.toString() ?? '')
    setNombre(data?.nombre ?? '')
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
    setSimilares([])
  }

  // CRÍTICO: inicializar estado aquí, NUNCA en useEffect con deps en datos del registro
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && esConflicto(globalError)) onSuccess?.()
    if (newOpen) {
      resetForm(categoria)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  /** Ejecuta el guardado real (sin verificación de similares) */
  const doSave = async () => {
    setLoading(true)
    const data: CategoriaInput = {
      empresaId: parseInt(empresa, 10),
      nombre: normalizeText(nombre),
    }
    try {
      const res = isEditing && categoria
        ? await actualizarCategoria(categoria.id, data)
        : await crearCategoria(data)
      if (!res.ok) {
        if (res.field) {
          setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
          setActiveTab('general')
        } else {
          setGlobalError(res.error)
        }
        return
      }
      resetForm(res.data)
      if (!isEditing) {
        setOpen(false)
      } else {
        setMode('view')
      }
      onSuccess?.()
    } catch {
      setGlobalError('Error inesperado del servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (blockAccidentalSubmit(e)) return
    setGlobalError(null)
    setSimilares([])

    const errors: Record<string, string> = {}
    if (!empresa) errors.empresa = 'Requerido'
    if (!nombre.trim()) errors.nombre = 'Requerido'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    // Verificar similares solo si el nombre cambió (R18)
    const nombreNormalizado = normalizeText(nombre)
    const nombreOriginal    = categoria?.nombre ?? ''
    if (!categoria || nombreNormalizado !== nombreOriginal) {
      setLoading(true)
      const found = await buscarCategoriasSimilares(
        nombreNormalizado,
        parseInt(empresa, 10),
        categoria?.id,
      )
      setLoading(false)

      if (found.length > 0) {
        const exacto = found.find(s => s.pct === 100)
        if (exacto) {
          setFieldErrors(prev => ({ ...prev, nombre: `Ya existe una categoría con este nombre: "${exacto.descripcion}"` }))
          return
        }
        setSimilares(found)
        return
      }
    }

    await doSave()
  }

  // Nombre de la empresa para el modal de prioridades
  const empresaNombreActual = empresas.find(e => e.value === empresa)?.label
    ?? categoria?.empresaNombre
    ?? `Empresa ${empresa}`

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
        <DialogContent className={UI_THEME.modal.contentStandard}>
          <ModalHeading
            accent={MODULE_ACCENT.categorias}
            icon={Tags}
            mode={isEditing ? (mode === 'view' ? 'view' : 'edit') : 'create'}
            title={isEditing ? (mode === 'view' ? 'Detalle Categoria' : 'Editar Categoria') : 'Nueva Categoria'}
            subtitle={isEditing ? empresaNombreActual : null}
          />

          {globalError && (
            <div className={`${UI_THEME.forms.globalError} shrink-0`}>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSave} noValidate className="flex-1 min-h-0 flex flex-col pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList variant="line" className={UI_THEME.tabs.listClass}>
                <TabsTrigger value="general">
                  <Tags className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
              </TabsList>

              <div className={UI_THEME.modal.scrollArea}>
                <TabsContent value="general" className="mt-0">
                  <SingleColumn>
                  <SegmentCard label="General">
                  <div className="col-span-2 grid gap-2">

                    {/* Empresa */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="cat-empresa" className={UI_THEME.forms.labelBase}>
                        Empresa {!isEditing && <span className="text-red-500">*</span>}
                      </Label>
                      {!isEditing ? (
                        <SearchableSelect
                          id="cat-empresa"
                          options={empresas}
                          value={empresa}
                          onChange={setEmpresa}
                          disabled={cargandoEmpresas}
                          placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                          error={!!fieldErrors.empresa}
                        />
                      ) : (
                        <Input
                          id="cat-empresa"
                          value={empresaNombreActual}
                          disabled
                          className={UI_THEME.forms.inputBase}
                        />
                      )}
                      <FieldError message={fieldErrors.empresa} />
                    </div>

                    {/* Nombre */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="cat-nombre">
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cat-nombre"
                        value={nombre}
                        onChange={(e) => {
                          setNombre(e.target.value)
                          if (similares.length > 0) setSimilares([])
                        }}
                        disabled={mode === 'view'}
                        data-view-mode={mode === 'view'}
                        className={`${UI_THEME.forms.inputBase} uppercase`}
                        aria-invalid={!!fieldErrors.nombre}
                      />
                      <FieldError message={fieldErrors.nombre} />
                      {similares.length > 0 && mode === 'edit' && (
                        <div className={UI_THEME.forms.warningSimilar}>
                          <p className={UI_THEME.forms.warningSimilarTitle}>
                            ⚠️ Se encontraron {similares.length} registro{similares.length > 1 ? 's' : ''} similar{similares.length > 1 ? 'es' : ''} — ¿Desea guardar de todas formas?
                          </p>
                          <ul className="space-y-1">
                            {similares.map(s => (
                              <li key={s.id} className={UI_THEME.forms.warningSimilarRow}>
                                <span className="font-mono">{s.descripcion}</span>
                                <span className={`font-bold ml-2 ${s.pct === 100 ? 'text-red-600' : 'text-amber-700'}`}>
                                  {s.pct}%
                                </span>
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

                    {/* Prioridad (solo lectura en modo vista) */}
                    {isEditing && mode === 'view' && (
                      <ViewField locked label="Prioridad" value={categoria!.prioridad > 0 ? String(categoria!.prioridad) : 'Sin prioridad'} />
                    )}

                  </div>
                  </SegmentCard>
                  </SingleColumn>
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer fijo — botones de acción */}
            <div className={UI_THEME.modal.footer}>
              {mode === 'view' ? (
                <div className={UI_THEME.modal.buttons.viewRow}>
                  <Button type="button" variant="ghost" size="sm" className={MODULE_ACCENT.categorias.hover} onClick={() => setHistorialOpen(true)}>
                    <History className={UI_THEME.modal.buttons.icon} /> Historial
                  </Button>
                  {isEditing && empresa && (
                    <Button type="button" variant="ghost" size="sm" className={MODULE_ACCENT.categorias.hover} onClick={() => setPrioridadOpen(true)}>
                      <ArrowUpDown className={UI_THEME.modal.buttons.icon} /> Prioridad
                    </Button>
                  )}
                  {puedeEditar && (
                    <Button type="button" variant="ghost" size="sm" className={MODULE_ACCENT.categorias.hover} onMouseDown={onEditMouseDown} onClick={onEditClick}>
                      <Pencil className={UI_THEME.modal.buttons.icon} /> Editar
                    </Button>
                  )}
                </div>
              ) : isEditing ? (
                <div className={UI_THEME.modal.buttons.editRow}>
                  <Button type="button" variant="ghost" size="sm" className={MODULE_ACCENT.categorias.hover} onClick={() => { resetForm(categoria); setMode('view') }} disabled={loading}>
                    <X className={UI_THEME.modal.buttons.icon} /> Cancelar
                  </Button>
                  <Button type="submit" variant="ghost" size="sm" className={MODULE_ACCENT.categorias.hover} disabled={loading}>
                    <Check className={UI_THEME.modal.buttons.icon} /> {loading ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
              ) : (
                <div className={UI_THEME.modal.buttons.editRow}>
                  <Button type="submit" variant="ghost" size="sm" className={MODULE_ACCENT.categorias.hover} disabled={loading}>
                    <Check className={UI_THEME.modal.buttons.icon} /> {loading ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drawer de historial */}
      {categoria && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={categoria.id}
          entidadTipo="Categoria"
          tabla="costeos_categoria"
        />
      )}

      {/* Modal de reordenamiento de prioridades */}
      {isEditing && empresa && (
        <PrioridadModal
          open={prioridadOpen}
          onOpenChange={setPrioridadOpen}
          empresaId={parseInt(empresa, 10)}
          empresaNombre={empresaNombreActual}
          onSuccess={() => {
            onSuccess?.()
          }}
        />
      )}
    </>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { Tags, Save, Pencil, History } from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { crearCategoria, actualizarCategoria } from '@/app/actions/categorias'
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import type { CategoriaInput, CategoriaRow } from '@/lib/types/categorias'

interface CategoriaModalProps {
  categoria?: CategoriaRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function CategoriaModal({ categoria, trigger, open: controlledOpen, onOpenChange, onSuccess }: CategoriaModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen
  const [historialOpen, setHistorialOpen] = useState(false)

  const isEditing = !!categoria
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  const [empresa, setEmpresa] = useState<string>('')
  const [codigo, setCodigo] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [prioridad, setPrioridad] = useState(false)
  const [activo, setActivo] = useState(true)

  const [empresas, setEmpresas] = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // ── Cargar empresas al abrir ─────────────────────────────────────────────────
  // SOLO depende de [open] — nunca de `categoria` ni de `mode` (anti-flash).
  useEffect(() => {
    if (open) {
      setCargandoEmpresas(true)
      getEmpresasForUser()
        .then(data => {
          const opts = data.map(e => ({ value: e.id.toString(), label: e.nombre }))
          setEmpresas(opts)
          // Auto-selección solo al crear; al editar ya viene en resetForm
          if (opts.length > 0 && !isEditing) {
            setEmpresa(opts[0].value)
          }
        })
        .finally(() => setCargandoEmpresas(false))
    }
  }, [open])

  // ── Reset ────────────────────────────────────────────────────────────────────
  const resetForm = (data?: CategoriaRow) => {
    setEmpresa(data?.empresaId.toString() ?? '')
    setCodigo(data?.codigo ?? null)
    setNombre(data?.nombre ?? '')
    setPrioridad(data?.prioridad ?? false)
    setActivo(data?.activo ?? true)
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  // ── Apertura/Cierre ──────────────────────────────────────────────────────────
  // CRÍTICO: inicializar estado AQUÍ, nunca en useEffect con deps en datos.
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm(categoria)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    // Construir errores locales — NO hacer setFieldErrors({}) al inicio
    const errors: Record<string, string> = {}
    if (!empresa) errors.empresa = 'Requerido'
    if (!nombre.trim()) errors.nombre = 'Requerido'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    const data: CategoriaInput = {
      empresaId: parseInt(empresa, 10),
      codigo,
      nombre: normalizeText(nombre),
      prioridad,
      activo,
    }

    try {
      const res = isEditing && categoria
        ? await actualizarCategoria(categoria.id, data)
        : await crearCategoria(data)

      if (!res.ok) {
        if (res.field) {
          setFieldErrors({ [res.field]: res.error })
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
        <DialogContent className="sm:max-w-[500px] h-[85vh] sm:h-[450px] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Tags className="w-5 h-5 text-slate-500" />
              {isEditing
                ? (mode === 'view' ? 'Detalle Categoría' : 'Editar Categoría')
                : 'Nueva Categoría'}
            </DialogTitle>
          </DialogHeader>

          {globalError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md mb-4 border border-red-200 shrink-0">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSave} noValidate className="flex-1 overflow-hidden flex flex-col pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <Tags className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 pb-4">
                <TabsContent value="general" className="mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                    {/* Empresa */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="cat-empresa">Empresa <span className="text-red-500">*</span></Label>
                      <SearchableSelect
                        options={empresas}
                        value={empresa}
                        onChange={setEmpresa}
                        disabled={mode === 'view' || cargandoEmpresas}
                        placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                        error={!!fieldErrors.empresa}
                      />
                      <FieldError message={fieldErrors.empresa} />
                    </div>

                    {/* Código — solo al editar, siempre deshabilitado */}
                    {isEditing && (
                      <div className="flex flex-col gap-1.5 col-span-1">
                        <Label htmlFor="cat-codigo">Código</Label>
                        <NumericInput
                          id="cat-codigo"
                          value={codigo ?? undefined}
                          onChange={(val) => setCodigo(val ?? null)}
                          disabled={true}
                          className="h-8 py-1 bg-muted/50"
                          aria-invalid={!!fieldErrors.codigo}
                          isInteger={true}
                        />
                        <FieldError message={fieldErrors.codigo} />
                      </div>
                    )}

                    {/* Nombre */}
                    <div className={`flex flex-col gap-1.5 ${isEditing ? 'col-span-1' : 'col-span-2'}`}>
                      <Label htmlFor="cat-nombre">Nombre <span className="text-red-500">*</span></Label>
                      <Input
                        id="cat-nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        disabled={mode === 'view'}
                        className="h-8 py-1 uppercase"
                        aria-invalid={!!fieldErrors.nombre}
                      />
                      <FieldError message={fieldErrors.nombre} />
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center gap-4 col-span-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="cat-prioridad"
                          checked={prioridad}
                          onCheckedChange={(checked) => setPrioridad(checked as boolean)}
                          disabled={mode === 'view'}
                        />
                        <Label htmlFor="cat-prioridad" className="font-normal cursor-pointer">Alta Prioridad</Label>
                      </div>
                      {isEditing && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="cat-activo"
                            checked={activo}
                            onCheckedChange={(checked) => setActivo(checked as boolean)}
                            disabled={mode === 'view'}
                          />
                          <Label htmlFor="cat-activo" className="font-normal cursor-pointer">Activo</Label>
                        </div>
                      )}
                    </div>

                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer estándar */}
            <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
              <div />
              <div className="flex gap-2 justify-end">
                {mode === 'view' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
                      onClick={() => setHistorialOpen(true)}
                    >
                      <History className="mr-2 h-4 w-4" /> Historial
                    </Button>
                    <Button type="button" onClick={() => setMode('edit')}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                  </>
                )}
                {mode === 'edit' && (
                  <>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { resetForm(categoria); setMode('view') }}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" />Guardar</>}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {categoria && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={categoria.id}
          entidadTipo="Categoria"
          tabla="costeos_categoria"
        />
      )}
    </>
  )
}

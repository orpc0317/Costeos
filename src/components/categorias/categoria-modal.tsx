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
import { Settings2, Save, Pencil, History } from 'lucide-react'
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
}

export function CategoriaModal({ categoria, trigger, open: controlledOpen, onOpenChange }: CategoriaModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen
  const [historialOpen, setHistorialOpen] = useState(false)

  const isEditing = !!categoria
  const [mode, setMode] = useState<'view' | 'edit'>(isEditing ? 'view' : 'edit')
  
  const [empresa, setEmpresa] = useState<string>(categoria?.empresa.toString() ?? '')
  const [codigo, setCodigo] = useState<number | null>(categoria?.codigo ?? null)
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [activo, setActivo] = useState(categoria?.activo ?? true)
  
  const [empresas, setEmpresas] = useState<{value: string, label: string}[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (open) {
      setCargandoEmpresas(true)
      getEmpresasForUser()
        .then(data => {
          setEmpresas(data.map(e => ({ value: e.id.toString(), label: e.nombre })))
          if (data.length > 0 && !categoria) {
            setEmpresa(data[0].id.toString())
          }
        })
        .finally(() => setCargandoEmpresas(false))
    }
  }, [open, categoria])

  const resetForm = (data?: CategoriaRow) => {
    setEmpresa(data?.empresa.toString() ?? '')
    setCodigo(data?.codigo ?? null)
    setNombre(data?.nombre ?? '')
    setActivo(data?.activo ?? true)
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm(categoria)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})
    
    if (!empresa || (isEditing && codigo === null) || !nombre.trim()) {
      const errs: Record<string, string> = {}
      if (!empresa) errs.empresa = 'Requerido'
      if (isEditing && codigo === null) errs.codigo = 'Requerido'
      if (!nombre.trim()) errs.nombre = 'Requerido'
      setFieldErrors(errs)
      return
    }

    setLoading(true)
    const data: CategoriaInput = {
      empresa: parseInt(empresa, 10),
      codigo,
      nombre: normalizeText(nombre),
      activo,
    }

    let res
    if (isEditing && categoria) {
      res = await actualizarCategoria(categoria.id, data)
    } else {
      res = await crearCategoria(data)
    }

    setLoading(false)

    if (!res.ok) {
      if (res.field) {
        setFieldErrors({ [res.field]: res.error })
        setActiveTab('general')
      } else {
        setGlobalError(res.error)
      }
    } else {
      // Guardado exitoso
      resetForm(res.data)
      if (!isEditing) {
        setOpen(false)
      } else {
        setMode('view')
      }
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-[500px] h-[85vh] sm:h-[450px] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="mb-2 shrink-0">
          <DialogTitle className="text-xl">
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
                <Settings2 className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <TabsContent value="general" className="mt-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <Label htmlFor="empresa">Empresa <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      options={empresas}
                      value={empresa}
                      onChange={setEmpresa}
                      disabled={mode === 'view' || cargandoEmpresas}
                      placeholder={cargandoEmpresas ? "Cargando..." : "Seleccionar empresa"}
                    />
                    {fieldErrors.empresa && (
                      <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.empresa}</p>
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <Label htmlFor="codigo">Código</Label>
                      <NumericInput
                        id="codigo"
                        value={codigo ?? undefined}
                        onChange={(val) => setCodigo(val ?? null)}
                        disabled={true}
                        className="h-8 py-1 bg-muted/50"
                        aria-invalid={!!fieldErrors.codigo}
                        isInteger={true}
                      />
                      {fieldErrors.codigo && (
                        <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.codigo}</p>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col gap-1.5 ${isEditing ? 'col-span-1' : 'col-span-2'}`}>
                    <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
                    <Input
                      id="nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      disabled={mode === 'view'}
                      className="h-8 py-1 uppercase"
                      aria-invalid={!!fieldErrors.nombre}
                    />
                    {fieldErrors.nombre && (
                      <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nombre}</p>
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-2 col-span-2 mt-2">
                      <Checkbox
                        id="activo"
                        checked={activo}
                        onCheckedChange={(checked) => setActivo(checked as boolean)}
                        disabled={mode === 'view'}
                      />
                      <Label htmlFor="activo" className="font-normal cursor-pointer">Activo</Label>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
            <div></div>
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
                    <Pencil className="w-4 h-4 mr-2" />Editar
                  </Button>
                </>
              )}
              {mode === 'edit' && (
                <>
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        resetForm(categoria)
                        setMode('view')
                      }}
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
        tabla="costeos_categoria_item"
      />
    )}
    </>
  )
}

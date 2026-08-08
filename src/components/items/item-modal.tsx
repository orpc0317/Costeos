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
import { Settings2, Save, Pencil, History, SlidersHorizontal } from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { crearItem, actualizarItem } from '@/app/actions/items'
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import type { ItemInput, ItemRow } from '@/lib/types/items'
import type { CategoriaRow } from '@/lib/types/categorias'

interface ItemModalProps {
  item?: ItemRow
  categorias: CategoriaRow[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TIPOS_ITEM = [
  { value: '1', label: 'PRODUCTO' },
  { value: '2', label: 'SERVICIO' },
  { value: '3', label: 'EQUIPO' },
  { value: '4', label: 'FINANCIERO' },
]

export function ItemModal({ item, categorias, trigger, open: controlledOpen, onOpenChange }: ItemModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen
  const [historialOpen, setHistorialOpen] = useState(false)

  const isEditing = !!item
  const [mode, setMode] = useState<'view' | 'edit'>(isEditing ? 'view' : 'edit')
  
  const [empresa, setEmpresa] = useState<string>(item?.empresaId.toString() ?? '')

  const [descripcion, setDescripcion] = useState(item?.descripcion ?? '')
  const [unidadMedida, setUnidadMedida] = useState(item?.unidadMedida ?? 'UND')
  const [tipoItem, setTipoItem] = useState<string>(item?.tipoItem.toString() ?? TIPOS_ITEM[0].value)
  const [tipoServicio, setTipoServicio] = useState<string>(item?.tipoServicio?.toString() ?? '0')
  const [codigoErp, setCodigoErp] = useState(item?.codigoErp ?? '')
  const [categoriaId, setCategoriaId] = useState<string>(
    item?.categoriaId.toString() ?? (categorias.length > 0 ? categorias[0].id.toString() : '')
  )
  const [precioVentaCero, setPrecioVentaCero] = useState(item?.precioVentaCero ?? false)
  const [activo, setActivo] = useState(item?.activo ?? true)
  
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  const [empresas, setEmpresas] = useState<{value: string, label: string}[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  useEffect(() => {
    if (open) {
      setCargandoEmpresas(true)
      getEmpresasForUser()
        .then(data => {
          setEmpresas(data.map(e => ({ value: e.id.toString(), label: e.nombre })))
          if (data.length > 0 && !item) {
            setEmpresa(data[0].id.toString())
          }
        })
        .finally(() => setCargandoEmpresas(false))
    }
  }, [open, item])

  useEffect(() => {
    if (tipoItem !== '2') {
      setTipoServicio('0')
    }
  }, [tipoItem])

  const resetForm = (data?: ItemRow) => {
    setEmpresa(data?.empresaId.toString() ?? '')

    setDescripcion(data?.descripcion ?? '')
    setUnidadMedida(data?.unidadMedida ?? 'UND')
    setTipoItem(data?.tipoItem.toString() ?? TIPOS_ITEM[0].value)
    setTipoServicio(data?.tipoServicio?.toString() ?? '0')
    setCodigoErp(data?.codigoErp ?? '')
    setCategoriaId(data?.categoriaId.toString() ?? (categorias.length > 0 ? categorias[0].id.toString() : ''))
    setPrecioVentaCero(data?.precioVentaCero ?? false)
    setActivo(data?.activo ?? true)
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm(item)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})
    
    if (!empresa || !descripcion.trim() || !categoriaId) {
      const errs: Record<string, string> = {}
      if (!empresa) errs.empresa = 'Requerido'

      if (!descripcion.trim()) errs.descripcion = 'Requerido'
      if (!categoriaId) errs.categoriaId = 'Requerido'
      setFieldErrors(errs)
      
      const paramFields = ['tipoServicio', 'precioVentaCero']
      const firstErrorField = Object.keys(errs)[0]
      if (firstErrorField && paramFields.includes(firstErrorField)) {
        setActiveTab('parametros')
      } else {
        setActiveTab('general')
      }
      
      return
    }

    setLoading(true)
    const data: ItemInput = {
      empresaId: parseInt(empresa, 10),

      descripcion: normalizeText(descripcion),
      unidadMedida: normalizeText(unidadMedida),
      tipoItem: parseInt(tipoItem, 10),
      tipoServicio: parseInt(tipoServicio, 10),
      codigoErp: codigoErp.trim() ? normalizeText(codigoErp) : null,
      categoriaId: parseInt(categoriaId, 10),
      precioVentaCero,
      activo,
    }

    let res
    if (isEditing && item) {
      res = await actualizarItem(item.id, { ...data, registroVersion: item.registroVersion })
    } else {
      res = await crearItem(data)
    }

    setLoading(false)

    if (!res.ok) {
      if (res.field) {
        setFieldErrors({ [res.field]: res.error })
        const paramFields = ['tipoServicio', 'precioVentaCero']
        if (paramFields.includes(res.field)) {
          setActiveTab('parametros')
        } else {
          setActiveTab('general')
        }
      } else {
        setGlobalError(res.error)
      }
    } else {
      resetForm(res.data)
      if (!isEditing) {
        setOpen(false)
      } else {
        setMode('view')
      }
    }
  }

  const opcionesCategoria = categorias.map(c => ({
    value: c.id.toString(),
    label: c.nombre
  }))

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-[650px] h-[85vh] sm:h-[550px] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="mb-2 shrink-0">
          <DialogTitle className="text-xl">
            {isEditing 
              ? (mode === 'view' ? 'Detalle Ítem' : 'Editar Ítem') 
              : 'Nuevo Ítem'}
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
              <TabsTrigger value="parametros">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Parámetros
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <TabsContent value="general" className="mt-0">
                <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                  <div className="flex flex-col gap-1.5 col-span-4">
                    <Label htmlFor="empresa">Empresa <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      options={empresas}
                      value={empresa}
                      onChange={setEmpresa}
                      disabled={mode === 'view' || cargandoEmpresas || isEditing}
                      placeholder={cargandoEmpresas ? "Cargando..." : "Seleccionar empresa"}
                    />
                    {fieldErrors.empresa && (
                      <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.empresa}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 col-span-4">
                    <Label htmlFor="descripcion">Descripción <span className="text-red-500">*</span></Label>
                    <Input
                      id="descripcion"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      disabled={mode === 'view'}
                      className="h-8 py-1 uppercase"
                      aria-invalid={!!fieldErrors.descripcion}
                    />
                    {fieldErrors.descripcion && (
                      <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.descripcion}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <Label htmlFor="categoria">Categoría <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      options={opcionesCategoria}
                      value={categoriaId}
                      onChange={setCategoriaId}
                      disabled={mode === 'view'}
                      placeholder="Seleccione..."
                    />
                    {fieldErrors.categoriaId && (
                      <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.categoriaId}</p>
                    )}
                  </div>


                  <div className="flex flex-col gap-1.5 col-span-1">
                    <Label htmlFor="unidadMedida">Unidad Medida</Label>
                    <Input
                      id="unidadMedida"
                      value={unidadMedida}
                      onChange={(e) => setUnidadMedida(e.target.value)}
                      disabled={mode === 'view'}
                      className="h-8 py-1 uppercase"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <Label htmlFor="tipoItem">Tipo Ítem</Label>
                    <SearchableSelect
                      options={TIPOS_ITEM}
                      value={tipoItem}
                      onChange={setTipoItem}
                      disabled={mode === 'view' || isEditing}
                      placeholder="Seleccione..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-4">
                    <Label htmlFor="codigoErp">Código ERP (Opcional)</Label>
                    <Input
                      id="codigoErp"
                      value={codigoErp}
                      onChange={(e) => setCodigoErp(e.target.value)}
                      disabled={mode === 'view'}
                      className="h-8 py-1 uppercase"
                    />
                  </div>


                  {isEditing && (
                    <div className="flex items-center gap-2 col-span-4 mt-2">
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
              <TabsContent value="parametros" className="mt-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <Label htmlFor="tipoServicio">Tipo Servicio</Label>
                    <SearchableSelect
                      options={[
                        { value: '0', label: 'ESTANDAR' },
                        { value: '1', label: 'PERSONAL' },
                      ]}
                      value={tipoServicio}
                      onChange={setTipoServicio}
                      disabled={mode === 'view' || tipoItem !== '2'}
                      placeholder="Seleccione..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-1 mt-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="precioVentaCero"
                        checked={precioVentaCero}
                        onCheckedChange={(checked) => setPrecioVentaCero(checked as boolean)}
                        disabled={mode === 'view'}
                      />
                      <Label htmlFor="precioVentaCero" className="font-normal cursor-pointer">
                        Permitir Precio Cero
                      </Label>
                    </div>
                  </div>
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
                        resetForm(item)
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
    {item && (
      <HistorialDrawer
        open={historialOpen}
        onOpenChange={setHistorialOpen}
        entidadId={item.id}
        entidadTipo="Item"
        tabla="costeos_item"
      />
    )}
    </>
  )
}

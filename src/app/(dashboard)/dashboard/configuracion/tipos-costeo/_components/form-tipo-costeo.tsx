'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Settings2, Layers, Network, Trash2, History, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { createTipoCosteoAction, updateTipoCosteoAction, deleteTipoCosteoAction } from '@/app/actions/tipos-costeo-actions'
import { normalizeText } from '@/lib/utils/text'

type TipoCosteo = {
  id?: number
  codigo: string
  nombre: string
  nivel1Activo: boolean
  nivel1Etiqueta: string | null
  nivel1ConDireccion: boolean
  nivel2Activo: boolean
  nivel2Etiqueta: string | null
  recursosEtiqueta: string
  activo: boolean
}

export function FormTipoCosteo({ 
  tipo, 
  open, 
  onOpenChange 
}: { 
  tipo?: TipoCosteo | null
  open: boolean
  onOpenChange: (open: boolean) => void 
}) {
  const router = useRouter()
  const isEditing = !!tipo?.id
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(tipo ? 'view' : 'create')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historialOpen, setHistorialOpen] = useState(false)

  const [codigo, setCodigo] = useState(tipo?.codigo || '')
  const [nombre, setNombre] = useState(tipo?.nombre || '')
  const [nivel1Activo, setNivel1Activo] = useState(tipo?.nivel1Activo ?? true)
  const [nivel1Etiqueta, setNivel1Etiqueta] = useState(tipo?.nivel1Etiqueta || '')
  const [nivel1ConDireccion, setNivel1ConDireccion] = useState(tipo?.nivel1ConDireccion ?? false)
  const [nivel2Activo, setNivel2Activo] = useState(tipo?.nivel2Activo ?? true)
  const [nivel2Etiqueta, setNivel2Etiqueta] = useState(tipo?.nivel2Etiqueta || '')
  const [recursosEtiqueta, setRecursosEtiqueta] = useState(tipo?.recursosEtiqueta || 'ITEM')
  const [activo, setActivo] = useState(tipo?.activo ?? true)

  useEffect(() => {
    if (open) {
      setMode(tipo ? 'view' : 'create')
      setCodigo(tipo?.codigo || '')
      setNombre(tipo?.nombre || '')
      setNivel1Activo(tipo?.nivel1Activo ?? true)
      setNivel1Etiqueta(tipo?.nivel1Etiqueta || '')
      setNivel1ConDireccion(tipo?.nivel1ConDireccion ?? false)
      setNivel2Activo(tipo?.nivel2Activo ?? true)
      setNivel2Etiqueta(tipo?.nivel2Etiqueta || '')
      setRecursosEtiqueta(tipo?.recursosEtiqueta || 'ITEM')
      setActivo(tipo?.activo ?? true)
      setError(null)
    }
  }, [open, tipo])

  const [isPendingDelete, startTransitionDelete] = useTransition()

  const handleDelete = () => {
    if (!tipo?.id) return
    if (confirm('¿Estás seguro de eliminar este tipo de costeo?')) {
      startTransitionDelete(async () => {
        const res = await deleteTipoCosteoAction(tipo.id!)
        if (res.error) {
          setError(res.error)
        } else {
          onOpenChange(false)
          router.refresh()
        }
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Normalizar textos
    const data = {
      codigo: normalizeText(codigo),
      nombre: normalizeText(nombre),
      nivel1Activo,
      nivel1Etiqueta: nivel1Activo ? normalizeText(nivel1Etiqueta) : undefined,
      nivel1ConDireccion: nivel1Activo ? nivel1ConDireccion : false,
      nivel2Activo: nivel1Activo ? nivel2Activo : false,
      nivel2Etiqueta: (nivel1Activo && nivel2Activo) ? normalizeText(nivel2Etiqueta) : undefined,
      recursosEtiqueta: normalizeText(recursosEtiqueta),
      activo,
    }

    try {
      if (isEditing && tipo?.id) {
        const res = await updateTipoCosteoAction(tipo.id, data)
        if (res.error) throw new Error(res.error)
      } else {
        const res = await createTipoCosteoAction(data)
        if (res.error) throw new Error(res.error)
      }
      onOpenChange(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-slate-500" />
            {mode === 'create' ? 'Nuevo Tipo Costeo' : mode === 'edit' ? 'Editar Tipo Costeo' : 'Detalles de Tipo Costeo'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="pt-4">
          {error && <div className="text-red-500 text-sm font-medium mb-4">{error}</div>}

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4 bg-transparent border-b w-full justify-start rounded-none p-0 h-auto gap-4">
              <TabsTrigger 
                value="general" 
                className="flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-2"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="estructura" 
                className="flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-2"
              >
                <Layers className="w-4 h-4 mr-2" />
                Estructura de Niveles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="outline-none mt-0">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label>Código <span className="text-red-500">*</span></Label>
                  <Input 
                    value={codigo} 
                    onChange={e => setCodigo(e.target.value)} 
                    required 
                    disabled={mode === 'view' || isEditing}
                    data-view-mode={mode === 'view'}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre <span className="text-red-500">*</span></Label>
                  <Input 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)} 
                    required 
                    disabled={mode === 'view'}
                    data-view-mode={mode === 'view'}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Etiqueta Recursos <span className="text-red-500">*</span></Label>
                  <Input 
                    value={recursosEtiqueta} 
                    onChange={e => setRecursosEtiqueta(e.target.value)} 
                    required 
                    disabled={mode === 'view'}
                    data-view-mode={mode === 'view'}
                    className="uppercase"
                    placeholder="ITEM, RECURSO, SERVICIO..."
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end pb-1">
                  <div className="flex items-center space-x-2">
                    <Switch checked={activo} onCheckedChange={setActivo} id="activo" disabled={mode === 'view'} />
                    <Label htmlFor="activo">Estado Activo</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="estructura" className="outline-none mt-0 space-y-4">
              <div className="p-4 border border-slate-200 rounded-sm bg-slate-50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">Nivel 1 (Ej. Sitio)</Label>
                  <Switch checked={nivel1Activo} onCheckedChange={setNivel1Activo} disabled={mode === 'view'} />
                </div>
                
                {nivel1Activo && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-slate-200 mt-4">
                    <div className="space-y-1.5">
                      <Label>Etiqueta Nivel 1 <span className="text-red-500">*</span></Label>
                      <Input 
                        value={nivel1Etiqueta} 
                        onChange={e => setNivel1Etiqueta(e.target.value)} 
                        required 
                        disabled={mode === 'view'}
                        data-view-mode={mode === 'view'}
                        className="uppercase"
                        placeholder="SITIO, SUCURSAL..."
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end pb-1">
                      <div className="flex items-center space-x-2">
                        <Switch checked={nivel1ConDireccion} onCheckedChange={setNivel1ConDireccion} id="conDir" disabled={mode === 'view'} />
                        <Label htmlFor="conDir">Solicitar Dirección</Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {nivel1Activo && (
                <div className="p-4 border border-slate-200 rounded-sm bg-slate-50">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-slate-700">Nivel 2 (Ej. Puesto)</Label>
                    <Switch checked={nivel2Activo} onCheckedChange={setNivel2Activo} disabled={mode === 'view'} />
                  </div>
                  
                  {nivel2Activo && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-slate-200 mt-4">
                      <div className="space-y-1.5">
                        <Label>Etiqueta Nivel 2 <span className="text-red-500">*</span></Label>
                        <Input 
                          value={nivel2Etiqueta} 
                          onChange={e => setNivel2Etiqueta(e.target.value)} 
                          required 
                          disabled={mode === 'view'}
                          data-view-mode={mode === 'view'}
                          className="uppercase"
                          placeholder="PUESTO, ÁREA..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-3 border-t bg-slate-50 sm:rounded-b-xl">
            {mode === 'view' ? (
              <>
                {tipo && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    className="mr-auto"
                    disabled={isPendingDelete}
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
                    onClick={() => setHistorialOpen(true)}
                  >
                    <History className="mr-2 h-4 w-4" /> Historial
                  </Button>
                  <Button type="button" size="sm" onClick={() => setMode('edit')}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 justify-end w-full">
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm" 
                  onClick={() => {
                    if (mode === 'edit') {
                      setCodigo(tipo?.codigo || '')
                      setNombre(tipo?.nombre || '')
                      setNivel1Activo(tipo?.nivel1Activo ?? true)
                      setNivel1Etiqueta(tipo?.nivel1Etiqueta || '')
                      setNivel1ConDireccion(tipo?.nivel1ConDireccion ?? false)
                      setNivel2Activo(tipo?.nivel2Activo ?? true)
                      setNivel2Etiqueta(tipo?.nivel2Etiqueta || '')
                      setRecursosEtiqueta(tipo?.recursosEtiqueta || 'ITEM')
                      setActivo(tipo?.activo ?? true)
                      setMode('view')
                    } else {
                      onOpenChange(false)
                    }
                  }} 
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {tipo && (
      <HistorialDrawer
        open={historialOpen}
        onOpenChange={setHistorialOpen}
        entidadId={tipo.id}
        entidadTipo="Tipo de Costeo"
        tabla="costeos_tipo_costeo"
      />
    )}
    </>
  )
}

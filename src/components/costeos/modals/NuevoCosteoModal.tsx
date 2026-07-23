'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericInput } from '@/components/ui/numeric-input'
import { Plus, Search, Loader2 } from 'lucide-react'
import { createCosteo } from '@/app/actions/costeos'
import { getEmpresasForUser, searchClientes } from '@/app/actions/erp'
import type { ErpEmpresa, ErpCliente } from '@/lib/erp/types'

export function NuevoCosteoModal() {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  
  // Datos del ERP
  const [empresas, setEmpresas] = useState<ErpEmpresa[]>([])
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>("")
  
  const [searchQuery, setSearchQuery] = useState('')
  const [clientesEncontrados, setClientesEncontrados] = useState<ErpCliente[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ErpCliente | null>(null)
  
  // Cliente Nuevo
  const [isNewClient, setIsNewClient] = useState(false)
  
  const [plazo, setPlazo] = useState(12)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar empresas al abrir el modal
  useEffect(() => {
    if (open) {
      getEmpresasForUser().then(data => {
        setEmpresas(data)
        if (data.length > 0) {
          setEmpresaSeleccionada(data[0].id.toString())
        }
      }).catch(err => console.error("Error al cargar empresas:", err))
    } else {
      // Reset state on close
      setSearchQuery('')
      setClientesEncontrados([])
      setClienteSeleccionado(null)
      setIsNewClient(false)
      setPlazo(12)
    }
  }, [open])

  // Buscador de clientes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (searchQuery.trim().length >= 2 && empresaSeleccionada && !clienteSeleccionado && !isNewClient) {
      setIsSearching(true)
      debounceRef.current = setTimeout(() => {
        searchClientes(parseInt(empresaSeleccionada, 10), searchQuery)
          .then(data => setClientesEncontrados(data))
          .catch(err => console.error("Error buscando clientes:", err))
          .finally(() => setIsSearching(false))
      }, 500)
    } else {
      setClientesEncontrados([])
      setIsSearching(false)
    }
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, empresaSeleccionada, clienteSeleccionado, isNewClient])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    formData.set('plazoMeses', plazo.toString())
    
    if (isNewClient) {
      const nit = formData.get('nuevoNit') as string
      const razon = formData.get('nuevoRazonSocial') as string
      const direccion = formData.get('nuevoDireccion') as string
      
      if (!nit || !razon) return
      
      // Creamos un ErpCliente simulado para enviarlo
      const tempClient: ErpCliente = {
        nit,
        nombreComercial: razon,
        razonSocial: razon,
        direccion,
        diasCredito: 0
      }
      formData.set('erpClienteData', JSON.stringify(tempClient))
      formData.set('isNewClient', 'true')
    } else {
      if (!clienteSeleccionado) return
      formData.set('erpClienteData', JSON.stringify(clienteSeleccionado))
      formData.set('isNewClient', 'false')
    }

    setIsPending(true)
    
    try {
      await createCosteo(formData)
    } catch (error) {
      console.error(error)
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="w-4 h-4 mr-2" /> Nuevo Costeo</Button>} />
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Costeo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <select 
              id="empresa"
              name="empresa"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={empresaSeleccionada}
              onChange={(e) => {
                setEmpresaSeleccionada(e.target.value)
                setClienteSeleccionado(null)
                setSearchQuery('')
              }}
              required
            >
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2 relative">
            <Label>Cliente</Label>
            {isNewClient ? (
              <div className="p-3 border rounded-md bg-slate-50 space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-blue-600">CLIENTE NUEVO TEMPORAL</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsNewClient(false)}>
                    Cancelar
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevoNit" className="text-xs">NIT</Label>
                  <Input id="nuevoNit" name="nuevoNit" required placeholder="Ej. 123456-7" className="h-8" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevoRazonSocial" className="text-xs">Razón Social</Label>
                  <Input id="nuevoRazonSocial" name="nuevoRazonSocial" required placeholder="Ej. Mi Empresa S.A." className="h-8" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevoDireccion" className="text-xs">Dirección (Opcional)</Label>
                  <Input id="nuevoDireccion" name="nuevoDireccion" placeholder="Ciudad" className="h-8" />
                </div>
              </div>
            ) : clienteSeleccionado ? (
              <div className="flex items-center justify-between p-2 border rounded-md bg-blue-50/50">
                <div>
                  <div className="text-sm font-medium">{clienteSeleccionado.razonSocial}</div>
                  <div className="text-xs text-muted-foreground">NIT: {clienteSeleccionado.nit}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setClienteSeleccionado(null)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input 
                  placeholder="Buscar por nombre o NIT en el ERP..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-3 top-2.5 text-muted-foreground">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </div>
                
                {/* Resultados */}
                {clientesEncontrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {clientesEncontrados.map(c => (
                      <div 
                        key={c.id || c.nit} 
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 border-b last:border-0"
                        onClick={() => {
                          setClienteSeleccionado(c)
                          setSearchQuery('')
                          setClientesEncontrados([])
                        }}
                      >
                        <div className="font-medium">{c.razonSocial}</div>
                        <div className="text-xs text-muted-foreground">NIT: {c.nit}</div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && !isSearching && (
                  <div className="mt-2 text-right">
                    <Button type="button" variant="link" size="sm" onClick={() => setIsNewClient(true)}>
                      ¿No lo encuentras? Crear Cliente Nuevo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreProyecto">Nombre del Proyecto</Label>
            <Input id="nombreProyecto" name="nombreProyecto" required placeholder="Ej. Seguridad Planta Central" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plazo (Meses)</Label>
              <NumericInput 
                value={plazo} 
                onChange={setPlazo} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda</Label>
              <select 
                id="moneda"
                name="moneda"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="GTQ">GTQ (Quetzales)</option>
                <option value="USD">USD (Dólares)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || (!clienteSeleccionado && !isNewClient)}>
              {isPending ? 'Creando...' : 'Crear Costeo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

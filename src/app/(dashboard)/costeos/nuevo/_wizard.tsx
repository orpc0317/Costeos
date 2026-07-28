'use client'

import { useState } from 'react'
import type { ErpEmpresa, ErpCliente } from '@/lib/erp'
import { getClientesAction } from '@/app/actions/erp-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Search, Plus } from 'lucide-react'

type WizardCosteoProps = {
  empresas: ErpEmpresa[]
  tiposCosteo?: any[]
}

export function WizardCosteo({ empresas, tiposCosteo }: WizardCosteoProps) {
  const [empresaId, setEmpresaId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [clientes, setClientes] = useState<ErpCliente[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  const [selectedCliente, setSelectedCliente] = useState<ErpCliente | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId) return alert('Por favor, selecciona una empresa primero.')

    setIsLoading(true)
    setSearched(true)
    const res = await getClientesAction(Number(empresaId), searchQuery)
    if (res.data) {
      setClientes(res.data)
    } else {
      alert(res.error)
    }
    setIsLoading(false)
  }

  const handleEmpresaChange = (value: string) => {
    setEmpresaId(value)
    setClientes([])
    setSearched(false)
    setSearchQuery('')
    setSelectedCliente(null)
  }

// Paso 3 (o 2 expandido): Formulario de Detalles del Proyecto
  const [showForm, setShowForm] = useState(false)
  const [tipoCosteoId, setTipoCosteoId] = useState<string>('')
  const [moneda, setMoneda] = useState<string>('GTQ')

  const handleSelectCliente = (cliente: ErpCliente) => {
    setSelectedCliente(cliente)
    setShowForm(true)
  }

  const handleBackToSearch = () => {
    setShowForm(false)
    setSelectedCliente(null)
  }

  return (
    <div className="space-y-6">
      {/* Paso 1: Filtros de Búsqueda */}
      {!showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">1. Datos Iniciales</CardTitle>
            <CardDescription>Selecciona la empresa y busca al cliente para el costeo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4 items-end">
              <div className="w-1/3 space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select value={empresaId} onValueChange={handleEmpresaChange}>
                  <SelectTrigger id="empresa">
                    <SelectValue placeholder="Selecciona una empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-1/2 space-y-2">
                <Label htmlFor="search">Buscar Cliente (NIT, Código, Nombre)</Label>
                <Input 
                  id="search" 
                  placeholder="Ej. Constructora..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!empresaId}
                />
              </div>

              <Button type="submit" disabled={!empresaId || isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Buscando...' : 'Buscar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Resultados */}
      {searched && !showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-indigo-900">Resultados de Búsqueda</CardTitle>
              <CardDescription>
                {clientes.length} cliente(s) encontrado(s). Selecciona uno o crea uno nuevo.
              </CardDescription>
            </div>
            <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">
              <Plus className="mr-2 h-4 w-4" />
              Cliente Nuevo
            </Button>
          </CardHeader>
          <CardContent>
            {clientes.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>NIT</TableHead>
                      <TableHead>Nombre Comercial</TableHead>
                      <TableHead>Razón Social</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c) => (
                      <TableRow 
                        key={c.id || c.nit} 
                        className="cursor-pointer hover:bg-indigo-50/50"
                        onClick={() => handleSelectCliente(c)}
                      >
                        <TableCell className="font-medium">{c.codigo || '-'}</TableCell>
                        <TableCell>{c.nit}</TableCell>
                        <TableCell>{c.nombreComercial}</TableCell>
                        <TableCell>{c.razonSocial}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No se encontraron clientes que coincidan con la búsqueda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paso 3: Detalles del Costeo */}
      {showForm && selectedCliente && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">2. Detalles del Costeo</CardTitle>
            <CardDescription>
              Cliente seleccionado: <span className="font-semibold text-indigo-700">{selectedCliente.razonSocial}</span> ({selectedCliente.nit})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/costeos/create" method="POST" className="space-y-6">
              <input type="hidden" name="empresa" value={empresaId} />
              <input type="hidden" name="erpClienteData" value={JSON.stringify(selectedCliente)} />
              <input type="hidden" name="isNewClient" value="false" />
              <input type="hidden" name="tipoCosteoId" value={tipoCosteoId} />
              <input type="hidden" name="moneda" value={moneda} />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreProyecto">Nombre del Proyecto</Label>
                  <Input id="nombreProyecto" name="nombreProyecto" required placeholder="Ej. Seguridad Oficinas Centrales" className="uppercase" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tipoCosteoIdSelect">Tipo de Costeo</Label>
                  <Select value={tipoCosteoId} onValueChange={setTipoCosteoId} required>
                    <SelectTrigger id="tipoCosteoIdSelect">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposCosteo?.map((tc: any) => (
                        <SelectItem key={tc.id} value={String(tc.id)}>
                          {tc.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plazoMeses">Plazo en Meses</Label>
                  <Input id="plazoMeses" name="plazoMeses" type="number" required defaultValue="12" min="1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monedaSelect">Moneda</Label>
                  <Select value={moneda} onValueChange={setMoneda}>
                    <SelectTrigger id="monedaSelect">
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTQ">Quetzales (GTQ)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={handleBackToSearch}>
                  Cambiar Cliente
                </Button>
                <Button type="submit" disabled={!tipoCosteoId} formAction={async (formData) => {
                  const { createCosteo } = await import('@/app/actions/costeos')
                  await createCosteo(formData)
                }} className="bg-indigo-600 hover:bg-indigo-700">
                  Crear Proyecto
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

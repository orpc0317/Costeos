'use client'

import { useState, useEffect, useMemo } from 'react'
import type { ErpCliente } from '@/lib/erp'
import { getClientesAction } from '@/app/actions/erp-actions'
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { NumericInput } from '@/components/ui/numeric-input'
import { createCosteo } from '@/app/actions/costeos'
import { toast } from 'sonner'
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
  tiposCosteo?: any[]
}

export function WizardCosteo({ tiposCosteo }: WizardCosteoProps) {
  const [empresas, setEmpresas] = useState<{value: string, label: string}[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)
  const [empresaId, setEmpresaId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [clientes, setClientes] = useState<ErpCliente[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  const [selectedCliente, setSelectedCliente] = useState<ErpCliente | null>(null)
  
  // Guardamos el código del tipo de costeo en lugar del ID
  const [tipoCosteoCodigo, setTipoCosteoCodigo] = useState<string>('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!empresaId) {
      setFieldErrors({ empresaId: 'Por favor, selecciona una empresa.' })
      return
    }

    if (!searchQuery.trim()) {
      setFieldErrors({ search: 'Por favor, escribe algo para buscar.' })
      return
    }

    if (searchQuery.trim().length < 3) {
      setFieldErrors({ search: 'Por favor, ingresa al menos 3 letras para la búsqueda.' })
      return
    }

    const busquedaNormalizada = normalizeText(searchQuery)

    setIsLoading(true)
    setSearched(true)
    const res = await getClientesAction(Number(empresaId), busquedaNormalizada)
    if (res.data) {
      setClientes(res.data)
    } else {
      setClientes([])
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
  const [moneda, setMoneda] = useState<string>('GTQ')
  const [nombreProyecto, setNombreProyecto] = useState('')
  const [plazoMeses, setPlazoMeses] = useState<number | undefined>(undefined)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtrar tipos de costeo por empresa seleccionada
  const filteredTiposCosteo = useMemo(() => {
    if (!tiposCosteo || !empresaId) return []
    return tiposCosteo.filter((tc: any) => tc.empresaId === Number(empresaId))
  }, [tiposCosteo, empresaId])

  // Pre-seleccionar el primer tipo de costeo de la empresa
  useEffect(() => {
    if (filteredTiposCosteo.length > 0) {
      setTipoCosteoCodigo(String(filteredTiposCosteo[0].codigo))
    } else {
      setTipoCosteoCodigo('')
    }
  }, [filteredTiposCosteo])

  const selectedTipoCosteo = useMemo(() => {
    return filteredTiposCosteo.find((tc: any) => tc.codigo === tipoCosteoCodigo)
  }, [filteredTiposCosteo, tipoCosteoCodigo])

  useEffect(() => {
    if (selectedTipoCosteo) {
      if ((selectedTipoCosteo.manejoPlazo === 'FIJO' || selectedTipoCosteo.manejoPlazo === 'LIBRE')) {
        setPlazoMeses(selectedTipoCosteo.fijarPlazo > 0 ? selectedTipoCosteo.fijarPlazo : undefined)
      } else if (selectedTipoCosteo.manejoPlazo === 'NO_APLICA') {
        setPlazoMeses(0)
      }
    }
  }, [selectedTipoCosteo])

  // Cargar empresas al inicio
  useEffect(() => {
    setCargandoEmpresas(true)
    getEmpresasForUser()
      .then(data => {
        setEmpresas(data.map(e => ({ value: e.id.toString(), label: e.nombre })))
        if (data.length > 0 && !empresaId) {
          setEmpresaId(data[0].id.toString())
        }
      })
      .catch(err => toast.error('Error al cargar empresas: ' + err.message))
      .finally(() => setCargandoEmpresas(false))
  }, [])

  const handleSelectCliente = (cliente: ErpCliente) => {
    setSelectedCliente(cliente)
    setShowForm(true)
  }

  const handleBackToSearch = () => {
    setShowForm(false)
    setSelectedCliente(null)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      if (!nombreProyecto.trim()) {
        setFieldErrors({ nombreProyecto: 'El nombre del proyecto es requerido' })
        setIsSubmitting(false)
        return
      }
      if ((selectedTipoCosteo?.manejoPlazo === 'FIJO' || selectedTipoCosteo?.manejoPlazo === 'LIBRE') && (!plazoMeses || plazoMeses <= 0)) {
        setFieldErrors({ plazoMeses: 'Debe especificar una cantidad de meses mayor a 0' })
        setIsSubmitting(false)
        return
      }

      const formData = new FormData()
      formData.append('empresa', empresaId)
      formData.append('erpClienteData', JSON.stringify(selectedCliente))
      formData.append('isNewClient', 'false')
      formData.append('tipoCosteoId', filteredTiposCosteo.find((tc: any) => tc.codigo === tipoCosteoCodigo)?.id?.toString() || '')
      formData.append('tipoCosteoCodigo', tipoCosteoCodigo)
      formData.append('moneda', moneda)
      formData.append('nombreProyecto', nombreProyecto)
      formData.append('plazoMeses', (plazoMeses || 0).toString())

      await createCosteo(formData)
    } catch (err: any) {
      if (err?.message === 'NEXT_REDIRECT') throw err
      setFormError(err.message || 'Ocurrió un error inesperado al crear el proyecto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Paso 1: Filtros de Búsqueda */}
      {!showForm && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">1. Datos Iniciales</CardTitle>
            <CardDescription>Selecciona la empresa y busca al cliente para el costeo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col gap-6">
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <SearchableSelect
                  options={empresas}
                  value={empresaId}
                  onChange={(val) => {
                    handleEmpresaChange(val)
                    setFieldErrors((prev) => ({ ...prev, empresaId: '' }))
                  }}
                  placeholder={cargandoEmpresas ? "Cargando..." : "Seleccionar empresa"}
                  disabled={cargandoEmpresas}
                />
                {fieldErrors.empresaId && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.empresaId}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tipoCosteoSelect">Tipo Costeo</Label>
                <SearchableSelect
                  options={filteredTiposCosteo.map((tc: any) => ({ value: String(tc.codigo), label: tc.nombre }))}
                  value={tipoCosteoCodigo}
                  onChange={setTipoCosteoCodigo}
                  placeholder="Selecciona un tipo"
                  disabled={!empresaId || filteredTiposCosteo.length === 0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Buscar Cliente (NIT, Nombre, Código)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="search" 
                    placeholder="Ej. CONSTRUCTORA..." 
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(normalizeText(e.target.value))
                      setFieldErrors((prev) => ({ ...prev, search: '' }))
                    }}
                    disabled={!empresaId}
                    className="flex-1"
                    aria-invalid={!!fieldErrors.search}
                  />
                  <Button type="submit" disabled={!empresaId || isLoading} className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap">
                    <Search className="mr-2 h-4 w-4" /> Buscar
                  </Button>
                </div>
                {fieldErrors.search && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.search}</p>}
              </div>
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
                        <TableCell className="font-medium">{c.codigo || c.id || '-'}</TableCell>
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
            {formError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-500">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreProyecto">Nombre Proyecto</Label>
                  <Input 
                    id="nombreProyecto" 
                    placeholder="Ej. Seguridad Oficinas Centrales" 
                    className="uppercase focus:ring-2 focus:ring-indigo-500" 
                    value={nombreProyecto}
                    aria-invalid={!!fieldErrors.nombreProyecto}
                    onChange={(e) => {
                      setNombreProyecto(normalizeText(e.target.value))
                      setFieldErrors((prev) => ({ ...prev, nombreProyecto: '' }))
                    }}
                  />
                  {fieldErrors.nombreProyecto && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nombreProyecto}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plazoMeses">Plazo Meses</Label>
                  <NumericInput 
                    value={plazoMeses}
                    isInteger={true}
                    disabled={Boolean(selectedTipoCosteo && (selectedTipoCosteo.manejoPlazo === 'FIJO' || selectedTipoCosteo.manejoPlazo === 'NO_APLICA'))}
                    aria-invalid={!!fieldErrors.plazoMeses}
                    onChange={(val) => {
                      setPlazoMeses(val)
                      setFieldErrors((prev) => ({ ...prev, plazoMeses: '' }))
                    }}
                  />
                  {fieldErrors.plazoMeses && (
                    <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.plazoMeses}</p>
                  )}
                  {selectedTipoCosteo && selectedTipoCosteo.manejoPlazo === 'FIJO' && !fieldErrors.plazoMeses && (
                    <p className="text-xs text-muted-foreground">Plazo fijado por el Tipo de Costeo.</p>
                  )}
                  {selectedTipoCosteo && selectedTipoCosteo.manejoPlazo === 'NO_APLICA' && !fieldErrors.plazoMeses && (
                    <p className="text-xs text-muted-foreground">Este tipo de proyecto no lleva plazo.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monedaSelect">Moneda</Label>
                  <Select value={moneda} onValueChange={(v) => v && setMoneda(v)}>
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
                <Button type="button" variant="outline" onClick={handleBackToSearch} disabled={isSubmitting}>
                  Volver
                </Button>
                <Button type="submit" disabled={!tipoCosteoCodigo || isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                  {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

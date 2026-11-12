'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getEmpresasConSync, searchClientesWizard, type ClienteWizardResultado } from '@/app/actions/erp'
import { cn } from '@/lib/utils'
import { normalizeText } from '@/lib/utils/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { NumericInput } from '@/components/ui/numeric-input'
import { FieldError } from '@/components/ui/field-error'
import { PageHeader } from '@/components/ui/page-header'
import { claseEstadoCosteo } from '@/lib/constants'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import { createCosteo, buscarContratosDeCliente, type ContratoExistente } from '@/app/actions/costeos'
import { Calculator, Search, Plus, Database, Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function hoyLocal(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

type WizardCosteoProps = {
  tiposCosteo?: any[]
}

export function WizardCosteo({ tiposCosteo }: WizardCosteoProps) {
  const router = useRouter()
  // ── Empresas (desde Prisma, con flag de sync de clientes) ──────────────────────
  const [empresas, setEmpresas] = useState<{ value: string; label: string; syncClientes: boolean }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)
  const [empresaId, setEmpresaId] = useState<string>('')

  // syncClientes de la empresa actualmente seleccionada
  const syncClientesActivo = useMemo(
    () => empresas.find(e => e.value === empresaId)?.syncClientes ?? false,
    [empresas, empresaId]
  )
  const empresaNombre = useMemo(
    () => empresas.find(e => e.value === empresaId)?.label ?? '',
    [empresas, empresaId]
  )

  // ── Búsqueda de clientes ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [clientes, setClientes] = useState<ClienteWizardResultado[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [selectedCliente, setSelectedCliente] = useState<ClienteWizardResultado | null>(null)
  const [contratosExistentes, setContratosExistentes] = useState<ContratoExistente[]>([])
  const [mostrarContratos, setMostrarContratos] = useState(false)
  const [buscandoContratos, setBuscandoContratos] = useState(false)
  const [tipoCosteoId, setTipoCosteoId] = useState<string>('')

  // ── Formulario final ───────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [moneda, setMoneda] = useState<string>('GTQ')
  const [nombreProyecto, setNombreProyecto] = useState('')
  const [fechaCosteo, setFechaCosteo] = useState(hoyLocal)
  const [fechaInicio, setFechaInicio] = useState('')
  const [plazoMeses, setPlazoMeses] = useState<number | undefined>(undefined)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Filtrar tipos de costeo por empresa seleccionada ───────────────────────────
  const filteredTiposCosteo = useMemo(() => {
    if (!tiposCosteo || !empresaId) return []
    return tiposCosteo
      .filter((tc: any) => tc.empresaId === Number(empresaId))
      .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
  }, [tiposCosteo, empresaId])

  useEffect(() => {
    if (filteredTiposCosteo.length > 0) {
      setTipoCosteoId(String(filteredTiposCosteo[0].id))
    } else {
      setTipoCosteoId('')
    }
  }, [filteredTiposCosteo])

  const selectedTipoCosteo = useMemo(
    () => filteredTiposCosteo.find((tc: any) => String(tc.id) === tipoCosteoId),
    [filteredTiposCosteo, tipoCosteoId]
  )

  useEffect(() => {
    if (selectedTipoCosteo) {
      if (selectedTipoCosteo.manejoPlazo === 'FIJO' || selectedTipoCosteo.manejoPlazo === 'LIBRE') {
        setPlazoMeses(selectedTipoCosteo.fijarPlazo > 0 ? selectedTipoCosteo.fijarPlazo : undefined)
      } else if (selectedTipoCosteo.manejoPlazo === 'NO_APLICA') {
        setPlazoMeses(0)
      }
    }
  }, [selectedTipoCosteo])

  // ── Cargar empresas desde Prisma al inicio ─────────────────────────────────────
  useEffect(() => {
    setCargandoEmpresas(true)
    getEmpresasConSync()
      .then(data => {
        const opciones = data.map(e => ({
          value:        String(e.id),
          label:        e.nombre,
          syncClientes: e.syncClientes,
        }))
        // Ya llegan ordenadas alfabéticamente desde el servidor
        setEmpresas(opciones)
        if (opciones.length > 0) {
          setEmpresaId(opciones[0].value)
        }
      })
      .catch(() => setFormError('Error al cargar las empresas. Por favor recarga la página.'))
      .finally(() => setCargandoEmpresas(false))
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────────
  const handleEmpresaChange = (value: string) => {
    setEmpresaId(value)
    setClientes([])
    setSearched(false)
    setSearchQuery('')
    setSelectedCliente(null)
    setContratosExistentes([])
    setMostrarContratos(false)
  }

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

    setIsLoading(true)
    setSearched(true)
    try {
      const resultados = await searchClientesWizard(
        Number(empresaId),
        normalizeText(searchQuery),
        syncClientesActivo,
      )
      setClientes(resultados)
    } catch {
      setFormError('Error al buscar clientes. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCliente = async (cliente: ClienteWizardResultado) => {
    setSelectedCliente(cliente)
    setFormError(null)
    if (cliente.fuente === 'LOCAL' && cliente.clienteLocalId) {
      setBuscandoContratos(true)
      try {
        const encontrados = await buscarContratosDeCliente(Number(empresaId), cliente.clienteLocalId)
        if (encontrados.length > 0) {
          setContratosExistentes(encontrados)
          setMostrarContratos(true)
          setShowForm(false)
          return
        }
      } catch {
        setFormError('Error al buscar contratos del cliente. Intenta de nuevo.')
        return
      } finally {
        setBuscandoContratos(false)
      }
    }
    setContratosExistentes([])
    setMostrarContratos(false)
    setShowForm(true)
  }

  const handleCrearNuevo = () => {
    setMostrarContratos(false)
    setShowForm(true)
  }

  const handleVerContrato = (costeoId: number) => {
    router.push(`/costeos/${costeoId}/builder`)
  }

  const handleBackToSearch = () => {
    setFormError(null)
    if (showForm && contratosExistentes.length > 0) {
      setShowForm(false)
      setMostrarContratos(true)
      return
    }
    setShowForm(false)
    setMostrarContratos(false)
    setSelectedCliente(null)
    setContratosExistentes([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const errors: { [key: string]: string } = {}
      if (!nombreProyecto.trim()) errors.nombreProyecto = 'El nombre del proyecto es requerido'
      if (!fechaCosteo) errors.fechaCosteo = 'Requerido'
      if (!fechaInicio) errors.fechaInicio = 'Requerido'
      if (
        (selectedTipoCosteo?.manejoPlazo === 'FIJO' || selectedTipoCosteo?.manejoPlazo === 'LIBRE') &&
        (!plazoMeses || plazoMeses <= 0)
      ) {
        errors.plazoMeses = 'Debe especificar una cantidad de meses mayor a 0'
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        setIsSubmitting(false)
        return
      }

      const formData = new FormData()
      formData.append('empresa', empresaId)
      formData.append('erpClienteData', JSON.stringify(selectedCliente))
      formData.append('isNewClient', 'false')
      formData.append('tipoCosteoId', tipoCosteoId)
      formData.append('moneda', moneda)
      formData.append('nombreProyecto', nombreProyecto)
      formData.append('fechaCosteo', fechaCosteo)
      formData.append('fechaInicio', fechaInicio)
      formData.append('plazoMeses', (plazoMeses || 0).toString())

      await createCosteo(formData)
    } catch (err: any) {
      if (err?.message === 'NEXT_REDIRECT') throw err
      setFormError(err.message || 'Ocurrió un error inesperado al crear el proyecto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calculator}
        title="Nuevo Contrato"
        subtitle="Busca el cliente. Si ya tiene contrato, se abre su costeo."
        accent={MODULE_ACCENT.contratos}
      />

      {/* Error global de carga (antes de mostrar form) */}
      {formError && !showForm && (
        <div className={UI_THEME.forms.globalError}>
          {formError}
        </div>
      )}

      {/* Paso 1: Filtros de Búsqueda */}
      {!showForm && !mostrarContratos && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">1. Datos Iniciales</CardTitle>
            <CardDescription>Selecciona la empresa y busca al cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col gap-6">
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <SearchableSelect
                  className="[&>button]:!border-b-[3px]"
                  options={empresas}
                  value={empresaId}
                  onChange={val => {
                    handleEmpresaChange(val)
                    setFieldErrors(prev => ({ ...prev, empresaId: '' }))
                  }}
                  placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                  disabled={cargandoEmpresas}
                />
                <FieldError message={fieldErrors.empresaId} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoCosteoSelect">Tipo Costeo</Label>
                <SearchableSelect
                  className="[&>button]:!border-b-[3px]"
                  options={filteredTiposCosteo.map((tc: any) => ({ value: String(tc.id), label: tc.nombre }))}
                  value={tipoCosteoId}
                  onChange={setTipoCosteoId}
                  placeholder="Selecciona un tipo"
                  disabled={!empresaId || filteredTiposCosteo.length === 0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">
                  Buscar Cliente{' '}
                  {syncClientesActivo && (
                    <span className="ml-1 text-xs font-normal text-indigo-500 inline-flex items-center gap-1">
                      <Database className="w-3 h-3" /> + ERP
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    placeholder="NIT, nombre o código..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(normalizeText(e.target.value))
                      setFieldErrors(prev => ({ ...prev, search: '' }))
                    }}
                    disabled={!empresaId}
                    className="flex-1 !border-b-[3px]"
                    aria-invalid={!!fieldErrors.search}
                  />
                  <Button
                    type="submit"
                    disabled={!empresaId || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {isLoading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
                <FieldError message={fieldErrors.search} />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Resultados */}
      {searched && !showForm && !mostrarContratos && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-indigo-900">Resultados Búsqueda</CardTitle>
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
              <div className={UI_THEME.table.container}>
                <Table>
                  <TableHeader>
                    <TableRow className={cn(UI_THEME.table.headerBgSolid, 'hover:bg-transparent')}>
                      <TableHead className="w-[80px]">Origen</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>NIT</TableHead>
                      <TableHead>Nombre Comercial</TableHead>
                      <TableHead>Razón Social</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c, idx) => (
                      <TableRow
                        key={c.clienteLocalId ?? `erp-${idx}`}
                        className={cn(
                          idx % 2 === 1 ? UI_THEME.table.rowStripe : UI_THEME.table.rowBase,
                          UI_THEME.table.rowHover,
                          'cursor-pointer',
                        )}
                        onClick={() => { if (!buscandoContratos) void handleSelectCliente(c) }}
                      >
                        <TableCell>
                          {c.fuente === 'LOCAL' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                              <Database className="w-2.5 h-2.5" />
                              Local
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">ERP</span>
                          )}
                        </TableCell>
                        <TableCell>{c.codigo || c.id || '-'}</TableCell>
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

      {mostrarContratos && !showForm && selectedCliente && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-indigo-900">Contratos del Cliente</CardTitle>
              <CardDescription>
                {selectedCliente.razonSocial} ya tiene {contratosExistentes.length === 1 ? 'un contrato' : `${contratosExistentes.length} contratos`}.
                Abre el costeo o crea uno nuevo.
              </CardDescription>
            </div>
            <Button type="button" onClick={handleCrearNuevo} className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              Crear Nuevo
            </Button>
          </CardHeader>
          <CardContent>
            <div className={UI_THEME.table.container}>
              <Table>
                <TableHeader>
                  <TableRow className={cn(UI_THEME.table.headerBgSolid, 'hover:bg-transparent')}>
                    <TableHead className="w-[70px] text-center">ID</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-center">Fecha</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead className="text-center">Inicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosExistentes.map((contrato, idx) => (
                    <TableRow
                      key={contrato.id}
                      className={idx % 2 === 1 ? UI_THEME.table.rowStripe : UI_THEME.table.rowBase}
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">{contrato.id}</TableCell>
                      <TableCell>{empresaNombre}</TableCell>
                      <TableCell className="text-center">{contrato.fechaCosteo}</TableCell>
                      <TableCell>{contrato.nombre}</TableCell>
                      <TableCell className="text-center">{contrato.fechaInicio}</TableCell>
                      <TableCell>
                        <span className={claseEstadoCosteo(contrato.estado)}>{contrato.estadoLabel}</span>
                      </TableCell>
                      <TableCell>{contrato.version != null ? `v${contrato.version}` : '—'}</TableCell>
                      <TableCell className="text-right">
                        {contrato.costeoId != null && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerContrato(contrato.costeoId!)}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Ver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="pt-4">
              <Button type="button" variant="outline" onClick={handleBackToSearch}>
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 3: Detalles del Costeo */}
      {showForm && selectedCliente && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">2. Detalles Costeo</CardTitle>
            <CardDescription>
              Cliente seleccionado:{' '}
              <span className="font-semibold text-indigo-700">{selectedCliente.razonSocial}</span>{' '}
              ({selectedCliente.nit})
              {selectedCliente.fuente === 'LOCAL' && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  <Database className="w-2.5 h-2.5" />
                  Local
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className={`${UI_THEME.forms.globalError} mb-4`}>
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
                    className={`${UI_THEME.forms.inputBase} uppercase`}
                    value={nombreProyecto}
                    aria-invalid={!!fieldErrors.nombreProyecto}
                    onChange={e => {
                      setNombreProyecto(normalizeText(e.target.value))
                      setFieldErrors(prev => ({ ...prev, nombreProyecto: '' }))
                    }}
                  />
                  <FieldError message={fieldErrors.nombreProyecto} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaCosteo">Fecha Costeo</Label>
                  <Input
                    id="fechaCosteo"
                    type="date"
                    className={UI_THEME.forms.inputBase}
                    value={fechaCosteo}
                    aria-invalid={!!fieldErrors.fechaCosteo}
                    onChange={e => {
                      setFechaCosteo(e.target.value)
                      setFieldErrors(prev => ({ ...prev, fechaCosteo: '' }))
                    }}
                  />
                  <FieldError message={fieldErrors.fechaCosteo} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    className={UI_THEME.forms.inputBase}
                    value={fechaInicio}
                    aria-invalid={!!fieldErrors.fechaInicio}
                    onChange={e => {
                      setFechaInicio(e.target.value)
                      setFieldErrors(prev => ({ ...prev, fechaInicio: '' }))
                    }}
                  />
                  <FieldError message={fieldErrors.fechaInicio} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plazoMeses">Plazo Meses</Label>
                  <NumericInput
                    value={plazoMeses}
                    isInteger={true}
                    disabled={Boolean(
                      selectedTipoCosteo &&
                        (selectedTipoCosteo.manejoPlazo === 'FIJO' ||
                          selectedTipoCosteo.manejoPlazo === 'NO_APLICA')
                    )}
                    aria-invalid={!!fieldErrors.plazoMeses}
                    onChange={val => {
                      setPlazoMeses(val)
                      setFieldErrors(prev => ({ ...prev, plazoMeses: '' }))
                    }}
                  />
                  <FieldError message={fieldErrors.plazoMeses} />
                  {selectedTipoCosteo?.manejoPlazo === 'FIJO' && !fieldErrors.plazoMeses && (
                    <p className="text-xs text-muted-foreground">Plazo fijado por el Tipo de Costeo.</p>
                  )}
                  {selectedTipoCosteo?.manejoPlazo === 'NO_APLICA' && !fieldErrors.plazoMeses && (
                    <p className="text-xs text-muted-foreground">Este tipo de proyecto no lleva plazo.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monedaSelect">Moneda</Label>
                  <SearchableSelect
                    id="monedaSelect"
                    options={[
                      { value: 'GTQ', label: 'Quetzales (GTQ)' },
                      { value: 'USD', label: 'Dólares (USD)' },
                    ]}
                    value={moneda}
                    onChange={setMoneda}
                    searchable={false}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={handleBackToSearch} disabled={isSubmitting}>
                  Volver
                </Button>
                <Button
                  type="submit"
                  disabled={!tipoCosteoId || isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Contrato'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getEmpresasConSync, searchClientesWizard, type ClienteWizardResultado } from '@/app/actions/erp'
import { ClienteAltaForm } from '@/components/clientes/cliente-alta-form'
import type { ClienteRow } from '@/lib/types/clientes'
import { cn } from '@/lib/utils'
import { normalizeText } from '@/lib/utils/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { NumericInput } from '@/components/ui/numeric-input'
import { FieldError } from '@/components/ui/field-error'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { claseEstadoCosteo } from '@/lib/constants'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import { createCosteo, buscarContratosDeCliente, type ContratoExistente } from '@/app/actions/costeos'
import { ArrowLeft, Calculator, Check, Database, Eye, FileSignature, Plus, Search, UserRound } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function hoyLocal(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

type WizardCosteoProps = {
  tiposCosteo?: any[]
  puedeAgregarClientes?: boolean
}

function clienteLocalDesdeAlta(row: ClienteRow): ClienteWizardResultado {
  return {
    fuente: 'LOCAL',
    clienteLocalId: row.id,
    id: row.codigoErp ?? undefined,
    codigo: row.codigoErp ?? undefined,
    nit: row.nit,
    razonSocial: row.razonSocial,
    nombreComercial: row.razonSocial,
    direccion: row.direccionFiscal ?? undefined,
    diasCredito: row.diasCredito,
  }
}

export function WizardCosteo({ tiposCosteo, puedeAgregarClientes = false }: WizardCosteoProps) {
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
  const [vista, setVista] = useState<'buscar' | 'alta' | 'existentes' | 'contrato'>('buscar')
  const [buscandoContratos, setBuscandoContratos] = useState(false)
  const [tipoCosteoId, setTipoCosteoId] = useState<string>('')

  // ── Formulario final ───────────────────────────────────────────────────────────
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
    setVista('buscar')
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
          setVista('existentes')
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
    setVista('contrato')
  }

  const handleCrearNuevo = () => {
    setVista('contrato')
  }

  const handleVerContrato = (costeoId: number) => {
    router.push(`/costeos/${costeoId}/builder`)
  }

  const handleBackToSearch = () => {
    setFormError(null)
    if (vista === 'contrato' && contratosExistentes.length > 0) {
      setVista('existentes')
      return
    }
    setVista('buscar')
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

  const enContrato = vista === 'contrato'

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calculator}
        title="Nuevo Contrato"
        subtitle="Primero el cliente. Luego los datos del contrato."
        accent={MODULE_ACCENT.contratos}
      />

      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-6">
      <Tabs value={enContrato ? 'contrato' : 'cliente'} className="gap-0">
        <TabsList variant="line" className={cn(UI_THEME.tabs.modalListClass, '-mt-4 sm:-mt-6')}>
          <TabsTrigger
            value="cliente"
            onClick={() => { if (vista !== 'buscar') handleBackToSearch() }}
          >
            <UserRound className="mr-2 h-4 w-4" />
            Cliente
          </TabsTrigger>
          <TabsTrigger value="contrato" disabled={!enContrato}>
            <FileSignature className="mr-2 h-4 w-4" />
            Contrato
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {formError && vista !== 'alta' && (
        <div className={`${UI_THEME.forms.globalError} mt-4`}>{formError}</div>
      )}

      <div className="pt-4">

      {vista === 'buscar' && (
        <>
        <form onSubmit={handleSearch} className="flex flex-col gap-6">
              <div className="space-y-2">
                <Label htmlFor="empresa" className={UI_THEME.forms.labelBase}>Empresa</Label>
                <SearchableSelect
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
                <Label htmlFor="tipoCosteoSelect" className={UI_THEME.forms.labelBase}>Tipo Costeo</Label>
                <SearchableSelect
                  options={filteredTiposCosteo.map((tc: any) => ({ value: String(tc.id), label: tc.nombre }))}
                  value={tipoCosteoId}
                  onChange={setTipoCosteoId}
                  placeholder="Selecciona un tipo"
                  disabled={!empresaId || filteredTiposCosteo.length === 0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search" className={UI_THEME.forms.labelBase}>
                  Buscar Cliente{' '}
                  {syncClientesActivo && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground inline-flex items-center gap-1">
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
                    className={`${UI_THEME.forms.inputBase} flex-1`}
                    aria-invalid={!!fieldErrors.search}
                  />
                  <Button
                    type="submit"
                    disabled={!empresaId || isLoading}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {isLoading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
                <FieldError message={fieldErrors.search} />
              </div>
            </form>

        {searched && (
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {clientes.length} cliente(s) encontrado(s).{' '}
                {puedeAgregarClientes
                  ? 'Selecciona uno o crea uno nuevo.'
                  : 'Selecciona uno que ya está en Costeos.'}
              </p>
              {puedeAgregarClientes && empresaId && (
                <Button type="button" variant="outline" onClick={() => { setFormError(null); setVista('alta') }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cliente Nuevo
                </Button>
              )}
            </div>
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
                    {clientes.map((c, idx) => {
                      const soloEnErp = c.fuente !== 'LOCAL'
                      const bloqueada = soloEnErp && !puedeAgregarClientes
                      return (
                      <TableRow
                        key={c.clienteLocalId ?? `erp-${idx}`}
                        className={cn(
                          idx % 2 === 1 ? UI_THEME.table.rowStripe : UI_THEME.table.rowBase,
                          !bloqueada && UI_THEME.table.rowHover,
                          !bloqueada && 'cursor-pointer',
                        )}
                        title={bloqueada ? 'Este cliente no está en Costeos' : undefined}
                        onClick={() => { if (!bloqueada && !buscandoContratos) void handleSelectCliente(c) }}
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
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No se encontraron clientes que coincidan con la búsqueda.</p>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {vista === 'alta' && (
        <ClienteAltaForm
          empresaId={Number(empresaId)}
          empresaNombre={empresaNombre}
          onCreado={(row) => { void handleSelectCliente(clienteLocalDesdeAlta(row)) }}
          onCancelar={() => setVista('buscar')}
        />
      )}

      {vista === 'existentes' && selectedCliente && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {selectedCliente.razonSocial} ya tiene {contratosExistentes.length === 1 ? 'un contrato' : `${contratosExistentes.length} contratos`}.
            Abre el costeo o crea uno nuevo.
          </p>
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
            <div className={UI_THEME.modal.footer}>
              <div className="flex w-full items-center justify-between">
                <Button type="button" variant="ghost" size="sm" className={UI_THEME.modal.buttons.accion} onClick={handleBackToSearch}>
                  <ArrowLeft className={UI_THEME.modal.buttons.icon} /> Volver
                </Button>
                <Button type="button" variant="ghost" size="sm" className={UI_THEME.modal.buttons.accion} onClick={handleCrearNuevo}>
                  <Plus className={UI_THEME.modal.buttons.icon} /> Crear Nuevo
                </Button>
              </div>
            </div>
        </div>
      )}

      {vista === 'contrato' && selectedCliente && (
            <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
              <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {empresaNombre}
                {selectedTipoCosteo ? ` · ${selectedTipoCosteo.nombre}` : ''}
                {' · '}
                <span className="font-medium text-foreground">{selectedCliente.razonSocial}</span>
                {' '}({selectedCliente.nit})
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreProyecto" className={UI_THEME.forms.labelBase}>Nombre Proyecto</Label>
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
                  <Label htmlFor="fechaCosteo" className={UI_THEME.forms.labelBase}>Fecha Costeo</Label>
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
                  <Label htmlFor="fechaInicio" className={UI_THEME.forms.labelBase}>Fecha Inicio</Label>
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
                  <Label htmlFor="plazoMeses" className={UI_THEME.forms.labelBase}>Plazo Meses</Label>
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
                  <Label htmlFor="monedaSelect" className={UI_THEME.forms.labelBase}>Moneda</Label>
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
              </div>

              <div className={UI_THEME.modal.footer}>
                <div className="flex w-full items-center justify-between">
                  <Button type="button" variant="ghost" size="sm" className={UI_THEME.modal.buttons.accion} onClick={handleBackToSearch} disabled={isSubmitting}>
                    <ArrowLeft className={UI_THEME.modal.buttons.icon} /> Volver
                  </Button>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className={UI_THEME.modal.buttons.accion}
                    disabled={!tipoCosteoId || isSubmitting}
                  >
                    <Check className={UI_THEME.modal.buttons.icon} />
                    {isSubmitting ? 'Creando...' : 'Crear Contrato'}
                  </Button>
                </div>
              </div>
            </form>
      )}
      </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { crearCliente, buscarClientesSimilares } from '@/app/actions/clientes'
import { getDepartamentosERP, getMunicipiosERP, buscarNombreCatalogoErp } from '@/app/actions/erp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { NumericInput } from '@/components/ui/numeric-input'
import { FieldError } from '@/components/ui/field-error'
import { SegmentCard, TwoColumns } from '@/components/ui/form-layout'
import { UI_THEME } from '@/lib/theme'
import { normalizeText } from '@/lib/utils/text'
import { isConsumidorFinal, normalizeNIT, validateNIT } from '@/lib/utils/nit'
import type { ClienteInput, ClienteRow } from '@/lib/types/clientes'

export type ClienteAltaInicial = {
  nit?: string
  razonSocial?: string
  direccionFiscal?: string
  departamento?: string
  municipio?: string
  diasCredito?: number
  codigoErp?: string | null
}

type ClienteAltaFormProps = {
  empresaId: number
  empresaNombre: string
  inicial?: ClienteAltaInicial
  onCreado: (row: ClienteRow) => void
  onCancelar?: () => void
  /** En el modal de catálogo el pie es el del diálogo. En la página, los botones van con el paso. */
  variante?: 'modal' | 'pagina'
}

export function ClienteAltaForm({
  empresaId,
  empresaNombre,
  inicial,
  onCreado,
  onCancelar,
  variante = 'pagina',
}: ClienteAltaFormProps) {
  const [nit, setNit] = useState(inicial?.nit ?? '')
  const [razonSocial, setRazonSocial] = useState(inicial?.razonSocial ?? '')
  const [direccionFiscal, setDireccionFiscal] = useState(inicial?.direccionFiscal ?? '')
  const [departamento, setDepartamento] = useState(inicial?.departamento ?? '')
  const [municipio, setMunicipio] = useState(inicial?.municipio ?? '')
  const [diasCredito, setDiasCredito] = useState<number | undefined>(inicial?.diasCredito ?? 0)
  const codigoErp = inicial?.codigoErp && inicial.codigoErp !== 'NULL' ? inicial.codigoErp : null
  const [nombreErp, setNombreErp] = useState<string | null>(null)
  const [departamentos, setDepartamentos] = useState<{ value: string; label: string }[]>([])
  const [municipios, setMunicipios] = useState<{ value: string; label: string }[]>([])
  const [loadingDeptos, setLoadingDeptos] = useState(false)
  const [loadingMunis, setLoadingMunis] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const bloqueadoPorErp = codigoErp != null && codigoErp !== '' && codigoErp !== 'NULL'

  useEffect(() => {
    if (!codigoErp) {
      setNombreErp(null)
      return
    }
    let active = true
    buscarNombreCatalogoErp('cliente', empresaId, codigoErp).then(nombre => {
      if (active) setNombreErp(nombre)
    })
    return () => { active = false }
  }, [codigoErp, empresaId])

  useEffect(() => {
    let active = true
    setLoadingDeptos(true)
    getDepartamentosERP()
      .then(data => {
        if (!active) return
        setDepartamentos(
          data
            .map(d => ({ value: String(d.codigo), label: d.nombre }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        )
      })
      .finally(() => { if (active) setLoadingDeptos(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!departamento) {
      setMunicipios([])
      setMunicipio('')
      return
    }
    setLoadingMunis(true)
    getMunicipiosERP(Number(departamento)).then(data => {
      if (!active) return
      const sorted = data
        .map(m => ({ value: String(m.codigo), label: m.nombre }))
        .sort((a, b) => a.label.localeCompare(b.label))
      setMunicipios(sorted)
      setLoadingMunis(false)
      setMunicipio(prev => {
        if (prev && sorted.some(m => m.value === prev)) return prev
        return sorted.length > 0 ? sorted[0].value : ''
      })
    })
    return () => { active = false }
  }, [departamento])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!empresaId) errors.empresaId = 'Requerido'
    if (!nit.trim()) errors.nit = 'Requerido'
    if (!razonSocial.trim()) errors.razonSocial = 'Requerido'
    if (!direccionFiscal.trim()) errors.direccionFiscal = 'Requerido'
    if (!departamento) errors.departamento = 'Requerido'
    if (!municipio) errors.municipio = 'Requerido'
    if (nit.trim() && !errors.nit) {
      const nitResult = validateNIT(nit.trim())
      if (!nitResult.valid) errors.nit = nitResult.error ?? 'NIT invalido'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const nitNorm = normalizeNIT(nit.trim())
    const nombreNorm = normalizeText(razonSocial)
    const esCF = isConsumidorFinal(nit.trim())

    setLoading(true)
    try {
      const [porNit, porNombre] = await Promise.all([
        esCF ? Promise.resolve([]) : buscarClientesSimilares(nitNorm, 'nit', empresaId),
        buscarClientesSimilares(nombreNorm, 'nombre', empresaId),
      ])
      const soloCosteos = (r: { source: string }) => r.source !== 'erp'
      const nitDuplicado = bloqueadoPorErp
        ? porNit.filter(soloCosteos).some(r => r.pct === 100)
        : porNit.some(r => r.pct === 100)
      const nombreDuplicado = bloqueadoPorErp
        ? porNombre.filter(soloCosteos).some(r => r.pct >= 85)
        : porNombre.some(r => r.pct >= 85)
      if (nitDuplicado || nombreDuplicado) {
        const next: Record<string, string> = {}
        if (nitDuplicado) next.nit = 'Este NIT ya existe en el sistema'
        if (nombreDuplicado) next.razonSocial = 'Este nombre ya existe'
        setFieldErrors(next)
        return
      }

      const data: ClienteInput = {
        empresaId,
        nit: nitNorm,
        razonSocial: nombreNorm,
        direccionFiscal: normalizeText(direccionFiscal),
        direccionPaisId: 1,
        direccionDepartamentoId: parseInt(departamento, 10) || 0,
        direccionMunicipioId: parseInt(municipio, 10) || 0,
        diasCredito: diasCredito ?? 0,
        codigoErp: codigoErp && codigoErp !== 'NULL' ? codigoErp : null,
      }
      const res = await crearCliente(data)
      if (!res.ok) {
        if (res.field) setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
        else setGlobalError(res.error)
        return
      }
      onCreado(res.data)
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Error inesperado al guardar')
    } finally {
      setLoading(false)
    }
  }

  const campos = (
    <TwoColumns
      left={<>
        <SegmentCard label="Identificacion">
          <div className="contents">
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label className={UI_THEME.forms.labelBase}>Empresa</Label>
              <Input value={empresaNombre} disabled className={UI_THEME.forms.inputBase} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="alta-codigo">Codigo ERP</Label>
              <Input
                id="alta-codigo"
                value={codigoErp && codigoErp !== 'NULL' ? codigoErp : ''}
                disabled
                className={`${UI_THEME.forms.inputBase} font-mono`}
              />
              {nombreErp && (
                <p className="text-xs text-emerald-600 !mt-0.5 leading-none font-medium">
                  ✓ {nombreErp}
                </p>
              )}
            </div>
          </div>
        </SegmentCard>
        <SegmentCard label="General">
          <div className="contents">
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="alta-nit">NIT <span className="text-red-500">*</span></Label>
              <Input
                id="alta-nit"
                value={nit}
                onChange={e => {
                  setNit(e.target.value.replace(/\s/g, ''))
                  if (fieldErrors.nit) setFieldErrors(prev => { const n = { ...prev }; delete n.nit; return n })
                }}
                disabled={bloqueadoPorErp}
                className={UI_THEME.forms.inputBase}
                aria-invalid={!!fieldErrors.nit}
              />
              <FieldError message={fieldErrors.nit} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-4">
              <Label htmlFor="alta-razon">Razon Social <span className="text-red-500">*</span></Label>
              <Input
                id="alta-razon"
                value={razonSocial}
                onChange={e => {
                  setRazonSocial(e.target.value)
                  if (fieldErrors.razonSocial) setFieldErrors(prev => { const n = { ...prev }; delete n.razonSocial; return n })
                }}
                disabled={bloqueadoPorErp}
                className={`${UI_THEME.forms.inputBase} uppercase`}
                aria-invalid={!!fieldErrors.razonSocial}
              />
              <FieldError message={fieldErrors.razonSocial} />
            </div>
          </div>
        </SegmentCard>
        <SegmentCard label="Otros">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="alta-dias">Dias Credito</Label>
            <NumericInput id="alta-dias" value={diasCredito} isInteger onChange={setDiasCredito} />
          </div>
        </SegmentCard>
      </>}
      right={
        <SegmentCard label="Direccion Fiscal">
          <div className="contents">
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5 col-span-4">
                <Label htmlFor="alta-direccion">Direccion <span className="text-red-500">*</span></Label>
                <Input
                  id="alta-direccion"
                  value={direccionFiscal}
                  onChange={e => {
                    setDireccionFiscal(e.target.value)
                    if (fieldErrors.direccionFiscal) setFieldErrors(prev => { const n = { ...prev }; delete n.direccionFiscal; return n })
                  }}
                  disabled={bloqueadoPorErp && !!inicial?.direccionFiscal}
                  className={`${UI_THEME.forms.inputBase} uppercase`}
                  aria-invalid={!!fieldErrors.direccionFiscal}
                  placeholder="Ej. ZONA 10, CIUDAD CAPITAL"
                />
                <FieldError message={fieldErrors.direccionFiscal} />
              </div>
              <div className="flex flex-col gap-1.5 col-span-4">
                <Label>Pais</Label>
                <SearchableSelect
                  options={[{ value: '1', label: 'Guatemala' }]}
                  value="1"
                  onChange={() => {}}
                  disabled
                  searchable={false}
                />
              </div>
              <div className="flex flex-col gap-1.5 col-span-4">
                <Label>
                  Departamento {loadingDeptos && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                  {' '}<span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={departamentos}
                  value={departamento}
                  onChange={val => {
                    setDepartamento(val)
                    setMunicipio('')
                    if (fieldErrors.departamento) setFieldErrors(prev => { const n = { ...prev }; delete n.departamento; return n })
                  }}
                  disabled={loadingDeptos || (bloqueadoPorErp && !!inicial?.departamento)}
                  placeholder={loadingDeptos ? 'Cargando...' : 'Seleccione...'}
                />
                <FieldError message={fieldErrors.departamento} />
              </div>
              <div className="flex flex-col gap-1.5 col-span-4">
                <Label>
                  Municipio {loadingMunis && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                  {' '}<span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={municipios}
                  value={municipio}
                  onChange={val => {
                    setMunicipio(val)
                    if (fieldErrors.municipio) setFieldErrors(prev => { const n = { ...prev }; delete n.municipio; return n })
                  }}
                  disabled={loadingMunis || !departamento || (bloqueadoPorErp && !!inicial?.municipio)}
                  placeholder={loadingMunis ? 'Cargando...' : !departamento ? 'Seleccione departamento' : 'Seleccione...'}
                />
                <FieldError message={fieldErrors.municipio} />
              </div>
            </div>
          </div>
        </SegmentCard>
      }
    />
  )

  return (
    <form
      onSubmit={handleSave}
      noValidate
      data-form-mode="edit"
      className={variante === 'modal' ? 'flex min-h-0 flex-1 flex-col pt-2' : 'flex flex-col'}
    >
      {globalError && <div className={UI_THEME.forms.globalError}>{globalError}</div>}
      {variante === 'modal' ? <div className={UI_THEME.modal.scrollArea}>{campos}</div> : <div className="mb-4">{campos}</div>}
      <div className={UI_THEME.modal.footer}>
        <div className={onCancelar ? 'flex w-full items-center justify-between' : UI_THEME.modal.buttons.editRow}>
          {onCancelar && (
            <Button type="button" variant="ghost" size="sm" className={UI_THEME.modal.buttons.accion} onClick={onCancelar} disabled={loading}>
              <ArrowLeft className={UI_THEME.modal.buttons.icon} /> {variante === 'pagina' ? 'Volver' : 'Atras'}
            </Button>
          )}
          <Button type="submit" variant="ghost" size="sm" className={UI_THEME.modal.buttons.accion} disabled={loading}>
            {variante === 'pagina' ? <ArrowRight className={UI_THEME.modal.buttons.icon} /> : <Check className={UI_THEME.modal.buttons.icon} />} {loading ? 'Guardando…' : (variante === 'pagina' ? 'Siguiente' : 'Guardar')}
          </Button>
        </div>
      </div>
    </form>
  )
}

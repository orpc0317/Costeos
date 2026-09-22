'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { NumericInput } from '@/components/ui/numeric-input'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import {
  Link2,
  Plus,
  Pencil,
  PowerOff,
  Power,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import { getEmpresasForUser } from '@/app/actions/erp'
import {
  listarTiposComboRH,
  crearTipoComboRH,
  editarTipoComboRH,
  toggleActivoTipoComboRH,
} from '@/app/actions/tipos-combo-rh'
import { normalizeText } from '@/lib/utils/text'
import type { TipoComboRHRow } from '@/lib/types/tipos-combo-rh'
import { cn } from '@/lib/utils'

// ─── Formulario inline ───────────────────────────────────────────────────────

interface FormState {
  empresaId: string
  nombre: string
  requerido: boolean
  orden: string
}

const FORM_EMPTY: FormState = {
  empresaId: '',
  nombre: '',
  requerido: false,
  orden: '',
}

function tipoToForm(t: TipoComboRHRow): FormState {
  return {
    empresaId: t.empresaId.toString(),
    nombre: t.nombre,
    requerido: t.requerido,
    orden: t.orden.toString(),
  }
}

// ─── Panel principal ─────────────────────────────────────────────────────────

interface TiposComboRHPanelProps {
  trigger?: React.ReactNode
}

export function TiposComboRHPanel({ trigger }: TiposComboRHPanelProps) {
  const [open, setOpen] = useState(false)

  // Datos
  const [tipos, setTipos] = useState<TipoComboRHRow[]>([])
  const [empresas, setEmpresas] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Formulario
  const [editingId, setEditingId] = useState<number | null>(null) // null = crear
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(FORM_EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // ── Cargar datos al abrir ──────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true)
    const [tiposData, empresasData] = await Promise.all([
      listarTiposComboRH(),
      getEmpresasForUser(),
    ])
    setTipos(tiposData)
    setEmpresas(
      empresasData
        .map(e => ({ value: e.id.toString(), label: e.nombre }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) cargarDatos()
  }, [open, cargarDatos])

  // ── Formulario helpers ────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setEditingId(null)
    setForm({
      ...FORM_EMPTY,
      empresaId: empresas[0]?.value ?? '',
    })
    setFieldErrors({})
    setGlobalError(null)
    setShowForm(true)
  }

  const abrirEditar = (tipo: TipoComboRHRow) => {
    setEditingId(tipo.id)
    setForm(tipoToForm(tipo))
    setFieldErrors({})
    setGlobalError(null)
    setShowForm(true)
  }

  const cancelarForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFieldErrors({})
    setGlobalError(null)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!form.empresaId) errors.empresaId = 'Requerido'
    if (!form.nombre.trim()) errors.nombre = 'Requerido'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setGlobalError(null)

    let res
    if (editingId !== null) {
      res = await editarTipoComboRH(editingId, {
        nombre: form.nombre,
        requerido: form.requerido,
        orden: parseInt(form.orden, 10) || 1,
      })
    } else {
      res = await crearTipoComboRH({
        empresaId: parseInt(form.empresaId, 10),
        nombre: form.nombre,
        requerido: form.requerido,
      })
    }

    setSaving(false)

    if (!res.ok) {
      if ('field' in res && res.field) {
        setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
      } else {
        setGlobalError(res.error)
      }
      return
    }

    await cargarDatos()
    cancelarForm()
  }

  const handleToggle = async (tipo: TipoComboRHRow) => {
    setTogglingId(tipo.id)
    const res = await toggleActivoTipoComboRH(tipo.id)
    if (!res.ok) setGlobalError(res.error)
    else await cargarDatos()
    setTogglingId(null)
  }

  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns: ColumnDef<TipoComboRHRow>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        id: 'empresa',
        accessorFn: (row) => row.empresaNombre ?? String(row.empresaId),
        header: 'Empresa',
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.empresaNombre ?? row.original.empresaId}</span>
        ),
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => (
          <span className="font-semibold text-sm">{row.original.nombre}</span>
        ),
      },
      {
        accessorKey: 'orden',
        header: 'Orden',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.orden}</span>
        ),
      },
      {
        accessorKey: 'requerido',
        header: 'Requerido',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              row.original.requerido
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-slate-200 text-slate-400',
            )}
          >
            {row.original.requerido ? 'Sí' : 'No'}
          </Badge>
        ),
      },
      {
        accessorKey: 'activo',
        header: 'Estado',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Badge
            variant={row.original.activo ? 'default' : 'secondary'}
            className={
              row.original.activo
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-xs'
                : 'bg-muted text-muted-foreground text-xs'
            }
          >
            {row.original.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => {
          const tipo = row.original
          const toggling = togglingId === tipo.id
          return (
            <div className="flex items-center gap-1 justify-center">
              <button
                type="button"
                onClick={() => abrirEditar(tipo)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 bg-blue-50/50 hover:bg-blue-100 transition-colors"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5 text-blue-600" />
              </button>
              <button
                type="button"
                onClick={() => handleToggle(tipo)}
                disabled={toggling}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
                  tipo.activo
                    ? 'border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600'
                    : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-600',
                )}
                title={tipo.activo ? 'Desactivar' : 'Activar'}
              >
                {toggling
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : tipo.activo
                  ? <PowerOff className="h-3.5 w-3.5" />
                  : <Power className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          )
        },
      },
    ],
    [togglingId, empresas],
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger
        ? <DialogTrigger render={trigger as React.ReactElement} />
        : (
          <DialogTrigger render={
            <button className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
              <Link2 className="h-4 w-4" />
              Tipos RH
            </button>
          } />
        )
      }

      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2 text-indigo-900">
            <Link2 className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">Tipos Combo RH</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configura los tipos de ítems asociados a Recursos Humanos (Uniforme, Equipo Seguridad, etc.). Máximo 8 activos por empresa.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0">

          {/* ── Formulario ── */}
          {showForm && (
            <form
              onSubmit={handleGuardar}
              className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-4"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-indigo-800">
                  {editingId !== null ? 'Editar Tipo' : 'Nuevo Tipo'}
                </h3>
                <button type="button" onClick={cancelarForm} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {globalError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {globalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Empresa — solo en creación */}
                {editingId === null && (
                  <div className="flex flex-col gap-1 col-span-2">
                    <Label htmlFor="tcr-empresa">Empresa <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      id="tcr-empresa"
                      options={empresas}
                      value={form.empresaId}
                      onChange={v => { setForm(p => ({ ...p, empresaId: v })); setFieldErrors(p => ({ ...p, empresaId: '' })) }}
                      placeholder="Seleccione empresa..."
                      error={!!fieldErrors.empresaId}
                    />
                    <FieldError message={fieldErrors.empresaId} />
                  </div>
                )}

                {/* Nombre */}
                <div className="flex flex-col gap-1 col-span-2">
                  <Label htmlFor="tcr-nombre">Nombre <span className="text-red-500">*</span></Label>
                  <Input
                    id="tcr-nombre"
                    value={form.nombre}
                    onChange={e => { setForm(p => ({ ...p, nombre: e.target.value })); setFieldErrors(p => ({ ...p, nombre: '' })) }}
                    placeholder="Ej: EQUIPO SEGURIDAD"
                    className={cn('uppercase', fieldErrors.nombre ? 'border-red-500' : '')}
                    autoComplete="off"
                  />
                  <FieldError message={fieldErrors.nombre} />
                </div>

                {/* Orden */}
                {editingId !== null && (
                  <div className="flex flex-col gap-1 col-span-1">
                    <Label htmlFor="tcr-orden">Orden</Label>
                    <NumericInput
                      id="tcr-orden"
                      value={parseInt(form.orden, 10) || 1}
                      onChange={v => setForm(p => ({ ...p, orden: String(v) }))}
                      min="1"
                      max="8"
                      className="w-24"
                    />
                  </div>
                )}

                {/* Requerido */}
                <div className={cn('flex items-center gap-2 mt-auto pb-1', editingId !== null ? 'col-span-1' : 'col-span-2')}>
                  <Checkbox
                    id="tcr-requerido"
                    checked={form.requerido}
                    onCheckedChange={checked => setForm(p => ({ ...p, requerido: !!checked }))}
                  />
                  <Label htmlFor="tcr-requerido" className="font-normal cursor-pointer">
                    Requerido al agregar RH al costeo
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={cancelarForm} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                    : <><Save className="w-4 h-4 mr-2" />Guardar</>
                  }
                </Button>
              </div>
            </form>
          )}

          {/* ── Tabla ── */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tipos}
              tableId="tipos-combo-rh-v1"
              searchPlaceholder="Buscar tipo..."
              customToolbarActions={
                !showForm ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={abrirNuevo}
                  >
                    <Plus className="w-4 h-4" /> Nuevo Tipo
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t bg-slate-50 sm:rounded-b-xl px-6 py-3 shrink-0">
          <p className="text-xs text-slate-500">
            Los tipos activos aparecen como opciones en el formulario de ítems y en el costeo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

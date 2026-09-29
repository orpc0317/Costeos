'use client'
/**
 * solicitudes-client.tsx
 * Pantalla de Solicitudes de Compra — lista con DataTable.
 * El modal unificado SolicitudModal maneja create, view y edit.
 */
import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { ClipboardList, Eye, Plus } from 'lucide-react'
import { UI_THEME } from '@/lib/theme'
import type { SolicitudRow } from '@/lib/types/cotizaciones'
import { labelEstadoSolicitud } from '@/lib/constants/cotizaciones'
import { SolicitudModal } from '@/components/compras/solicitud-modal'
import { formatCurrency } from '@/lib/utils/format'

export function SolicitudesClient({ solicitudes }: { solicitudes: SolicitudRow[] }) {
  const router = useRouter()

  const columns: ColumnDef<SolicitudRow>[] = useMemo(() => [
    // 1 — ID
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
      ),
    },
    // 2 — Empresa
    {
      id: 'empresa',
      accessorFn: (row) => row.empresaNombre ?? '—',
      header: 'Empresa',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.empresaNombre ?? '—'}</span>
      ),
    },
    // 3 — Fecha
    {
      id: 'fechaSolicitud',
      accessorFn: (row) => row.fecha ? new Date(row.fecha).toLocaleDateString('es-GT') : '—',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {row.original.fecha ? new Date(row.original.fecha).toLocaleDateString('es-GT') : '—'}
        </span>
      ),
    },
    // 4 — Cliente / Proyecto
    {
      id: 'cliente',
      accessorFn: (row) => row.clienteNombre ?? '—',
      header: 'Cliente / Proyecto',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.clienteNombre ?? '—'}</span>
      ),
    },
    // 5 — Ítem
    {
      accessorKey: 'itemDescripcion',
      header: 'Ítem',
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.itemDescripcion}</span>
      ),
    },
    // 6 — Cantidad
    {
      accessorKey: 'cantidad',
      header: 'Cantidad',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-right block">
          {Number(row.original.cantidad).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      ),
    },
    // 7 — Medida
    {
      accessorKey: 'itemUnidadMedida',
      header: 'Medida',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">{row.original.itemUnidadMedida || '—'}</span>
      ),
    },
    // 8 — Tipo
    {
      accessorKey: 'scope',
      header: 'Tipo',
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          row.original.scope === 'POR_PROYECTO'
            ? 'bg-violet-50 text-violet-700 border border-violet-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {row.original.scope === 'POR_PROYECTO' ? 'Por Proyecto' : 'General'}
        </span>
      ),
    },
    // 9 — Estado
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const e = row.original.estado
        const cfg: Record<number, string> = {
          1: 'bg-amber-50 text-amber-700 border-amber-200',
          2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          3: 'bg-red-50 text-red-600 border-red-200',
        }
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${cfg[e] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {labelEstadoSolicitud(e)}
          </span>
        )
      },
    },
    // actions — siempre última
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => (
        <SolicitudModal
          solicitud={row.original}
          onSuccess={() => router.refresh()}
          trigger={
            <button className={UI_THEME.action.viewButton}>
              <Eye className="h-4 w-4 text-blue-600" />
            </button>
          }
        />
      ),
    },
  ], [router])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Solicitudes</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {solicitudes.length === 1 ? '1 solicitud registrada' : `${solicitudes.length} solicitudes registradas`}
          </p>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={solicitudes}
        tableId="solicitudes-compras-v3"
        searchPlaceholder="Buscar por ítem, empresa, cliente..."
        customToolbarActions={
          <SolicitudModal
            onSuccess={() => router.refresh()}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Solicitud
              </Button>
            }
          />
        }
      />
    </div>
  )
}

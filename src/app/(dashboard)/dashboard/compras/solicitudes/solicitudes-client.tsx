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
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ClipboardList, Eye, Plus } from 'lucide-react'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import type { PermisosPantalla } from '@/lib/permisos'
import type { SolicitudRow } from '@/lib/types/cotizaciones'
import { labelEstadoSolicitud } from '@/lib/constants/cotizaciones'
import { SolicitudModal } from '@/components/compras/solicitud-modal'
import { formatCurrency } from '@/lib/utils/format'

export function SolicitudesClient({ solicitudes, permisos }: { solicitudes: SolicitudRow[]; permisos?: PermisosPantalla }) {
  const puedeAgregar = permisos?.agregar !== false
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
        <span>{row.original.itemDescripcion}</span>
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
        <span className={row.original.scope === 'POR_PROYECTO' ? UI_THEME.badge.info : UI_THEME.badge.inactive}>
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
          1: UI_THEME.badge.warning,
          2: UI_THEME.badge.active,
          3: UI_THEME.badge.danger,
        }
        return (
          <span className={cfg[e] ?? UI_THEME.badge.inactive}>
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
      <PageHeader
        icon={ClipboardList}
        title="Solicitudes"
        subtitle={solicitudes.length === 1 ? '1 solicitud registrada' : `${solicitudes.length} solicitudes registradas`}
        accent={MODULE_ACCENT.solicitudes}
        actions={puedeAgregar ? (
          <SolicitudModal
            onSuccess={() => router.refresh()}
            trigger={<Button className="gap-2"><Plus className="w-4 h-4" />Nueva Solicitud</Button>}
          />
        ) : null}
      />
      <DataTable
        columns={columns}
        data={solicitudes}
        tableId="solicitudes-compras-v3"
        searchPlaceholder="Buscar por item, empresa, cliente..."
        rowAccent={MODULE_ACCENT.solicitudes.row}
      />
    </div>
  )
}

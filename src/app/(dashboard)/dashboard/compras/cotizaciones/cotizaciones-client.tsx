'use client'
/**
 * cotizaciones-client.tsx
 *
 * Client component para la pantalla CRUD de Cotizaciones.
 * Sigue el patrón gold standard de categorias-client.tsx.
 *
 * Columnas: id, empresa, item, proveedor, fecha, cantidad, total,
 *           costoUnitario, vigente (badge), actions
 */
import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { FileText, Plus, Eye, CheckCircle2 } from 'lucide-react'
import { CotizacionModal } from '@/components/compras/cotizacion-modal'
import { UI_THEME } from '@/lib/theme'
import type { CotizacionRow } from '@/lib/types/cotizaciones'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface CotizacionesClientProps {
  cotizaciones: CotizacionRow[]
}

export function CotizacionesClient({ cotizaciones }: CotizacionesClientProps) {
  const router = useRouter()

  const columns: ColumnDef<CotizacionRow>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'empresaNombre',
      header: 'Empresa',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.empresaNombre ?? `Empresa ${row.original.empresaId}`}
        </span>
      ),
    },
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.fecha)}</span>
      ),
    },
    {
      id: 'item',
      accessorFn: (row) => row.itemDescripcion,
      header: 'Ítem',
      cell: ({ row }) => (
        <div className="max-w-[220px]">
          <span className="font-medium text-sm block truncate">{row.original.itemDescripcion}</span>
          {row.original.itemUnidadMedida && (
            <span className="text-xs text-muted-foreground">{row.original.itemUnidadMedida}</span>
          )}
        </div>
      ),
    },
    {
      id: 'proveedor',
      accessorFn: (row) => row.proveedorNombre,
      header: 'Proveedor',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.proveedorNombre}</span>
      ),
    },
    {
      accessorKey: 'cantidad',
      header: 'Cantidad',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="text-sm font-mono tabular-nums">
          {formatCurrency(row.original.cantidad, 2)}
        </span>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="text-sm font-mono tabular-nums">
          {formatCurrency(row.original.total, 2)}
        </span>
      ),
    },
    {
      id: 'costoUnitario',
      accessorFn: (row) => row.costoUnitario,
      header: 'Costo Unit.',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className={`text-sm font-mono tabular-nums font-medium ${row.original.vigente === 1 ? 'text-emerald-700' : ''}`}>
          {formatCurrency(row.original.costoUnitario, 4)}
        </span>
      ),
    },
    {
      id: 'vigente',
      accessorFn: (row) => row.vigente === 1 ? 'Vigente' : 'No Vigente',
      header: 'Vigente',
      meta: { align: 'center' },
      cell: ({ row }) =>
        row.original.vigente === 1 ? (
          <span className={UI_THEME.badge.active}>
            <CheckCircle2 className="h-3 w-3 mr-0.5" />
            Vigente
          </span>
        ) : (
          <span className={UI_THEME.badge.inactive}>No Vigente</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <CotizacionModal
          cotizacion={row.original}
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
        icon={FileText}
        title="Cotizaciones"
        subtitle={
          cotizaciones.length === 1
            ? '1 cotización registrada'
            : `${cotizaciones.length} cotizaciones registradas`
        }
      />
      <DataTable
        columns={columns}
        data={cotizaciones}
        tableId="cotizaciones-v2"
        searchPlaceholder="Buscar por empresa, ítem, proveedor..."
        customToolbarActions={
          <CotizacionModal
            onSuccess={() => router.refresh()}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Cotización
              </Button>
            }
          />
        }
      />
    </div>
  )
}

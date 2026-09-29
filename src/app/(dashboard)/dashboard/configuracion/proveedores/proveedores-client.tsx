'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Truck, Plus, Eye } from 'lucide-react'
import { ProveedorModal } from '@/components/proveedores/proveedor-modal'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import type { ProveedorRow } from '@/lib/types/proveedores'

export function ProveedoresClient({ data }: { data: ProveedorRow[] }) {
  const columns: ColumnDef<ProveedorRow>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        id: 'empresa',
        accessorFn: (row) => row.empresaNombre ?? String(row.empresaId),
        header: 'Empresa',
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.empresaNombre ?? row.original.empresaId}
          </span>
        ),
      },
      {
        accessorKey: 'nit',
        header: 'NIT',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.nit}</span>
        ),
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.nombre}</span>
        ),
      },
      {
        accessorKey: 'contacto',
        header: 'Contacto',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.contacto ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'telefono',
        header: 'Teléfono',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.telefono ?? '—'}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <ProveedorModal
            proveedor={row.original}
            trigger={
              <button className={UI_THEME.action.viewButton}>
                <Eye className="h-4 w-4 text-blue-600" />
              </button>
            }
          />
        ),
      },
    ],
    []
  )

  const toolbarActions = (
    <ProveedorModal
      trigger={
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </Button>
      }
    />
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title="Proveedores"
        subtitle={data.length === 1 ? '1 proveedor registrado' : `${data.length} proveedores registrados`}
      />

      <DataTable
        columns={columns}
        data={data}
        tableId="proveedores-v1"
        searchPlaceholder="Buscar en todos los campos..."
        customToolbarActions={toolbarActions}
      />
    </div>
  )
}

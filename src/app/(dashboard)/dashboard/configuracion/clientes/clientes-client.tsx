'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { UserRound, Plus, Eye } from 'lucide-react'
import { ClienteModal } from '@/components/clientes/cliente-modal'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import type { ClienteRow } from '@/lib/types/clientes'

export function ClientesClient({ data }: { data: ClienteRow[] }) {
  const columns: ColumnDef<ClienteRow>[] = useMemo(
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
        accessorKey: 'razonSocial',
        header: 'Nombre',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.razonSocial}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <ClienteModal
            cliente={row.original}
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
    <ClienteModal
      trigger={
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </Button>
      }
    />
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserRound}
        title="Clientes"
        subtitle={data.length === 1 ? '1 cliente registrado' : `${data.length} clientes registrados`}
      />

      <DataTable
        columns={columns}
        data={data}
        tableId="clientes-v3"
        searchPlaceholder="Buscar en todos los campos..."
        customToolbarActions={toolbarActions}
      />
    </div>
  )
}

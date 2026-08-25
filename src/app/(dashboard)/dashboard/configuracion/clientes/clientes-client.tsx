'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Building2, Plus } from 'lucide-react'
import { ClienteModal } from '@/components/clientes/cliente-modal'
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
              <button className="p-2 hover:bg-slate-100 rounded-md transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Building2 className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.length === 1
              ? '1 cliente registrado'
              : `${data.length} clientes registrados`}
          </p>
        </div>
      </div>

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

'use client'

import { useMemo } from 'react'
import { EmpresaRow } from '@/lib/types/empresas'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Eye, Plus } from 'lucide-react'
import { EmpresaModal } from './empresa-modal'
import { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'

interface EmpresasTableProps {
  data: EmpresaRow[]
}

export function EmpresasTable({ data }: EmpresasTableProps) {
  const router = useRouter()

  const columns: ColumnDef<EmpresaRow, unknown>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'nombre',
      header: 'Empresa',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nombre}</span>
      ),
    },
    {
      accessorKey: 'razonSocial',
      header: 'Razón Social',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.razonSocial || '—'}</span>
      ),
    },
    {
      accessorKey: 'nit',
      header: 'NIT',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.nit || '—'}</span>
      ),
    },
    {
      accessorKey: 'codigoErp',
      header: 'Código ERP',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.codigoErp || 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <EmpresaModal
            empresa={row.original}
            onSuccess={() => router.refresh()}
            trigger={
              <button className="p-2 hover:bg-slate-100 rounded-md transition-colors h-8 w-8 inline-flex items-center justify-center">
                <Eye className="h-4 w-4 text-blue-600" />
              </button>
            }
          />
        </div>
      ),
    },
  ], [router])

  return (
    <DataTable
      tableId="empresas-table"
      data={data}
      columns={columns}
      searchPlaceholder="Buscar empresa..."
      customToolbarActions={
        <EmpresaModal
          onSuccess={() => router.refresh()}
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva Empresa
            </Button>
          }
        />
      }
    />
  )
}

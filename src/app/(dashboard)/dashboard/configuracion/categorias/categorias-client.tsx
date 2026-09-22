'use client'
import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Tags, Plus, Eye } from 'lucide-react'
import { CategoriaModal } from '@/components/categorias/categoria-modal'
import { UI_THEME } from '@/lib/theme'
import type { CategoriaRow } from '@/lib/types/categorias'

export function CategoriasClient({ data }: { data: CategoriaRow[] }) {
  const router = useRouter()

  const columns: ColumnDef<CategoriaRow>[] = useMemo(() => [
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
        <span className="text-muted-foreground">{row.original.empresaNombre ?? row.original.empresaId}</span>
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
      accessorKey: 'prioridad',
      header: 'Prioridad',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const p = row.original.prioridad
        return p > 0 ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
            {p}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <CategoriaModal
          categoria={row.original}
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
        icon={Tags}
        title="Categorias"
        subtitle={data.length === 1 ? '1 categoría registrada' : `${data.length} categorías registradas`}
      />
      <DataTable
        columns={columns}
        data={data}
        tableId="categorias-v3"
        searchPlaceholder="Buscar por nombre..."
        customToolbarActions={
          <CategoriaModal
            onSuccess={() => router.refresh()}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Categoría
              </Button>
            }
          />
        }
      />
    </div>
  )
}

'use client'
import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Tags, Plus, Eye } from 'lucide-react'
import { CategoriaModal } from '@/components/categorias/categoria-modal'
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
            <button className="p-2 hover:bg-slate-100 rounded-md transition-colors">
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
            <Tags className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.length === 1 ? '1 categoría registrada' : `${data.length} categorías registradas`}
          </p>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        tableId="categorias-crud"
        searchPlaceholder="Buscar por nombre..."
        searchKey="nombre"
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

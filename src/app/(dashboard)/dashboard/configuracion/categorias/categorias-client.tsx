'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tags, Plus, Eye } from 'lucide-react'
import { CategoriaModal } from '@/components/categorias/categoria-modal'
import type { CategoriaRow } from '@/lib/types/categorias'

export function CategoriasClient({ data }: { data: CategoriaRow[] }) {
  const columns: ColumnDef<CategoriaRow>[] = useMemo(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Código',
        cell: ({ row }) => <span className="font-medium">{row.original.codigo}</span>,
      },
      {
        accessorKey: 'empresa',
        header: 'Empresa',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.empresaNombre || row.original.empresa}</span>,
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      },
      {
        accessorKey: 'activo',
        header: 'Estado',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const activo = row.original.activo
          return (
            <Badge
              variant={activo ? 'default' : 'secondary'}
              className={
                activo
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                  : 'bg-muted text-muted-foreground'
              }
            >
              {activo ? 'Activo' : 'Inactivo'}
            </Badge>
          )
        },
      },

      {
        id: 'acciones',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <CategoriaModal
            categoria={row.original}
            trigger={
              <button className="p-2 hover:bg-slate-100 rounded-md transition-colors">
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
    <CategoriaModal
      trigger={
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2">
          <Plus className="w-4 h-4" /> Nueva Categoría
        </button>
      }
    />
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Tags className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.length === 1
              ? '1 categoría registrada'
              : `${data.length} categorías registradas`}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        tableId="categorias-crud"
        searchPlaceholder="Buscar por nombre..."
        searchKey="nombre"
        customToolbarActions={toolbarActions}
      />
    </div>
  )
}

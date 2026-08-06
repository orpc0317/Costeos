'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Box, Plus, Eye } from 'lucide-react'
import { ItemModal } from '@/components/items/item-modal'
import { ItemAcciones } from '@/components/items/item-acciones'
import type { ItemRow } from '@/lib/types/items'
import type { CategoriaRow } from '@/lib/types/categorias'

export function ItemsClient({ data, categorias }: { data: ItemRow[], categorias: CategoriaRow[] }) {
  const columns: ColumnDef<ItemRow>[] = useMemo(
    () => [

      {
        accessorKey: 'empresa',
        header: 'Empresa',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.empresaNombre || row.original.empresa}</span>,
      },
      {
        accessorKey: 'descripcion',
        header: 'Descripción',
        cell: ({ row }) => <span className="font-medium">{row.original.descripcion}</span>,
      },
      {
        accessorKey: 'categoriaId',
        header: 'Categoría',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.categoria?.nombre || row.original.categoriaId}</span>,
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
          <ItemAcciones
            item={row.original}
            categorias={categorias}
          />
        ),
      },
    ],
    [categorias]
  )

  const toolbarActions = (
    <ItemModal
      categorias={categorias}
      trigger={
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2">
          <Plus className="w-4 h-4" /> Nuevo Ítem
        </button>
      }
    />
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Box className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Ítems</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.length === 1
              ? '1 ítem registrado'
              : `${data.length} ítems registrados`}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        tableId="items-crud"
        searchPlaceholder="Buscar por descripción..."
        searchKey="descripcion"
        customToolbarActions={toolbarActions}
      />
    </div>
  )
}

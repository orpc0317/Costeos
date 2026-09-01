'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Plus } from 'lucide-react'
import { ItemModal } from '@/components/items/item-modal'
import type { ItemRow } from '@/lib/types/items'
import type { CategoriaRow } from '@/lib/types/categorias'

export function ItemsClient({ data, categorias }: { data: ItemRow[], categorias: CategoriaRow[] }) {
  const columns: ColumnDef<ItemRow>[] = useMemo(
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
          <span className="font-medium">{row.original.empresaNombre ?? row.original.empresaId}</span>
        ),
      },
      {
        accessorKey: 'descripcion',
        header: 'Descripción',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.descripcion}</span>
        ),
      },
      {
        id: 'categoria',
        accessorFn: (row) => row.categoria?.nombre ?? String(row.categoriaId),
        header: 'Categoría',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.categoria?.nombre ?? row.original.categoriaId}
          </span>
        ),
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
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <ItemModal
            item={row.original}
            categorias={categorias}
            todosItems={data}
            trigger={
              <button className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 bg-blue-50/50 hover:bg-blue-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            }
          />
        ),
      },
    ],
    [categorias]
  )

  const toolbarActions = (
    <ItemModal
      categorias={categorias}
      todosItems={data}
      trigger={
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Ítem
        </Button>
      }
    />
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Package className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Items</h1>
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
        tableId="items-v4"
        searchPlaceholder="Buscar en todos los campos..."
        customToolbarActions={toolbarActions}
      />
    </div>
  )
}

'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Plus, Eye } from 'lucide-react'
import { ItemModal } from '@/components/items/item-modal'
import type { ItemRow } from '@/lib/types/items'
import type { CategoriaRow } from '@/lib/types/categorias'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'

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
              className={activo ? UI_THEME.badge.active : UI_THEME.badge.inactive}
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
              <button className={UI_THEME.action.viewButton}>
                <Eye className="h-4 w-4 text-blue-600" />
              </button>
            }
          />
        ),
      },
    ],
    [categorias]
  )

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <ItemModal
        categorias={categorias}
        todosItems={data}
        trigger={
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Ítem
          </Button>
        }
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Items"
        subtitle={data.length === 1 ? '1 ítem registrado' : `${data.length} ítems registrados`}
      />

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

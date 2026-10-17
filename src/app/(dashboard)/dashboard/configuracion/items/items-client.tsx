'use client'

import React, { useMemo, useState, useEffect } from 'react'
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
import { listarItems } from '@/app/actions/items'
import { useDebounce } from '@/hooks/use-debounce'

interface Props {
  initialData: ItemRow[]
  categorias: CategoriaRow[]
}

const LIMIT_INICIAL = 50
const LIMIT_BUSQUEDA = 150

export function ItemsClient({ initialData, categorias }: Props) {
  const [data, setData]         = useState<ItemRow[]>(initialData)
  const [allItems, setAllItems] = useState<ItemRow[]>(initialData) // sin paginación, para el modal
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]   = useState(false)

  const debouncedQuery = useDebounce(searchQuery, 400)

  // Carga inicial sin límite — para los selectores del modal y el árbol de combos
  useEffect(() => {
    listarItems().then(setAllItems)
  }, [])

  useEffect(() => {
    // No lanzar query con un solo carácter (demasiado amplio)
    if (debouncedQuery.length === 1) return

    let cancelled = false
    setLoading(true)

    listarItems({
      search: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      limit:  debouncedQuery.length >= 2 ? LIMIT_BUSQUEDA : LIMIT_INICIAL,
    })
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedQuery])

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
          <span>{row.original.empresaNombre ?? row.original.empresaId}</span>
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
            todosItems={allItems}
            trigger={
              <button className={UI_THEME.action.viewButton}>
                <Eye className="h-4 w-4 text-blue-600" />
              </button>
            }
          />
        ),
      },
    ],
    [categorias, data]
  )

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `Últimos ${data.length} ítems`

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
        subtitle={subtitulo}
      />

      <DataTable
        columns={columns}
        data={data}
        tableId="items-v4"
        searchPlaceholder="Buscar por nombre o código ERP..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        customToolbarActions={toolbarActions}
      />
    </div>
  )
}

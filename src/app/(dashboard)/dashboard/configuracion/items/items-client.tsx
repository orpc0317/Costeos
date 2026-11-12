'use client'

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
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
import { MODULE_ACCENT } from '@/lib/ui-accent'
import type { PermisosPantalla } from '@/lib/permisos'
import { listarItems } from '@/app/actions/items'
import { useDebounce } from '@/hooks/use-debounce'
import { reemplazarFila } from '@/hooks/use-registro-fresco'

interface Props {
  initialData: ItemRow[]
  categorias: CategoriaRow[]
  permisos?: PermisosPantalla
}

const LIMIT_INICIAL = 50
const LIMIT_BUSQUEDA = 150

export function ItemsClient({ initialData, categorias, permisos }: Props) {
  const puedeAgregar = permisos?.agregar !== false
  const [data, setData]         = useState<ItemRow[]>(initialData)
  const [allItems, setAllItems] = useState<ItemRow[]>(initialData) // sin paginación, para el modal
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]   = useState(false)

  const debouncedQuery = useDebounce(searchQuery, 400)

  const recargar = useCallback(async () => {
    const busqueda = debouncedQuery.length >= 2
    const [lista, todos] = await Promise.all([
      listarItems({
        search: busqueda ? debouncedQuery : undefined,
        limit: busqueda ? LIMIT_BUSQUEDA : LIMIT_INICIAL,
      }),
      listarItems(),
    ])
    setData(lista)
    setAllItems(todos)
  }, [debouncedQuery])

  const allItemsRef = useRef(allItems)
  allItemsRef.current = allItems

  const pendientesRef = useRef<ItemRow[]>([])

  const guardarEnMemoria = useCallback((saved: ItemRow) => {
    pendientesRef.current = [
      ...pendientesRef.current.filter(row => row.id !== saved.id),
      saved,
    ]
  }, [])

  const aplicarPendientes = useCallback(() => {
    const saved = pendientesRef.current
    if (saved.length === 0) return
    pendientesRef.current = []
    const merge = (row: ItemRow): ItemRow => {
      const nuevo = saved.find(item => item.id === row.id)
      if (!nuevo) return row
      return {
        ...row,
        ...nuevo,
        empresaNombre: row.empresaNombre,
        categoria: row.categoria,
        tipoComboNombre: row.tipoComboNombre,
        costoReferenciaDescripcion: row.costoReferenciaDescripcion,
      }
    }
    setData(prev => prev.map(merge))
    setAllItems(prev => prev.map(merge))
  }, [])

  const aplicarRef = useRef(aplicarPendientes)
  aplicarRef.current = aplicarPendientes
  const guardarRef = useRef(guardarEnMemoria)
  guardarRef.current = guardarEnMemoria

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
        header: 'Descripcion',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.descripcion}</span>
        ),
      },
      {
        id: 'categoria',
        accessorFn: (row) => row.categoria?.nombre ?? String(row.categoriaId),
        header: 'Categoria',
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
            todosItems={allItemsRef.current}
            onSaved={(saved) => guardarRef.current(saved)}
            onClosed={() => aplicarRef.current()}
            onActualizado={(rowActual) => {
              setData((prev) => reemplazarFila(prev, rowActual))
              setAllItems((prev) => {
                const next = reemplazarFila(prev, rowActual)
                if (!rowActual.costoReferenciaItemId || !rowActual.costoReferenciaDescripcion) return next
                return next.map((fila) => fila.id === rowActual.costoReferenciaItemId
                  ? { ...fila, descripcion: rowActual.costoReferenciaDescripcion! }
                  : fila)
              })
            }}
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

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `Últimos ${data.length} ítems`

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <ItemModal
        categorias={categorias}
        todosItems={allItems}
        onSaved={() => { void recargar() }}
        trigger={
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Ítem
          </Button>
        }
      />
    </div>
  )

  return (
    <div className={UI_THEME.page.listShell}>
      <div className={UI_THEME.page.listHeader}>
        <PageHeader
          icon={Package}
          title="Items"
          subtitle={subtitulo}
          accent={MODULE_ACCENT.items}
          actions={puedeAgregar ? toolbarActions : null}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        tableId="items-v4"
        searchPlaceholder="Buscar por nombre o código ERP..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        rowAccent={MODULE_ACCENT.items.row}
      />
    </div>
  )
}

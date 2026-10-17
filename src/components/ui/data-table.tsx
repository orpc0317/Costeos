'use client'

import React, { useState, useEffect } from 'react'
import {
  ColumnFilterPopover,
  columnFilterFn,
  type ColumnFilterValue,
} from '@/components/ui/column-filter-popover'
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  Header,
} from '@tanstack/react-table'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Settings2, Download, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { UI_THEME } from '@/lib/theme'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  tableId: string
  searchPlaceholder?: string
  searchKey?: string
  customToolbarActions?: React.ReactNode
  /** Cuando true, el filtrado interno de TanStack se deshabilita y la búsqueda es controlada por el padre. */
  isServerSearch?: boolean
  /** Valor controlado del input de búsqueda (solo cuando isServerSearch=true). */
  searchValue?: string
  /** Callback cuando el usuario escribe en el input (solo cuando isServerSearch=true). */
  onSearchChange?: (value: string) => void
  /** Muestra un overlay de carga sobre la tabla mientras se consulta el servidor. */
  loading?: boolean
  /** Número de registros por página. Default: 25. */
  pageSize?: number
}

// Icono de dirección de ordenamiento
function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (direction === 'asc')  return <ArrowUp   className="h-3 w-3 text-indigo-500 shrink-0" />
  if (direction === 'desc') return <ArrowDown  className="h-3 w-3 text-indigo-500 shrink-0" />
  return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
}

// Componente para renderizar la cabecera arrastrable con sort y filtro por columna
function DraggableTableHead({
  header,
  allRows,
}: {
  header: Header<any, unknown>
  allRows: any[]
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: header.column.id,
      disabled: header.column.id === 'id' || header.column.id === 'actions' || header.column.id === 'acciones'
    })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? ('relative' as const) : undefined,
  }

  const align = (header.column.columnDef.meta as any)?.align || 'left'
  const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

  const isActionCol = header.column.id === 'id' || header.column.id === 'actions' || header.column.id === 'acciones'
  const canSort   = !isActionCol && header.column.getCanSort()
  const canFilter = !isActionCol && header.column.getCanFilter()

  // Valores únicos para el panel de filtro (calculados sobre TODOS los datos, no solo la página actual)
  const uniqueValues = React.useMemo(() => {
    if (!canFilter) return []
    const vals = new Set<string>()
    allRows.forEach(row => {
      const colDef = header.column.columnDef as any
      let raw: any
      if (typeof colDef.accessorFn === 'function') {
        raw = colDef.accessorFn(row.original ?? row, 0)
      } else if (colDef.accessorKey) {
        raw = (row.original ?? row)[colDef.accessorKey]
      }
      if (raw !== undefined && raw !== null && raw !== '') {
        vals.add(String(raw))
      }
    })
    return Array.from(vals).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  }, [allRows, canFilter, header.column])

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`group ${UI_THEME.table.headerBg} relative ${alignClass}`}
    >
      <div className={`flex items-center gap-1 w-full h-full py-1 ${justifyClass}`}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={`flex items-center gap-1.5 flex-1 min-w-0 select-none ${
            isActionCol ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
          title={isActionCol ? '' : 'Arrastrar para reordenar'}
        >
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </div>

        {/* Botón de ordenamiento — siempre visible */}
        {canSort && (
          <button
            type="button"
            onClick={header.column.getToggleSortingHandler()}
            className="shrink-0 rounded p-0.5 hover:bg-accent transition-colors"
            title={
              header.column.getIsSorted() === 'asc'  ? 'Ordenado A→Z (clic para invertir)' :
              header.column.getIsSorted() === 'desc' ? 'Ordenado Z→A (clic para quitar)' :
              'Clic para ordenar'
            }
          >
            <SortIcon direction={header.column.getIsSorted()} />
          </button>
        )}

        {/* Panel de filtro estilo Excel — siempre visible */}
        {canFilter && (
          <ColumnFilterPopover
            uniqueValues={uniqueValues}
            filterValue={header.column.getFilterValue() as ColumnFilterValue}
            onChange={val => header.column.setFilterValue(val)}
          />
        )}
      </div>
    </TableHead>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  tableId,
  searchPlaceholder = 'Buscar...',
  searchKey,
  customToolbarActions,
  isServerSearch = false,
  searchValue,
  onSearchChange,
  loading = false,
  pageSize = 25,
}: DataTableProps<TData, TValue>) {
  const [isMounted, setIsMounted] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize })
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    setIsMounted(true)
    const savedVisibility = localStorage.getItem(`${tableId}-visibility`)
    const savedOrder = localStorage.getItem(`${tableId}-order`)

    let initialOrder: string[] = []

    if (savedVisibility) {
      try { setColumnVisibility(JSON.parse(savedVisibility)) } catch (e) {}
    }
    
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder)
        const currentColIds = columns.map(c => (c as any).id || (c as any).accessorKey)
        const validOrder = order.filter((id: string) => currentColIds.includes(id))
        if (validOrder.length > 0) {
          initialOrder = validOrder
        }
      } catch (e) {}
    } 
    
    if (initialOrder.length === 0) {
      initialOrder = columns.map((c: any) => c.id ?? c.accessorKey as string)
    }

    // Fuerza a que 'id' sea SIEMPRE el primero y 'actions' el último
    const currentColIds = columns.map((c: any) => c.id ?? (c.accessorKey as string))
    const withoutIdAndActions = initialOrder.filter(
      x => x !== 'id' && x !== 'actions' && x !== 'acciones'
    )
    // Columnas que existen ahora pero no estaban en el orden guardado
    // (ej. columnas nuevas agregadas después de que el usuario guardó preferencias)
    const missingMiddleCols = currentColIds.filter(
      id => id !== 'id' && id !== 'actions' && id !== 'acciones' && !withoutIdAndActions.includes(id)
    )

    const finalOrder: string[] = []
    if (currentColIds.includes('id')) finalOrder.push('id')
    finalOrder.push(...withoutIdAndActions, ...missingMiddleCols)
    if (currentColIds.includes('actions'))  finalOrder.push('actions')
    else if (currentColIds.includes('acciones')) finalOrder.push('acciones')

    setColumnOrder(finalOrder)
  }, [tableId, columns])

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(`${tableId}-visibility`, JSON.stringify(columnVisibility))
      localStorage.setItem(`${tableId}-order`, JSON.stringify(columnOrder))
    }
  }, [columnVisibility, columnOrder, tableId, isMounted])

  // Cuando el servidor devuelve nueva data (searchText cambió) → pizarrón limpio:
  // resetear página, filtros de columna y ordenamiento para no confundir al usuario
  // con filtros del set anterior aplicados sobre data completamente diferente.
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    setColumnFilters([])
    setSorting([])
  }, [data])

  // Cuando el usuario filtra en local (búsqueda global), también resetear página
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [globalFilter, searchKey])

  // Cuando cambian filtros de columna o sorting, volver a página 1
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [columnFilters, sorting])

  const table = useReactTable({
    data,
    columns,
    // Cuando isServerSearch=true, el servidor ya filtró la búsqueda global.
    // globalFilter queda vacío para no filtrar dos veces. Los filtros de columna
    // siguen en el cliente: manualFiltering los apagaría también.
    defaultColumn: { filterFn: 'columnFilter' },
    state: {
      columnVisibility,
      columnOrder,
      globalFilter: isServerSearch ? '' : globalFilter,
      pagination,
      sorting,
      columnFilters,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Función de filtro registrada para columnas: soporta modo lista y modo avanzado
    filterFns: { columnFilter: columnFilterFn },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requiere mover 5px para activar el drag (evita drags accidentales al hacer clic)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id && over?.id) {
      if (active.id === 'id' || over.id === 'id') return
      if (active.id === 'actions' || over.id === 'actions' || active.id === 'acciones' || over.id === 'acciones') return

      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over?.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const exportToCSV = () => {
    const visibleColumns = table.getVisibleLeafColumns()
    // Filtramos columnas de acciones u otras que no tengan sentido exportar
    const exportableColumns = visibleColumns.filter((c) => c.id !== 'acciones')

    const headers = exportableColumns.map((c) => {
      const headerStr = typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id
      return `"${headerStr.replace(/"/g, '""')}"`
    })

    const rows = table.getRowModel().rows.map((row) => {
      return exportableColumns.map((column) => {
        let val = row.getValue(column.id)
        
        if (typeof val === 'boolean') {
          val = val ? 'Activo/Sí' : 'Inactivo/No'
        } else if (val === null || val === undefined) {
          val = ''
        } else if (val instanceof Date) {
          val = val.toLocaleDateString()
        }
        
        const strVal = String(val).replace(/"/g, '""')
        return `"${strVal}"`
      }).join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    // Agregamos BOM para que Excel reconozca correctamente los acentos (UTF-8)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${tableId}-export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isMounted) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm w-full">
            {loading ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            )}
            <Input
              placeholder={searchPlaceholder}
              value={
                isServerSearch
                  ? (searchValue ?? '')
                  : searchKey !== undefined
                  ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
                  : globalFilter ?? ''
              }
              onChange={(event) => {
                if (isServerSearch) {
                  onSearchChange?.(event.target.value)
                } else if (searchKey !== undefined) {
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                } else {
                  setGlobalFilter(String(event.target.value))
                }
              }}
              className="pl-9 w-[300px]"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {customToolbarActions}
          
          <Button variant="outline" size="icon" onClick={exportToCSV} title="Exportar a CSV">
            <Download className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger 
              render={
                <Button variant="outline" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Mostrar/Ocultar Columnas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {table.getAllLeafColumns().map((column) => {
                    if (!column.getCanHide() || column.id === 'id' || column.id === 'actions' || column.id === 'acciones') return null
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {typeof column.columnDef.header === 'string'
                          ? column.columnDef.header
                          : column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </div>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={UI_THEME.table.container}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader className={UI_THEME.table.headerBg}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className={`${UI_THEME.table.border} hover:bg-transparent`}>
                  <SortableContext
                    items={columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <DraggableTableHead
                        key={header.id}
                        header={header}
                        allRows={table.getCoreRowModel().rows}
                      />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`${UI_THEME.table.rowHover} ${UI_THEME.table.border}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id}
                        className={
                          (cell.column.columnDef.meta as any)?.align === 'center'
                            ? 'text-center'
                            : (cell.column.columnDef.meta as any)?.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className={UI_THEME.table.emptyState}
                  >
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length === 0
            ? 'Sin resultados'
            : (() => {
                const total = table.getFilteredRowModel().rows.length
                const from  = pagination.pageIndex * pagination.pageSize + 1
                const to    = Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)
                return `${from}–${to} de ${total} registro${total !== 1 ? 's' : ''}`
              })()}
        </p>

        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums px-1">
              {pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

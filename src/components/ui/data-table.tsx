'use client'

import React, { useState, useEffect } from 'react'
import {
  ColumnDef,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
import { Search, Settings2, Download } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'

// ==========================================
// CONFIGURACIÓN CENTRALIZADA DE ESTILOS (THEMING)
// ==========================================
export const TABLE_THEME = {
  headerBg: 'bg-slate-100',
  headerTextColor: 'text-slate-700',
  headerFont: 'font-semibold text-sm',
  rowTextColor: 'text-slate-600',
  rowFont: 'font-normal text-sm',
  rowHoverBg: 'hover:bg-slate-50',
  borderColor: 'border-slate-200',
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  tableId: string
  searchPlaceholder?: string
  searchKey?: string
  customToolbarActions?: React.ReactNode
}

// Componente para renderizar la cabecera arrastrable
function DraggableTableHead({ header }: { header: Header<any, unknown> }) {
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

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`${TABLE_THEME.headerTextColor} ${TABLE_THEME.headerFont} group bg-slate-100 relative ${alignClass}`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`flex items-center gap-2 select-none w-full h-full py-1 ${justifyClass} ${
          header.column.id === 'id' || header.column.id === 'actions' || header.column.id === 'acciones' 
            ? 'cursor-default' 
            : 'cursor-grab active:cursor-grabbing'
        }`}
        title={header.column.id === 'id' || header.column.id === 'actions' || header.column.id === 'acciones' ? '' : 'Arrastrar para reordenar'}
      >
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
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
}: DataTableProps<TData, TValue>) {
  const [isMounted, setIsMounted] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [globalFilter, setGlobalFilter] = useState('')

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

  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      columnOrder,
      globalFilter,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchKey !== undefined ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? '' : globalFilter ?? ''}
              onChange={(event) => {
                if (searchKey !== undefined) {
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

      <div className={`rounded-md border ${TABLE_THEME.borderColor} bg-white overflow-hidden`}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader className={TABLE_THEME.headerBg}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className={`${TABLE_THEME.borderColor} hover:bg-transparent`}>
                  <SortableContext
                    items={columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <DraggableTableHead key={header.id} header={header} />
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
                    className={`${TABLE_THEME.rowHoverBg} ${TABLE_THEME.borderColor}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id}
                        className={`${TABLE_THEME.rowTextColor} ${TABLE_THEME.rowFont} ${
                          (cell.column.columnDef.meta as any)?.align === 'center'
                            ? 'text-center'
                            : (cell.column.columnDef.meta as any)?.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }`}
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
                    className="h-24 text-center text-slate-500"
                  >
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  )
}

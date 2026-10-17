'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Truck, Plus, Eye } from 'lucide-react'
import { ProveedorModal } from '@/components/proveedores/proveedor-modal'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import type { ProveedorRow } from '@/lib/types/proveedores'
import { listarProveedores } from '@/app/actions/proveedores'
import { useDebounce } from '@/hooks/use-debounce'

interface Props { initialData: ProveedorRow[] }

const LIMIT_INICIAL  = 50
const LIMIT_BUSQUEDA = 150

export function ProveedoresClient({ initialData }: Props) {
  const [data, setData]               = useState<ProveedorRow[]>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]         = useState(false)
  const debouncedQuery                = useDebounce(searchQuery, 400)

  useEffect(() => { setData(initialData); setSearchQuery('') }, [initialData])

  useEffect(() => {
    if (debouncedQuery.length === 1) return
    let cancelled = false
    setLoading(true)
    listarProveedores({
      search: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      limit:  debouncedQuery.length >= 2 ? LIMIT_BUSQUEDA : LIMIT_INICIAL,
    })
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const columns: ColumnDef<ProveedorRow>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>,
    },
    {
      id: 'empresa',
      accessorFn: (row) => row.empresaNombre ?? String(row.empresaId),
      header: 'Empresa',
      cell: ({ row }) => row.original.empresaNombre ?? row.original.empresaId,
    },
    {
      accessorKey: 'nit',
      header: 'NIT',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.nit}</span>,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => row.original.nombre,
    },
    {
      accessorKey: 'contacto',
      header: 'Contacto',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.contacto ?? '—'}</span>,
    },
    {
      accessorKey: 'telefono',
      header: 'Teléfono',
      cell: ({ row }) => <span className="text-sm">{row.original.telefono ?? '—'}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <ProveedorModal
          proveedor={row.original}
          trigger={<button className={UI_THEME.action.viewButton}><Eye className="h-4 w-4 text-blue-600" /></button>}
        />
      ),
    },
  ], [])

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `Últimos ${data.length} proveedores`

  return (
    <div className="space-y-6">
      <PageHeader icon={Truck} title="Proveedores" subtitle={subtitulo} />
      <DataTable
        columns={columns}
        data={data}
        tableId="proveedores-v1"
        searchPlaceholder="Buscar por nombre o NIT..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        customToolbarActions={
          <ProveedorModal
            trigger={<Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Proveedor</Button>}
          />
        }
      />
    </div>
  )
}

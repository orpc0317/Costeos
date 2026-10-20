'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { UserRound, Plus, Eye } from 'lucide-react'
import { ClienteModal } from '@/components/clientes/cliente-modal'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import type { PermisosPantalla } from '@/lib/permisos'
import type { ClienteRow } from '@/lib/types/clientes'
import { listarClientes } from '@/app/actions/clientes'
import { useDebounce } from '@/hooks/use-debounce'

interface Props { initialData: ClienteRow[]; permisos?: PermisosPantalla }

const LIMIT_INICIAL  = 50
const LIMIT_BUSQUEDA = 150

export function ClientesClient({ initialData, permisos }: Props) {
  const puedeAgregar = permisos?.agregar !== false
  const [data, setData]               = useState<ClienteRow[]>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]         = useState(false)
  const debouncedQuery                = useDebounce(searchQuery, 400)

  // Sync cuando el servidor actualiza initialData (después de router.refresh())
  useEffect(() => { setData(initialData); setSearchQuery('') }, [initialData])

  useEffect(() => {
    if (debouncedQuery.length === 1) return
    let cancelled = false
    setLoading(true)
    listarClientes({
      search: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      limit:  debouncedQuery.length >= 2 ? LIMIT_BUSQUEDA : LIMIT_INICIAL,
    })
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const columns: ColumnDef<ClienteRow>[] = useMemo(() => [
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
      accessorKey: 'razonSocial',
      header: 'Nombre',
      cell: ({ row }) => row.original.razonSocial,
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <ClienteModal
          cliente={row.original}
          trigger={<button className={UI_THEME.action.viewButton}><Eye className="h-4 w-4 text-blue-600" /></button>}
        />
      ),
    },
  ], [])

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `Últimos ${data.length} clientes`

  return (
    <div className="space-y-6">
      <PageHeader icon={UserRound} title="Clientes" subtitle={subtitulo} accent={MODULE_ACCENT.clientes} actions={puedeAgregar ? <ClienteModal trigger={<Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Cliente</Button>} /> : null} />
      <DataTable
        columns={columns}
        data={data}
        tableId="clientes-v3"
        searchPlaceholder="Buscar por nombre o NIT..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        rowAccent={MODULE_ACCENT.clientes.row}
      />
    </div>
  )
}

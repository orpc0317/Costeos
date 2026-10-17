'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { TipoCosteoModal } from '@/components/tipos-costeo/tipo-costeo-modal'
import { Network, Plus, Eye } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'
import { listarTiposCosteo } from '@/app/actions/tipos-costeo'
import { useDebounce } from '@/hooks/use-debounce'
import { useRouter } from 'next/navigation'

interface Props { initialData: TipoCosteoRow[] }

export function TiposCosteoClient({ initialData }: Props) {
  const router = useRouter()
  const [data, setData]               = useState<TipoCosteoRow[]>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]         = useState(false)
  const debouncedQuery                = useDebounce(searchQuery, 400)

  useEffect(() => { setData(initialData); setSearchQuery('') }, [initialData])

  useEffect(() => {
    if (debouncedQuery.length === 1) return
    let cancelled = false
    setLoading(true)
    listarTiposCosteo({ search: debouncedQuery.length >= 2 ? debouncedQuery : undefined })
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const columns: ColumnDef<TipoCosteoRow>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'empresaNombre',
      header: 'Empresa',
      cell: ({ row }) => row.original.empresaNombre || `Empresa ${row.original.empresaId}`,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => row.original.nombre,
    },
    {
      accessorKey: 'lineaEtiqueta',
      header: 'Línea',
      meta: { align: 'center' },
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.lineaEtiqueta}</span>,
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const activo = row.original.activo
        return <Badge variant={activo ? 'default' : 'secondary'} className={activo ? UI_THEME.badge.active : UI_THEME.badge.inactive}>{activo ? 'Activo' : 'Inactivo'}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <TipoCosteoModal
          tipoCosteo={row.original}
          onSuccess={() => router.refresh()}
          trigger={<button className={UI_THEME.action.viewButton}><Eye className="h-4 w-4 text-blue-600" /></button>}
        />
      ),
    },
  ], [router])

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `${data.length} ${data.length === 1 ? 'tipo costeo registrado' : 'tipos costeos registrados'}`

  return (
    <div className="space-y-6">
      <PageHeader icon={Network} title="Tipos Costeos" subtitle={subtitulo} />
      <DataTable
        columns={columns}
        data={data}
        tableId="tipos-costeo-crud-v3"
        searchPlaceholder="Buscar por nombre..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        customToolbarActions={
          <TipoCosteoModal
            onSuccess={() => router.refresh()}
            trigger={<Button className="gap-2"><Plus className="w-4 h-4" />Nuevo Tipo</Button>}
          />
        }
      />
    </div>
  )
}

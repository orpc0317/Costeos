'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { TipoComboModal } from '@/components/tipos-combo/tipo-combo-modal'
import { Layers, Plus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import type { TipoComboRow } from '@/lib/types/tipos-combo'
import { listarTiposCombo } from '@/app/actions/tipos-combo'
import { useDebounce } from '@/hooks/use-debounce'

interface Props { initialData: TipoComboRow[] }

export function TiposComboClient({ initialData }: Props) {
  const [data, setData]               = useState<TipoComboRow[]>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]         = useState(false)
  const debouncedQuery                = useDebounce(searchQuery, 400)

  useEffect(() => { setData(initialData); setSearchQuery('') }, [initialData])

  useEffect(() => {
    if (debouncedQuery.length === 1) return
    let cancelled = false
    setLoading(true)
    listarTiposCombo({ search: debouncedQuery.length >= 2 ? debouncedQuery : undefined })
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const columns: ColumnDef<TipoComboRow>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>,
    },
    {
      id: 'empresa',
      accessorFn: (row) => row.empresaNombre,
      header: 'Empresa',
      cell: ({ row }) => row.original.empresaNombre,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => row.original.nombre,
    },
    {
      accessorKey: 'icono',
      header: 'Icono',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.icono ?? '—'}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <TipoComboModal
          tipoCombo={row.original}
          trigger={<button className={UI_THEME.action.viewButton} title="Ver / Editar"><Eye className="h-3.5 w-3.5 text-blue-600" /></button>}
        />
      ),
    },
  ], [])

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `${data.length} ${data.length === 1 ? 'tipo combo registrado' : 'tipos combo registrados'}`

  return (
    <div className="space-y-6">
      <PageHeader icon={Layers} title="Tipos Combo" subtitle={subtitulo} />
      <DataTable
        columns={columns}
        data={data}
        tableId="tipos-combo-crud-v1"
        searchPlaceholder="Buscar tipo combo..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        customToolbarActions={
          <TipoComboModal
            trigger={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuevo Tipo</Button>}
          />
        }
      />
    </div>
  )
}

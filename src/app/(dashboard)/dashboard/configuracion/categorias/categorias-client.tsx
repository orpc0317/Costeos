'use client'
import React, { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Tags, Plus, Eye } from 'lucide-react'
import { CategoriaModal } from '@/components/categorias/categoria-modal'
import { UI_THEME } from '@/lib/theme'
import type { CategoriaRow } from '@/lib/types/categorias'
import { listarCategorias } from '@/app/actions/categorias'
import { useDebounce } from '@/hooks/use-debounce'

interface Props { initialData: CategoriaRow[] }

export function CategoriasClient({ initialData }: Props) {
  const router                        = useRouter()
  const [data, setData]               = useState<CategoriaRow[]>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]         = useState(false)
  const debouncedQuery                = useDebounce(searchQuery, 400)

  useEffect(() => { setData(initialData); setSearchQuery('') }, [initialData])

  useEffect(() => {
    if (debouncedQuery.length === 1) return
    let cancelled = false
    setLoading(true)
    listarCategorias({ search: debouncedQuery.length >= 2 ? debouncedQuery : undefined })
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const columns: ColumnDef<CategoriaRow>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'empresaNombre',
      header: 'Empresa',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.empresaNombre ?? row.original.empresaId}</span>,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => row.original.nombre,
    },
    {
      accessorKey: 'prioridad',
      header: 'Prioridad',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const p = row.original.prioridad
        return p > 0
          ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{p}</span>
          : <span className="text-muted-foreground text-sm">—</span>
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <CategoriaModal
          categoria={row.original}
          onSuccess={() => router.refresh()}
          trigger={<button className={UI_THEME.action.viewButton}><Eye className="h-4 w-4 text-blue-600" /></button>}
        />
      ),
    },
  ], [router])

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `${data.length} ${data.length === 1 ? 'categoría registrada' : 'categorías registradas'}`

  return (
    <div className="space-y-6">
      <PageHeader icon={Tags} title="Categorias" subtitle={subtitulo} />
      <DataTable
        columns={columns}
        data={data}
        tableId="categorias-v3"
        searchPlaceholder="Buscar por nombre..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        customToolbarActions={
          <CategoriaModal
            onSuccess={() => router.refresh()}
            trigger={<Button className="gap-2"><Plus className="w-4 h-4" />Nueva Categoría</Button>}
          />
        }
      />
    </div>
  )
}

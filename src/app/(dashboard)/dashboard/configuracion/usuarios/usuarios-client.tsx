'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { UsuarioModal } from '@/components/usuarios/usuario-modal'
import { Users, Plus, Eye } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import type { PermisosPantalla } from '@/lib/permisos'
import { listarUsuarios } from '@/app/actions/usuarios'
import { useDebounce } from '@/hooks/use-debounce'
import { useRouter } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Usuario = any

const ROL_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ADMIN:    { label: 'Admin',    variant: 'default' },
  MANAGER:  { label: 'Manager',  variant: 'secondary' },
  ANALISTA: { label: 'Analista', variant: 'outline' },
  VIEWER:   { label: 'Viewer',   variant: 'outline' },
}

interface Props { initialData: Usuario[]; permisos?: PermisosPantalla }

export function UsuariosClient({ initialData, permisos }: Props) {
  const puedeAgregar = permisos?.agregar !== false
  const router = useRouter()
  const [data, setData]               = useState<Usuario[]>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]         = useState(false)
  const debouncedQuery                = useDebounce(searchQuery, 400)

  useEffect(() => { setData(initialData); setSearchQuery('') }, [initialData])

  useEffect(() => {
    if (debouncedQuery.length === 1) return
    let cancelled = false
    setLoading(true)
    listarUsuarios({ search: debouncedQuery.length >= 2 ? debouncedQuery : undefined })
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const columns: ColumnDef<Usuario>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => row.original.nombre,
    },
    {
      accessorKey: 'email',
      header: 'Correo electrónico',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: 'rol',
      header: 'Rol',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const rolConfig = ROL_LABELS[row.original.rol] ?? { label: row.original.rol, variant: 'outline' as const }
        return <Badge variant={rolConfig.variant}>{rolConfig.label}</Badge>
      },
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
        <UsuarioModal
          usuario={row.original}
          onSuccess={() => router.refresh()}
          trigger={<button className={UI_THEME.action.viewButton}><Eye className="h-4 w-4 text-blue-600" /></button>}
        />
      ),
    },
  ], [router])

  const subtitulo = debouncedQuery.length >= 2
    ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
    : `${data.length} ${data.length === 1 ? 'usuario registrado' : 'usuarios registrados'}`

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title="Usuarios" subtitle={subtitulo} accent={MODULE_ACCENT.usuarios} actions={puedeAgregar ? <UsuarioModal permisos={permisos} onSuccess={() => router.refresh()} trigger={<Button className="gap-2"><Plus className="w-4 h-4" />Nuevo Usuario</Button>} /> : null} />
      <DataTable
        columns={columns}
        data={data}
        tableId="usuarios-table"
        searchPlaceholder="Buscar por nombre o correo..."
        isServerSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        rowAccent={MODULE_ACCENT.usuarios.row}
      />
    </div>
  )
}

'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { NuevoUsuarioButton } from '@/components/usuarios/nuevo-usuario-button'
import { UsuarioAcciones } from '@/components/usuarios/usuario-acciones'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'

// El tipo Usuario asumiendo que lo obtenemos del prop
type Usuario = any

const ROL_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ADMIN:    { label: 'Admin',    variant: 'default' },
  MANAGER:  { label: 'Manager',  variant: 'secondary' },
  ANALISTA: { label: 'Analista', variant: 'outline' },
  VIEWER:   { label: 'Viewer',   variant: 'outline' },
}

export function UsuariosClient({ usuarios }: { usuarios: Usuario[] }) {
  const columns: ColumnDef<Usuario>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
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
          const rolConfig = ROL_LABELS[row.original.rol] ?? {
            label: row.original.rol,
            variant: 'outline' as const,
          }
          return <Badge variant={rolConfig.variant}>{rolConfig.label}</Badge>
        },
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
        cell: ({ row }) => <UsuarioAcciones usuario={row.original} />,
      },

    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Usuarios"
        subtitle={usuarios.length === 1 ? '1 usuario registrado' : `${usuarios.length} usuarios registrados`}
      />

      {/* Tabla Estandarizada */}
      <DataTable
        columns={columns}
        data={usuarios}
        tableId="usuarios-table"
        searchPlaceholder="Buscar en todos los campos..."
        customToolbarActions={<NuevoUsuarioButton />}
      />
    </div>
  )
}

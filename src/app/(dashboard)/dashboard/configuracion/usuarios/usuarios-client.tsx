'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { NuevoUsuarioButton } from '@/components/usuarios/nuevo-usuario-button'
import { UsuarioAcciones } from '@/components/usuarios/usuario-acciones'
import { Users } from 'lucide-react'

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
              className={
                activo
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                  : 'bg-muted text-muted-foreground'
              }
            >
              {activo ? 'Activo' : 'Inactivo'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'agregoFecha',
        header: 'Fecha Registro',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const date = new Date(row.original.agregoFecha)
          return (
            <span className="text-sm text-muted-foreground">
              {date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )
        },
      },
      {
        id: 'acciones',
        header: '',
        enableHiding: false, // Las acciones no se deben ocultar normalmente
        meta: { align: 'center' },
        cell: ({ row }) => <UsuarioAcciones usuario={row.original} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {usuarios.length === 1
              ? '1 usuario registrado'
              : `${usuarios.length} usuarios registrados`}
          </p>
        </div>
      </div>

      {/* Tabla Estandarizada */}
      <DataTable
        columns={columns}
        data={usuarios}
        tableId="usuarios-crud"
        searchPlaceholder="Buscar por nombre o correo..."
        searchKey="nombre" // Búsqueda por defecto usando el nombre
        customToolbarActions={<NuevoUsuarioButton />}
      />
    </div>
  )
}

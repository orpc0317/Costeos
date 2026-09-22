'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { NuevoTipoCosteoButton } from '@/components/tipos-costeo/nuevo-tipo-costeo-button'
import { TipoCosteoAcciones } from '@/components/tipos-costeo/tipo-costeo-acciones'
import { Network } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'

export function TiposCosteoClient({ tiposCosteo }: { tiposCosteo: TipoCosteoRow[] }) {
  const columns: ColumnDef<TipoCosteoRow>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
        ),
      },

      {
        accessorKey: 'empresaNombre',
        header: 'Empresa',
        cell: ({ row }) => <span className="font-medium">{row.original.empresaNombre || `Empresa ${row.original.empresaId}`}</span>,
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      },
      {
        accessorKey: 'lineaEtiqueta',
        header: 'Línea',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.lineaEtiqueta}
          </span>
        ),
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
        cell: ({ row }) => <TipoCosteoAcciones tipoCosteo={row.original} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Network}
        title="Tipos Costeos"
        subtitle={tiposCosteo.length === 1 ? '1 tipo costeo registrado' : `${tiposCosteo.length} tipos costeos registrados`}
      />

      <DataTable
        columns={columns}
        data={tiposCosteo}
        tableId="tipos-costeo-crud-v3"
        searchPlaceholder="Buscar por código o nombre..."
        customToolbarActions={<NuevoTipoCosteoButton />}
      />
    </div>
  )
}

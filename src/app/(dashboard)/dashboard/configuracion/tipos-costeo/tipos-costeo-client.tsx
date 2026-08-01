'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { NuevoTipoCosteoButton } from '@/components/tipos-costeo/nuevo-tipo-costeo-button'
import { TipoCosteoAcciones } from '@/components/tipos-costeo/tipo-costeo-acciones'
import { Hash } from 'lucide-react'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'

export function TiposCosteoClient({ tiposCosteo }: { tiposCosteo: TipoCosteoRow[] }) {
  const columns: ColumnDef<TipoCosteoRow>[] = useMemo(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Código',
        cell: ({ row }) => <span className="font-medium">{row.original.codigo}</span>,
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
        accessorKey: 'creadoEn',
        header: 'Fecha Registro',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const date = new Date(row.original.creadoEn)
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
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => <TipoCosteoAcciones tipoCosteo={row.original} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Hash className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Tipos Costeos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tiposCosteo.length === 1
              ? '1 tipo costeo registrado'
              : `${tiposCosteo.length} tipos costeos registrados`}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tiposCosteo}
        tableId="tipos-costeo-crud-v3"
        searchPlaceholder="Buscar por código o nombre..."
        searchKey="nombre"
        customToolbarActions={<NuevoTipoCosteoButton />}
      />
    </div>
  )
}

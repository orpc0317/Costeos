'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import { CosteosTableActions } from '@/components/costeos/CosteosTableActions'
import { Calculator } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export type CosteoListRow = {
  id: number
  codigoErp: number | null
  empresaNombre: string
  proyectoNombre: string
  clienteRazonSocial: string
  estado: string
  version: number
  modificadoEn: Date
}

export function CosteosClient({ costeos }: { costeos: CosteoListRow[] }) {
  const columns: ColumnDef<CosteoListRow>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'codigoErp',
        header: 'No. Costeo',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="font-mono font-normal">
            {row.original.codigoErp ? row.original.codigoErp : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'empresaNombre',
        header: 'Empresa',
        cell: ({ row }) => row.original.empresaNombre,
      },
      {
        accessorKey: 'clienteRazonSocial',
        header: 'Cliente',
        cell: ({ row }) => row.original.clienteRazonSocial,
      },
      {
        accessorKey: 'proyectoNombre',
        header: 'Proyecto',
        cell: ({ row }) => row.original.proyectoNombre,
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const estado = row.original.estado
          
          let badgeClass = UI_THEME.badge.inactive

          if (estado === 'BORRADOR') {
            badgeClass = UI_THEME.badge.warning
          } else if (estado === 'APROBADO' || estado === 'VIGENTE') {
            badgeClass = UI_THEME.badge.active
          } else if (estado === 'TERMINADO') {
            badgeClass = UI_THEME.badge.info
          }

          return (
            <span className={badgeClass}>
              {estado}
            </span>
          )
        },
      },
      {
        accessorKey: 'version',
        header: 'Versión',
        meta: { align: 'center' },
        cell: ({ row }) => <span className="text-sm text-muted-foreground">v{row.original.version}</span>,
      },
      {
        accessorKey: 'modificadoEn',
        header: 'Actualizado',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const date = new Date(row.original.modificadoEn)
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
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => <CosteosTableActions costeoId={row.original.id} estado={row.original.estado} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calculator}
        title="Costeos"
        subtitle={costeos.length === 1 ? '1 registro' : `${costeos.length} registros`}
      />

      {/* Tabla Estandarizada */}
      <DataTable
        columns={columns}
        data={costeos}
        tableId="costeos-crud-v2"
        searchPlaceholder="Buscar en todos los campos..."
        customToolbarActions={
          <Link href="/costeos/nuevo" className={buttonVariants({ variant: "default" })}>
            Nuevo Costeo
          </Link>
        }
      />
    </div>
  )
}

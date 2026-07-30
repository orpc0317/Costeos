'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
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
        accessorKey: 'codigoErp',
        header: 'No. Costeo',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="font-medium font-mono">
            {row.original.codigoErp ? row.original.codigoErp : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'empresaNombre',
        header: 'Empresa',
        cell: ({ row }) => <span className="font-medium">{row.original.empresaNombre}</span>,
      },
      {
        accessorKey: 'clienteRazonSocial',
        header: 'Cliente',
        cell: ({ row }) => <span className="font-medium">{row.original.clienteRazonSocial}</span>,
      },
      {
        accessorKey: 'proyectoNombre',
        header: 'Proyecto',
        cell: ({ row }) => <span className="font-medium">{row.original.proyectoNombre}</span>,
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const estado = row.original.estado
          
          let badgeClass = "bg-muted text-muted-foreground"
          
          if (estado === 'BORRADOR') {
            badgeClass = "bg-slate-500/15 text-slate-700 border-slate-500/20"
          } else if (estado === 'APROBADO' || estado === 'VIGENTE') {
            badgeClass = "bg-emerald-500/15 text-emerald-700 border-emerald-500/20"
          } else if (estado === 'TERMINADO') {
            badgeClass = "bg-blue-500/15 text-blue-700 border-blue-500/20"
          }

          return (
            <Badge variant="outline" className={badgeClass}>
              {estado}
            </Badge>
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
        id: 'acciones',
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Calculator className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Costeos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona los costeos y presupuestos de tus contratos.
          </p>
        </div>
      </div>

      {/* Tabla Estandarizada */}
      <DataTable
        columns={columns}
        data={costeos}
        tableId="costeos-crud-v2"
        searchPlaceholder="Buscar por proyecto o cliente..."
        searchKey="proyectoNombre" // Búsqueda por defecto
        customToolbarActions={
          <Link href="/costeos/nuevo" className={buttonVariants({ variant: "default" })}>
            Nuevo Costeo
          </Link>
        }
      />
    </div>
  )
}

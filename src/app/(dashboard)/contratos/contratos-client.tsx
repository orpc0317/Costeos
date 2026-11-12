'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import type { PermisosPantalla } from '@/lib/permisos'
import { CosteosTableActions } from '@/components/costeos/CosteosTableActions'
import { FileSignature } from 'lucide-react'
import { claseEstadoCosteo, labelEstadoContrato } from '@/lib/constants'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export type ContratoListRow = {
  id: number
  numero: string
  empresaNombre: string
  fechaContrato: string
  clienteRazonSocial: string
  nombre: string
  fechaInicio: string
  estado: number
  costeoId: number | null
  costeoEstado: number | null
}

export function ContratosClient({ contratos, permisos }: { contratos: ContratoListRow[]; permisos?: PermisosPantalla }) {
  const puedeAgregar = permisos?.agregar !== false
  const columns: ColumnDef<ContratoListRow>[] = useMemo(
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
        accessorKey: 'numero',
        header: 'Numero',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="font-mono font-normal">{row.original.numero || '-'}</span>
        ),
      },
      {
        accessorKey: 'empresaNombre',
        header: 'Empresa',
        cell: ({ row }) => row.original.empresaNombre,
      },
      {
        accessorKey: 'fechaContrato',
        header: 'Fecha',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.fechaContrato}</span>
        ),
      },
      {
        accessorKey: 'clienteRazonSocial',
        header: 'Cliente',
        cell: ({ row }) => row.original.clienteRazonSocial,
      },
      {
        accessorKey: 'nombre',
        header: 'Proyecto',
        cell: ({ row }) => row.original.nombre,
      },
      {
        accessorKey: 'fechaInicio',
        header: 'Inicio',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.fechaInicio}</span>
        ),
      },
      {
        id: 'estado',
        accessorFn: (row) => labelEstadoContrato(row.estado),
        header: 'Estado',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className={claseEstadoCosteo(row.original.estado)}>
            {labelEstadoContrato(row.original.estado)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => row.original.costeoId != null ? (
          <CosteosTableActions costeoId={row.original.costeoId} estado={row.original.costeoEstado ?? 0} />
        ) : null,
      },
    ],
    []
  )

  return (
    <div className={UI_THEME.page.listShell}>
      <div className={UI_THEME.page.listHeader}>
        <PageHeader
          icon={FileSignature}
          title="Contratos"
          subtitle={contratos.length === 1 ? '1 registro' : `${contratos.length} registros`}
          accent={MODULE_ACCENT.contratos}
          actions={puedeAgregar ? (
            <Link href="/costeos/nuevo" className={buttonVariants({ variant: 'default' })}>
              Nuevo Contrato
            </Link>
          ) : null}
        />
      </div>

      <DataTable
        columns={columns}
        data={contratos}
        tableId="contratos-v2"
        searchPlaceholder="Buscar en todos los campos..."
        rowAccent={MODULE_ACCENT.contratos.row}
      />
    </div>
  )
}

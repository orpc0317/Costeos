'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { TipoComboModal } from '@/components/tipos-combo/tipo-combo-modal'
import { Layers, Plus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { UI_THEME } from '@/lib/theme'
import type { TipoComboRow } from '@/lib/types/tipos-combo'

export function TiposComboClient({ tiposCombo }: { tiposCombo: TipoComboRow[] }) {
  const columns: ColumnDef<TipoComboRow>[] = useMemo(
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
        id: 'empresa',
        accessorFn: (row) => row.empresaNombre,
        header: 'Empresa',
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.empresaNombre}</span>
        ),
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => (
          <span className="font-semibold text-sm">{row.original.nombre}</span>
        ),
      },
      {
        accessorKey: 'icono',
        header: 'Icono',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.icono ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <TipoComboModal
            tipoCombo={row.original}
            trigger={
              <button
                className={UI_THEME.action.viewButton}
                title="Ver / Editar"
              >
                <Eye className="h-3.5 w-3.5 text-blue-600" />
              </button>
            }
          />
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title="Tipos Combo"
        subtitle={tiposCombo.length === 1 ? '1 tipo combo registrado' : `${tiposCombo.length} tipos combo registrados`}
      />

      <DataTable
        columns={columns}
        data={tiposCombo}
        tableId="tipos-combo-crud-v1"
        searchPlaceholder="Buscar tipo combo..."
        customToolbarActions={
          <TipoComboModal
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nuevo Tipo
              </Button>
            }
          />
        }
      />
    </div>
  )
}

'use client'
import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Building2, Plus, Eye } from 'lucide-react'
import { EmpresaModal } from '@/components/empresas/empresa-modal'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import type { PermisosPantalla } from '@/lib/permisos'
import type { EmpresaRow } from '@/lib/types/empresas'

interface Props { initialData: EmpresaRow[]; permisos?: PermisosPantalla }

export function EmpresasClient({ initialData, permisos }: Props) {
  const puedeAgregar = permisos?.agregar !== false
  const router = useRouter()

  const columns: ColumnDef<EmpresaRow>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'nombre',
      header: 'Empresa',
      cell: ({ row }) => row.original.nombre,
    },
    {
      accessorKey: 'razonSocial',
      header: 'Razón Social',
      cell: ({ row }) => <span className="text-sm">{row.original.razonSocial || '—'}</span>,
    },
    {
      accessorKey: 'nit',
      header: 'NIT',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.nit || '—'}</span>,
    },
    {
      accessorKey: 'codigoErp',
      header: 'Código ERP',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.codigoErp || 'N/A'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <EmpresaModal
          empresa={row.original}
          onSuccess={() => router.refresh()}
          trigger={<button className={UI_THEME.action.viewButton}><Eye className="h-4 w-4 text-blue-600" /></button>}
        />
      ),
    },
  ], [router])

  const subtitulo = initialData.length === 1
    ? '1 empresa registrada'
    : `${initialData.length} empresas registradas`

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} title="Empresas" subtitle={subtitulo} accent={MODULE_ACCENT.empresas} actions={puedeAgregar ? <EmpresaModal onSuccess={() => router.refresh()} trigger={<Button className="gap-2"><Plus className="w-4 h-4" />Nueva Empresa</Button>} /> : null} />
      <DataTable
        columns={columns}
        data={initialData}
        tableId="empresas-table"
        searchPlaceholder="Buscar empresa..."
        rowAccent={MODULE_ACCENT.empresas.row}
      />
    </div>
  )
}

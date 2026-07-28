'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Plus, Network } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { TipoCosteoAcciones } from './_components/tipo-costeo-acciones'
import { FormTipoCosteo } from './_components/form-tipo-costeo'

export function TiposCosteoClient({ data }: { data: any[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleCreate = () => {
    setOpen(true)
  }


  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Código',
        meta: { align: 'center' },
        cell: ({ row }) => <span className="font-medium">{row.original.codigo}</span>,
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre',
      },
      {
        id: 'estructura',
        accessorFn: (row) => {
          let str = ''
          if (row.nivel1Activo) str += row.nivel1Etiqueta
          if (row.nivel1Activo && row.nivel2Activo) str += ` > ${row.nivel2Etiqueta}`
          if (row.nivel1Activo || row.nivel2Activo) str += ` > `
          str += row.recursosEtiqueta
          return str
        },
        header: 'Estructura',
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span>,
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
        id: 'acciones',
        header: '',
        enableHiding: false,
        meta: { align: 'center' },
        cell: ({ row }) => <TipoCosteoAcciones tipo={row.original} />,
      },
    ],
    []
  )

  const customToolbarActions = (
    <Button onClick={handleCreate} className="gap-2">
      <Plus className="w-4 h-4" /> Nuevo Tipo
    </Button>
  )

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-indigo-900">
          <Network className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tipos de Costeo</h1>
        </div>
        <p className="text-slate-500 mt-0.5">Configura las estructuras de los árboles de costeo.</p>
      </div>

      <DataTable
        columns={columns}
        data={data}
        tableId="tipos-costeo-crud"
        searchPlaceholder="Buscar por código o nombre..."
        searchKey="nombre" // Usar nombre como default si no proveemos un filtro complejo
        customToolbarActions={customToolbarActions}
      />

      <FormTipoCosteo 
        open={open} 
        onOpenChange={setOpen} 
        tipo={null} 
      />
    </div>
  )
}

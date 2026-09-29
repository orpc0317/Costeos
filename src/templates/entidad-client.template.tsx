// @ts-nocheck — Archivo de plantilla con placeholders intencionales. No es código de producción.
'use client'
/**
 * TEMPLATE — Client Page CRUD (copiar y completar antes de escribir código real)
 *
 * INSTRUCCIONES PARA LA IA:
 * 1. Busca y reemplaza TODO "Entidad" / "entidad" / "ENTIDAD" por el nombre real.
 * 2. Reemplaza "IconoEntidad" por el ícono canónico del sidebar.
 * 3. Agrega / elimina columnas según los campos de la entidad.
 * 4. El botón "Nueva Entidad" va SIEMPRE en customToolbarActions del DataTable.
 * 5. Al terminar, ejecuta la PRE-FLIGHT CHECKLIST de AGENTS.md punto a punto.
 *
 * GOLD STANDARD DE REFERENCIA (leer antes de modificar):
 *   src/app/(dashboard)/dashboard/configuracion/categorias/categorias-client.tsx
 */

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { IconoEntidad, Plus, Eye } from 'lucide-react' // ← cambiar IconoEntidad
import { EntidadModal } from '@/components/entidades/entidad-modal' // ← ajustar ruta
import { UI_THEME } from '@/lib/theme'
import type { EntidadRow } from '@/lib/types/entidades' // ← ajustar import

export function EntidadesClient({ data }: { data: EntidadRow[] }) {
  const router = useRouter()

  // ── Columnas — siempre con useMemo ────────────────────────────────────────
  const columns: ColumnDef<EntidadRow>[] = useMemo(() => [

    // ① Primera columna SIEMPRE es id (enableHiding: false, inamovible)
    {
      accessorKey: 'id',
      header: 'ID',
      enableHiding: false,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
      ),
    },

    // ② Columna Empresa — usar accessorFn para que el buscador funcione sobre el texto (R19)
    {
      id: 'empresa',
      accessorFn: (row) => row.empresaNombre ?? String(row.empresaId),
      header: 'Empresa',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.empresaNombre ?? row.original.empresaId}
        </span>
      ),
    },

    // ③ Columnas de datos de la entidad
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nombre}</span>
      ),
    },

    // TODO: agregar más columnas según la entidad
    // NOTA: Si una columna muestra texto de FK (no el ID crudo), USAR accessorFn no accessorKey

    // ④ Última columna SIEMPRE es actions (id: 'actions', enableHiding: false)
    //    Usar instancia por fila vía trigger — NUNCA estado compartido (condición de carrera)
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <EntidadModal
          entidad={row.original}
          onSuccess={() => router.refresh()}
          trigger={
            <button className={UI_THEME.action.viewButton}>
              <Eye className="h-4 w-4 text-blue-600" />
            </button>
          }
        />
      ),
    },
  ], [router])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* PageHeader — título e ícono, SIN el botón Nuevo (eso va en el DataTable) */}
      <PageHeader
        icon={IconoEntidad}
        title="Entidades"
        subtitle={
          data.length === 1
            ? '1 entidad registrada'
            : `${data.length} entidades registradas`
        }
      />

      {/* DataTable — el botón Nuevo va SIEMPRE en customToolbarActions */}
      <DataTable
        columns={columns}
        data={data}
        tableId="entidades-v1"
        searchPlaceholder="Buscar en todos los campos..."
        customToolbarActions={
          <EntidadModal
            onSuccess={() => router.refresh()}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Entidad
              </Button>
            }
          />
        }
      />
    </div>
  )
}

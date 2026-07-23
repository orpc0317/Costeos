import { Suspense } from 'react'
import { Search, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { listarUsuarios } from '@/app/actions/usuarios'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NuevoUsuarioButton } from '@/components/usuarios/nuevo-usuario-button'
import { UsuarioAcciones } from '@/components/usuarios/usuario-acciones'

export const metadata: Metadata = {
  title: 'Usuarios | Costeos',
  description: 'Gestión de usuarios del sistema de costeos',
}

// ─── Estilos por rol ──────────────────────────────────────────────────────────

const ROL_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ADMIN:    { label: 'Admin',    variant: 'default' },
  MANAGER:  { label: 'Manager',  variant: 'secondary' },
  ANALISTA: { label: 'Analista', variant: 'outline' },
  VIEWER:   { label: 'Viewer',   variant: 'outline' },
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function UsuariosPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const busqueda = q?.trim() || undefined
  const usuarios = await listarUsuarios(busqueda)

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
        <NuevoUsuarioButton />
      </div>

      {/* Buscador */}
      <form method="GET" className="flex items-center gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="q-usuarios"
            name="q"
            placeholder="Buscar por nombre o correo…"
            defaultValue={q ?? ''}
            className="pl-9"
            autoComplete="off"
          />
        </div>
        {busqueda && (
          <a
            href="/dashboard/configuracion/usuarios"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Limpiar
          </a>
        )}
      </form>

      {/* Tabla */}
      <Suspense fallback={null}>
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo electrónico</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {busqueda
                      ? `No se encontraron usuarios con "${busqueda}"`
                      : 'No hay usuarios registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => {
                  const rolConfig = ROL_LABELS[usuario.rol] ?? {
                    label: usuario.rol,
                    variant: 'outline' as const,
                  }
                  return (
                    <TableRow key={usuario.id} className={!usuario.activo ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{usuario.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                      <TableCell>
                        <Badge variant={rolConfig.variant}>{rolConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={usuario.activo ? 'default' : 'secondary'}
                          className={
                            usuario.activo
                              ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(usuario.agregoFecha).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <UsuarioAcciones usuario={usuario} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Suspense>
    </div>
  )
}

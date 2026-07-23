# SKILL: crud-screen

## Descripción

Genera una pantalla de catálogo CRUD completa (tabla + modal de Ver/Crear/Editar/Eliminar) para el proyecto **Costeos**.

Produce dos archivos:
- `src/app/(dashboard)/catalogos/[entidad]/page.tsx` (Server Component)
- `src/app/(dashboard)/catalogos/[entidad]/_client.tsx` (Client Component)
- `src/app/actions/[entidad].ts` (Server Actions)

## Cuándo usar

- El usuario quiere una pantalla para administrar un catálogo simple (Roles, Categorías, Tipos, etc.)
- Los datos se almacenan en **MySQL via Prisma** (no en el ERP)
- El patrón es: lista en tabla → modal para ver/editar/crear → toast de confirmación

## Pre-requisitos

Antes de ejecutar:
1. Leer `crud-screens.instructions.md`
2. Leer `components.instructions.md`
3. Leer `data-tables.instructions.md`
4. Leer `server-actions.instructions.md`
5. Leer `ui-conventions.instructions.md`
6. Leer el spec de la pantalla en `prompts/`

## Diferencias respecto a Cartera

| Cartera | Costeos |
|---------|---------|
| Supabase client | Prisma ORM |
| `getCuentaActiva()` | `auth()` de Auth.js |
| `createAdminClient()` | `prisma` singleton |
| Schema `cartera.*` | Modelos en `prisma/schema.prisma` |
| RLS en DB | Verificación en Server Action |
| `f()` de Cartera utils | `f()` de `@/lib/utils` |

## Patrón Server Action para CRUD

```ts
'use server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { f } from '@/lib/utils'
import { Prisma } from '@prisma/client'

// GET
export async function getEntidades() {
  const session = await auth()
  if (!session?.user?.id) return []
  return prisma.entidad.findMany({ orderBy: { nombre: 'asc' } })
}

// CREATE
export async function crearEntidad(form: { nombre: string; ... }) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Sesión no válida.' }
  try {
    const data = await prisma.entidad.create({
      data: { nombre: f(form.nombre), creadoPor: Number(session.user.id) }
    })
    return { data }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return { error: 'Ya existe un registro con ese nombre.' }
    return { error: 'Error al guardar.' }
  }
}

// UPDATE (con concurrencia optimista)
export async function editarEntidad(id: number, form: { nombre: string }, lastModified: Date) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Sesión no válida.' }
  const updated = await prisma.entidad.updateMany({
    where: { id, modificadoEn: lastModified },
    data: { nombre: f(form.nombre), modificadoEn: new Date() }
  })
  if (updated.count === 0) return { error: 'Registro modificado por otro usuario. Recarga la página.' }
  return { data: { ok: true } }
}

// DELETE
export async function eliminarEntidad(id: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Sesión no válida.' }
  try {
    await prisma.entidad.delete({ where: { id } })
    return { data: { ok: true } }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003')
      return { error: 'No se puede eliminar: tiene registros asociados.' }
    return { error: 'Error al eliminar.' }
  }
}
```

## Pasos de ejecución

1. Leer el spec de la pantalla
2. Identificar el modelo Prisma correspondiente
3. Generar `src/app/actions/[entidad].ts` con el patrón de arriba
4. Generar `page.tsx` (Server Component con fetch y Promise.all)
5. Generar `_client.tsx` (tabla + modal, siguiendo `crud-screens.instructions.md`)
6. Verificar que no hay errores de TypeScript evidentes
7. Confirmar al usuario que los archivos están listos

---
description: "Costeos — server action patterns: auth guard, Prisma mutations, ERP repository usage, optimistic concurrency."
applyTo: "src/app/actions/**/*.ts"
---

# Costeos — Server Action Patterns

## Estructura base obligatoria

Toda Server Action que muta datos DEBE empezar con el auth guard:

```ts
'use server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { f } from '@/lib/utils'

export async function crearAlgo(form: FormData | object) {
  // 1. Auth guard — OBLIGATORIO primero
  const session = await auth()
  if (!session?.user?.id) return { error: 'Sesión no válida.' }
  const userId = Number(session.user.id)

  // 2. Validaciones de negocio
  // ...

  // 3. Mutación con Prisma
  try {
    const result = await prisma.entidad.create({ data: { ...form, creadoPor: userId } })
    return { data: result }
  } catch (err) {
    console.error('[crearAlgo]', err)
    return { error: 'Error al guardar. Intenta de nuevo.' }
  }
}
```

## Concurrencia optimista

Toda mutación de UPDATE usa `modificadoEn` como token de versión:

```ts
const updated = await prisma.costeo.updateMany({
  where: {
    id: costeoId,
    modificadoEn: lastModified,  // token de versión
  },
  data: {
    ...cambios,
    modificadoEn: new Date(),
  },
})

if (updated.count === 0) {
  return { error: 'Este registro fue modificado por otro usuario. Por favor recarga la página.' }
}
```

## Normalización de texto

Antes de insertar o actualizar strings en DB, normalizar con `f()`:

```ts
import { f } from '@/lib/utils'

data: {
  nombre: f(form.nombre),    // → MAYÚSCULAS sin acentos
  descripcion: form.descripcion, // descripcion libre → no normalizar
}
```

**Regla:** normalizar campos que se usan en búsquedas (nombre, código, descripción corta). No normalizar emails, contraseñas, o texto libre largo.

## Integración ERP — REGLA CRÍTICA

**NUNCA** importar `SqlServerErpRepository`, `ApiRestErpRepository` ni `mssql` directamente en un Server Action.

**SIEMPRE** usar el ErpRepository:

```ts
import { erp } from '@/lib/erp'

// ✅ Correcto
const productos = await erp.getProductos({ busqueda: query })
const precios   = await erp.getProductosCostos(ids)

// ❌ PROHIBIDO
import sql from 'mssql'  // NUNCA en Server Actions
import { SqlServerErpRepository } from '@/lib/erp/sql-server'  // NUNCA
```

## Leer precios ERP para Costeo en BORRADOR

```ts
export async function getCosteoConPreciosActuales(costeoId: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Sesión no válida.' }

  const costeo = await prisma.costeo.findUnique({
    where: { id: costeoId },
    include: { itemsProducto: true, itemsManoObra: true, itemsServicio: true, parametros: true },
  })

  if (!costeo) return { error: 'Costeo no encontrado.' }

  // Solo refrescar precios si está en BORRADOR
  if (costeo.estado === 'BORRADOR') {
    const productoIds = costeo.itemsProducto.map(i => i.erpProductoId)
    const precios = productoIds.length > 0
      ? await erp.getProductosCostos(productoIds)
      : {}

    // Enriquecer ítems con precios actuales (en memoria — no escribir a DB todavía)
    const itemsConPrecios = costeo.itemsProducto.map(item => ({
      ...item,
      costoUnitarioActual: precios[item.erpProductoId] ?? null,
      subtotalActual: item.cantidad.toNumber() * (precios[item.erpProductoId] ?? 0),
    }))

    return { data: { ...costeo, itemsProducto: itemsConPrecios } }
  }

  return { data: costeo }
}
```

## Aprobar un Costeo

```ts
export async function aprobarCosteo(costeoId: number, lastModified: Date) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Sesión no válida.' }

  const costeo = await prisma.costeo.findUnique({
    where: { id: costeoId, estado: 'BORRADOR' },
    include: { itemsProducto: true, itemsManoObra: true, itemsServicio: true, parametros: true },
  })

  if (!costeo) return { error: 'Costeo no encontrado o ya aprobado.' }

  // 1. Obtener precios actuales del ERP (batch)
  const productoIds = costeo.itemsProducto.map(i => i.erpProductoId)
  const precios = productoIds.length > 0 ? await erp.getProductosCostos(productoIds) : {}

  const ahora = new Date()

  // 2. Calcular totales
  const costoProductos = costeo.itemsProducto.reduce(
    (sum, i) => sum + i.cantidad.toNumber() * (precios[i.erpProductoId] ?? 0), 0
  )
  // ... calcular costoManoObra, costoServicios, overhead, etc.

  // 3. Congelar precios y aprobar en una transacción
  await prisma.$transaction([
    // Congelar precios de productos
    ...costeo.itemsProducto.map(item =>
      prisma.itemProducto.update({
        where: { id: item.id },
        data: {
          costoUnitarioErp: precios[item.erpProductoId] ?? 0,
          subtotal: item.cantidad.toNumber() * (precios[item.erpProductoId] ?? 0),
          congeladoEn: ahora,
        },
      })
    ),
    // Guardar resultado
    prisma.resultado.upsert({
      where: { costeoId },
      create: { costeoId, costoProductos, /* ... */ calculadoEn: ahora },
      update: { costoProductos, /* ... */ calculadoEn: ahora },
    }),
    // Aprobar el costeo (con concurrencia optimista)
    prisma.costeo.updateMany({
      where: { id: costeoId, modificadoEn: lastModified },
      data: { estado: 'APROBADO', aprobadoPor: Number(session.user.id), aprobadoEn: ahora, modificadoEn: ahora },
    }),
  ])

  // 4. Notificar al ERP
  const pushResult = await erp.pushCosteoAprobado({ costeoId, /* ... */ })
  if (!pushResult.ok) {
    // El costeo ya quedó aprobado en Costeos — el push al ERP puede reintentarse
    console.warn('[aprobarCosteo] Push al ERP falló:', pushResult.error)
  }

  return { data: { ok: true, erpReferencia: pushResult.erpReferencia } }
}
```

## Restricciones de exportación de 'use server'

En archivos `'use server'` solo exportar:
- `async function` — ✅
- `type` / `interface` — ✅
- Constantes o valores — ❌ (causa error de build en Next.js)

## Manejo de errores

```ts
try {
  // operación Prisma
} catch (err) {
  // Detectar unique constraint violation de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return { error: 'Ya existe un registro con ese nombre.' }
  }
  console.error('[nombreAction]', err)
  return { error: 'Error inesperado. Por favor intenta de nuevo.' }
}
```

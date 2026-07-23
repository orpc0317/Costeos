---
description: "Costeos — ERP integration pattern: ErpRepository contract, how to use it in Server Actions, Fase A vs Fase C switch, error handling."
applyTo: "src/app/actions/**/*.ts, src/lib/**/*.ts"
---

# ERP Integration — Patrón ErpRepository

## Regla Crítica

> **NUNCA** importar `SqlServerErpRepository`, `ApiRestErpRepository`, ni `mssql` directamente.
> **SIEMPRE** usar `erp` de `@/lib/erp`.

Esta regla garantiza que el switch de SQL Server (Fase A) a API REST (Fase C) sea un cambio de environment variable, sin tocar ningún Server Action ni componente.

## Uso correcto en Server Actions

```ts
import { erp } from '@/lib/erp'
// También disponibles los tipos:
import type { ErpProducto, ErpCliente } from '@/lib/erp'

// Buscar productos en el ERP
const productos = await erp.getProductos({ busqueda: 'cemento', activo: true })

// Obtener precios actuales para múltiples productos (batch — siempre preferir esto)
const precios = await erp.getProductosCostos([1, 2, 3, 4, 5])
// → { 1: 45.00, 2: 120.00, 3: 18.50, 4: 95.00, 5: 67.00 }

// Buscar clientes
const clientes = await erp.getClientes({ busqueda: 'constructora' })

// Receta de un producto
const receta = await erp.getRecetaProducto(123)

// Roles de mano de obra
const roles = await erp.getRoles()

// Push de costeo aprobado al ERP
const resultado = await erp.pushCosteoAprobado(payload)
```

## Nombres de campos snapshot

Cuando el usuario agrega un ítem al costeo, guardar snapshot del nombre/unidad (para display sin llamar al ERP):

```ts
// Al agregar un ItemProducto:
await prisma.itemProducto.create({
  data: {
    costeoId,
    erpProductoId: producto.id,
    nombre: producto.nombre,   // snapshot — para mostrar sin ERP call
    unidad: producto.unidad,   // snapshot
    cantidad: form.cantidad,
    // NO guardar costoUnitarioErp aquí → se carga vivo en BORRADOR
    // Se congela en el momento de aprobar
  },
})
```

## Precios en BORRADOR vs APROBADO

```ts
// BORRADOR → precios siempre del ERP (campo congeladoEn es null)
if (costeo.estado === 'BORRADOR') {
  const ids = items.map(i => i.erpProductoId)
  const precios = await erp.getProductosCostos(ids)
  // Enriquecer items en memoria — NO persistir
}

// APROBADO → usar campos congelados de DB (no llamar al ERP)
if (costeo.estado === 'APROBADO') {
  // Usar item.costoUnitarioErp directamente — ya está congelado
}
```

## Manejo de errores del ERP

Las llamadas al ERP pueden fallar si el SQL Server está caído o la red falla. Siempre wrappear:

```ts
try {
  const productos = await erp.getProductos(filtros)
  return { data: productos }
} catch (err) {
  console.error('[getProductosERP]', err)
  return { error: 'No se pudo conectar al catálogo del ERP. Verifica la conexión y vuelve a intentar.' }
}
```

Para `pushCosteoAprobado`: si falla, el costeo ya quedó APROBADO en Costeos (la operación es idempotente desde el lado de Costeos). Loguear el error y permitir reintento manual.

## El switch A → C en detalle

**Archivo que controla el switch:** `src/lib/erp/index.ts`

```ts
// Fase A (hoy):
ERP_INTEGRATION_MODE=sqlserver   → SqlServerErpRepository

// Fase C (futuro):
ERP_INTEGRATION_MODE=api         → ApiRestErpRepository
```

**Pasos para migrar a Fase C:**
1. El equipo ERP implementa los 6 endpoints REST
2. Se implementan los métodos en `src/lib/erp/api-rest.ts` (el archivo ya existe)
3. Se prueba `ApiRestErpRepository` en staging
4. Se cambia `ERP_INTEGRATION_MODE=api` en `.env` del servidor de producción
5. `pm2 restart costeos`
6. Monitoreo 24h
7. Opcional: remover dependencia `mssql` del `package.json`

**Zero cambios en:** Server Actions, UI, tipos de datos, lógica de negocio.

---
description: "Costeos — contexto de negocio: empresa de seguridad física, jerarquía Cliente→Contrato→Sitio→Puesto→Recurso→Receta, estados del flujo, reglas críticas."
applyTo: "src/app/**/*.ts, src/app/**/*.tsx, src/lib/**/*.ts"
---

# Costeos — Contexto del Negocio

## Qué es Costeos

Aplicación web financiera para elaborar **costeos de contratos de seguridad**. La empresa provee servicios de **seguridad física** (guardias, equipos, armamento, comunicación). Un Costeo estima todos los costos y precios de venta de un proyecto para un cliente.

Los datos maestros (Items, Recetas, Lista de Precios, Clientes existentes) viven en el **ERP (SQL Server)**. Costeos los lee en tiempo real y almacena los contratos y costeos en su propia BD (MySQL, Google Cloud).

**Perfil de usuario crítico:** Analistas comerciales, no técnicos. La app debe guiarlos paso a paso. Nunca asumir conocimiento financiero previo.

---

## Quién usa Costeos

| Rol | Qué puede hacer |
|-----|----------------|
| `ADMIN` | Acceso total. Gestiona usuarios y configuración. |
| `MANAGER` | Crea, edita y **aprueba** contratos/costeos. Ve todo. |
| `ANALISTA` | Crea y edita contratos/costeos. No puede aprobar. |
| `VIEWER` | Solo lectura. |

El acceso se verifica en cada Server Action:
```ts
const session = await auth()
if (!session?.user?.id) return { error: 'Sesión no válida.' }
```

---

## Jerarquía de datos (la más importante del sistema)

```
CLIENTE  (del ERP o nuevo temporal)
  └── CONTRATO  (creado en Costeos, pasa al ERP al aprobar)
        ├── COSTEO  (parámetros financieros: overhead%, contingencia%, margen%)
        └── SITIOs  (ubicaciones físicas donde se prestará el servicio)
              └── PUESTOs  (posiciones dentro del sitio: "Garita", "Puerta Principal")
                    └── RECURSOS  (items del ERP asignados al puesto con cantidad)
                          └── RECETA  (items que acompañan al recurso, hasta 4 niveles)
```

**Los catálogos del ERP (Items, Recetas, Lista de Precios, Clientes) se leen en tiempo real — no se almacenan en MySQL de Costeos**, excepto:
- Campos snapshot en `PuestoRecurso` (item_nombre, item_tipo, item_categoria, item_tipo_costo) — para display sin ERP
- `RecetaSnap` — snapshot completo de recetas al aprobar

---

## Tipos de Recurso (catálogo ERP)

| Tipo | Descripción | Ejemplos |
|---|---|---|
| `RECURSO_HUMANO` | Personal | Guardia, Coordinador, Supervisor |
| `EQUIPO` | Equipo y maquinaria | Radio Motorola, Revolver, Vehículo |
| `ARTICULO` | Artículos y suministros | Camisa, Pantalón, Linterna |
| `SERVICIO` | Servicios externos | Plan de datos, Seguro, Mantenimiento |

---

## Tipo de Costo (campo clave en el ERP)

Cada item del ERP tiene `tipo_costo: 'MENSUAL' | 'UNICO'`.
Este campo determina cómo se calcula el costo durante la vida del contrato.

| `tipo_costo` | Significado | Cálculo | Ejemplo |
|---|---|---|---|
| `MENSUAL` | Costo recurrente | `costo × cantidad × plazo_meses` | Salario guardia |
| `UNICO` | Costo de una sola vez | `costo × cantidad` (fijo) | Radio, uniforme |

Para reportes mensuales, los items `UNICO` se **amortizan**: `costo_total / plazo_meses`.

---

## Clientes

### Cliente existente (ya está en el ERP)
```
getClientes() del ERP → usuario selecciona → se guarda erp_cliente_id en MySQL
```

### Cliente nuevo (aún no existe en ERP)
```
Usuario ingresa: NIT, Razón Social, Dirección Fiscal
→ Se guarda en costeos_cliente con codigo_temp = "TEMP-{timestamp}"
→ Al aprobar el Contrato → pushContratoAprobado() crea el cliente en ERP
→ ERP devuelve erp_cliente_id real
→ Se reemplaza codigo_temp por erp_cliente_id
```

---

## Recetas

- Definidas en el ERP. Se leen al momento de seleccionar un Recurso para un Puesto.
- Hasta **4 niveles de profundidad** (el sistema rechaza más).
- Algunos items de receta son `esOpcional = true` → el usuario puede eliminarlos.
- **En BORRADOR**: recetas se leen vivas del ERP al seleccionar.
- **Al APROBAR**: snapshot completo guardado en `costeos_receta_snap`.

---

## Precio de Venta

- El ERP tiene una **lista de precios** por item (`precio_venta` en `ErpItem`).
- El usuario **puede modificar** ese precio (override manual).
- Si el item no tiene precio en lista, el usuario lo ingresa manualmente.
- Se registra el origen: `LISTA` o `MANUAL`.
- Aplica principalmente a `RECURSO_HUMANO`, pero también puede aplicar a `EQUIPO` o `SERVICIO`.

---

## Estados de un Contrato

| Estado | Significado |
|--------|-------------|
| `BORRADOR` | En elaboración. Editable. |
| `APROBADO` | Aprobado. Enviado al ERP. Inmutable. |
| `VIGENTE` | Contrato activo en el ERP. |
| `TERMINADO` | Contrato finalizado. |

---

## Estados de un Costeo

| Estado | Costos | Editable |
|--------|--------|---------|
| `BORRADOR` | **Vivos del ERP** — batch fetch al abrir | Sí |
| `APROBADO` | **Congelados** — snapshot en `congelado_en` | No |
| `CANCELADO` | Congelados | No (estado final) |

**Al aprobar un Costeo:**
1. Batch fetch de costos actuales del ERP para todos los recursos
2. Batch fetch de precios de lista para todos los recursos
3. Congelar: escribir `costo_unitario_erp` y `congelado_en = NOW()`
4. Snapshot de recetas expandidas → `costeos_receta_snap`
5. Calcular y guardar `Resultado` (mensual + anual + total proyecto)
6. Llamar `erp.pushContratoAprobado()` — ERP crea Contrato y (si nuevo) Cliente
7. Actualizar `erp_contrato_id` y `erp_cliente_id` en MySQL
8. Estado pasa a `APROBADO`

---

## Versiones de Costeo

`Costeo.version` empieza en 1. "Actualizar costos" en un APROBADO crea una nueva fila con `version + 1` y `costeo_padre_id` apuntando al aprobado anterior. El original queda intacto (trazabilidad financiera).

---

## Integración con ERP

**REGLA CRÍTICA:** Toda interacción con datos del ERP usa el ErpRepository.

```ts
import { erp } from '@/lib/erp'

// ✅ Correcto
const items     = await erp.getItems({ tipo: 'RECURSO_HUMANO' })
const costos    = await erp.getItemsCostos([1, 2, 3])
const precios   = await erp.getListaPrecios([1, 2, 3])
const receta    = await erp.getRecetaItem(itemId)
const clientes  = await erp.getClientes({ busqueda: 'empresa' })

// ❌ NUNCA importar directamente:
import { SqlServerErpRepository } from '@/lib/erp/sql-server' // PROHIBIDO
```

Ver detalles en `erp-integration.instructions.md`.

---

## Reglas de negocio críticas

### Costos en BORRADOR son siempre actuales
Al cargar un Costeo en BORRADOR, SIEMPRE refrescar precios del ERP en batch:
```ts
const ids    = recursos.map(r => r.erpItemId)
const costos = await erp.getItemsCostos(ids)
// Nunca mostrar costo_unitario_erp guardado en DB si estado = BORRADOR
```

### Snapshot al aprobar
Escribir los precios del ERP en `costo_unitario_erp` + `congelado_en = NOW()`.
Un Costeo APROBADO es un documento financiero inmutable.

### Concurrencia optimista
```ts
const updated = await prisma.costeo.updateMany({
  where: { id, modificadoEn: lastModified },
  data:  { ...cambios, modificadoEn: new Date() },
})
if (updated.count === 0)
  return { error: 'Este registro fue modificado por otro usuario. Recarga la página.' }
```

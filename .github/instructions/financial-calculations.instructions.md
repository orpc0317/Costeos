---
description: "Costeos — fórmulas financieras: mensualizacion, costo directo, overhead, gross margin, ROI. Proyecciones mensual/anual/duración. Siempre importar de src/lib/financial.ts."
applyTo: "src/app/**/*.ts, src/app/**/*.tsx, src/lib/**/*.ts"
---

# Fórmulas Financieras — Costeos

## Vocabulario estándar

| Término | Para el usuario |
|---------|----------------|
| **Costo Directo** | "Lo que vas a gastar en el proyecto" |
| **Overhead** | "Gastos indirectos de la empresa que aplican al proyecto (admin, oficina, etc.)" |
| **Contingencia** | "Colchón por si algo sale más caro — recomendamos al menos 10%" |
| **Costo Total** | "Tu costo real antes de ganancia" |
| **Precio de Venta** | "Cuánto le vas a cobrar al cliente" |
| **Gross Margin** | "Tu ganancia como % del precio de venta" |
| **ROI** | "Cuánto ganas por cada quetzal invertido" |

---

## Concepto clave: Mensualizacion

Cada item del ERP tiene `tipo_costo: 'MENSUAL' | 'UNICO'`.

```
Duración del contrato = N meses

Item MENSUAL (salario, servicio recurrente):
  costo_mensual   = costo_unitario × cantidad
  costo_total     = costo_mensual  × N
  costo_anual     = costo_mensual  × 12

Item UNICO (radio, uniforme, compra única):
  costo_total     = costo_unitario × cantidad        ← no cambia con el plazo
  costo_mensual   = costo_total    / N               ← amortizado (solo para reporte)
  costo_anual     = costo_total    / N × 12          ← amortizado
```

La recursión aplica también a los items de **Recetas**: cada item de receta tiene su propio `tipo_costo` y se calcula igual.

---

## Cálculo por item (incluyendo receta expandida)

```ts
import { calcularItem } from '@/lib/financial'

// Recurso: GUARDIA ESTÁNDAR (MENSUAL, Q5,000) con receta expandida
const guardia: ItemCalculo = {
  tipoCosto:     'MENSUAL',
  costoUnitario: 5_000,
  cantidad:      1,
  recetaItems: [
    // SUB-RECETA: SALARIOS
    { tipoCosto: 'MENSUAL', costoUnitario: 500, cantidad: 1, recetaItems: [] }, // bono
    { tipoCosto: 'MENSUAL', costoUnitario: 300, cantidad: 1, recetaItems: [] }, // IGSS
    // SUB-RECETA: UNIFORME (UNICO)
    { tipoCosto: 'UNICO',   costoUnitario: 400, cantidad: 1, recetaItems: [] }, // camisa
    { tipoCosto: 'UNICO',   costoUnitario: 350, cantidad: 1, recetaItems: [] }, // pantalón
  ],
}

const resultado = calcularItem(guardia, 24) // contrato 24 meses
// resultado.costoMensual = Q6,031.25  (UNICO items amortizados: 750/24)
// resultado.costoTotal   = Q146,550   (MENSUAL×24 + UNICO×1)
```

---

## Cálculo completo del Costeo

```ts
import { calcularCosteo, calcularVentaMensual } from '@/lib/financial'

// 1. Calcular venta mensual total
const ventaMensual = calcularVentaMensual(
  recursos.map(r => ({ precioVenta: r.precioVenta, cantidad: r.cantidad }))
)

// 2. Calcular el costeo completo
const resultado = calcularCosteo(
  recursos, // Array<ItemCalculo & { categoriaItem: string }>
  ventaMensual,
  {
    plazoMeses:      contrato.plazoMeses,  // duración del contrato
    overheadPct:     costeo.overheadPct,
    contingenciaPct: costeo.contingenciaPct,
    margenPct:       costeo.margenPct,
  }
)
```

---

## Fórmulas del Costeo completo

```
CostoDirectoMensual = Σ calcularItem(recurso, N).costoMensual  (todos los puestos)
CostoDirectoTotal   = Σ calcularItem(recurso, N).costoTotal

OverheadMensual     = CostoDirectoMensual × (overhead_pct / 100)
ContingenciaMensual = CostoDirectoMensual × (contingencia_pct / 100)
CostoTotalMensual   = CostoDirectoMensual + OverheadMensual + ContingenciaMensual

CostoTotalAnual     = CostoTotalMensual × 12
CostoTotalProyecto  = CostoTotalMensual × N

VentaMensual        = Σ (precioVenta × cantidad) de recursos con precio_venta
VentaAnual          = VentaMensual × 12
VentaTotalProyecto  = VentaMensual × N

GrossMarginPct      = (VentaMensual - CostoTotalMensual) / VentaMensual × 100
ROI_Pct             = (VentaMensual - CostoTotalMensual) / CostoTotalMensual × 100
```

> **⚠️ Gross Margin se calcula sobre el precio de venta, no sobre el costo.**
> Margen ≠ Markup. Si el margen objetivo fuera un markup (sobre costo), el cálculo sería diferente.

---

## Desglose por categoría

`calcularCosteo` retorna también `porCategoria`:

```ts
resultado.porCategoria
// {
//   "SALARIOS":     { costoMensual: 45_000, costoTotal: 1_080_000 },
//   "COMUNICACIÓN": { costoMensual: 2_500,  costoTotal: 60_000 },
//   "ARMAMENTO":    { costoMensual: 833,    costoTotal: 20_000 },
// }
```

Usar este objeto para los reportes financieros categorizados en el dashboard.

---

## Colores de alerta

```ts
import { grossMarginColor, roiColor } from '@/lib/financial'

grossMarginColor(pct)
// < 10% → 'red'    (cuidado)
// 10-25% → 'amber'  (aceptable)
// > 25% → 'green'   (bueno)

roiColor(pct)
// < 15% → 'red'
// 15-35% → 'amber'
// > 35% → 'green'
```

---

## Formato de presentación

- **Moneda:** siempre con separador de miles y 2 decimales: `Q 1,234,567.89`
- **Porcentajes:** siempre con 2 decimales: `15.00%`
- Mostrar siempre las **3 vistas**: mensual, anual, duración completa del proyecto.
- Nunca mostrar fórmulas crudas al usuario final — solo etiquetas descriptivas.

### Tres vistas obligatorias en el resumen

```tsx
<Tabs defaultValue="mensual">
  <TabsTrigger value="mensual">Mensual</TabsTrigger>
  <TabsTrigger value="anual">Anual</TabsTrigger>
  <TabsTrigger value="proyecto">Duración del proyecto ({plazoMeses} meses)</TabsTrigger>
</Tabs>
```

---

## Implementación completa

Ver `src/lib/financial.ts`. **Nunca reimplementar las fórmulas inline.**

```ts
import {
  calcularItem,
  calcularCosteo,
  calcularVentaMensual,
  grossMarginColor,
  roiColor,
} from '@/lib/financial'
```

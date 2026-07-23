---
description: "Costeos — UI conventions: accent colors, typography, icon patterns, label naming, normalization rules."
applyTo: "src/app/**/*.tsx, src/components/**/*.tsx"
---

# Costeos — Convenciones de UI

## Paleta de colores

El acento principal de Costeos es **azul índigo** — transmite seriedad financiera y confianza.

```css
/* Variables principales (globals.css) */
--accent: 234 89% 60%;          /* índigo principal */
--accent-foreground: 0 0% 100%;
```

### Colores por módulo

| Módulo | Color | Clase Tailwind |
|--------|-------|---------------|
| Costeos / Proyectos | Índigo | `text-indigo-600`, `bg-indigo-50` |
| Mano de Obra | Violeta | `text-violet-600`, `bg-violet-50` |
| Servicios | Azul cielo | `text-sky-600`, `bg-sky-50` |
| Productos | Esmeralda | `text-emerald-600`, `bg-emerald-50` |
| Aprobado | Verde | `text-green-600`, `bg-green-50` |
| Borrador | Ámbar | `text-amber-600`, `bg-amber-50` |
| Cancelado | Rojo | `text-red-600`, `bg-red-50` |

## Badges de estado de Costeo

Usar el mismo patrón de `crud-screens.instructions.md § Status badge variants`:

```tsx
const ESTADO_BADGE = {
  BORRADOR:  { label: 'Borrador',  className: 'bg-amber-100 text-amber-700' },
  APROBADO:  { label: 'Aprobado',  className: 'bg-green-100 text-green-700' },
  CANCELADO: { label: 'Cancelado', className: 'bg-red-100   text-red-700'   },
}
```

## Tipografía

- **Fuente:** `Inter` (Google Fonts) — ya configurada en `layout.tsx`
- **Labels de campos:** `text-[11px] font-semibold tracking-wider text-muted-foreground`
- **Valores:** `text-[13px] font-medium`
- **Montos monetarios:** `text-[15px] font-semibold tabular-nums`
- **KPIs grandes (dashboard):** `text-3xl font-bold tabular-nums`

## Nomenclatura de labels

Usar español claro, sin jerga financiera cuando el campo es para el usuario final:

| ❌ Técnico | ✅ Para usuario |
|-----------|----------------|
| Overhead | Gastos indirectos |
| ROI | Retorno de inversión |
| Margen bruto | Ganancia sobre precio |
| Contingencia | Colchón por imprevistos |
| Costo unitario | Precio por unidad |

En pantallas de administración (catálogos) sí se puede usar terminología técnica.

## Normalización de texto

- Nombres en DB: **MAYÚSCULAS, sin acentos** — usar `f()` de `@/lib/utils`
- Display al usuario: **como viene del DB** (ya en mayúsculas) — no transformar en UI
- Labels e instrucciones de ayuda: capitalización normal (primera letra mayúscula)

## Formato numérico

- **Moneda:** `Q 1,234,567.89` (prefijo Q, separador de miles, 2 decimales)
- **Porcentaje:** `15.00%` (siempre 2 decimales)
- **Horas:** `24.50 hrs` (2 decimales)
- **Cantidades:** `1,250.000` (separador de miles, 3 decimales para productos)

Usar siempre `formatMoney()` y `formatPct()` de `@/lib/utils`.

## Iconos (Lucide React)

| Elemento | Icono |
|----------|-------|
| Proyectos | `FolderOpen` |
| Costeos | `Calculator` |
| Mano de Obra | `Users` |
| Servicios | `Wrench` |
| Productos | `Package` |
| Aprobar | `CheckCircle` |
| Borrador | `FileEdit` |
| ERP / Sincronizar | `RefreshCw` |
| Dashboard / ROI | `TrendingUp` |
| Agregar ítem | `Plus` |
| Eliminar | `Trash2` |
| Editar | `Pencil` |

## Campo activo/inactivo (Checkbox o Badge)

Usar el patrón de Cartera sin cambios:
```tsx
<Badge variant="secondary" className={`font-normal ${activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
  {activo ? 'Activo' : 'Inactivo'}
</Badge>
```

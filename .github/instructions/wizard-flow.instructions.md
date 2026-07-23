---
description: "Costeos — wizard flow pattern for guided multi-step cost entry. WizardLayout, WizardStep, StepProgress components and state management."
applyTo: "src/app/**/nuevo/**/*.tsx, src/components/wizard/**/*.tsx"
---

# Wizard Flow — Flujo Guiado de Costeo

## Cuándo usar Wizard vs CRUD

| Patrón | Cuándo | Skill |
|--------|--------|-------|
| **CRUD** (tabla + modal) | Catálogos simples: Roles, Categorías, etc. | `crud-screen` |
| **Wizard** (pasos guiados) | Crear/editar un Costeo completo | `wizard-flow` |

El wizard es para **usuarios no técnicos** que necesitan ser guiados paso a paso. Un concepto por pantalla. Nunca mostrar todos los campos a la vez.

---

## Estructura de archivos del wizard

```
src/app/(dashboard)/costeos/nuevo/
├── page.tsx              ← Server Component (carga datos iniciales: tipos, parámetros default)
└── _wizard.tsx           ← Client Component (todo el estado y la UI del wizard)

src/components/wizard/
├── wizard-layout.tsx     ← Contenedor principal con barra de progreso
├── wizard-step.tsx       ← Cada paso individual
└── step-progress.tsx     ← Indicador de pasos (círculos numerados)
```

---

## Pasos del Wizard de Costeo (Tipo 1: MO + Servicios + Productos)

```
Paso 1 — Datos del proyecto
  Qué: nombre del proyecto, cliente (del ERP), descripción breve
  Ayuda: "Dale un nombre descriptivo. Ej: 'Remodelación Oficina Central'"

Paso 2 — Mano de Obra
  Qué: tabla editable con roles y horas. Botón "Agregar persona".
  Ayuda: "¿Cuántas personas necesitan y cuánto tiempo? El costo ya está precargado."
  Muestra subtotal en tiempo real.

Paso 3 — Servicios Externos
  Qué: tabla editable. Botón "Agregar servicio".
  Ayuda: "¿Van a contratar a alguien de afuera? Ej: electricista, transporte, instalación."
  Muestra subtotal en tiempo real.

Paso 4 — Productos y Materiales
  Qué: tabla editable con búsqueda en ERP. Botón "Agregar producto".
  Ayuda: "¿Qué materiales o productos necesitan? Ej: cable, cemento, pintura."
  Muestra subtotal en tiempo real.

Paso 5 — Ajustes y Márgenes
  Qué: 3 inputs (overhead%, margen%, contingencia%) con descripción en lenguaje simple.
  Muestra el total proyectado actualizándose en tiempo real mientras ajustan.

Paso 6 — Resumen y Confirmación
  Qué: dashboard visual con gráfica de desglose, KPIs, precio de venta sugerido, ROI.
  Acciones: "Guardar borrador" | "Aprobar costeo"
```

---

## Estado del wizard

```ts
// _wizard.tsx
type WizardState = {
  paso: number                           // 1-6
  guardadoEn: Date | null               // null si aún no se ha guardado
  costeoId: number | null               // null hasta primer guardado

  // Paso 1
  proyectoId: number | null
  proyectoNombre: string
  clienteErpId: number | null
  clienteNombre: string

  // Paso 2
  itemsManoObra: ItemManoObraForm[]

  // Paso 3
  itemsServicio: ItemServicioForm[]

  // Paso 4
  itemsProducto: ItemProductoForm[]

  // Paso 5
  overheadPct: number    // default: 15
  margenPct: number      // default: 20
  contingenciaPct: number // default: 10

  // Calculados (derivados)
  resultado: ResultadoCalculo | null
}
```

---

## Guardado automático por paso

El costeo se guarda en DB al completar cada paso (no solo al final). Si el usuario cierra el browser puede retomar desde donde dejó.

```ts
// Al avanzar al siguiente paso:
async function avanzarPaso() {
  setGuardando(true)
  const result = await guardarPasoActual(state)
  if (result.error) {
    toast.error(result.error)
    setGuardando(false)
    return
  }
  if (!state.costeoId && result.data?.costeoId) {
    setState(prev => ({ ...prev, costeoId: result.data.costeoId }))
  }
  setState(prev => ({ ...prev, paso: prev.paso + 1, guardadoEn: new Date() }))
  setGuardando(false)
}
```

---

## Reglas de UX para usuarios no técnicos

1. **Un concepto por paso** — nunca mostrar campos de pasos futuros
2. **Explicación visible** — cada paso tiene un párrafo corto que explica qué se necesita y por qué
3. **Subtotales en tiempo real** — el usuario siempre sabe cuánto lleva
4. **Lenguaje simple** — "Gastos de la empresa" en lugar de "Overhead"
5. **Botón "Atrás"** siempre disponible — el usuario puede corregir pasos anteriores
6. **Indicador de progreso** — el usuario sabe en qué paso está y cuántos faltan
7. **Guardado automático** — nunca perder trabajo por cerrar accidentalmente
8. **Mensajes de apoyo** — si un campo está vacío, mostrar mensaje de ayuda, no solo un borde rojo

---

## Componente WizardLayout

```tsx
// src/components/wizard/wizard-layout.tsx
import { StepProgress } from './step-progress'

interface WizardLayoutProps {
  titulo: string
  pasoActual: number
  totalPasos: number
  pasos: { titulo: string; descripcion: string }[]
  children: React.ReactNode
  onAtras?: () => void
  onAdelante?: () => void
  textoAdelante?: string
  cargando?: boolean
  puedeAvanzar?: boolean
}

export function WizardLayout({
  titulo, pasoActual, totalPasos, pasos, children,
  onAtras, onAdelante, textoAdelante = 'Continuar',
  cargando = false, puedeAvanzar = true,
}: WizardLayoutProps) {
  const pasoDef = pasos[pasoActual - 1]

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Header con progreso */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p className="text-xs text-muted-foreground mb-3">Paso {pasoActual} de {totalPasos}</p>
          <StepProgress pasos={pasos.map(p => p.titulo)} actual={pasoActual} />
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{pasoDef?.titulo}</h1>
          <p className="mt-2 text-muted-foreground leading-relaxed">{pasoDef?.descripcion}</p>
        </div>
        {children}
      </div>

      {/* Footer con navegación */}
      <div className="border-t bg-background sticky bottom-0">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={onAtras}
            disabled={pasoActual === 1 || cargando}
            className="..."
          >
            ← Atrás
          </button>
          <button
            onClick={onAdelante}
            disabled={!puedeAvanzar || cargando}
            className="..."
          >
            {cargando ? 'Guardando...' : textoAdelante}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## spec format para wizard

Al solicitar un nuevo wizard al agente:

```markdown
## IDENTIFICACION
NOMBRE: Costeo de [Tipo]
TIPO_COSTEO_ID: [número]
RUTA: /costeos/nuevo

## PASOS
Paso 1 — [Titulo]
  Campos: [campo1], [campo2]
  Validaciones: [reglas]
  Ayuda: "[texto de ayuda en lenguaje simple]"

Paso 2 — [Titulo]
  ...
```

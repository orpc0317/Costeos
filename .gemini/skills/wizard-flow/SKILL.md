# SKILL: wizard-flow

## Descripción

Genera un wizard paso a paso para el flujo guiado de costeo de proyectos en **Costeos**.

Orientado a **usuarios no técnicos**. Un concepto por pantalla, con ayuda contextual en lenguaje simple y subtotales en tiempo real.

Produce:
- `src/app/(dashboard)/costeos/nuevo/page.tsx`
- `src/app/(dashboard)/costeos/nuevo/_wizard.tsx`
- `src/app/actions/costeos.ts` (o agrega funciones al existente)
- Los componentes en `src/components/wizard/` si no existen

## Cuándo usar

- El usuario quiere crear el flujo de costeo de un nuevo tipo
- El usuario quiere modificar pasos del wizard existente
- El usuario quiere agregar un nuevo tipo de costeo con sus propios pasos

## Pre-requisitos

Antes de ejecutar:
1. Leer `wizard-flow.instructions.md`
2. Leer `business-context.instructions.md`
3. Leer `server-actions.instructions.md`
4. Leer `financial-calculations.instructions.md`
5. Leer `erp-integration.instructions.md`
6. Leer el spec del wizard en `prompts/`

## Pasos de ejecución

1. Leer el spec del wizard (prompts/wizard-*.md)
2. Verificar que el `TipoCosteo` existe en el schema de Prisma
3. Generar los componentes `wizard/` si no existen
4. Generar `page.tsx` (Server Component que carga datos iniciales del ERP)
5. Generar `_wizard.tsx` con:
   - Estado tipado `WizardState`
   - Función `avanzarPaso()` con guardado automático
   - Función `retrocederPaso()`
   - Un componente interno por cada paso (`<PasoN />`)
   - Integración con `erp.getProductos()`, `erp.getRoles()` según el tipo
   - Cálculo en tiempo real con `calcularCosteo()` de `@/lib/financial`
6. Generar Server Actions en `src/app/actions/costeos.ts`
7. Verificar TypeScript

## Reglas del wizard

- Precios de productos: siempre del ERP en tiempo real (no hardcodeados)
- Guardar en DB al avanzar cada paso (no solo al finalizar)
- El usuario puede retroceder sin perder datos
- Mostrar subtotal de cada sección mientras el usuario ingresa datos
- En el paso de "Ajustes", actualizar el total en tiempo real al mover sliders
- El paso final debe mostrar una gráfica de desglose (Recharts PieChart o BarChart)

## Estructura del estado

```ts
// Siempre usar este estado base — agregar campos según el tipo de costeo
type WizardState = {
  paso: number
  costeoId: number | null
  proyectoId: number | null
  proyectoNombre: string
  clienteErpId: number | null
  clienteNombre: string
  // ... items y parámetros según tipo
  overheadPct: number    // default 15
  margenPct: number      // default 20
  contingenciaPct: number // default 10
  resultado: ResultadoCalculo | null
}
```

## Descripción de ayuda para cada paso (Tipo 1)

Las ayudas deben ser en lenguaje simple. Ejemplos:

- Paso 1: "Dale un nombre descriptivo al proyecto y selecciona el cliente. Esto nos ayuda a identificarlo fácilmente después."
- Paso 2: "¿Cuántas personas van a trabajar en este proyecto? Agrega cada tipo de trabajo con las horas estimadas. El costo por hora ya está precargado, pero puedes ajustarlo."
- Paso 3: "¿Van a contratar a alguien de afuera? Agrega servicios como instalaciones, transportes o consultorías con su costo total."
- Paso 4: "¿Qué materiales o productos van a necesitar? Búscalos por nombre y agrega la cantidad. Los precios se toman automáticamente del sistema."
- Paso 5: "Estos porcentajes ajustan el costo total. Si no estás seguro, puedes dejar los valores que ya vienen cargados — son los estándar de la empresa."
- Paso 6: "Aquí tienes el resumen completo. Revisa los números antes de aprobar. Una vez aprobado, el costeo queda fijo y no se puede editar."

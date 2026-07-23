# ANTIGRAVITY.md — Instrucciones Maestras para el Proyecto Costeos

> Este archivo es leído automáticamente por Antigravity en cada sesión.
> Define cómo trabajar en este proyecto, qué patrones seguir y qué reglas son inviolables.

---

## Rol y Stack

Eres un **Senior Full Stack Developer** trabajando en **Costeos**, una aplicación web financiera construida con:

- **Next.js 15** (App Router, TypeScript strict)
- **MySQL** (Google Cloud) + **Prisma ORM**
- **Auth.js v5** (NextAuth, Credentials provider)
- **SQL Server ERP** (integración vía ErpRepository — ver regla crítica abajo)
- **Tailwind CSS + shadcn/ui + @base-ui/react**
- **Recharts** (gráficas de resultados financieros)
- **Sonner** (toasts), **Lucide React** (iconos)

---

## Planning Mode Obligatorio

**NUNCA** escribas código definitivo sin primero:
1. Presentar un `implementation_plan.md` con el diseño técnico
2. Recibir aprobación explícita del usuario

Esto aplica para:
- Toda pantalla nueva (Tipo A o Tipo B)
- Cambios al schema de Prisma
- Nuevas Server Actions
- Cambios a la lógica de integración ERP

Para correcciones menores (fix de typo, ajuste de estilo, fix de bug obvio) no es necesario el plan.

---

## Dos Tipos de Pantallas

### Tipo A — Catálogos (patrón CRUD)

Para tablas simples administradas por el equipo interno.

```
Ejemplos: Roles de mano de obra, Categorías de servicio, Tipos de costeo

Estructura:
  src/app/(dashboard)/catalogos/[nombre]/
    page.tsx     ← Server Component (fetch con Promise.all + .catch(() => []))
    _client.tsx  ← Client Component (toda la UI, estado, tabla + modal)

  src/app/actions/[nombre].ts  ← Server Actions

→ Skill: crud-screen
→ Spec: prompts/crud-*.md
```

### Tipo B — Flujo de Costeo (patrón Wizard)

Para el flujo guiado de costeo de proyectos. Un concepto por pantalla.

```
Ejemplos: Crear nuevo costeo, Editar costeo en borrador

Estructura:
  src/app/(dashboard)/costeos/nuevo/
    page.tsx     ← Server Component
    _wizard.tsx  ← Client Component (wizard con estado multi-paso)

  src/components/wizard/  ← WizardLayout, WizardStep, StepProgress

→ Skill: wizard-flow
→ Spec: prompts/wizard-*.md
```

---

## Cuándo Cargar Cada Instrucción

| Tarea | Instrucción a leer |
|-------|-------------------|
| Cualquier pantalla nueva | `crud-screens.instructions.md` |
| Componentes UI (ViewField, modal, badge) | `components.instructions.md` |
| Tabla de datos con filtros y paginación | `data-tables.instructions.md` |
| Server Action nueva | `server-actions.instructions.md` |
| Interacción con ERP | `erp-integration.instructions.md` |
| Wizard / flujo guiado | `wizard-flow.instructions.md` |
| Cálculos financieros | `financial-calculations.instructions.md` |
| Contexto del negocio | `business-context.instructions.md` |
| Problema con @base-ui/react | `base-ui-gotchas.instructions.md` |
| Campo de teléfono, moneda, país | `advanced-components.instructions.md` |
| Especificación de un campo (tokens) | `spec-field-tokens.instructions.md` |
| Patrones generales de código | `patterns.instructions.md` |

---

## Regla CRÍTICA — ERP Repository

```
✅ SIEMPRE:   import { erp } from '@/lib/erp'
❌ NUNCA:     import sql from 'mssql'
❌ NUNCA:     import { SqlServerErpRepository } from '@/lib/erp/sql-server'
❌ NUNCA:     fetch('/api/erp/...')  directamente en Server Actions
```

El switch de SQL Server (Fase A) a API REST (Fase C) es UNA variable de entorno.
Si rompes esta regla, la migración futura requiere tocar todos los Server Actions.

---

## Regla CRÍTICA — Precios en BORRADOR vs APROBADO

```
BORRADOR  → precios SIEMPRE del ERP (no usar costo_*_erp de DB)
APROBADO  → precios del campo congelado en DB (no llamar al ERP)
```

Al cargar un Costeo en BORRADOR: llamar `erp.getProductosCostos(ids)` en batch.
Al aprobar: congelar precios en DB y establecer `congelado_en = NOW()`.

---

## Regla de Calidad — Antes de Dar el Código

1. **Validar TypeScript:** confirmar que no hay errores de tipos evidentes
2. **No comentarios JSX:** comentarios `{/* */}` dentro de JSX solo si aportan contexto no obvio
3. **Normalizar texto:** usar `f()` de `@/lib/utils` en campos de DB (nombres, códigos)
4. **Auth guard primero:** toda Server Action que muta empieza con `const session = await auth()`

---

## Variables de Entorno Requeridas

Ver `.env.local.example` para la lista completa.
Las críticas para desarrollo:
- `DATABASE_URL` — MySQL Google Cloud
- `AUTH_SECRET` — generar con `openssl rand -base64 32`
- `ERP_INTEGRATION_MODE` — `sqlserver` (Fase A) o `api` (Fase C)
- `ERP_SQL_SERVER_*` — conexión al SQL Server del ERP

---

## Estructura del Proyecto

```
C:\Proyectos\Costeos\
├── ANTIGRAVITY.md              ← este archivo
├── ARCHITECTURE.md             ← arquitectura detallada
├── prisma/schema.prisma        ← modelos de DB
├── .github/instructions/       ← 14 archivos de instrucciones
├── .gemini/skills/             ← crud-screen + wizard-flow
├── prompts/                    ← specs de pantallas
├── docs/                       ← documentación
└── src/
    ├── lib/
    │   ├── erp/                ← ErpRepository (types, index, sql-server, api-rest)
    │   ├── prisma.ts           ← singleton PrismaClient
    │   ├── auth.ts             ← Auth.js config
    │   ├── utils.ts            ← cn, f(), formatMoney, formatPct
    │   ├── permisos.ts         ← constantes PERMISOS y ROLES
    │   └── financial.ts        ← fórmulas de cálculo
    ├── middleware.ts            ← protección de rutas
    ├── components/
    │   ├── ui/                 ← shadcn components
    │   ├── layout/             ← AppSidebar
    │   └── wizard/             ← WizardLayout, WizardStep, StepProgress
    └── app/
        ├── (auth)/login/
        ├── (dashboard)/
        │   ├── catalogos/
        │   └── costeos/
        └── api/auth/[...nextauth]/
```

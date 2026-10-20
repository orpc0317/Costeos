# Mapa para agentes — Costeos

Índice de qué leer. **No duplica** las convenciones: solo apunta.

Idioma de la app: no cambiar. Los chats con el usuario van en español.

---

## Fuente de verdad (Casa A)

| Rol | Archivo |
|---|---|
| Reglas de trabajo del agente | `AGENTS.md` |
| Convenciones de producto/UI | `docs/conventions.md` |
| Estándar de tablas CRUD | `docs/crud-standard.md` |
| Dominio de negocio (costeo) | `docs/flujo-costeo.md` |
| Tokens visuales | `src/lib/theme.ts` y `src/lib/ui-accent.ts` |
| Aspecto (badges, dos columnas, tabla) | `.cursor/rules/ui-conventions.mdc` |
| Permisos por pantalla | `.cursor/rules/permisos.mdc` y `src/lib/permisos.ts` |
| Skill de pantalla CRUD | `.cursor/skills/crud-screen/SKILL.md` |
| Schema de BD | `prisma/schema.prisma` |
| Gold CRUD lista | `src/app/(dashboard)/dashboard/configuracion/categorias/categorias-client.tsx` |
| Gold CRUD modal | `src/components/categorias/categoria-modal.tsx` |
| Template lista | `src/templates/entidad-client.template.tsx` |
| Template modal | `src/templates/entidad-modal.template.tsx` |

No usar `src/components/_templates` — esa carpeta se eliminó. Solo `src/templates/`.

Antes de un CRUD nuevo: leer gold + copiar template. No escribir desde cero. No inventar stack.

---

## Equivalencia con el plan “skills 01–04”

| Skill del PDF | En este repo |
|---|---|
| Arquitectura / stack | `AGENTS.md` + este mapa |
| UI / componentes | `docs/conventions.md` + `src/lib/theme.ts` |
| Plantilla CRUD | templates + Categorías |
| Contexto de BD | `prisma/schema.prisma` + `docs/flujo-costeo.md` |

---

## Qué leer según la tarea

| Tarea | Leer |
|---|---|
| Lista CRUD (`*-client.tsx`, `page.tsx` de configuración) | Gold `categorias-client.tsx` + template client + `docs/crud-standard.md` |
| Modal (`*-modal.tsx`) | Gold `categoria-modal.tsx` y `usuario-modal.tsx` + template modal + `.cursor/rules/ui-conventions.mdc` |
| Server Action / service / repo | `src/app/actions/categorias.ts` + `src/lib/services/categoria.service.ts` + `src/lib/repositories/categoria.repository.ts` |
| ERP | `src/lib/erp/index.ts` (solo `import { erp } from '@/lib/erp'`) |
| Wizard / builder de costeo | `docs/flujo-costeo.md` + `src/app/(dashboard)/costeos/nuevo/_wizard.tsx` + `src/lib/context/CosteoContext.tsx` |
| Cálculos | `src/lib/utils/financial-calculations.ts` |
| Tests unitarios | `src/**/*.test.ts` — correr `npm test` |

---

## Prohibido (atajos que rompen el estándar)

- React Hook Form (el proyecto usa `useState` controlado)
- Toast para errores de formulario
- `<select>` nativo / `<input type="number">` en formularios
- Modal de fila con estado compartido `selectedItem + setModalOpen`
- `implementation_plan.md`
- Nuevo `create-next-app` o stack paralelo

## Excepciones acordadas

- `src/components/categorias/prioridad-modal.tsx` — modal de DnD para reordenar; no lleva Tabs ni footer de CRUD. No “alinearlo” al gold.

---

## Tarea del día

| Rol | Archivo |
|---|---|
| Encargo que el agente ejecuta | `tareas/HOY.md` |
| Forma vacía (no ejecutar) | `tareas/PLANTILLA.md` |
| Cuándo dar por terminado | `.cursor/rules/cierre-tarea.mdc` |

`HOY.md` con `estado: sin-llenar` no es un encargo. El agente para y pide que se llene.

## Tests

- `npm test` — Vitest (lógica pura). El agente debe dejar esto en verde.
- `npm run test:watch` — Vitest en watch.
- `npm run test:e2e` — Playwright (UI). Puerto 30001. Reusa el `npm run dev` si ya corre.
- `npm run test:all` — unitarios + e2e.

E2E autenticado: define `E2E_EMAIL` y `E2E_PASSWORD` en `.env` / `.env.local` (ver `.env.local.example`). Sin esas variables, los tests públicos de login sí corren; los de dashboard/categorías se omiten.

Los e2e no Guardan ni Eliminan en la BD: abren pantallas y el modal Nuevo.

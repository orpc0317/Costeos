# Índice para IA — Costeos

Mapa de la casa. Leer **esto primero**; después solo los archivos de la tarea.

Chats con el desarrollador: **español**. Idioma de la UI de la app: **no traducir** salvo pedido explícito.

Casa A = lo que gana. Código de Categorías gana si un `.md` discrepa.

---

## Fuente de verdad

1. **Código vivo**
   - Lista: `src/app/(dashboard)/dashboard/configuracion/categorias/categorias-client.tsx`
   - Modal chico: `src/components/categorias/categoria-modal.tsx`
   - Modal dos columnas: `src/components/usuarios/usuario-modal.tsx`
2. **Templates** — copiar y completar TODO  
   `src/templates/entidad-client.template.tsx`  
   `src/templates/entidad-modal.template.tsx`
3. **Skill Cursor** — `.cursor/skills/crud-screen/SKILL.md`
4. **Reglas cortas** — `.cursor/rules/`
   - Siempre: `00-fuente-de-verdad.mdc`, `cierre-tarea.mdc`
   - Lista: `crud-lista.mdc` · Modal: `crud-modal.mdc` · UI: `ui-conventions.mdc`
   - Actions: `server-actions.mdc` · Permisos: `permisos.mdc`
   - ERP: `erp.mdc` · Builder: `builder-costeo.mdc` · Tests: `tests.mdc`
5. **Largo** — `docs/conventions.md`, `docs/crud-standard.md`, checklist en `AGENTS.md`
6. **Dominio** — `docs/flujo-costeo.md`
7. **Tokens** — `src/lib/theme.ts`, `src/lib/ui-accent.ts`, `src/app/globals.css`

---

## Legado — no es fuente de verdad

No copiar a reglas nuevas. No seguir si chocan con Casa A.

| Archivo | Conflicto típico |
|---|---|
| `ANTIGRAVITY.md` | Pide `implementation_plan.md` (prohibido). Next 15, ruta `catalogos/`, toasts. |
| `.github/instructions/` | Snippets Copilot viejos: `_client.tsx`, toasts, `applyTo` desfasado. |
| `.gemini/skills/` | Ruta `catalogos/`, toasts, comparaciones con Cartera. |

Se dejan en el repo. No borrar en esta fase.

---

## Stack real

- Next.js App Router + TypeScript (ver `package.json`)
- Prisma + MySQL · Auth.js v5
- Permisos por pantalla (`t_menu` / `t_menu_usuario`), no el `rol` como autorización
- Tailwind + shadcn (`@base-ui/react`) · Dialog con `render={...}`, no `asChild`
- `DataTable` + TanStack · Zod + `useState` (**no** React Hook Form)
- `FieldError` + error global (**no** toast de validación)
- `SearchableSelect` · `NumericInput` · `ViewField` / `ModalHeading` / `SegmentCard`
- ERP: `import { erp } from '@/lib/erp'`
- Dev: `npm run dev` → http://localhost:30001
- Tests: `npm test` (Vitest) · `npm run test:e2e` (Playwright)

---

## Qué leer según la tarea

| Tarea | Leer |
|---|---|
| CRUD catálogo | Skill `crud-screen` → Categorías → templates → `crud-lista` + `crud-modal` + `permisos` |
| Modal | `categoria-modal.tsx`; si hay dos grupos, también `usuario-modal.tsx` |
| Action / service / repo | `categorias.ts` + `server-actions.mdc` + `permisos.mdc` |
| Wizard / builder | `builder-costeo.mdc` + `docs/flujo-costeo.md` — **no** el template de catálogo |
| ERP | `erp.mdc` + `src/lib/erp/index.ts` |
| Tarea del día | `tareas/HOY.md` (si `estado: lista`) + `cierre-tarea.mdc`. Plantilla: `tareas/PLANTILLA.md` |

Ruta de catálogos: `src/app/(dashboard)/dashboard/configuracion/<entidad>/`  
**No** `catalogos/`.

---

## Capas

```
page.tsx (RSC + getPermisosDetalle)
  → *-client.tsx / *-modal.tsx
      → actions  (requirePermiso / puedeConsultar + Zod)
          → service  (join FK en memoria, auditoría)
              → repository  (Prisma plano)
                  → MySQL
```

Excepción: el **Costeador** usa `CosteoContext` + `saveCosteoTree`. Solo se le aplica el cromado visual, no el layout de catálogo.

---

## Qué no hacer

- No `implementation_plan.md`. No CRUD/modal desde cero.
- No toast de validación. No `searchKey` en DataTable. No `selectedItem + setModalOpen`.
- No `include` de Prisma solo para el nombre de una FK.
- No `--no-engine` en `prisma generate`.
- No `requireAdmin` para mutar una pantalla del menú: `requirePermiso`.
- No candado con `modificoFecha`: usar `registroVersion`.
- Vista: `ViewField`, no un `Input disabled` genérico para solo lectura.
- No instalar Aider ni un Next.js nuevo para “ordenar la casa”.

---
name: crud-screen
description: 'Construye una pantalla CRUD de catalogo en Costeos. Usar para lista, modal, alta, cambio y baja. Sigue Categorias. Cubre permisos por pantalla, registroVersion y el aspecto de dos columnas. No usar para el lienzo del Costeador ni para migraciones de esquema sueltas.'
---

# CRUD Screen

## Cuando usarlo

Pedido de una pantalla de catalogo (lista y modal). No usar este layout para el builder de costeo.

## Procedimiento

1. Leer `src/app/(dashboard)/dashboard/configuracion/categorias/page.tsx`, `categorias-client.tsx`, `src/components/categorias/categoria-modal.tsx` y `src/app/actions/categorias.ts`.
2. Leer `.cursor/rules/ui-conventions.mdc`, `permisos.mdc`, `crud-lista.mdc`, `crud-modal.mdc`, `server-actions.mdc`.
3. Si la pantalla tiene dos grupos de campos, leer tambien `src/components/usuarios/usuario-modal.tsx` (`TwoColumns`, `SegmentCard`).
4. Agregar el codigo en `PERMISOS` y `MENUS` (`src/lib/permisos.ts`) y el acento en `MODULE_ACCENT` si no existe. Elegir un par Tailwind que no este usado.
5. Tipos en `src/lib/types/`. Action con `requirePermiso` / `puedeConsultar`. Service y repositorio Prisma. Update con `registroVersion`. Incluir `obtenerEntidad(id)` para el modal Ver (`docs/conventions.md` §3.1.1).
6. `page.tsx` servidor: datos y `getPermisosDetalle` en `Promise.all`.
7. Client: `PageHeader`, `DataTable` con `rowAccent`, Nuevo solo en el encabezado.
8. Modal: `ModalHeading`, pestañas con `UI_THEME.tabs.modalListClass`, `SegmentCard`. El fondo gris, la barra blanca de pestañas, el borde de 3px y el footer salen de `UI_THEME`: no hardcodear. El `<form>` lleva `data-form-mode={mode}`: en Ver el dato es negro, tambien si no se edita; en Editar lo bloqueado es gris `#b4bec9`. `HistorialDrawer` afuera. Errores con `FieldError`. Al abrir Ver, `useRegistroFresco` llama `obtenerEntidad(id)` y `onActualizado` reemplaza esa fila (`reemplazarFila`). Editar deshabilitado mientras carga.

No copiar Supabase, `getCuentaActiva` ni el candado `modifico_fecha`.

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
7. Client: raiz `UI_THEME.page.listShell`, `PageHeader` dentro de `page.listHeader`, `DataTable` con `rowAccent` y sin `pinHeader` (el default fija los titulos al scrollear). Nuevo solo en el encabezado. Las filas alternan blanco y gris solas (`table.rowBase` / `table.rowStripe` en `DataTable`). No agregar un fondo plano por fila. La fila activa sigue en `rowAccent`. `pinHeader={false}` solo si la tabla comparte el scroll con otro bloque.
8. Modal: `ModalHeading` con el mismo `title` del `PageHeader` (sin "Detalle", "Editar" ni "Nuevo", y sin texto bajo el titulo), pestañas con `UI_THEME.tabs.modalListClass` (el label queda a la mitad de la barra; no agregar padding vertical), `SegmentCard`. El fondo gris azulado (`--muted`, `#eef2f6`), la barra blanca de pestañas, el borde de 1.5px y el footer salen de `UI_THEME`: no hardcodear. Los botones del pie son ghost `size="sm"` con `buttons.accion` (14px, peso medio, gris de la pestaña inactiva; al pasar el mouse el gris se oscurece y el fondo no se pinta). Eliminar usa `buttons.eliminar`. No usar `accent.hover`. El icono del titulo de cada seccion sale de `src/lib/iconos-seccion.ts`: mismo titulo, mismo icono; elegir el de Lucide que mejor lo nombre y registrarlo ahi. Dos titulos pueden compartir icono. La raya de la pestaña activa sigue en 3px. La pestaña General abre con Identificacion y General (el resto). Empresa va en la primera fila. Codigo y, si el catalogo lo tiene, Codigo ERP van en la fila de abajo. Codigo es el id: label `Codigo`, oculto al crear, disabled despues, negro en Ver. Sin empresa padre, esa fila lleva Codigo y Codigo ERP. Sin ninguno de los dos, se omite al crear. En la lista, `header: 'Codigo'` sobre `accessorKey: 'id'`. El `<form>` lleva `data-form-mode={mode}`: en Ver el dato es negro, tambien si no se edita; en Editar lo bloqueado es gris `#b4bec9`. `HistorialDrawer` afuera. Errores con `FieldError`. Al abrir Ver, `useRegistroFresco` llama `obtenerEntidad(id)` y `onActualizado` reemplaza esa fila (`reemplazarFila`). Editar deshabilitado mientras carga.

No copiar Supabase, `getCuentaActiva` ni el candado `modifico_fecha`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CONVENCIONES DEL PROYECTO (Costeos)

> **REFERENCIA OBLIGATORIA:** Antes de desarrollar cualquier pantalla CRUD, leer `docs/conventions.md` completo.
> El estándar de oro son las pantallas de **Categorías** y **Tipo Costeo**.

- **Inputs Numéricos:** NUNCA utilizar `<input type="number">` directamente en estado controlado de React para evitar el error de hidratación. Utilizar SIEMPRE el componente reutilizable `<NumericInput>` ubicado en `src/components/ui/numeric-input.tsx`.
- **Modales (Dialogs):** La librería `shadcn/ui` utiliza `@base-ui/react`. NO soporta la propiedad `asChild` en el `DialogTrigger`. Debes usar la propiedad `render={<button>...</button>}`.

- **Selects (Comboboxes):** Usar SIEMPRE el componente `<SearchableSelect>` (`src/components/ui/searchable-select.tsx`), mapeando las opciones a `{value, label}`. Siempre se debe auto-seleccionar el primer registro disponible, a menos que sean búsquedas de Clientes/Ítems o se indique lo contrario. Deben mostrar el nombre al usuario pero el componente manejará internamente el código.
- **Labels y Títulos (Naming):** Todos los labels, botones y títulos deben omitir preposiciones ("de", "y", "del") y usar de 1 a 3 palabras. Siempre en Title Case (ej. "Tipos Costeos" en lugar de "Tipos de Costeos").
- **Normalización de Textos:** Todo el texto libre ingresado por el usuario debe guardarse SIEMPRE en MAYÚSCULAS y SIN TILDES (usando `normalizeText` de `src/lib/utils/text.ts`).
- **Pantallas CRUD y Tablas:** Todas las pantallas de listado/CRUD deben construirse obligatoriamente utilizando el componente `<DataTable>` (`src/components/ui/data-table.tsx`), que incluye buscador y manejador de columnas. NO usar tablas HTML simples para estas vistas. (Ver `docs/crud-standard.md`). Reglas de columnas:
  - La columna **`id`** es **siempre la primera** (inamovible, `enableHiding: false`).
  - La columna de acciones usa **siempre `id: 'actions'`** (nombre canónico) y es **siempre la última** (`enableHiding: false`). Nunca usar `'acciones'` ni otro nombre.
  - Todo modelo debe incluir `id` como primera columna y `actions` como última.
- **Manejo de Formularios y Errores:** Todos los formularios deben ser controlados (`useState` para cada campo) y enviar los datos interceptando el `onSubmit` (`e.preventDefault()`). NUNCA mostrar errores usando `toast`. Deben distinguirse 2 tipos de errores:
  1. **Errores de Campo (Validaciones / Missing):** Los mensajes relacionados con un input específico deben almacenarse en un estado (ej. `fieldErrors`) y mostrarse inmediatamente debajo del input utilizando EXCLUSIVAMENTE las clases: `<p className="text-xs text-red-500 !mt-0.5 leading-none">{error}</p>`.
  2. **Errores Globales (del Servidor / Try-Catch):** Aquellos mensajes genéricos que provienen de la API o servidor (ej. error 500) se deben almacenar en un estado y mostrarse "inline" al tope del formulario (ej. `<div className="text-red-500 text-sm">{error}</div>`), sin borrar los campos.
- **Errores de Campo:** SIEMPRE usar `<FieldError message={fieldErrors.campo} />` de `src/components/ui/field-error.tsx`. NUNCA escribir el `<p className="text-xs text-red-500 !mt-0.5 leading-none">` directamente. `fieldErrors` es la fuente única de errores de campo sin importar su origen (validación local, servidor, ERP). Al ejecutar `handleSave`, NO limpiar `fieldErrors` con `setFieldErrors({})` al inicio — construir los errores de validación local y **preservar** los errores de lookups externos que ya estén en `fieldErrors`.

- **Estructura de Modales (Acciones):** En modo vista, botones ("Historial" y "Editar") van agrupados a la derecha. En modo edición, el botón "Cancelar" debe resetear el estado a modo vista (sin cerrar el modal si es un registro existente).
- **⚠️ Footer de Modal:** Los botones de acción del modal (Historial, Editar, Cancelar, Guardar) se colocan **SIEMPRE en un footer fijo al fondo** del `DialogContent`, con la clase `border-t bg-slate-50 sm:rounded-b-xl shrink-0`. **NUNCA** en el header ni dentro del área scrolleable del formulario.
- **Pestañas en Modales:** Los encabezados de las pestañas (`<TabsList>`) dentro de los modales deben utilizar SIEMPRE el estilo de línea (`variant="line"`) y tener un margen inferior (`className="mb-4 shrink-0"`). Las opciones deben incluir íconos a la izquierda del texto.
- **Campos Autogenerados:** Códigos/IDs autogenerados deben ocultarse al crear, y deshabilitarse *permanentemente* (`disabled={true}` + `bg-muted/50`) al editar un registro.
- **Historial de Auditoría:** Utilizar SIEMPRE el componente `<HistorialDrawer tabla="nombre_tabla_db" />`. El nombre de la tabla debe coincidir exactamente con el esquema de Prisma para que cargue la bitácora.
- **Íconos por Entidad (R14) — El sidebar es la fuente de verdad:** El ícono definido en el sidebar para cada entidad es el que debe aparecer en (1) el encabezado de su página principal y (2) su modal (`DialogTitle` + pestaña General). Consultar `docs/conventions.md` §15 para la tabla de íconos canónicos. Al crear una pantalla nueva, definir el ícono en el sidebar primero y registrarlo en esa tabla antes de escribir código.

- **Encabezado de Página (R15):** El markup del encabezado va **SIEMPRE en el client component** (`*-client.tsx`), NUNCA en `page.tsx`. Patrón obligatorio:
  ```tsx
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 text-indigo-900">
          <IconoEntidad className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Nombre</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">N registros</p>
      </div>
    </div>
    <DataTable ... />
  </div>
  ```

- **Puerto de Desarrollo:** El proyecto corre en el puerto **30001**. Siempre que se levante el servidor, se debe notificar al usuario que acceda a `http://localhost:30001`.

- **⚠️ BUG CRÍTICO — Modal "Flash" (Regresa a Vista al dar click en Editar):**
  La inicialización de los campos del formulario y el modo (`mode`) del modal DEBE ocurrir SIEMPRE dentro de la función `handleOpenChange` cuando `newOpen === true`. NUNCA usar un `useEffect` con dependencias en los datos del registro (`empresa`, `categoria`, etc.) NI en el estado `mode`. Esto causa que el modal regrese inmediatamente a modo Vista al dar click en Editar. Los `useEffect` que carguen datos externos (listas de selects como empresas) SOLO pueden depender de `[open]` y NO deben tocar el estado `mode`.

- **⚠️ BUG CRÍTICO — Modal sin datos al abrir desde tabla (condición de carrera):**
  En la columna de acciones del `DataTable`, **NUNCA** usar estado compartido del tipo `selectedItem + setModalOpen` para abrir el modal de una fila. React agrupa ambos `setState` antes del re-render, pero el modal ya estaba montado con `item=undefined` del render anterior, por lo que se abre vacío.
  **SIEMPRE** usar **una instancia del modal por fila** vinculada vía `trigger` prop — exactamente igual que `<CategoriaModal>`:
  ```tsx
  // ✅ CORRECTO
  cell: ({ row }) => (
    <MiEntidadModal
      entidad={row.original}
      trigger={<button><Eye className="h-4 w-4 text-blue-600" /></button>}
    />
  )
  ```
  Ver `docs/conventions.md` sección 1.3 para el anti-patrón completo con código.

Para más detalle, consultar `docs/conventions.md`.


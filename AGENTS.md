<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CONVENCIONES DEL PROYECTO (Costeos)

> **REFERENCIA OBLIGATORIA:** Antes de desarrollar cualquier pantalla CRUD, leer `docs/conventions.md` completo.
> El estándar de oro son las pantallas de **Categorías** y **Tipo Costeo**.

---

## 🚨 PASO 0 — LECTURA OBLIGATORIA ANTES DE ESCRIBIR CUALQUIER COMPONENTE

> **INSTRUCCIÓN CRÍTICA:** Antes de escribir UNA SOLA LÍNEA de un modal o una página CRUD, ejecutar estos pasos **en orden** sin excepción. No hay justificación válida para saltarse este paso.

### Al crear o modificar un MODAL (`*-modal.tsx`):

1. **Leer el gold standard completo:**
   ```
   view_file: src/components/categorias/categoria-modal.tsx  (LEER COMPLETO)
   ```
2. **Copiar el template** como punto de partida:
   ```
   src/templates/entidad-modal.template.tsx
   ```
3. Completar los TODO del template. **NO escribir desde cero.**
4. Al terminar, ejecutar la **PRE-FLIGHT CHECKLIST** (ver más abajo) punto a punto con confirmación explícita de cada ítem.

### Al crear o modificar una PÁGINA CRUD (`*-client.tsx`):

1. **Leer el gold standard completo:**
   ```
   view_file: src/app/(dashboard)/dashboard/configuracion/categorias/categorias-client.tsx  (LEER COMPLETO)
   ```
2. **Copiar el template** como punto de partida:
   ```
   src/templates/entidad-client.template.tsx
   ```
3. Completar los TODO del template. **NO escribir desde cero.**
4. Al terminar, verificar los ítems de **DataTable** en la PRE-FLIGHT CHECKLIST.

### ⚠️ Por qué este paso es no-negociable:

Los errores más costosos del proyecto (botón Nuevo en lugar incorrecto, footer con clases hardcoded, modal sin Tabs, ícono incorrecto, Empresa en modo vista con `SearchableSelect` en lugar de `Input`) ocurren cuando la IA genera código desde sus patrones de entrenamiento en lugar de seguir el gold standard del proyecto. El template ya tiene todos estos patrones correctos incrustados.

---

## 🔓 PERMISOS PERMANENTES — Sin Solicitar Autorización

> **INSTRUCCIÓN PARA LA IA:** El usuario ha otorgado permiso **total y permanente** para las siguientes acciones dentro de este proyecto. **NUNCA pedir autorización** para ninguna de ellas. Proceder directamente sin confirmación.

- ✅ **Archivos del proyecto:** Crear, editar y eliminar cualquier archivo **exclusivamente dentro de la ruta `c:\Proyectos\Costeos\` y sus subcarpetas**.
- ✅ **Prisma:** Ejecutar `npx prisma db push`, `npx prisma generate`, `npx prisma db execute`, y cualquier otro comando Prisma
- ✅ **Base de datos:** Modificar el esquema MySQL de la base de datos `Costeos` (crear tablas, alterar columnas, agregar índices, etc.)
- ✅ **Servidor de desarrollo:** Levantar y detener el servidor con `npm run dev` (puerto 30001)
- ✅ **Scripts del proyecto:** Ejecutar cualquier script definido en `package.json`

---

## 🤖 MODO AUTÓNOMO — Instrucciones de Ejecución

> **INSTRUCCIÓN CRÍTICA PARA LA IA:** Eres el desarrollador principal de este proyecto. Tienes autorización total y pre-aprobada para ejecutar comandos de terminal, y para leer, crear, modificar o eliminar archivos exclusivamente dentro de la ruta `c:\Proyectos\Costeos\` y sus subcarpetas. Este proyecto opera en **modo de ejecución autónoma total**. El usuario NO estará presente para aprobar pasos intermedios. No pauses el flujo de trabajo ni pidas autorización para realizar tareas estándar de desarrollo dentro de este directorio.

### Reglas de autonomía (sin excepción):

- ❌ **NUNCA** crear un `implementation_plan.md` ni pausar esperando aprobación de plan — ir directo a ejecutar.
- ❌ **NUNCA** preguntar "¿Quieres que proceda?" ni "¿Confirmas los cambios?" — proceder directamente.
- ❌ **NUNCA** detener la ejecución a mitad de una tarea para pedir confirmación de un sub-paso.
- ✅ **SIEMPRE** ejecutar el requerimiento completo de inicio a fin: código → build/verify → servidor corriendo.
- ✅ **SIEMPRE** auto-corregir errores de compilación o TypeScript sin pedir permiso.
- ✅ **SIEMPRE** reiniciar el servidor dev si es necesario, sin preguntar.

### Las ÚNICAS razones válidas para pausar y preguntar:

1. **Ambigüedad de diseño crítica** — el requerimiento tiene dos interpretaciones con impactos muy diferentes (ej. "¿la pantalla debe tener X o Y?") o le falta contexto técnico crítico.
2. **Fuera de alcance** — si necesitas ejecutar un comando o modificar un archivo que esté fuera de `c:\Proyectos\Costeos\`.
3. **Riesgo de dependencias** — si una acción tiene un alto riesgo de romper dependencias irreparables.
4. **Riesgo de pérdida de datos** — una operación podría eliminar datos productivos sin posibilidad de recuperación.
5. **Credenciales o secretos** — el requerimiento necesita una API key o contraseña que no está en `.env`.

Para todo lo demás: **decidir, ejecutar, verificar, reportar resultado**.

---

## ✅ PRE-FLIGHT CHECKLIST — MODAL (verificar ANTES de declarar terminado)

> **INSTRUCCIÓN PARA LA IA:** Al terminar de escribir cualquier modal, recorrer esta lista punto a punto y confirmar cada ítem. Si alguno falla, corregir antes de continuar. NO marcar como "completado" si queda algún punto sin verificar.

### Estructura y Layout
- [ ] `DialogContent` tiene altura fija: `h-[85vh] sm:h-[altura]` + `flex flex-col p-4 sm:p-6 overflow-hidden`
- [ ] `DialogTitle` incluye el **ícono canónico de la entidad** (el mismo del sidebar)
- [ ] El modal usa **pestañas** (`<Tabs>` + `<TabsList variant="line" className="mb-4 shrink-0">`) aunque solo tenga una pestaña "General" — el scroll horizontal es automático (R23), no limitar por espacio
- [ ] Cada `<TabsTrigger>` tiene el ícono canónico de la entidad a la izquierda del texto
- [ ] El área de campos está dentro de `<div className="flex-1 overflow-y-auto pr-2 pb-4">` + `<TabsContent>`

### Campos y Datos
- [ ] **Empresa** se muestra en los TRES modos: `create` → `<SearchableSelect>` | `view/edit` → `<Input disabled className="bg-muted/50">`
- [ ] **NO hay datos de auditoría inline** (`Creado:`, `ID:`, `Modificado:`) — eso es responsabilidad del `<HistorialDrawer>`
- [ ] Todos los campos de texto libre usan `normalizeText()` al guardar (mayúsculas sin tildes)
- [ ] Campos deshabilitados en vista: `disabled={mode === 'view'}`
- [ ] **NO hay `<input type="number">`** — usar `<NumericInput>` de `src/components/ui/numeric-input.tsx`
- [ ] **Campos numéricos en modo vista** — si usan `<Input disabled>`, el `value` usa `formatNumber()` de `src/lib/utils/format.ts` (R24). NUNCA el número crudo.

### Manejo de Errores (NUNCA toast)
- [ ] Errores de campo mostrados con `<FieldError message={fieldErrors.campo} />` — NUNCA el `<p>` directo
- [ ] Error global mostrado inline al tope del formulario con `bg-red-50 border-red-200`
- [ ] `handleSubmit` usa `setFieldErrors(prev => ({ ...prev, ...errors }))` — NO `setFieldErrors(errors)` (preservar errores de lookups externos)
- [ ] `catch` en `doSave` asigna a `globalError`, NO usa toast

### Selects
- [ ] Todos los selects usan `<SearchableSelect>`, NUNCA `<select>` HTML nativo
- [ ] Opciones de BD/ERP ordenadas con `.sort((a, b) => a.label.localeCompare(b.label))`
- [ ] Se auto-selecciona el primer registro en listas de referencia (excepto búsquedas Cliente/Ítem)
- [ ] `searchable={false}` solo en listas cortas y predecibles (< 8 opciones fijas)
- [ ] Opciones hardcoded en Title Case (`'Producto'`, `'No Aplica'`) — NUNCA `ALL_CAPS`

### Historial de Auditoría
- [ ] `<HistorialDrawer>` está **FUERA** del `<Dialog>`, como hermano en el fragmento `<>...</>`
- [ ] El prop `tabla=` coincide **EXACTAMENTE** con el nombre de la tabla en MySQL/Prisma
- [ ] El `<HistorialDrawer>` se renderiza condicionalmente solo cuando existe `initialEntidad`

### Footer
- [ ] Footer usa **SIEMPRE** `className={UI_THEME.modal.footer}` — NUNCA hardcodear las clases Tailwind directamente
- [ ] Botones de color usan **SIEMPRE** los tokens `UI_THEME.modal.buttons.*`:
  - `Historial` → `variant="outline" className={UI_THEME.modal.buttons.historial}` (sky)
  - `Eliminar` → `variant="outline" className={UI_THEME.modal.buttons.eliminar}` (rojo)
  - Acción especial (Prioridad, etc.) → `variant="outline" className={UI_THEME.modal.buttons.accionEspecial}` (violet)
  - Grupo derecho → `className={UI_THEME.modal.buttons.rightGroup}`
- [ ] `Editar`, `Cancelar` y `Guardar` usan `<Button>` sin className extra (primary / outline por defecto)
- [ ] **Modo Vista** → izquierda: `Eliminar` o acción especial (si aplica) | derecha: `Historial` (sky) + `Editar`
- [ ] **Modo Editar/Crear** → derecha: `Cancelar` (outline, solo si `isEditing`) + `Guardar` (con ícono `<Save>`)

### Comportamiento
- [ ] `handleOpenChange(true)` inicializa `mode` + todos los campos + llama `resetFields()`
- [ ] `useEffect([open])` tiene **reset defensivo de campos** al inicio (R22) — sin tocar `mode`
- [ ] Anti-similares R18: verificar al guardar, error rojo si 100%, panel amarillo si ≥85%
- [ ] OCC: el `update` pasa `registroVersion` y maneja el caso `count === 0`

### DataTable (página cliente)
- [ ] Columna `id` es la primera (`enableHiding: false`)
- [ ] Columna `actions` es la última (`enableHiding: false`, `id: 'actions'`)
- [ ] Modal de fila usa **instancia por fila** vía prop `trigger` — NUNCA estado compartido
- [ ] Columnas de FK usan `accessorFn` (no `accessorKey`) para que el buscador funcione
- [ ] NO se pasa `searchKey` al `<DataTable>`
- [ ] Encabezado de página está en `*-client.tsx`, NO en `page.tsx`

---

- **Tokens de UI — SIEMPRE usar `UI_THEME` (fuente única de verdad):** Todos los estilos visuales recurrentes están definidos en `src/lib/theme.ts`. **NUNCA hardcodear clases Tailwind** que ya tengan un token. Tokens obligatorios en formularios:
  - `<Label className={UI_THEME.forms.labelBase}>` — SIEMPRE en cada label de formulario/modal.
  - `<Input className={UI_THEME.forms.inputBase}>` — SIEMPRE en cada Input de texto. Agregar clases extra **después** del token: `className={\`${UI_THEME.forms.inputBase} uppercase\`}`.
  - `<FieldError message={fieldErrors.campo} />` — SIEMPRE (nunca `<p className="text-xs text-red-500">` directo).
  - `UI_THEME.forms.globalError` — Error global al tope del formulario.
  - `UI_THEME.forms.warningSimilar` / `warningSimilarTitle` / `warningSimilarRow` — Panel amarillo de similares (R18).
  - `UI_THEME.modal.footer` / `UI_THEME.modal.buttons.*` / `UI_THEME.modal.scrollArea` — Footer y área scroll del modal.
  - `UI_THEME.modal.title` — `DialogTitle` de todos los modales.
  - `UI_THEME.badge.*` — Píldoras de estado (`active`, `inactive`, `warning`, `info`).
  - `UI_THEME.action.viewButton` — Botón ícono en columna `actions` del DataTable.
  - Consultar `src/lib/theme.ts` completo antes de agregar cualquier clase nueva — puede que ya exista el token.

- **Inputs Numéricos:** NUNCA utilizar `<input type="number">` directamente en estado controlado de React para evitar el error de hidratación. Utilizar SIEMPRE el componente reutilizable `<NumericInput>` ubicado en `src/components/ui/numeric-input.tsx`.
  - **Formato en Modo Vista (R24) — OBLIGATORIO:** Todo campo numérico mostrado en un `<Input disabled>` en modo vista **DEBE** usar `formatNumber()` de `src/lib/utils/format.ts`. **NUNCA** pasar el número crudo al `value`. El `NumericInput` ya formatea automáticamente cuando está `disabled` o al perder foco.
    ```tsx
    // ❌ MAL — número crudo sin formato
    <Input value={entidad?.cantidad} disabled />

    // ✅ PATRÓN A — NumericInput con disabled (recomendado cuando el campo es editable)
    <NumericInput value={cantidad} onChange={setCantidad} disabled={mode === 'view'} />
    // → muestra "1,500.25" al perder foco, número limpio al editar

    // ✅ PATRÓN B — Input disabled en vista + NumericInput en edición
    {mode === 'view' ? (
      <Input
        value={formatNumber(Number(entidad?.cantidad ?? 0))}
        disabled
        className={`${UI_THEME.forms.inputBase} bg-muted/50`}
      />
    ) : (
      <NumericInput value={cantidad} onChange={setCantidad} disabled={loading} />
    )}
    // → import { formatNumber } from '@/lib/utils/format'
    // → formatNumber(value, minDecimals=2, maxDecimals=4)
    ```
- **Modales (Dialogs):** La librería `shadcn/ui` utiliza `@base-ui/react`. NO soporta la propiedad `asChild` en el `DialogTrigger`. Debes usar la propiedad `render={<button>...</button>}`.

- **Selects (Comboboxes):** Usar SIEMPRE el componente `<SearchableSelect>` (`src/components/ui/searchable-select.tsx`), mapeando las opciones a `{value, label}`. Siempre se debe auto-seleccionar el primer registro disponible, a menos que sean búsquedas de Clientes/Ítems o se indique lo contrario. Deben mostrar el nombre al usuario pero el componente manejará internamente el código.
  - **Ordenamiento Obligatorio (R17):** Todo select que cargue datos desde la BD o ERP DEBE ordenarse alfabéticamente ascendente usando `.sort((a, b) => a.label.localeCompare(b.label))` al construir las opciones. **Excepción:** selects hardcoded (ej. `OPCIONES_CUBRE_DESCANSO`, estados fijos) y selects que representen jerarquías/árboles respetan su orden definido — NO aplicar sort.
  - **Capitalización Selects Hardcoded (R21):** Las opciones de selects definidas en el código (no provenientes de BD/ERP) deben mostrarse en **Title Case**: primera letra de cada palabra en mayúscula, el resto en minúsculas. Ejemplos: `'Producto'`, `'Recurso Humano'`, `'No Aplica'`. **NUNCA** en `ALL_CAPS` (`'PRODUCTO'`, `'ESTANDAR'`). Esta regla es la excepción explícita a la regla de normalización de textos, que aplica solo al texto libre ingresado por el usuario, no a labels de UI.
  - **Prop `searchable`:** El componente acepta `searchable={false}` para ocultar el input de búsqueda. Usar en listas cortas y predecibles (ej. Categorías de Items). Por defecto es `true`.
- **Labels y Títulos (Naming):** Todos los labels, botones y títulos deben omitir preposiciones ("de", "y", "del") y usar de 1 a 3 palabras. Siempre en Title Case (ej. "Tipos Costeos" en lugar de "Tipos de Costeos").
- **Normalización de Textos:** Todo el texto libre ingresado por el usuario debe guardarse SIEMPRE en MAYÚSCULAS y SIN TILDES (usando `normalizeText` de `src/lib/utils/text.ts`).
- **Pantallas CRUD y Tablas:** Todas las pantallas de listado/CRUD deben construirse obligatoriamente utilizando el componente `<DataTable>` (`src/components/ui/data-table.tsx`), que incluye buscador y manejador de columnas. NO usar tablas HTML simples para estas vistas. (Ver `docs/crud-standard.md`). Reglas de columnas:
  - La columna **`id`** es **siempre la primera** (inamovible, `enableHiding: false`).
  - La columna de acciones usa **siempre `id: 'actions'`** (nombre canónico) y es **siempre la última** (`enableHiding: false`). Nunca usar `'acciones'` ni otro nombre.
  - Todo modelo debe incluir `id` como primera columna y `actions` como última.
  - **Búsqueda global (R18):** NUNCA pasar la prop `searchKey` al `<DataTable>` — el buscador debe filtrar en todos los campos visibles simultáneamente.
  - **Columnas FK (R19):** Cuando una columna muestra el texto de una relación (FK) en lugar del ID numérico crudo, usar **`accessorFn`** en lugar de `accessorKey: 'entidadId'`. El filtro global busca sobre el valor del accessor, no sobre el texto renderizado. Ejemplo correcto:
    ```ts
    // ❌ MAL — el filtro busca sobre el número (ej. 5), no sobre "SERVICIOS"
    { accessorKey: 'categoriaId', cell: ({ row }) => row.original.categoria?.nombre }

    // ✅ BIEN — el filtro busca sobre el texto visible
    { id: 'categoria', accessorFn: (row) => row.categoria?.nombre ?? String(row.categoriaId), cell: ... }
    ```
    **Excepción:** Si el tipo de dato ya incluye el campo string resuelto como propiedad directa (ej. `empresaNombre: string`), usar `accessorKey: 'empresaNombre'` es correcto y suficiente.
- **Manejo de Formularios y Errores:** Todos los formularios deben ser controlados (`useState` para cada campo) y enviar los datos interceptando el `onSubmit` (`e.preventDefault()`). NUNCA mostrar errores usando `toast`. Deben distinguirse 2 tipos de errores:
  1. **Errores de Campo (Validaciones / Missing):** Los mensajes relacionados con un input específico deben almacenarse en un estado (ej. `fieldErrors`) y mostrarse inmediatamente debajo del input utilizando EXCLUSIVAMENTE las clases: `<p className="text-xs text-red-500 !mt-0.5 leading-none">{error}</p>`.
  2. **Errores Globales (del Servidor / Try-Catch):** Aquellos mensajes genéricos que provienen de la API o servidor (ej. error 500) se deben almacenar en un estado y mostrarse "inline" al tope del formulario (ej. `<div className="text-red-500 text-sm">{error}</div>`), sin borrar los campos.
- **Errores de Campo:** SIEMPRE usar `<FieldError message={fieldErrors.campo} />` de `src/components/ui/field-error.tsx`. NUNCA escribir el `<p className="text-xs text-red-500 !mt-0.5 leading-none">` directamente. `fieldErrors` es la fuente única de errores de campo sin importar su origen (validación local, servidor, ERP). Al ejecutar `handleSave`, NO limpiar `fieldErrors` con `setFieldErrors({})` al inicio — construir los errores de validación local y **preservar** los errores de lookups externos que ya estén en `fieldErrors`.

- **Anti-duplicados / Similares (R18):** En toda pantalla CRUD con campo Nombre o Descripción libre, verificar similares al guardar. Comportamiento en **dos niveles**:
  - **100% idéntico** → Error de campo rojo, no puede guardar.
  - **≥ 85% similar (no idéntico)** → Panel amarillo de advertencia con lista de similares y % — el usuario puede elegir **"Guardar de todas formas"** o cancelar para corregir.
  - La comparación siempre filtra por empresa (`empresaId`). Dos empresas distintas pueden tener nombres iguales sin advertencia.
  - Implementación de referencia: `src/components/items/item-modal.tsx` + `buscarItemsSimilaresConERP`. Ver `docs/conventions.md §7.5`.

- **Estructura de Modales (Acciones):** En modo vista, botones ("Historial" y "Editar") van agrupados a la derecha. En modo edición, el botón "Cancelar" debe resetear el estado a modo vista (sin cerrar el modal si es un registro existente).
- **⚠️ Footer de Modal:** Los botones de acción del modal (Historial, Editar, Cancelar, Guardar) se colocan **SIEMPRE en un footer fijo al fondo** del `DialogContent`. Usar **SIEMPRE** `className={UI_THEME.modal.footer}` para el contenedor y `UI_THEME.modal.buttons.*` para los colores de botones. **NUNCA** hardcodear clases Tailwind de color, **NUNCA** poner los botones en el header ni en el área scrolleable del formulario.
- **⚠️ Pestañas en Modales — OBLIGATORIAS SIEMPRE:** TODO modal DEBE usar pestañas (`<Tabs>`), **aunque el formulario sea tan simple que solo tenga una pestaña "General"**. NUNCA construir un modal sin la estructura de tabs. El `<TabsList>` debe usar `variant="line"` y `className="mb-4 shrink-0"`. Cada `<TabsTrigger>` DEBE incluir el **ícono canónico de la entidad** a la izquierda del texto. Referencia obligatoria: `src/components/categorias/categoria-modal.tsx`.
- **Scroll Horizontal de Pestañas (R23):** El componente `<TabsList variant="line">` implementa scroll horizontal con **botones de flecha `‹` / `›`** que aparecen y desaparecen dinámicamente según el contenido. Internamente usa `ScrollableTabsList` con `ResizeObserver`. **NUNCA limitar el número de pestañas de un modal por miedo a que no quepan.** Agregar todas las que la entidad necesite. No se necesita ningún wrapper extra ni clase adicional en el código del modal. Ver detalles en `docs/conventions.md §5.0`.
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

- **⚠️ BUG — Modal "Nuevo" con datos del open anterior (R22 — Reset Defensivo):**
  Al abrir el modal de "Nuevo" por segunda vez puede mostrar datos que el usuario escribió en la apertura anterior (nombre, icono, errores). Causa: `@base-ui/react` en modo dialog controlado **puede no invocar `onOpenChange`** al hacer click en el trigger si el estado controlado ya es `false`, dejando el estado de React con valores stale.
  
  **Solución obligatoria — patrón de doble capa:**
  1. `handleOpenChange(newOpen === true)` hace el reset principal (incl. `mode`) — **ya documentado**.
  2. El `useEffect([open])` que carga datos externos (empresas, etc.) DEBE además **limpiar los campos del formulario** al inicio, como capa defensiva.
  
  ```tsx
  useEffect(() => {
    if (!open) return

    // ✅ RESET DEFENSIVO — solo campos, NUNCA `mode` (causaría Bug Flash)
    const tc = miEntidad ?? null
    setNombre(tc?.nombre ?? '')
    setIcono(tc?.icono ?? '')
    setFieldErrors({})
    setGlobalError(null)
    // ... otros campos del formulario

    // Luego cargar datos externos (empresas, selects, etc.)
    let active = true
    getEmpresasForUser().then(...)
    return () => { active = false }
  }, [open]) // Solo [open] — NUNCA dependencias de datos ni de mode
  ```
  
  **Reglas críticas del reset defensivo:**
  - ✅ Resetear SOLO campos del formulario (nombre, icono, fieldErrors, globalError, similares, etc.)
  - ✅ Usar el valor actual de la prop (`miEntidad ?? null`), no el estado
  - ❌ NUNCA tocar `mode` en el useEffect — eso provoca el Bug Flash
  - ❌ NUNCA tocar `initialMiEntidad` en el useEffect — solo en `handleOpenChange`
  - Este patrón aplica a TODOS los modales con trigger de creación ("Nuevo")

- **Navegación a Tab con Error (R20):** En todo modal con pestañas, al guardar y producirse cualquier error de campo (local, de servidor o de negocio), el modal DEBE navegar automáticamente a la pestaña que contiene ese campo. Patrón obligatorio:
  ```tsx
  // Declarar mapa campo→tab (solo los que NO son "general")
  const CAMPOS_POR_TAB: Record<string, string> = {
    miCampo: 'nombre-de-tab',
  }
  // Función utilitaria dentro del componente
  const irATabConError = (campo: string) => {
    setActiveTab(CAMPOS_POR_TAB[campo] ?? 'general')
  }
  // Llamar en los 3 puntos: validación local, error de campo del servidor, error de negocio.
  ```
  Implementación de referencia: `src/components/items/item-modal.tsx`. Ver `docs/conventions.md` §5.1.

- **⚠️ SELECTS — `<SearchableSelect>` SIEMPRE (Portal obligatorio, sep-2026):**
  El componente `<SearchableSelect>` (`src/components/ui/searchable-select.tsx`) usa `createPortal` para renderizar el dropdown en `document.body` con `position:fixed`. Esto **garantiza que nunca es recortado por ningún `overflow`** — incluyendo los modales del proyecto que tienen `overflow-y:auto` en el área de campos.
  - ✅ **SIEMPRE** usar `<SearchableSelect>` para cualquier select en formularios o modales.
  - ❌ **NUNCA** usar `<select>` HTML nativo en formularios/modales. La excepción es celdas de tabla con listas cortas (< 10 ítems) sin necesidad de búsqueda.
  - ❌ **NUNCA** volver a `position:absolute` ni eliminar el portal del componente.
  - El comportamiento visual es idéntico a un dropdown normal: cae exactamente debajo del trigger.
  - Ver documentación completa en `docs/conventions.md` §17.

Para más detalle, consultar `docs/conventions.md`.

---

## Reglas Prisma ORM

- **⚠️ NUNCA usar `--no-engine` en `prisma generate`:** El flag `--no-engine` genera un cliente para Prisma Accelerate (cloud) que **no puede conectar directamente a MySQL**. Siempre usar `npx prisma generate` sin flags adicionales. El error que produce es `P6001: the URL must start with the protocol prisma://`.

- **Flujo obligatorio al cambiar el schema de Prisma:**
  1. Editar `prisma/schema.prisma`
  2. `npx prisma db push` — sincroniza la BD con el schema
  3. `npx prisma generate` — regenera el cliente (sin `--no-engine`)
  4. **Reiniciar el servidor de desarrollo** — Turbopack cachea `node_modules` al arrancar y no detecta automáticamente cambios en el cliente Prisma generado. Sin reinicio, seguirá usando el cliente anterior aunque los archivos hayan cambiado.

- **Limpiar caché de Turbopack:** Si el servidor persiste en usar una versión antigua del cliente Prisma incluso después de reiniciar, eliminar la carpeta `.next/` antes de volver a levantar: `Remove-Item -Recurse -Force ".next"` seguido de `npm run dev`.

- **Estándar FK — Join manual en el Service (NO usar `include` de Prisma para resolver nombres):**
  El repositorio devuelve datos planos. El service resuelve los nombres de FK vía `Promise.all` con una query separada y construye un `Map` para el join en memoria.
  ```ts
  // ✅ ESTÁNDAR — join manual en service
  async listar() {
    const [rows, empresas] = await Promise.all([
      MiRepository.findAll(),
      prisma.empresa.findMany({ select: { id: true, nombre: true } }),
    ])
    const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]))
    return rows.map(r => ({ ...r, empresaNombre: empresaMap.get(r.empresaId) ?? String(r.empresaId) }))
  }

  // ❌ PROHIBIDO — usar include de Prisma para resolver nombres de FK
  prisma.miEntidad.findMany({ include: { empresa: { select: { nombre: true } } } })
  ```
  **Excepción permitida:** `include` para colecciones propias del objeto (ej. `empresa.include({ configuracionesSync: true })`), donde los datos incluidos son parte intrínseca de la entidad y no solo un label para display.

- **Auditoría FK — Nombres legibles en el historial (NO códigos numéricos):**
  **REGLA GLOBAL SIN EXCEPCIÓN:** Todo campo auditable que sea una FK (ID numérico que referencia a otra entidad — de BD local o del ERP) DEBE mostrar el **nombre/descripción** del registro referenciado, NUNCA el código o ID crudo. Esto aplica a cualquier campo tipo FK sin importar el módulo. El `computeDiff` soporta la propiedad `transform` exactamente para esto.
  ```ts
  // ✅ CORRECTO — resuelve nombres antes del diff
  async actualizar(id, data, userId) {
    const anterior = await Repository.findById(id)
    // Construir mapa FUERA de la transacción
    const deptos = await erp.getDepartamentos('GT')
    const deptosMap = new Map(deptos.map(d => [d.codigo, d.nombre]))

    const campos = [
      { key: 'departamentoId', label: 'Departamento',
        transform: (val: unknown) => deptosMap.get(Number(val)) ?? String(val) },
    ]
    await prisma.$transaction(async (tx) => {
      const reg = await Repository.update(id, data, tx)
      const { antes, despues } = computeDiff(campos, anterior, reg)
      await AuditRepository.logUpdate(TABLA, id, userId, antes, despues, tx)
    })
  }

  // ❌ MAL — registra "14" en lugar de "GUATEMALA"
  { key: 'departamentoId', label: 'Departamento' }
  ```
  **Para FKs del ERP** (departamento, municipio, turno, etc.): llamar `erp.getDepartamentos()` / `erp.getMunicipios()` ANTES de la transacción Prisma y pasar los mapas como closures al `transform`.
  **Para FKs locales de BD** (empresaId, categoriaId, etc.): usar `prisma.entidad.findMany()` ANTES de la transacción para construir el Map.

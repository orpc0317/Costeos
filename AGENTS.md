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

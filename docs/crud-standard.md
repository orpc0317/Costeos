# Estándar para Pantallas CRUD

El boton Nuevo va en `PageHeader` (`actions`), no en la barra de la tabla. `DataTable` recibe `rowAccent`. La columna `id` queda fija a la izquierda y `actions` a la derecha. Aspecto: `.cursor/rules/ui-conventions.mdc`.

Para mantener la consistencia en el proyecto, **todas las pantallas CRUD** (listados de registros con opciones para crear, editar, eliminar) deben utilizar el componente reutilizable `DataTable` ubicado en `src/components/ui/data-table.tsx`.

## Requisitos de Implementación

1. **Uso de DataTable**: NO debes implementar tablas HTML manuales (`<table>`, `<tr>`, etc.) ni iterar colecciones directamente en la vista principal para listas de datos complejas. Debes instanciar el componente `<DataTable>`.
2. **Componente Cliente**: El renderizado de `DataTable` con sus columnas (que usualmente requieren hooks como `useMemo` o botones con interactividad) debe hacerse en un **Client Component** (con `'use client'`).
3. **Página de Servidor (Layout y Ancho)**: Se recomienda que la página (`page.tsx`) sea un Server Component que obtenga la lista completa de datos desde la base de datos (por ejemplo, llamando a un action) y se la pase al Client Component que contiene el `<DataTable>`. 
   - **IMPORTANTE (Layout):** El contenedor de la página que llama al Client Component **NO debe restringir el ancho** (por ejemplo, evitar clases como `max-w-7xl mx-auto`). La tabla de un CRUD siempre debe ocupar el 100% del ancho disponible de la pantalla para mantener consistencia visual con el resto de la aplicación.
4. **Creación de Registros**: Por defecto usar el "Modal Estándar" explicado más abajo, a menos que el proceso de creación sea un flujo complejo (ej. asistentes de configuración multi-paso como el de Costeos), en cuyo caso el botón "Nuevo" debe redirigir a una página/ruta dedicada ocupando la pantalla completa, pero la tabla base del CRUD se mantiene con el mismo estándar.

## Características del DataTable

Al utilizar `DataTable`, heredas automáticamente:
- **Paginación**: 25 registros por página (configurable con la prop `pageSize`). Muestra un contador `"X–Y de N registros"` siempre visible. Los botones de navegación (◀/▶) solo aparecen cuando hay más de una página. Al realizar una búsqueda en servidor o cambiar el filtro local, la tabla regresa automáticamente a la página 1.
- **Ordenamiento de columnas**
- **Búsqueda global** (buscando coincidencias en *cualquier* campo visible de la fila). **IMPORTANTE:** Para que la búsqueda global funcione correctamente en todos los campos, NO debes enviar la propiedad `searchKey` al instanciar el componente, a menos que haya una justificación estricta para limitar la búsqueda a una sola columna.
- **Ocultamiento de columnas** y reordenamiento mediante drag-and-drop en el encabezado.
- **Exportación a CSV**: Botón de descarga integrado que exporta automáticamente solo las columnas visibles a un archivo CSV compatible con Excel.
- **Persistencia**: La visibilidad y orden de columnas se guarda en el `localStorage` del navegador bajo las claves `${tableId}-visibility` y `${tableId}-order`.
- **Theming parametrizado**: Colores, tamaños de fuente y estilos unificados.

### ⚠️ Regla: Columnas Foreign Key → usar `accessorFn`

Cuando una columna muestra el texto de una relación (FK) en lugar del ID numérico crudo, **NUNCA** uses `accessorKey: 'entidadId'` porque el filtro global buscaría sobre el número, no sobre el texto visible. Usa siempre `accessorFn` para exponer el valor legible:

```ts
// ❌ MAL: el filtro global busca sobre el número (ej. 5), no sobre "SERVICIOS PROFESIONALES"
{ accessorKey: 'categoriaId', header: 'Categoría', cell: ... }

// ✅ BIEN: el filtro global busca sobre el texto visible
{
  id: 'categoria',
  accessorFn: (row) => row.categoria?.nombre ?? String(row.categoriaId),
  header: 'Categoría',
  cell: ({ row }) => <span>{row.original.categoria?.nombre ?? row.original.categoriaId}</span>,
}
```

Esta regla aplica a cualquier columna que renderice un nombre/descripción derivado de un ID (empresa, categoría, cliente, etc.).

## Ejemplo de Uso

```tsx
'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function MiEntidadClient({ data }: { data: any[] }) {
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      },
      // ...otras columnas
      {
        id: 'acciones',
        header: '',
        enableHiding: false, // Las acciones nunca se deben ocultar
        cell: ({ row }) => {
          return <Button>Editar</Button>
        }
      }
    ],
    []
  )

  const toolbarActions = (
    <Button className="gap-2">
      <Plus className="w-4 h-4" /> Nuevo Registro
    </Button>
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      tableId="mi-entidad-crud" // IMPORTANTE: Un ID único para persistencia en localStorage
      searchPlaceholder="Buscar registros..."
      searchKey="nombre" // Opcional: llave por la cual buscar por defecto
      customToolbarActions={toolbarActions}
    />
  )
}
```

## Theming y Diseño Centralizado (Estilos)

El objetivo principal de esta arquitectura es que **si en el futuro se desea cambiar un color, tamaño de letra o estilo global de las tablas, se haga en un solo lugar**.

1. **Estilos Globales de la Tabla**: 
   NO se debe cambiar el estilo individualmente en cada pantalla. Edita la constante `TABLE_THEME` directamente en `src/components/ui/data-table.tsx`. Esto controla el fondo de encabezados, color y fuente de las filas por defecto, y los colores de bordes.

2. **Estilos de Celdas (Tipografía Interna)**:
   Al definir las columnas en los archivos `*-client.tsx`, debes apegarte a las siguientes reglas CSS (basadas en Tailwind) para el contenido renderizado, de modo que hereden armónicamente del `TABLE_THEME`:
   
   - **Datos Principales (Nombres, Códigos, Identificadores)**: 
     Utilizar `<span className="font-medium">`. NO apliques colores fijos (como `text-slate-700`); deja que herede el color del tema global, solo aplicando peso a la tipografía.
   - **Datos Secundarios (Descripciones, Correos, Textos de Apoyo)**: 
     Utilizar `<span className="text-muted-foreground">` o `<span className="text-sm text-muted-foreground">`. Esto asegura que se vean atenuados en comparación a los datos principales.
   - **Fechas**: 
     Utilizar `<span className="text-sm text-muted-foreground">`.
   - **Badges/Estados**: 
     Utilizar el componente `<Badge>` preferentemente con las variantes `default` (Activo/Positivo), `secondary` (Inactivo/Neutro), u `outline`. Si ocupas colores personalizados, usa utilidades con opacidad controlada (ej. `bg-emerald-500/15 text-emerald-600 border-emerald-500/20`).

## Estándar para Modales (Formularios CRUD)

Para mantener una apariencia corporativa ("ERP state of the art"):
1. **Contenedor Principal (Tabs)**: Todo el formulario dentro del `DialogContent` debe estar contenido en un componente `<Tabs defaultValue="general">`.
2. **Pestaña por defecto**: Siempre debe existir la pestaña `General` (`value="general"`).
3. **Pestañas adicionales**: Si el formulario requiere configuración avanzada o mucha información, divídelo lógicamente en más pestañas (ej: "Configuración", "Estructura").
4. **Layout de Cuadrícula (Grid)**: Dentro de cada `TabsContent`, los campos deben agruparse utilizando CSS Grid de mínimo 2 columnas (`<div className="grid grid-cols-2 gap-x-6 gap-y-4">`). No usar listas verticales simples.
9. **Estética ERP**: Los componentes base (`Input`, `Select`, `Label`) ya están modificados globalmente para usar una alta densidad visual (más pequeños, tipografía `text-sm`, `rounded-sm`), garantizando una experiencia profesional.
10. **Estructura Interna del Modal (Scroll y Sticky Elements)**:
    - Para que las pestañas (`TabsList`) no se pierdan al hacer scroll y los botones de acción (`Footer`) queden fijos abajo, el formulario debe utilizar Flexbox:
      - `<form className="flex-1 overflow-hidden flex flex-col pt-2">`
      - El contenedor principal de Tabs: `<Tabs className="w-full flex-1 flex flex-col min-h-0">`
      - El Listado de Tabs: `<TabsList variant="line" className={UI_THEME.tabs.listClass}>` (sin margen inferior; las pestañas quedan sobre el fondo del modal)
      - El contenedor de campos: `<div className={UI_THEME.modal.scrollArea}>` — panel blanco con borde, pegado a la línea de las pestañas. `<TabsContent ...>` va adentro. El footer queda fuera.
      - El Footer: `<div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">`
11. **Mensajes de Campos Bloqueados**: Si un registro "en uso" bloquea ciertos campos (modo de edición restringido), evita mostrar cajas de alerta (blocks amarillos) en el formulario que rompen la estética. En su lugar, agrega un "foot note" pequeño (ej. `<p className="text-[11px] text-amber-700">`) del lado izquierdo del footer para mantener el diseño limpio.
12. **Flujo de Edición (Editar -> Guardar -> Ver)**:
    - Al guardar exitosamente una modificación (UPDATE), el modal **NO** debe cerrarse.
    - El Backend (Server Action) debe devolver el registro recién actualizado en la respuesta.
    - El Frontend debe tomar este nuevo registro, actualizar su estado interno (`initialData`) y cambiar inmediatamente a modo "vista" (`setMode('view')`).
    - Esto permite que el usuario visualice sus cambios aplicados instantáneamente (incluyendo marcas de tiempo o campos calculados) y brinda una mejor experiencia tipo "Guardado exitoso".
11. **Manejo de Errores de Validación (Server Actions)**:
    - Todos los formularios deben incluir el atributo `noValidate` (`<form onSubmit={handleSubmit} noValidate>`) para deshabilitar las burbujas de error nativas del navegador y asegurar un estilo de error 100% consistente gestionado por nuestra UI.
    - Las validaciones fallidas devueltas por Zod desde el servidor deben incluir el nombre del campo (`field: parsed.error.issues[0].path[0]`).
    - En el componente cliente, se debe mantener un estado `fieldErrors` para mapear los errores por campo.
    - Cuando ocurra un error, el modal debe navegar automáticamente a la pestaña que contiene el campo (`setActiveTab`), aplicarle el foco usando `document.getElementById(...).focus()` tras un breve timeout de renderizado.
    - Los controles (`Input`, `NumericInput`, etc.) deben recibir la propiedad `aria-invalid={!!fieldErrors.nombreCampo}` (o `error` en caso de usar selectores) para marcarse con un borde rojo.
    - El mensaje de error debe renderizarse de forma *inline* debajo del control afectado. **IMPORTANTE**: Utilizar las clases `text-xs text-red-500 !mt-0.5 leading-none` (ej. `<p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nombreCampo}</p>`) para forzar una proximidad estrecha al input y lograr una excelente integración visual.

## 6. Configuración Visual de Pestañas (Tabs)

Para garantizar un estilo visual uniforme (estilo "Premium" con fondo transparente y borde inferior azul/índigo) en los formularios y pantallas que utilicen pestañas, se debe utilizar siempre la variante `line` provista por nuestro sistema de diseño:

- **Configuración del Componente**:
  - Utilizar `<TabsList variant="line" className={UI_THEME.tabs.listClass}>`. En modales no agregar margen inferior: el panel `UI_THEME.modal.scrollArea` arranca en la línea de las pestañas.
  - Los `<TabsTrigger>` no necesitan ninguna clase personalizada manual; el componente central `ui/tabs.tsx` se encargará de estilizarlos automáticamente.

Ejemplo correcto:
```tsx
<Tabs defaultValue="general" className="w-full">
  <TabsList variant="line" className="mb-4">
    <TabsTrigger value="general">
      <Settings2 className="w-4 h-4 mr-2" />
      General
    </TabsTrigger>
    <TabsTrigger value="permisos">
      <Shield className="w-4 h-4 mr-2" />
      Permisos
    </TabsTrigger>
  </TabsList>
  {/* TabsContent ... */}
</Tabs>
```

## 7. Acciones de Fila (Row Actions)

Al definir las acciones para cada fila en las tablas CRUD, se deben seguir estos lineamientos para mantener la consistencia visual en toda la aplicación:
- **Ícono "Ver detalles" o "Ver/Editar"**: Se debe utilizar siempre el ícono `Eye` de `lucide-react` para la acción principal de visualizar o editar en detalle un registro (ej. `<Eye className="h-4 w-4 text-blue-600" />`). Evitar utilizar `Search` u otros íconos para este propósito.

## Patrón de Búsqueda con Servidor (isServerSearch)

Para catálogos con muchos registros, se usa búsqueda server-side con debounce:

```ts
// En el *-client.tsx:
const LIMIT_INICIAL  = 50   // registros más recientes al cargar
const LIMIT_BUSQUEDA = 150  // máximo de resultados al buscar

const [searchQuery, setSearchQuery] = useState('')
const debouncedQuery = useDebounce(searchQuery, 400)

useEffect(() => {
  if (debouncedQuery.length === 1) return // muy corto, ignorar
  let cancelled = false
  setLoading(true)
  listarEntidad({
    search: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
    limit:  debouncedQuery.length >= 2 ? LIMIT_BUSQUEDA : LIMIT_INICIAL,
  })
    .then(result => { if (!cancelled) setData(result) })
    .finally(() => { if (!cancelled) setLoading(false) })
  return () => { cancelled = true }
}, [debouncedQuery])

// En <DataTable>:
<DataTable
  ...
  isServerSearch
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  loading={loading}
/>
```

El subtítulo de la página debe cambiar dinámicamente:
```ts
const subtitulo = debouncedQuery.length >= 2
  ? `${data.length} resultado${data.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
  : `Últimos ${data.length} registros`
```

## Sort y Filtro por columna en DataTable

El `<DataTable>` incluye sort y filtro por columna automáticamente — no requiere configuración adicional por pantalla.

### Sort por columna
- Click en el header de cualquier columna cicla: sin orden → ascendente → descendente.
- Los íconos ↕/↑/↓ son **siempre visibles** (no solo en hover).
- Al recibir nueva `data` del servidor (cambio de búsqueda), el sorting se resetea automáticamente.
- Implementado con `getSortedRowModel()` + estado `SortingState` de TanStack Table.

### Filtro por columna (`ColumnFilterPopover`)
Componente: `src/components/ui/column-filter-popover.tsx`

**Tab Lista**
- Muestra todos los valores únicos de la columna (de todos los registros, no solo la página actual).
- Búsqueda en tiempo real sobre la lista de valores.
- Multi-selección con checkboxes. "Seleccionar todo" con estado indeterminado.
- Contador de seleccionados y botón Limpiar.

**Tab Avanzado** — 12 condiciones de filtro:
| Texto | Numérico | Vacío |
|---|---|---|
| Contiene / No contiene | Mayor que / Mayor o igual | Está vacío |
| Igual a / No es igual a | Menor que / Menor o igual | No está vacío |
| Empieza con / Termina con | | |

**Reglas del filtro por columna**:
- Opera **client-side únicamente** — nunca dispara requests al servidor.
- Al cambiar el `searchText` (nueva búsqueda en servidor), columnFilters y sorting se resetean.
- La función `columnFilterFn` está registrada en TanStack Table como `filterFns: { columnFilter: columnFilterFn }`.

## Árbol de Combos en pantallas de catálogo

Cuando un ítem puede tener sub-ítems que a su vez tienen sus propios sub-ítems (combos anidados), se usa el patrón de árbol expansible del Costeador.

### Patrón: buildComboTree
```ts
// Pre-calcular el árbol una sola vez (useMemo)
const comboTree = useMemo(
  () => buildComboTree(combos, allItems, getLabel, new Set([itemId])),
  [combos, allItems, itemId]
)

// Render recursivo — trabaja sobre nodos pre-calculados, sin lookups
const renderComboRow = (node: ComboTreeItem, depth: number, idx: number | null) => {
  const tieneHijos = node.hijos.length > 0
  const isExpanded = expandedIds.has(node.productoSecundarioId)
  return (
    <React.Fragment key={`row-${depth}-${node.productoSecundarioId}`}>
      <tr>...</tr>
      {tieneHijos && isExpanded && node.hijos.map(hijo => renderComboRow(hijo, depth + 1, null))}
    </React.Fragment>
  )
}
```

**Reglas**:
- El árbol se pre-calcula con `buildComboTree()` — idéntico al `buildCombosDisponibles()` de `src/lib/utils/combos.ts`.
- `allItems` debe ser el catálogo **completo sin paginación** (`listarItems()` sin `limit`).
- `expandedIds` vacío = todo colapsado por defecto. El usuario expande manualmente.
- `TreeGuide` con líneas punteadas marca la sangría por nivel (20px por nivel).
- Ciclos se cortan en `buildComboTree()` vía el `visited: Set<number>`.
- Las filas de niveles anidados son read-only (sin acciones edit/delete).

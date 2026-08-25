# Convenciones de Desarrollo — Costeos

> **Documento de Referencia Obligatoria.**
> Todo código generado por IA o desarrollador humano **DEBE** cumplir estas reglas sin excepción.
> Cada regla se derivó de las pantallas de **Categorías** y **Tipo Costeo**, que son el estándar de oro del proyecto.
> Si existe un caso de excepción, se documenta y aprueba en la sesión donde se desarrolle esa pantalla particular.

---

## 1. ARQUITECTURA DE PANTALLAS CRUD

### 1.1 Separación Server / Client
- **`page.tsx`** → Server Component. Obtiene los datos (llamada al action de Prisma) y los pasa al Client Component. **NO restringir ancho** (evitar `max-w-*` aquí).
- **`*-client.tsx`** → Client Component (`'use client'`). Define columnas con `useMemo`, monta el `<DataTable>`, define el botón "Nuevo" en `customToolbarActions`.

```
app/(dashboard)/dashboard/configuracion/<entidad>/
├── page.tsx               ← Server Component (fetch de datos)
└── <entidad>-client.tsx   ← Client Component (DataTable + columnas)
```

### 1.2 Componentes de Modal
Los modales de cada entidad viven en `src/components/<entidad>/`:
```
src/components/<entidad>/
├── <entidad>-modal.tsx    ← Modal autocontenido (Ver / Editar / Crear)
└── <entidad>-acciones.tsx ← Solo si modal usa patrón controlado externo
```

**Regla de Oro de Patrón Modal:** Si el modal es simple (como Categorías), se pasa directamente como `trigger` prop y el modal maneja su propio estado interno (`internalOpen`). Si es complejo (como Tipo Costeo, con muchas dependencias), se extrae a un componente `<EntidadAcciones>` que maneja el `open` externamente. Ambos patrones son válidos; elegir según complejidad.

### 1.3 ⚠️ Anti-patrón: Estado Compartido para Abrir Modal desde Tabla

**NUNCA** usar un estado compartido (`selectedItem + setModalOpen`) para abrir el modal de detalle/edición de una fila. Esto causa que el modal se abra con los datos del render *anterior* (vacíos la primera vez).

```tsx
// ❌ MAL — condición de carrera: selectedEmpresa puede ser undefined al abrir
const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaRow | undefined>(undefined)
const [modalOpen, setModalOpen] = useState(false)
// ...
cell: ({ row }) => (
  <button onClick={() => {
    setSelectedEmpresa(row.original) // ← React agrupa estos dos setState...
    setModalOpen(true)               // ← ...y el modal ya estaba montado con empresa=undefined
  }}>
    <Eye />
  </button>
)
// <EmpresaModal empresa={selectedEmpresa} open={modalOpen} /> ← recibe undefined
```

```tsx
// ✅ CORRECTO — una instancia del modal por fila, datos vinculados directamente
cell: ({ row }) => (
  <EmpresaModal
    empresa={row.original}   // ← dato siempre disponible, sin estado compartido
    trigger={
      <button className="p-2 hover:bg-slate-100 rounded-md transition-colors">
        <Eye className="h-4 w-4 text-blue-600" />
      </button>
    }
  />
)
```

Este es el mismo patrón que usa `<CategoriaModal>`. **Siempre replicar este patrón** en pantallas CRUD nuevas.

---

## 2. COMPONENTE `<DataTable>`

Siempre usar `src/components/ui/data-table.tsx`. Nunca implementar tablas HTML manuales.

### 2.1 Columnas

- Las columnas **SIEMPRE** se definen con `useMemo(() => [...], [])`.
- La columna **`id`** es **siempre la primera**: inamovible e inocultable (`enableHiding: false`).
- La columna de **acciones** debe ser **siempre la última**: `id: 'actions'` (nombre canónico), `enableHiding: false`. El DataTable usa este id para fijarla al extremo derecho automáticamente. **Nunca usar `'acciones'` ni otro nombre.**

```tsx
const columns: ColumnDef<MiEntidad>[] = useMemo(() => [
  { accessorKey: 'id', header: 'ID' },               // ← PRIMERA, siempre
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>
  },
  {
    id: 'actions',                                   // ← ÚLTIMA, siempre. Nombre canónico.
    header: '',
    enableHiding: false,
    meta: { align: 'center' },
    cell: ({ row }) => (
      <MiEntidadModal
        entidad={row.original}
        trigger={
          <button className="p-2 hover:bg-slate-100 rounded-md transition-colors">
            <Eye className="h-4 w-4 text-blue-600" />
          </button>
        }
      />
    )
  }
], [])
```

> **⚠️ Caché de localStorage:** El `DataTable` persiste el orden y visibilidad de columnas en `localStorage` con las claves `${tableId}-order` y `${tableId}-visibility`. Esto significa:
> - **Columnas nuevas** se insertan automáticamente antes de `actions` gracias a la lógica del DataTable.
> - **Columnas renombradas** pierden su posición guardada (el id viejo desaparece del orden).
> - **Para forzar un orden limpio** durante desarrollo, limpiar desde DevTools → Application → Local Storage, o cambiar el `tableId` de la tabla afectada.
> - **Nunca renombrar el id de una columna existente** en producción sin considerar el impacto en el caché de los usuarios.

### 2.2 Tipografía de Celdas

| Tipo de dato | Clase CSS |
|---|---|
| Dato principal (nombre, código) | `<span className="font-medium">` |
| Dato secundario (descripción, email) | `<span className="text-muted-foreground">` |
| Código / dato técnico | `<span className="font-mono text-sm text-muted-foreground">` |
| Fecha | `<span className="text-sm text-muted-foreground">` |
| Estado activo/inactivo | `<Badge>` con clases semánticas de color |

### 2.3 Badges de Estado

```tsx
<Badge
  variant={activo ? 'default' : 'secondary'}
  className={activo
    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
    : 'bg-muted text-muted-foreground'}
>
  {activo ? 'Activo' : 'Inactivo'}
</Badge>
```

### 2.4 Encabezado de Página

Encima del `<DataTable>` siempre va un encabezado con ícono, título y contador:

```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2 text-indigo-900">
        <IconoEntidad className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Nombre Entidad</h1>
      </div>
      <p className="text-sm text-muted-foreground mt-0.5">
        {data.length === 1 ? '1 registro' : `${data.length} registros`}
      </p>
    </div>
  </div>

  <DataTable
    columns={columns}
    data={data}
    tableId="entidad-crud"
    searchPlaceholder="Buscar por nombre..."
    searchKey="nombre"
    customToolbarActions={<MiEntidadModal trigger={<Button className="gap-2"><Plus className="w-4 h-4" /> Nueva Entidad</Button>} />}
  />
</div>
```

---

## 3. MODALES (DIALOGS)

### 3.1 Estructura del Componente Modal

El componente modal es **autocontenido**: maneja su propio estado de apertura y recibe opcionalmente el `trigger`.

```tsx
interface MiEntidadModalProps {
  entidad?: MiEntidadRow       // undefined = modo Crear
  trigger?: React.ReactNode    // elemento que abre el modal
  // Props controladas (opcionales, para casos avanzados):
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MiEntidadModal({ entidad, trigger, open: controlledOpen, onOpenChange }: MiEntidadModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  const isEditing = !!entidad
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [historialOpen, setHistorialOpen] = useState(false)

  // Estados de campos
  const [nombre, setNombre] = useState(entidad?.nombre ?? '')
  // ... más campos

  // Estados de error y carga
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  const resetForm = (data?: MiEntidadRow) => {
    setNombre(data?.nombre ?? '')
    // ... resetear más campos
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm(entidad)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }
  // ...
}
```

> **CRÍTICO — Bug de "Flash":** La inicialización del formulario SIEMPRE ocurre dentro de `handleOpenChange` cuando `newOpen === true`. **NUNCA** usar un `useEffect` con dependencias en los datos del registro o en el `mode`, ya que esto causa que el modal regrese a modo Vista inmediatamente después de dar click en Editar. Si se necesita cargar datos externos (ej: lista de empresas), ese `useEffect` solo puede depender de `[open]` y no tocar el `mode`.

### 3.2 Estructura JSX del Modal

```tsx
return (
  <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-[600px] h-[520px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconoEntidad className="w-5 h-5 text-slate-500" />
            {isEditing
              ? (mode === 'view' ? 'Detalle Entidad' : 'Editar Entidad')
              : 'Nueva Entidad'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col" noValidate>
          {globalError && (
            <div className="text-red-500 text-sm font-medium mb-4 shrink-0">{globalError}</div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList variant="line" className="mb-4 shrink-0">
              <TabsTrigger value="general">
                <Settings2 className="w-4 h-4 mr-2" /> General
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <TabsContent value="general" className="outline-none mt-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {/* Campos del formulario */}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
            {mode === 'view' ? (
              /* Botones modo Vista (ver §4.1) */
              <div className="flex items-center gap-2 ml-auto">
                <Button type="button" variant="outline"
                  className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
                  onClick={() => setHistorialOpen(true)}>
                  <History className="mr-2 h-4 w-4" /> Historial
                </Button>
                <Button type="button" onClick={() => setMode('edit')}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
              </div>
            ) : (
              /* Botones modo Editar/Crear (ver §4.2) */
              <div className="flex items-center justify-between w-full">
                <div className="flex-1" />
                <div className="flex gap-2 justify-end shrink-0">
                  {isEditing && (
                    <Button type="button" variant="outline"
                      onClick={() => { resetForm(entidad); setMode('view') }}
                      disabled={loading}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" />Guardar</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* HistorialDrawer FUERA del Dialog, dentro del fragmento */}
    {isEditing && (
      <HistorialDrawer
        open={historialOpen}
        onOpenChange={setHistorialOpen}
        entidadId={entidad!.id}
        entidadTipo="NombreEntidad"
        tabla="nombre_exacto_tabla_prisma"
      />
    )}
  </>
)
```

### 3.3 Alto Fijo del Modal

El `<DialogContent>` usa **altura fija** en desktop para evitar que el modal "salte" al cambiar de pestaña:
- Modales simples (1 pestaña): `sm:h-[450px]`
- Modales estándar (2-3 pestañas): `sm:h-[520px]` o `sm:h-[550px]`
- Modales complejos: `sm:h-[600px]`

Nunca usar `sm:h-auto`. El scroll ocurre dentro de `<div className="flex-1 overflow-y-auto">`.

### 3.4 DialogTrigger (shadcn/ui con @base-ui/react)

Esta versión de shadcn **NO soporta `asChild`**. Usar siempre `render={}`:

```tsx
{trigger && <DialogTrigger render={trigger as React.ReactElement} />}
```

---

## 4. FOOTER DEL MODAL — BOTONES DE ACCIÓN

> **REGLA CRÍTICA:** Los botones de acción del modal (Historial, Editar, Cancelar, Guardar) se colocan **SIEMPRE en un footer fijo al fondo** del `DialogContent`, separado del área de contenido con un borde superior. **NUNCA** deben ir flotando dentro del área scrolleable del formulario ni en la cabecera.

### Footer estándar

```tsx
{/* Footer — SIEMPRE al fondo, SIEMPRE con este estilo */}
<div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
  <div /> {/* placeholder izquierda (o botón Activar/Desactivar si aplica) */}
  <div className="flex gap-2 justify-end">
    {/* botones según modo — ver §4.1 y §4.2 */}
  </div>
</div>
```

Clases clave: `border-t bg-slate-50 sm:rounded-b-xl shrink-0`. El `shrink-0` evita que el footer se comprima cuando el contenido es largo. El `-mx-4 -mb-4 px-4` extiende el fondo hasta los bordes del diálogo.

### 4.1 Modo Vista (`mode === 'view'`)

```tsx
<>
  {/* Botón Activar/Desactivar — SOLO si aplica — queda a la izquierda */}
  {isEditing && (
    <Button type="button" variant={activo ? 'destructive' : 'default'} className="mr-auto" onClick={handleToggle}>
      {activo ? <><PowerOff className="mr-2 h-4 w-4" /> Desactivar</> : <><Power className="mr-2 h-4 w-4" /> Activar</>}
    </Button>
  )}

  {/* Botones a la derecha */}
  <div className="flex items-center gap-2">
    <Button type="button" variant="outline"
      className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
      onClick={() => setHistorialOpen(true)}>
      <History className="mr-2 h-4 w-4" /> Historial
    </Button>
    <Button type="button" onClick={() => setMode('edit')}>
      <Pencil className="mr-2 h-4 w-4" /> Editar
    </Button>
  </div>
</>
```

### 4.2 Modo Edición / Crear

```tsx
<div className="flex items-center justify-between w-full">
  <div className="flex-1">
    {/* Mensaje informativo izquierda (si el registro está en uso, etc.) */}
    {mode === 'edit' && entidad?.enUso && (
      <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" /> Algunos campos bloqueados (en uso).
      </p>
    )}
  </div>
  <div className="flex gap-2 justify-end shrink-0">
    {/* Cancelar: SOLO al editar un registro existente */}
    {isEditing && (
      <Button type="button" variant="outline"
        onClick={() => { resetForm(entidad); setMode('view') }}
        disabled={loading}>
        Cancelar
      </Button>
    )}
    <Button type="submit" disabled={loading}>
      {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" />Guardar</>}
    </Button>
  </div>
</div>
```

**Tabla resumen de botones:**

| Situación | Botones |
|---|---|
| Modo Vista (registro existente) | `Historial` (sky-blue) + `Editar` (primary) → derecha |
| Modo Crear (nuevo registro) | Solo `Guardar` → derecha. Sin Cancelar. |
| Modo Editar (registro existente) | `Cancelar` (outline) + `Guardar` → derecha |
| Activar/Desactivar | Solo en `mode === 'view'`, botón left con `mr-auto` |

---

## 5. PESTAÑAS EN MODALES

```tsx
<TabsList variant="line" className="mb-4 shrink-0">
  <TabsTrigger value="general">
    <Settings2 className="w-4 h-4 mr-2" /> General
  </TabsTrigger>
  <TabsTrigger value="configuracion">
    <Sliders className="w-4 h-4 mr-2" /> Configuración
  </TabsTrigger>
</TabsList>
```

**Reglas:**
- `variant="line"` siempre. Sin excepciones.
- `className="mb-4 shrink-0"` siempre.
- Cada `TabsTrigger` lleva ícono de `lucide-react` (`w-4 h-4 mr-2`) a la izquierda del texto.
- Siempre existe la pestaña `"general"` como pestaña inicial.
- Si hay error de validación con `field` retornado del servidor → navegar a la pestaña que contiene ese campo + enfocar el input: `setTimeout(() => document.getElementById(id)?.focus(), 100)`.

---

## 6. CAMPOS DE FORMULARIO

### 6.1 Grid y Espaciado Estándar

```tsx
<div className="grid grid-cols-2 gap-x-6 gap-y-4">
  <div className="flex flex-col gap-1.5 col-span-2">
    <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
    <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)}
      disabled={mode === 'view'} className="h-8 py-1 uppercase"
      aria-invalid={!!fieldErrors.nombre} />
    <FieldError message={fieldErrors.nombre} />
  </div>
</div>
```

Clases estándar: contenedor `flex flex-col gap-1.5`, inputs `h-8 py-1`, grid `gap-x-6 gap-y-4`.

### 6.2 Campos Autogenerados (Código, ID)

Ocultos al crear. Deshabilitados **permanentemente** al editar (no condicional con `mode`):

```tsx
{isEditing && (
  <div className="flex flex-col gap-1.5 col-span-1">
    <Label>Código</Label>
    <Input value={codigo} disabled={true} className="bg-muted/50 font-mono text-sm" />
  </div>
)}
```

---

## 7. COMPONENTES UI ESPECIALES

### 7.1 Inputs Numéricos

**NUNCA** `<input type="number">`. Siempre:

```tsx
import { NumericInput } from '@/components/ui/numeric-input'

<NumericInput
  id="cantidad"
  value={cantidad}
  onChange={(val) => setCantidad(val ?? 0)}
  isInteger={true}
  disabled={mode === 'view'}
  aria-invalid={!!fieldErrors.cantidad}
  className="h-8 py-1"
/>
```

### 7.2 Selects Hardcoded (Opciones Fijas)

Usar `<Select>` nativo de shadcn. Labels: primera letra mayúscula, resto minúscula. Sin buscador.

```tsx
<Select value={estado} onValueChange={setEstado} disabled={mode === 'view'}>
  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="NO_APLICA">No aplica</SelectItem>
    <SelectItem value="LIBRE">Libre</SelectItem>
    <SelectItem value="FIJO">Fijo</SelectItem>
  </SelectContent>
</Select>
```

### 7.3 Selects de Base de Datos (Dinámicos)

Siempre `<SearchableSelect>`. Opciones como `{ value: string, label: string }`. Los datos de BD vienen en MAYÚSCULAS.

**Auto-selección al cargar:** Siempre seleccionar el primero de la lista, **excepto** para Clientes e Ítems.

**Cascada:** Al cambiar el select padre → limpiar hijo → recargar lista hijo → auto-seleccionar primero del hijo.

**⚠️ Ordenamiento Obligatorio (R17):** Todo select que cargue datos desde la base de datos o desde el ERP **DEBE** ordenarse alfabéticamente ascendente (A-Z) al momento de construir las opciones, usando `.sort((a, b) => a.label.localeCompare(b.label))`. Esto aplica a: empresas, categorías, items, tipos de costeo, turnos, uniformes, bonos, departamentos, municipios, y cualquier otra entidad que provenga de BD/ERP.

```tsx
// ✅ CORRECTO — cargar + ordenar
useEffect(() => {
  if (open) {
    getEmpresasForUser().then(data => {
      const opts = data
        .map(e => ({ value: e.id.toString(), label: e.nombre }))
        .sort((a, b) => a.label.localeCompare(b.label))  // ← OBLIGATORIO
      setEmpresas(opts)
      if (opts.length > 0 && !isEditing) setEmpresaId(opts[0].value)
    })
  }
}, [open])

// JSX
<SearchableSelect
  options={empresas}
  value={empresaId}
  onChange={setEmpresaId}
  disabled={mode === 'view'}
  error={!!fieldErrors.empresaId}
  placeholder="Seleccionar empresa"
/>
```

**Excepción — Selects hardcoded:** Cuando las opciones están definidas en el código (ej. `OPCIONES_CUBRE_DESCANSO`, estados, `CATEGORIAS_SERVICIO`), se respeta el orden definido por el desarrollador. **No aplicar sort**.

**Excepción — Jerarquías/árboles:** Selects que representan estructura jerárquica (ej. destino al mover nodo de costeo) mantienen su orden natural de árbol. **No aplicar sort**.

### 7.4 Prop `searchable` en SearchableSelect

El componente `<SearchableSelect>` soporta la prop `searchable` (default `true`).

- `searchable={true}` (default): Muestra el input de búsqueda. Usar cuando la lista puede ser larga o de tamaño impredecible.
- `searchable={false}`: Oculta el input de búsqueda y lista todos los registros directamente. Usar cuando la lista siempre tendrá pocos registros (ej. Categorías de Items).

```tsx
// Lista corta — sin buscador
<SearchableSelect
  options={opcionesCategoria}
  value={categoriaId}
  onChange={setCategoriaId}
  searchable={false}
/>
```

---


### 7.5 Detección de Similares / Anti-duplicados (R18)

**Regla:** En toda pantalla de catálogo que tenga un campo Nombre o Descripción libre, se debe verificar si existe un registro similar antes de guardar. El objetivo es minimizar la creación de duplicados.

#### Alcance por Empresa

> **CRÍTICO:** La comparación de similitud se realiza **únicamente contra registros de la misma empresa**. Dos empresas distintas SÍ pueden tener registros con nombres iguales o similares — eso es válido y no debe generar advertencia.

El `empresaId` debe siempre filtrarse antes de comparar:

```typescript
// ✅ CORRECTO — filtrar por empresa antes de comparar
const deEmpresa = todos
  .filter(i => i.empresaId === empresaId)  // ← OBLIGATORIO
  .map(i => ({ id: i.id, descripcion: i.descripcion }))
return detectarSimilares(descripcion, deEmpresa, 0.85, excluirId)

// ❌ INCORRECTO — comparar contra toda la BD mezclaría empresas
return detectarSimilares(descripcion, todos, 0.85, excluirId)
```

#### Cuándo Activar la Validación

- Al intentar **Guardar** un registro nuevo o editado (no en onBlur, no en onChange).
- Solo para campos de texto libre (Nombre, Descripción). No aplica a códigos, IDs ni campos codificados.
- Solo en catálogos propios de Costeos. No aplica a búsquedas de ítems dentro de costeos (allí la lista puede ser enorme y la búsqueda es intencional).

#### Comportamiento Esperado

| Situación | Acción |
|---|---|
| No se encuentran similares (< 85%) | Guardar procede normalmente |
| Se encuentran similares (≥ 85%) | Se muestra advertencia con la lista y porcentaje. El guardado se **detiene**. |
| Porcentaje 100% (texto idéntico) | El porcentaje aparece en **rojo** |
| Usuario acepta igualmente | Clic en "Sí, guardar de todas formas" → guarda sin re-verificar |
| Usuario cancela | Clic en "Cancelar" → cierra la advertencia para corregir el nombre |

#### Algoritmo

Ubicado en `src/lib/utils/similarity.ts`. Combina dos estrategias y toma el máximo:

1. **Levenshtein normalizado** sobre el texto completo.
2. **Levenshtein normalizado** sobre el texto **sin stopwords** (preposiciones y artículos del español: `DE`, `DEL`, `LA`, `EL`, `LOS`, `CON`, `POR`, etc.).

Esto permite detectar variantes semánticas:
```
"JEFE DE GRUPO"  vs  "JEFE GRUPO"  →  100% (idénticos sin stopwords)
"COORDINADOR DE AREA"  vs  "COORDINADOR AREA"  →  100%
```

El umbral es **85%** por defecto. Al editar, se excluye el propio registro de la comparación (`excluirId`).

#### Implementación Estándar

```typescript
// server action (actions/mi-entidad.ts)
export async function buscarMiEntidadSimilares(
  nombre: string,
  empresaId: number,
  excluirId?: number,
): Promise<SimilarItem[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  const todos = await MiEntidadRepository.findAll()
  const deEmpresa = todos
    .filter(r => r.empresaId === empresaId)  // ← siempre filtrar por empresa
    .map(r => ({ id: r.id, descripcion: r.nombre }))
  return detectarSimilares(nombre, deEmpresa, 0.85, excluirId)
}
```

```typescript
// En el modal (components/mi-entidad/mi-entidad-modal.tsx)
const [similares, setSimilares] = useState<SimilarItem[]>([])

// doSave() — lógica pura de guardado, sin verificación de similares
const doSave = async () => { /* crearMiEntidad / actualizarMiEntidad */ }

// handleSave — verifica similares PRIMERO
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault()
  setSimilares([])
  // ... validaciones de campo ...

  // Verificar similares
  const found = await buscarMiEntidadSimilares(normalizeText(nombre), parseInt(empresa, 10), miEntidad?.id)
  if (found.length > 0) { setSimilares(found); return }

  await doSave()
}
```

```tsx
{/* JSX del aviso — debajo del input de Nombre/Descripción */}
{similares.length > 0 && mode === 'edit' && (
  <div className="mt-1 rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
    <p className="text-xs font-semibold text-amber-800">
      ⚠️ Se encontraron {similares.length} registro(s) similar(es) — ¿Desea guardar de todas formas?
    </p>
    <ul className="space-y-1">
      {similares.map(s => (
        <li key={s.id} className="flex justify-between text-xs text-amber-900">
          <span className="font-mono">{s.descripcion}</span>
          <span className={`font-bold ml-2 ${s.pct === 100 ? 'text-red-600' : 'text-amber-700'}`}>{s.pct}%</span>
        </li>
      ))}
    </ul>
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={() => { setSimilares([]); doSave() }}
        className="text-xs bg-amber-700 text-white px-3 py-1 rounded hover:bg-amber-800 font-medium">
        Sí, guardar de todas formas
      </button>
      <button type="button" onClick={() => setSimilares([])}
        className="text-xs text-amber-800 underline hover:text-amber-900">
        Cancelar
      </button>
    </div>
  </div>
)}
```

#### Pantallas que ya tienen R18 implementado

| Pantalla | Campo verificado | Scope |
|---|---|---|
| Items (`item-modal.tsx`) | Descripción | Por empresa |
| Categorias (`categoria-modal.tsx`) | Nombre | Por empresa |

---


## 8. MANEJO DE ERRORES

### 8.1 Errores de Campo (debajo del input)

**SIEMPRE** usar el componente `<FieldError>` (`src/components/ui/field-error.tsx`). **NUNCA** escribir el `<p>` inline directamente.

```tsx
import { FieldError } from '@/components/ui/field-error'

// Debajo de cada input con error potencial:
<FieldError message={fieldErrors.nombre} />
```

**¿Por qué?** `<FieldError>` es el único lugar donde se define la presentación visual de los errores de campo. Si en el futuro se quiere cambiar el estilo (burbuja, tooltip, ícono), se edita **solo ese componente** y toda la app se actualiza automáticamente.

**`fieldErrors` es la fuente única de errores de campo**, sin importar el origen:

| Origen del error | Cómo llega a `fieldErrors` |
|---|---|
| Validación local (campo vacío, formato) | `errors.campo = 'Requerido'` → `setFieldErrors(errors)` |
| Servidor / base de datos | `res.field` + `res.error` → `setFieldErrors({ [res.field]: res.error })` |
| ERP u otro servicio externo | Dentro del handler del lookup → `setFieldErrors(prev => ({ ...prev, campo: 'Mensaje' }))` |

**Regla de preservación al guardar:** Al ejecutar `handleSave`, NO limpiar `fieldErrors` con `setFieldErrors({})` al inicio. En cambio, construir los errores de validación local Y preservar errores de servicios externos que ya estén en `fieldErrors`:

```tsx
async function handleSave(e: React.FormEvent) {
  e.preventDefault()
  setGlobalError(null)

  const errors: Record<string, string> = {}
  if (!nombre.trim()) errors.nombre = 'Requerido'
  // Preservar errores de lookups externos (ERP, etc.) que ya estén activos
  if (fieldErrors.campoExterno) errors.campoExterno = fieldErrors.campoExterno

  setFieldErrors(errors)
  if (Object.keys(errors).length > 0) return

  // ... proceder con el guardado
}
```

Mensajes concisos: `"Requerido"`, `"Inválido"`, `"Ya existe"`, `"No encontrado en ERP"`.

### 8.2 Errores Globales (al tope del formulario)

```tsx
{globalError && (
  <div className="text-red-500 text-sm font-medium mb-4 shrink-0">{globalError}</div>
)}
```

### 8.3 Reglas de Errores

- **NUNCA** usar `toast` para errores de validación de campo.
- `toast` solo para mensajes de éxito o errores de operaciones secundarias.
- Los campos NO deben borrarse al mostrar un error global.
- El formulario siempre lleva `noValidate` para deshabilitar las burbujas nativas del navegador.

---

## 9. NORMALIZACIÓN DE TEXTO

```tsx
import { normalizeText } from '@/lib/utils/text'

// En onChange:
onChange={(e) => setNombre(normalizeText(e.target.value))}

// O antes de guardar:
nombre: normalizeText(data.nombre)
```

Los inputs de texto libre llevan clase `uppercase` para retroalimentación visual inmediata.

---

## 10. HISTORIAL DE AUDITORÍA

```tsx
{isEditing && (
  <HistorialDrawer
    open={historialOpen}
    onOpenChange={setHistorialOpen}
    entidadId={entidad!.id}
    entidadTipo="NombreEntidad"
    tabla="nombre_exacto_tabla_prisma"   // coincide con el esquema de Prisma
  />
)}
```

El `tabla` debe coincidir **exactamente** con el nombre de la tabla en la BD. Se activa desde el botón "Historial" del footer en modo Vista.

---

## 11. SERVER ACTIONS (BACKEND)

### 11.1 Estructura Estándar

```typescript
'use server'

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string }

export async function crearEntidad(data: EntidadInput): Promise<ActionResult<EntidadRow>> {
  const userRes = await obtenerUsuarioActual()
  if (!userRes.ok) return { ok: false, error: userRes.error }

  const parsed = entidadSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString()
    }
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const nueva = await tx.entidad.create({
        data: { ...parsed.data, usuarioCreo: userRes.userId }
      })
      await tx.auditLog.create({
        data: {
          tabla: 'nombre_tabla',
          registroId: nueva.id,
          accion: 'CREATE',
          usuarioId: userRes.userId,
          datosDespues: JSON.stringify(nueva),
        }
      })
      return nueva
    })

    revalidatePath('/dashboard/configuracion/entidad')
    return { ok: true, data: resultado }
  } catch (error: any) {
    return { ok: false, error: 'Error al guardar el registro.' }
  }
}
```

### 11.2 Concurrencia Optimística

Cada tabla tiene `registroVersion` (Int, default 0). Al actualizar, incrementar:

```typescript
data: { ...parsed.data, registroVersion: { increment: 1 } }
```

Si el registro fue modificado por otro usuario concurrentemente, Prisma lanzará error `P2025`. Capturarlo y retornar mensaje al usuario.

### 11.3 Atomicidad (Todo o Nada)

Toda operación que toque más de una tabla (registro + audit log) DEBE estar dentro de `prisma.$transaction(async (tx) => {...})`.

### 11.4 Flujo Post-Guardado en el Frontend

```typescript
if (result.ok) {
  if (mode === 'edit') {
    resetForm(result.data)   // actualizar estados con datos frescos del servidor
    setMode('view')          // regresar a Vista SIN cerrar el modal
  } else {
    setOpen(false)           // Modo Crear → cerrar el modal
  }
}
```

---

## 12. NOMENCLATURA Y TÍTULOS

- **1 a 3 palabras**, sin preposiciones ("de", "del", "y", "la", "el").
- Siempre **Title Case**.
- Ejemplos: "Tipos Costeos", "Nueva Categoría", "Detalle Empresa".
- Textos libres en MAYÚSCULAS y sin tildes.
- Encabezados de sección internos del formulario en MAYÚSCULAS sin tilde.

```tsx
// Sección separadora interna
<div className="flex items-center mb-3">
  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
    DATOS GENERALES
  </h3>
  <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
</div>
```

---

## 13. TYPES Y SCHEMAS (ZOD)

Cada entidad tiene `src/lib/types/<entidad>.ts`:

```typescript
import { z } from 'zod'

export const entidadSchema = z.object({
  empresaId: z.coerce.number().min(1, 'Empresa es requerida'),
  nombre:    z.string().min(1, 'Nombre es requerido').max(100),
  activo:    z.boolean().default(true),
})

export type EntidadInput = z.infer<typeof entidadSchema>

export type EntidadRow = {
  id:              number
  empresaId:       number
  empresaNombre?:  string    // calculado, no en BD directa
  nombre:          string
  activo:          boolean
  usuarioCreo:     number
  fechaCreo:       Date
  registroVersion: number   // para concurrencia optimística
}
```

---

## 14. REGLAS CRÍTICAS — RESUMEN RÁPIDO

| # | Regla |
|---|---|
| R1 | Ícono de acción en tabla: siempre `<Eye className="h-4 w-4 text-blue-600" />`. Nunca `Search` u otros. |
| R2 | NO usar `toast` para errores de validación de campo. Solo para éxito. |
| R3 | NO borrar campos del formulario al mostrar errores globales. |
| R4 | Al cancelar edición: `resetForm(entidad)` + `setMode('view')`. NO cerrar modal. |
| R5 | La 'X' de cierre la provee `DialogContent` automáticamente. NO agregar 'X' manual en el header. |
| R6 | El bug del "Flash" (modal que regresa a View al dar click en Editar) se evita inicializando en `handleOpenChange`, NO en `useEffect` con dependencias en `mode` o datos del registro. |
| R7 | `tableId` único por entidad en `<DataTable>` (persistencia en `localStorage`). |
| R8 | El proyecto corre en **`http://localhost:30001`**. |
| R9 | `registroVersion` en toda tabla para concurrencia optimística. |
| R10 | Toda operación multi-tabla en `prisma.$transaction()`. |
| R11 | Botones del modal **SIEMPRE en el footer inferior** (`border-t bg-slate-50`). Nunca en el header ni dentro del área scrolleable. |
| R12 | En la columna de acciones del DataTable, usar **una instancia del modal por fila** vía `trigger` prop. NUNCA usar estado compartido `selectedItem + setModalOpen` — causa que el modal se abra con datos vacíos (condición de carrera). |
| R13 | Errores de campo: **SIEMPRE** usar `<FieldError message={fieldErrors.campo} />` (`src/components/ui/field-error.tsx`). NUNCA escribir el `<p className="text-xs text-red-500...">` inline. La presentación visual de errores de campo se define **únicamente** en ese componente. |
| R14 | **El ícono del sidebar es la fuente de verdad.** El mismo ícono que aparece en el sidebar para una entidad debe usarse en: (1) el encabezado de su página principal y (2) su modal (`DialogTitle` + pestaña General). Ver §15 para la tabla de íconos canónicos. |
| R15 | **Encabezado de página estándar:** toda pantalla de listado/CRUD debe usar exactamente este patrón en su client component (ver §2.4): `<div className="space-y-6">` → `<div className="flex items-center gap-2 text-indigo-900">` → `<IconoEntidad className="h-6 w-6" />` → `<h1 className="text-2xl font-bold tracking-tight">`. El `page.tsx` (Server Component) NO debe contener markup de encabezado; solo pasa datos al client component. |

---

## 15. ÍCONOS POR ENTIDAD

Cada entidad tiene **un ícono canónico** definido en el sidebar (`app-sidebar.tsx`). Ese ícono es la **fuente de verdad** y debe usarse de forma idéntica en:

1. **Sidebar** (`app-sidebar.tsx`) — el ícono se define aquí primero
2. **Encabezado de página** — junto al `<h1>` en el client component
3. **Modal** — en `DialogTitle` y en la pestaña "General" del `TabsTrigger`

```tsx
// Ejemplo — Empresas usa Building2 en todos los contextos:

// 1. Sidebar:
{ label: 'Empresas', href: '...', icon: Building2 }

// 2. Modal (DialogTitle):
<Building2 className="w-5 h-5 text-slate-500" />

// 2. Modal (TabsTrigger General):
<Building2 className="w-4 h-4 mr-2" /> General

// 3. Encabezado de página:
<Building2 className="h-6 w-6" />
```

### Tabla de íconos vigentes

| Entidad | Ícono | Importar de |
|---|---|---|
| Empresas | `Building2` | `lucide-react` |
| Tipos Costeo | `Network` | `lucide-react` |
| Categorías | `Tags` | `lucide-react` |
| Ítems | `Package` | `lucide-react` |
| Usuarios | `Users` | `lucide-react` |

> Al desarrollar una pantalla nueva, elegir el ícono **antes** de escribir código y agregarlo a esta tabla. El mismo ícono va en los tres contextos mencionados.

---

## 16. LOG DE AUDITORÍA SEMÁNTICO

> **Regla obligatoria** para todo `AuditRepository.logUpdate`. Aplica a todos los services del proyecto.

### 16.1 El Problema con Objetos Completos

Pasar objetos crudos a `logUpdate` genera entradas ilegibles:
- Muestra campos técnicos (`registroVersion`, `usuarioCreo`, `fechaCreo`) que no le interesan al usuario.
- Muestra **todos** los campos aunque no hayan cambiado.
- Usa claves de columna BD (`razonSocial`, `codigoErp`) en lugar de labels legibles.

```ts
// ❌ MAL — genera ruido: muestra registroVersion, fechaCreo, campos sin cambio, etc.
await AuditRepository.logUpdate(TABLA, id, userId, anterior as any, reg as any, tx as any)
```

### 16.2 La Solución: `computeDiff`

Usar siempre la utilidad `computeDiff` de `src/lib/utils/audit.ts`:

```ts
import { computeDiff } from '@/lib/utils/audit'

// ✅ BIEN — solo campos que cambiaron, con labels legibles
const { antes, despues } = computeDiff(CAMPOS_ENTIDAD, anterior as any, reg as any)
if (Object.keys(antes).length > 0) {
  await AuditRepository.logUpdate(TABLA, id, userId, antes as any, despues as any, tx as any)
}
```

El guard `Object.keys(antes).length > 0` evita crear entradas vacías cuando el usuario guarda sin cambios.

### 16.3 Definir el Mapa de Campos

Cada service define su propia constante `CAMPOS_<ENTIDAD>` con los campos auditables y sus labels legibles:

```ts
/** Campos auditables con labels legibles. Solo incluir campos editables por el usuario. */
const CAMPOS_EMPRESA = [
  { key: 'nombre',      label: 'Nombre' },
  { key: 'razonSocial', label: 'Razón Social' },
  { key: 'nit',         label: 'NIT' },
  { key: 'codigoErp',   label: 'Código ERP' },
] as const
```

**Reglas para el mapa:**
- Incluir **solo** los campos que el usuario puede editar.
- **Excluir** siempre: `registroVersion`, `usuarioCreo`, `fechaCreo`, `id`.
- Los `labels` deben coincidir con los labels del formulario (misma nomenclatura que ve el usuario).
- Los booleanos se formatean automáticamente como `"Sí"` / `"No"` por `computeDiff`.

### 16.4 Cambios Puntuales Sin computeDiff

Cuando solo cambia **un campo específico** (ej: `toggleActivo`), se puede escribir el diff directamente — más legible que usar computeDiff:

```ts
// ✅ OK — campo puntual, diff explícito
await AuditRepository.logUpdate(
  TABLA, id, userId,
  { Activo: tipo.activo ? 'Sí' : 'No' },
  { Activo: reg.activo  ? 'Sí' : 'No' },
  tx as any,
)
```

### 16.5 Cambios Compuestos (Empresa + Sub-entidades)

Cuando una sola acción del usuario modifica la entidad principal **y** sub-entidades relacionadas (ej: Empresa + catálogos ERP), generar **un único log consolidado** con todos los cambios:

```ts
// ✅ BIEN — un único log con todos los campos que cambiaron
const antes: Record<string, unknown>   = {}
const despues: Record<string, unknown> = {}

// Campos principales via computeDiff
const diffEmpresa = computeDiff(CAMPOS_EMPRESA, anterior, nuevo)
Object.assign(antes, diffEmpresa.antes)
Object.assign(despues, diffEmpresa.despues)

// Sub-entidades (catálogos, relaciones, etc.)
for (const cat of catalogosCambiados) {
  antes[`Sync ${cat.label}`]   = cat.valorAnterior ? 'Sí' : 'No'
  despues[`Sync ${cat.label}`] = cat.nuevoValor    ? 'Sí' : 'No'
}

if (Object.keys(antes).length > 0) {
  await AuditRepository.logUpdate(TABLA, id, userId, antes as any, despues as any, tx as any)
}
```

**¿Por qué un único log?** El historial debe reflejar la intención del usuario ("guardé estos cambios"), no los detalles de implementación ("hice 3 llamadas a BD"). Si el usuario modifica NIT + Sync Clientes + Sync Items en una sola acción de "Guardar", el historial debe mostrar **una sola entrada** con los 3 cambios.

### 16.6 Resumen Rápido

| Escenario | Herramienta |
|---|---|
| Actualizar múltiples campos de una entidad | `computeDiff(CAMPOS_ENTIDAD, anterior, nuevo)` |
| Cambiar un solo campo puntual | Diff manual `{ Label: antes }` → `{ Label: despues }` |
| Cambiar entidad + sub-entidades en un solo guardado | Diff consolidado manual (ver §16.5) |
| Ningún campo cambió | NO llamar `logUpdate` (verificar con `Object.keys(antes).length > 0`) |
| Booleanos | `computeDiff` los formatea automáticamente como `"Sí"` / `"No"` |

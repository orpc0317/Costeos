# Convenciones de Desarrollo - Costeos

Este documento contiene las reglas y componentes estandarizados que han nacido orgánicamente en el proyecto y que deben ser respetados por la IA en futuras implementaciones.

## UI y Formularios

### Tablas y Pantallas CRUD
- **Regla:** NUNCA implementar tablas HTML planas ni iterar listas manualmente para vistas principales de entidades (CRUDs).
- **Solución:** Utilizar siempre el componente estándar `<DataTable>` ubicado en `src/components/ui/data-table.tsx`.
- **Detalle:** Consultar `docs/crud-standard.md` para ver la forma correcta de implementar columnas, persistencia y theming unificado.

### Inputs Numéricos (Cantidades, Costos, Porcentajes)
- **Regla:** NUNCA utilizar `<input type="number">` directamente en componentes de React que estén enlazados a un estado (State/Context) para evitar el error de hidratación y el "síndrome del punto decimal fantasma".
- **Solución:** Utilizar el componente reutilizable `<NumericInput>` ubicado en `src/components/ui/numeric-input.tsx`.
- **Uso:**
  ```tsx
  import { NumericInput } from '@/components/ui/numeric-input';
  
  <NumericInput 
    value={stateValue} 
    onChange={(val) => handleChange(val)} 
    className="..."
  />
  ```

### Modales (Dialogs)
- **Regla:** Estamos utilizando la librería `shadcn/ui` que por debajo implementa `@base-ui/react`. Esta versión reciente NO soporta la propiedad `asChild` en el `DialogTrigger` de la misma manera que versiones anteriores.
- **Solución:** Si necesitas un botón personalizado como disparador, debes usar la propiedad `render={}` en lugar de `asChild`.
- **Uso:**
  ```tsx
  <DialogTrigger render={<button className="mi-clase">Abrir</button>}>
    Icono o Texto
  </DialogTrigger>
  ```

### Selects (Comboboxes) y Cascada
- **Regla 1 (Componente y Mapeo):** En lugar del Select nativo de Shadcn, SIEMPRE se debe utilizar el componente `<SearchableSelect>` ubicado en `src/components/ui/searchable-select.tsx`. Este requiere que las opciones se mapeen estrictamente al formato `{ value: string, label: string }`.
- **Regla 2 (Búsqueda):** Este componente ya incluye un buscador interno (Combobox) para que el usuario pueda escribir parte del nombre de la opción.
- **Regla 3 (Código vs Nombre):** El componente mostrará el `label` (nombre/descripción) al usuario, pero su estado interno guardará el `value` (código/id). Si se guarda como código, pero la API/BD requiere un ID numérico, interceptarlo mediante un `<input type="hidden">` antes del submit.
- **Regla 4 (Auto-selección):** Siempre se debe auto-seleccionar el primer registro disponible al cargar los datos, de manera global. **Excepciones:** Las búsquedas de "Clientes" o "Ítems", o a menos que se indique explícitamente lo contrario, NO se autoseleccionan.
- **Regla 5 (Cascadas Automáticas):** Si un Select depende de otro (ej. Tipo Costeo depende de Empresa), al cambiar el padre, se debe limpiar la selección del hijo, cargar la nueva lista y aplicar la *Regla 4* (auto-seleccionar el primero) de forma encadenada.
- **Uso:**
  ```tsx
  import { SearchableSelect } from '@/components/ui/searchable-select';
  
  const opciones = datos.map(d => ({ value: String(d.codigo), label: d.nombre }));

  <SearchableSelect
    options={opciones}
    value={codigoSeleccionado}
    onChange={setCodigoSeleccionado}
    placeholder="Seleccione..."
  />
  ```

### Labels y Títulos (Naming Conventions)
- **Regla 1:** Todos los labels, botones y títulos de pantallas deben evitar el uso de preposiciones como "de", "y", "del", "el", "la". Tratar que se lean con 1 a 3 palabras.
- **Ejemplo:** En lugar de "Tipos de Costeos", usar "Tipos Costeos". En lugar de "Nuevo Tipo de Costeo", usar "Nuevo Tipo Costeo".
- **Formato:** Siempre usar Title Case (la primera letra de cada palabra en Mayúscula).
- **Botones de Edición y Acciones del Modal (Modo Vista vs Edición):** 
  1. Cuando el modal esté en modo Vista (`mode === 'view'`), las acciones deben agruparse a la **derecha** del footer.
  2. El botón de edición debe usar el texto **"Editar"** (no "Modificar") con el ícono `<Pencil className="w-4 h-4 mr-2" />`.
  3. Siempre se debe incluir el botón de **Historial** a la izquierda del botón "Editar" con el ícono `<History className="mr-2 h-4 w-4" />` que abre el componente `<HistorialDrawer>`.
  4. **NO usar botones de "Cerrar" o "Cancelar" innecesarios:** Si la única función del botón es cerrar el modal (por ejemplo, al crear un nuevo registro), NO se debe incluir un botón de Cancelar. La "X" nativa de la esquina superior derecha ya cumple esa función.
  5. **Botón Cancelar Exclusivo de Edición:** El botón de **"Cancelar"** (variante `ghost` o `outline`) SOLO debe existir cuando se está editando un registro existente (`isEditing === true`). Su única función debe ser deshacer los cambios actuales (`resetForm()`) y regresar a `mode === 'view'`, SIN cerrar el modal. Al crear un nuevo registro, solo debe mostrarse el botón "Guardar".
  6. **Comportamiento post-edición:** Al guardar un registro editado exitosamente, el modal NO debe cerrarse, debe permanecer abierto y cambiar su estado a modo Vista (`setMode('view')`).
  7. **Manejo del Estado del Modal en Tablas:** Para evitar que un modal se cierre inesperadamente al guardar (debido a que `revalidatePath` refresca la data y React Table desmonta las filas completas si cambia la referencia de `data`), el modal de edición de una fila NUNCA debe incluirse directamente inline dentro de la definición de `columns`. Debe extraerse a un componente cliente independiente (ej. `<NombreEntidadAcciones>`) que maneje su propio estado `open` y controle el `<Dialog>`.
  8. **Alto Fijo en Modales con Pestañas:** Para evitar que el modal "salte" o se redimensione molestamente al cambiar entre pestañas que tienen distinto contenido, los modales grandes (`<DialogContent>`) deben llevar una altura fija en desktop en lugar de `sm:h-auto` (ej. usar `sm:h-[550px]` o `sm:h-[600px]`), y tener sus áreas internas (`flex-1`, `overflow-y-auto`) configuradas para hacer scroll cuando sea necesario.
  9. **Foco de Pestañas en Errores de Validación:** Si un modal utiliza pestañas (`<Tabs>`) y ocurre un error de validación (ya sea en cliente o devuelto por el servidor), el sistema debe cambiar automáticamente la pestaña activa hacia aquella que contenga el campo con error, para que el usuario pueda ver el mensaje y corregirlo inmediatamente.

### Campos Autogenerados y de Solo Lectura
- **Regla:** Los campos cuyo valor es generado automáticamente por el sistema (ej. un "Código" secuencial) no deben poder ser alterados por el usuario.
- **Implementación:** Durante la creación (nuevo registro), estos campos deben estar ocultos. Durante la edición (registro existente), deben mostrarse pero estar **permanentemente deshabilitados** (`disabled={true}` en lugar de depender de `mode === 'view'`). Se debe agregar la clase `bg-muted/50` para reforzar visualmente que es de solo lectura.

### Normalización de Textos (Mayúsculas y sin Tildes)
- **Regla:** TODO el texto ingresado por el usuario en campos de texto libre (nombres, direcciones, etc.) debe guardarse SIEMPRE en MAYÚSCULAS y SIN TILDES (diacríticos) para facilitar las búsquedas y evitar duplicidad de registros (ej. "Petén" vs "PETEN").
- **Solución:** Utilizar la función `normalizeText` ubicada en `src/lib/utils/text.ts` en los manejadores de cambios (`onChange` o antes de hacer dispatch/guardar).

### Mensajes de Error de Validación (Campos)
- **Regla 1 (Ubicación y Estilo):** Cuando un campo individual de un formulario no cumple las condiciones (ej. requerido o inválido), el mensaje de error debe aparecer justo debajo del campo de input correspondiente, manteniendo un espaciado muy ajustado para integrarse visualmente.
- **Regla 2 (Mensajes Concisos):** Los textos de validación deben ser lo más cortos y directos posible. Para campos obligatorios, utilizar únicamente la palabra **"Requerido"** en lugar de frases largas como "El campo nombre es requerido". Esto mantiene la interfaz más limpia.
- **Solución:** Utilizar siempre las clases `text-xs text-red-500 !mt-0.5 leading-none` en la etiqueta `<p>` del mensaje de error. El `!mt-0.5` sobreescribe los márgenes de los contenedores padre, manteniéndolo pegado al input.
- **Uso:**
  ```tsx
  {fieldErrors.nombre && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nombre}</p>}
  ```

### Espaciado de Formularios y Campos
- **Regla:** El espaciado vertical entre campos no debe sentirse demasiado holgado. Los campos de texto y combos deben ser compactos (ej. h-8), y el espaciado vertical entre filas debe ser `space-y-2`.
- **Solución:** Utilizar clases como `space-y-2` (en lugar de space-y-4 o 6), `gap-3` o `gap-4` para grid horizontal, e inputs con clase `h-8 py-1`.
- **Max-Width:** Para evitar que los formularios se estiren excesivamente en monitores grandes, envolverlos en un contenedor con restricciones (ej. `max-w-md`, `max-w-xl` o `max-w-2xl` dependiendo de la densidad de columnas).

### Encabezados de Secciones (Separadores)
- **Regla 1 (Ortografía):** NUNCA usar tildes en los títulos o nombres de sección (ej. usar "CONFIGURACION" en lugar de "Configuración").
- **Regla 2 (Diseño):** El diseño estándar para separar secciones dentro de un formulario es utilizar un contenedor flexible que alinee verticalmente el texto con una línea divisoria. El título debe llevar un borde izquierdo (`border-l-2`) y la línea debe dibujarse a media altura usando `border-t`. Ambos usando el color azul tenue estándar de la aplicación.
- **Uso (Ejemplo):**
  ```tsx
  <div className="flex items-center mb-3">
    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
      TITULO SECCION
    </h3>
    <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
  </div>
  ```

### Labels e Inputs (Formularios)
- **Contenedor:** Cada campo de formulario (Label + Input) debe estar envuelto en un contenedor con la clase `flex flex-col gap-1.5` (o `space-y-1.5`). Esto asegura un espaciado consistente y pegado entre el label y su input en toda la aplicación.
- **Label:** Utilizar el componente `<Label>` de shadcn/ui sin sobreescribir sus clases base de texto. NO agregar `className="text-sm font-medium"` manualmente, ya que el componente por defecto ya incluye `text-sm font-medium leading-none`. Solo usar `className` si se requiere un estilo especial (ej. cursiva o color).

### Historial de Auditoría (Audit Log)
- **Regla 1 (Integración):** Todas las pantallas principales de visualización/edición de registros deben incluir el `<HistorialDrawer>`.
- **Regla 2 (Prop 'tabla'):** Al instanciar el `<HistorialDrawer>`, se debe pasar la prop `tabla` con el **nombre exacto de la tabla de base de datos** (tal como está mapeada en el esquema de Prisma, ej. `costeos_categoria_item`). No usar nombres genéricos o camelCase, o el historial no se conectará.
- **Regla 3 (Campos Ignorados):** El historial no debe mostrar cambios en campos del sistema, metadatos, o llaves primarias para no saturar al usuario final. Campos como `id`, `usuario_creo`, `fecha_creo`, `registro_version`, etc., deben estar excluidos en el archivo centralizado `src/app/actions/auditoria.ts` (variable `CAMPOS_IGNORADOS`).

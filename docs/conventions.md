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
- **Regla:** Todos los labels, botones y títulos de pantallas deben evitar el uso de preposiciones como "de", "y", "del", "el", "la". Tratar que se lean con 1 a 3 palabras.
- **Ejemplo:** En lugar de "Tipos de Costeos", usar "Tipos Costeos". En lugar de "Nuevo Tipo de Costeo", usar "Nuevo Tipo Costeo".
- **Formato:** Siempre usar Title Case (la primera letra de cada palabra en Mayúscula).

### Normalización de Textos (Mayúsculas y sin Tildes)
- **Regla:** TODO el texto ingresado por el usuario en campos de texto libre (nombres, direcciones, etc.) debe guardarse SIEMPRE en MAYÚSCULAS y SIN TILDES (diacríticos) para facilitar las búsquedas y evitar duplicidad de registros (ej. "Petén" vs "PETEN").
- **Solución:** Utilizar la función `normalizeText` ubicada en `src/lib/utils/text.ts` en los manejadores de cambios (`onChange` o antes de hacer dispatch/guardar).

### Mensajes de Error de Validación (Campos)
- **Regla:** Cuando un campo individual de un formulario no cumple las condiciones (ej. requerido o inválido), el mensaje de error debe aparecer justo debajo del campo de input correspondiente, manteniendo un espaciado muy ajustado para integrarse visualmente.
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

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CONVENCIONES DEL PROYECTO (Costeos)
- **Inputs Numéricos:** NUNCA utilizar `<input type="number">` directamente en estado controlado de React para evitar el error de hidratación. Utilizar SIEMPRE el componente reutilizable `<NumericInput>` ubicado en `src/components/ui/numeric-input.tsx`.
- **Modales (Dialogs):** La librería `shadcn/ui` utiliza `@base-ui/react`. NO soporta la propiedad `asChild` en el `DialogTrigger`. Debes usar la propiedad `render={<button>...</button>}`.

- **Selects (Comboboxes):** Los selects SIEMPRE deben desplegar solo el nombre/descripción al usuario, pero deben guardar el código internamente. Deben usar un componente de búsqueda (SearchableSelect).
- **Normalización de Textos:** Todo el texto libre ingresado por el usuario debe guardarse SIEMPRE en MAYÚSCULAS y SIN TILDES (usando `normalizeText` de `src/lib/utils/text.ts`).
- **Pantallas CRUD y Tablas:** Todas las pantallas de listado/CRUD deben construirse obligatoriamente utilizando el componente `<DataTable>` (`src/components/ui/data-table.tsx`), que incluye buscador y manejador de columnas. NO usar tablas HTML simples para estas vistas. (Ver `docs/crud-standard.md`).
- **Manejo de Formularios y Errores:** Todos los formularios deben ser controlados (`useState` para cada campo) y enviar los datos interceptando el `onSubmit` (`e.preventDefault()`). Los errores devueltos por el servidor (ej. validaciones de Zod) NO deben mostrarse con `toast`, sino que deben almacenarse en un estado y mostrarse de forma "inline" al tope del formulario (ej. `<div className="text-red-500 text-sm">{error}</div>`). Esto evita que el formulario pierda la data si la validación falla.
- **Puerto de Desarrollo:** El proyecto corre en el puerto **30001**. Siempre que se levante el servidor, se debe notificar al usuario que acceda a `http://localhost:30001`.

Para más detalle, consultar `docs/conventions.md`.

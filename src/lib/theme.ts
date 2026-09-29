/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UI_THEME — Fuente Única de Verdad para el Sistema de Diseño de Costeos
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * INSTRUCCIÓN PARA LA IA Y DESARROLLADORES:
 * Todos los estilos visuales recurrentes deben definirse aquí y referenciarse
 * desde los componentes. Cambiar un token aquí lo propaga automáticamente a
 * toda la aplicación sin necesidad de buscar y reemplazar en múltiples archivos.
 *
 * Estructura de secciones:
 *   forms   → Labels, Inputs, Selects, Errores de campo
 *   table   → Cabeceras, celdas, filas, contenedor
 *   modal   → Diálogos: título, footer, botones de acción, área de scroll
 *   tabs    → Pestañas en modales (variant="line")
 *   badge   → Píldoras de estado (activo/inactivo/etc.)
 *   select  → Dropdown del SearchableSelect
 *   page    → Encabezados de páginas CRUD
 *   action  → Botones en columna de acciones de la tabla
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const UI_THEME = {

  // ─── FORMULARIOS ──────────────────────────────────────────────────────────
  forms: {
    /**
     * Base de todos los inputs de texto, selects y comboboxes.
     *
     * ── Opción A (ERP micro-ajustes) ──────────────────────────────────────────
     * • bg-white        → el campo se distingue claramente del fondo del form
     * • border-slate-300 → borde más visible que el border-input (gris muy claro)
     * • text-slate-900  → el VALOR ingresado es el protagonista visual
     * • ring-2 en foco  → retroalimentación clara al navegar con Tab
     * ──────────────────────────────────────────────────────────────────────────
     * Usado en: Input, SearchableSelect (trigger), NumericInput (hereda de Input).
     */
    inputBase:
      "h-8 w-full min-w-0 border-0 border-b-2 border-slate-200 bg-transparent px-1 py-1 text-sm text-slate-900 " +
      "rounded-none transition-colors outline-none ring-0 " +
      "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0 " +
      "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 " +
      "placeholder:text-slate-400 " +
      "data-[view-mode=true]:border-transparent data-[view-mode=true]:bg-transparent " +
      "data-[view-mode=true]:text-slate-900 " +
      "data-[view-mode=true]:shadow-none data-[view-mode=true]:pointer-events-none data-[view-mode=true]:opacity-100",

    /**
     * Label de campo en formularios y modales.
     * Normal case (no uppercase) — texto pequeño, peso medio, gris suave.
     * El label es guía; el VALOR del input es el protagonista.
     */
    labelBase:
      "flex items-center gap-2 text-[11px] font-medium text-slate-500 leading-none select-none",

    /**
     * Error de validación de campo individual.
     */
    fieldError: "text-xs text-red-500 !mt-0.5 leading-none",

    /**
     * Error global (del servidor / catch) — se muestra al tope del formulario.
     */
    globalError:
      "bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200 shrink-0",

    /**
     * Panel de advertencia de similares (R18 — ≥85% similitud).
     */
    warningSimilar:
      "mt-1 rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2",

    /**
     * Texto de encabezado del panel de similares.
     */
    warningSimilarTitle: "text-xs font-semibold text-amber-800",

    /**
     * Fila individual en la lista de similares.
     */
    warningSimilarRow: "flex justify-between text-xs text-amber-900",
  },

  // ─── TABLA ────────────────────────────────────────────────────────────────
  table: {
    /**
     * Fondo del encabezado (thead).
     */
    headerBg: "bg-slate-100",

    /**
     * Estilo del texto en encabezados de columna.
     * uppercase + tracking-wide → apariencia moderna de tabla de datos.
     */
    headerText: "text-slate-600 font-semibold text-xs uppercase tracking-wide",

    /**
     * Texto en celdas de datos (td).
     */
    cellText: "text-slate-700 text-sm",

    /**
     * Hover sobre filas de datos.
     */
    rowHover: "hover:bg-slate-50/80",

    /**
     * Color del borde entre filas y del contenedor.
     */
    border: "border-slate-200",

    /**
     * Estado vacío cuando no hay registros.
     */
    emptyState: "h-24 text-center text-slate-400 text-sm italic",

    /**
     * Contenedor de la tabla completa.
     * rounded-lg + shadow-sm → aspecto de "card" moderno.
     */
    container: "rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm",
  },

  // ─── MODAL ────────────────────────────────────────────────────────────────
  modal: {
    /**
     * Título del modal (DialogTitle).
     */
    title: "flex items-center gap-2 text-base font-semibold text-slate-800",

    /**
     * Footer fijo al fondo del modal.
     * bg-white con borde superior — cuando el modal es gris (bg-slate-50),
     * el footer blanco crea separación visual clara de los botones de acción.
     */
    footer:
      "flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-3 " +
      "border-t border-slate-200 bg-white sm:rounded-b-xl shrink-0",

    /**
     * Área de scroll de campos del formulario dentro del modal.
     */
    scrollArea: "flex-1 overflow-y-auto pr-2 pb-4",

    /**
     * ── Botones de acción en el footer del modal ──────────────────────────────
     *
     * REGLA: Siempre usar estos tokens en lugar de hardcodear las clases.
     *        Esto garantiza uniformidad visual en todos los modales.
     *
     * Paleta estándar del footer (modo Vista):
     *   izquierda → botón rojo de Eliminar (si aplica), o botón de acción especial
     *   derecha   → botón Historial (sky) + botón Editar (primary default)
     *
     * Paleta estándar del footer (modo Edición/Crear):
     *   derecha   → botón Cancelar (outline default) + botón Guardar (primary default)
     *
     * El botón Editar y Guardar usan el <Button> primario sin clases extra.
     * El botón Cancelar usa variant="outline" sin clases extra.
     */
    buttons: {
      /**
       * Botón "Historial" — siempre a la derecha en modo Vista.
       * Paleta sky-blue: suave y distinguible del botón primario de Editar.
       * Uso: <Button variant="outline" className={UI_THEME.modal.buttons.historial}>
       */
      historial:
        "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800",

      /**
       * Botón "Eliminar" — siempre a la izquierda en modo Vista (con mr-auto).
       * Paleta rojo destructivo: señal clara de acción irreversible.
       * Uso: <Button variant="outline" size="sm" className={UI_THEME.modal.buttons.eliminar}>
       */
      eliminar:
        "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800",

      /**
       * Botón de "acción especial" opcional en el lado izquierdo del footer.
       * Ejemplos: "Prioridad" (Categorías), "Reordenar", "Vista previa".
       * Paleta violet: neutra, no compite con los botones derecha.
       * Uso: <Button variant="outline" className={UI_THEME.modal.buttons.accionEspecial}>
       */
      accionEspecial:
        "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:text-violet-800",

      /**
       * Contenedor agrupador de botones del lado derecho del footer.
       * Uso: <div className={UI_THEME.modal.buttons.rightGroup}>
       */
      rightGroup: "flex items-center gap-2",
    },
  },

  // ─── PESTAÑAS (variant="line") ───────────────────────────────────────────
  tabs: {
    /**
     * Clases extra del TabsList en modales.
     * El variant="line" ya está definido en tabs.tsx; aquí solo agregamos shrink-0.
     */
    listClass: "mb-4 shrink-0",
  },

  // ─── BADGES DE ESTADO ─────────────────────────────────────────────────────
  badge: {
    /**
     * Registro activo / habilitado.
     */
    active: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200",

    /**
     * Registro inactivo / deshabilitado.
     */
    inactive: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200",

    /**
     * Estado de advertencia (pendiente, en revisión, etc.).
     */
    warning: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200",

    /**
     * Estado informativo / primario.
     */
    info: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200",
  },

  // ─── SELECT / COMBOBOX (dropdown) ─────────────────────────────────────────
  select: {
    /**
     * Contenedor del dropdown (renderizado via portal).
     */
    dropdown:
      "max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground " +
      "shadow-md outline-none animate-in fade-in-0 zoom-in-95",

    /**
     * Área de búsqueda sticky en el dropdown.
     */
    searchArea: "sticky top-0 z-10 bg-popover px-2 py-2 border-b",

    /**
     * Input de búsqueda dentro del dropdown.
     */
    searchInput:
      "w-full bg-transparent pl-8 pr-2 py-1 text-sm outline-none placeholder:text-muted-foreground",

    /**
     * Ítem de opción en el dropdown (estado normal).
     */
    optionItem:
      "relative flex w-full cursor-default select-none items-center rounded-sm " +
      "py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",

    /**
     * Ítem de opción seleccionado.
     */
    optionItemSelected: "bg-accent text-accent-foreground font-medium",

    /**
     * Estado vacío cuando no hay opciones.
     */
    emptyState: "py-6 text-center text-sm text-muted-foreground",
  },

  // ─── ENCABEZADOS DE PÁGINA ────────────────────────────────────────────────
  page: {
    /**
     * Fila de encabezado (contiene ícono + título).
     */
    headingRow: "flex items-center gap-2 text-indigo-900",

    /**
     * Ícono en el encabezado de página.
     */
    headingIcon: "h-6 w-6",

    /**
     * Título principal de la página.
     */
    headingText: "text-2xl font-bold tracking-tight",

    /**
     * Subtítulo / conteo de registros.
     */
    subtitle: "text-sm text-muted-foreground mt-0.5",
  },

  // ─── BOTÓN DE ACCIÓN EN TABLA (columna actions) ───────────────────────────
  action: {
    /**
     * Botón de "ver detalle" en la columna de acciones.
     */
    viewButton: "p-1.5 hover:bg-slate-100 rounded-md transition-colors",
  },
}

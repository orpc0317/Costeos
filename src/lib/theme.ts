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
     * • text-foreground → valor de un campo que sí se edita (casi negro)
     * • disabled:text-slate-400 → valor de un campo que no se edita (gris claro)
     * • modo vista (`data-view-mode="true"`) se usa solo si ese campo
     *   sí se puede cambiar en Editar: el texto vuelve a text-foreground.
     *   El subrayado no cambia. No se baja la opacidad del control.
     *   -webkit-text-fill-color evita que el navegador pinte igual
     *   todos los inputs deshabilitados.
     * ──────────────────────────────────────────────────────────────────────────
     * Usado en: Input, Textarea, SearchableSelect (trigger), NumericInput (hereda de Input).
     */
    inputBase:
      "h-[var(--ui-field-height)] w-full min-w-0 rounded-none border-0 border-b border-primary/50 bg-transparent px-2 text-foreground " +
      "transition-colors outline-none ring-0 shadow-none " +
      "focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0 " +
      "disabled:pointer-events-none disabled:cursor-not-allowed " +
      "placeholder:text-muted-foreground " +
      "data-[view-mode=true]:border-b data-[view-mode=true]:border-primary/50 data-[view-mode=true]:bg-transparent " +
      "data-[view-mode=true]:!text-foreground data-[view-mode=true]:shadow-none " +
      "data-[view-mode=true]:pointer-events-none data-[view-mode=true]:opacity-100 " +
      "data-[view-mode=true]:[-webkit-text-fill-color:var(--foreground)] " +
      "disabled:data-[view-mode=true]:!text-foreground " +
      "disabled:data-[view-mode=true]:[-webkit-text-fill-color:var(--foreground)]",

    /**
     * Label de campo en formularios y modales.
     * Normal case (no uppercase) — texto pequeño, peso medio, gris suave.
     * El label es guía; el VALOR del input es el protagonista.
     */
    labelBase:
      "flex items-center gap-2 font-semibold tracking-wider text-muted-foreground leading-none select-none text-[length:var(--ui-form-label)]",

    /**
     * Error de validación de campo individual.
     */
    fieldError: "text-xs text-red-500 !mt-0.5 leading-none",

    /**
     * Título de sección dentro de un formulario (no es label de campo).
     */
    sectionTitle: "block text-sm font-semibold text-slate-800",

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
    headerBg: "bg-muted/40",

    /**
     * Estilo del texto en encabezados de columna.
     * Peso medio, no semibold: el encabezado se distingue por tamaño y mayúsculas.
     */
    headerText: "font-semibold uppercase tracking-wider text-muted-foreground text-[length:var(--ui-table-font)]",

    /**
     * Texto en celdas de datos (td).
     * font-normal a propósito: las celdas no deben verse en negrita.
     */
    cellText: "text-foreground font-normal",

    /**
     * Hover sobre filas de datos.
     */
    rowHover: "group hover:bg-muted/40",

    /**
     * Color del borde entre filas y del contenedor.
     */
    border: "border-border/60",

    /**
     * Estado vacío cuando no hay registros.
     */
    emptyState: "h-24 text-center text-slate-400 text-sm italic",

    /**
     * Contenedor de la tabla completa.
     * rounded-lg + shadow-sm → aspecto de "card" moderno.
     */
    container: "rounded-lg border border-border/60 bg-card overflow-hidden",
    stickyLeft: "sticky left-0 z-10",
    stickyRight: "sticky right-0 z-10",
  },

  // ─── MODAL ────────────────────────────────────────────────────────────────
  modal: {
    /**
     * Título del modal (DialogTitle).
     */
    title: "text-base font-semibold leading-tight truncate",
    contentWide:
      "flex flex-col w-[90vw] sm:max-w-[64rem] h-[700px] max-h-[90vh] overflow-hidden gap-3",
    contentStandard:
      "flex flex-col w-full sm:max-w-[36rem] h-[85vh] sm:h-[520px] max-h-[90vh] overflow-hidden gap-3",
    header:
      "-mx-4 -mt-4 px-5 pt-4 pb-2 sm:-mx-6 sm:-mt-6 bg-gradient-to-br to-transparent border-b border-border/50 shrink-0",
    iconBadge: "shrink-0 rounded-xl p-2",
    columns: "flex gap-6 items-start",
    column: "flex-1 min-w-0 grid grid-cols-2 gap-2 content-start",
    divider: "w-px self-stretch bg-primary/30",

    /**
     * Footer fijo al fondo del modal.
     * bg-white con borde superior — cuando el modal es gris (bg-slate-50),
     * el footer blanco crea separación visual clara de los botones de acción.
     */
    footer:
      "flex flex-row items-center justify-between mt-auto -mx-4 -mb-4 px-4 py-3 sm:-mx-6 sm:-mb-6 " +
      "border-t border-border/60 bg-card sm:rounded-b-xl shrink-0",

    /**
     * Interior de la pestaña, donde van los campos.
     * Panel blanco con borde sobre el fondo del modal (bg-slate-50).
     * El borde superior lo aporta la línea de las pestañas: listClass no lleva margen.
     * El footer queda fuera de este panel.
     */
    scrollArea:
      "flex-1 min-h-0 overflow-y-auto overflow-x-auto pr-1",

    /**
     * ── Botones de acción en el footer del modal ──────────────────────────────
     *
     * REGLA: Siempre usar estos tokens en lugar de hardcodear las clases.
     *        Esto garantiza uniformidad visual en todos los modales.
     *
     * Vista: una sola fila a la izquierda, ghost size sm.
     *   Historial, accion extra, Eliminar, Editar. Hover del acento del modulo.
     * Edicion de un registro: Cancelar y Guardar ghost size sm, a la derecha,
     *   con icono (X y Check) y el mismo hover del modulo.
     * Alta: solo Guardar ghost size sm, con icono Check, hover del acento.
     */
    buttons: {
      viewRow: "flex w-full items-center gap-1",
      editRow: "flex w-full justify-end gap-2",
      icon: "mr-1.5 h-3.5 w-3.5",
      eliminar: "text-destructive hover:text-destructive",
    },
  },

  // ─── PESTAÑAS (variant="line") ───────────────────────────────────────────
  tabs: {
    /**
     * TabsList de los modales. Sin margen inferior: el panel de campos
     * (modal.scrollArea) arranca pegado a la línea de las pestañas.
     * Las pestañas quedan sobre el fondo del modal.
     */
    listClass: "shrink-0",
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
     * Estado anulado / rechazado.
     */
    danger: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200",

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
    headingRow: "flex items-center gap-3",

    /**
     * Ícono en el encabezado de página.
     */
    headingIcon: "h-5 w-5",
    headingBadge: "shrink-0 rounded-xl p-2",

    /**
     * Título principal de la página.
     */
    headingText: "text-xl font-bold tracking-tight text-foreground",

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
    viewButton: "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent",
  },
}

/**
 * Acento por pantalla. Un par Tailwind por módulo; no reutilizar el mismo par.
 * badge/icon: pastilla del encabezado y del modal en alta y vista.
 * gradient: cola del degradado de la cabecera del modal (`from-*`).
 * row: fila activa de la tabla.
 */
export const MODULE_ACCENT = {
  empresas: {
    badge: 'bg-emerald-100',
    icon: 'text-emerald-600',
    gradient: 'from-emerald-50/70',
    row: 'bg-emerald-50',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
  clientes: {
    badge: 'bg-indigo-100',
    icon: 'text-indigo-600',
    gradient: 'from-indigo-50/70',
    row: 'bg-indigo-50',
    hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
  },
  proveedores: {
    badge: 'bg-teal-100',
    icon: 'text-teal-600',
    gradient: 'from-teal-50/70',
    row: 'bg-teal-50',
    hover: 'hover:bg-teal-50 dark:hover:bg-teal-950/30',
  },
  items: {
    badge: 'bg-amber-100',
    icon: 'text-amber-600',
    gradient: 'from-amber-50/70',
    row: 'bg-amber-50',
    hover: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
  },
  categorias: {
    badge: 'bg-violet-100',
    icon: 'text-violet-600',
    gradient: 'from-violet-50/70',
    row: 'bg-violet-50',
    hover: 'hover:bg-violet-50 dark:hover:bg-violet-950/30',
  },
  tiposCosteo: {
    badge: 'bg-sky-100',
    icon: 'text-sky-600',
    gradient: 'from-sky-50/70',
    row: 'bg-sky-50',
    hover: 'hover:bg-sky-50 dark:hover:bg-sky-950/30',
  },
  tiposCombo: {
    badge: 'bg-rose-100',
    icon: 'text-rose-600',
    gradient: 'from-rose-50/70',
    row: 'bg-rose-50',
    hover: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
  },
  usuarios: {
    badge: 'bg-purple-100',
    icon: 'text-purple-600',
    gradient: 'from-purple-50/70',
    row: 'bg-purple-50',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
  },
  solicitudes: {
    badge: 'bg-orange-100',
    icon: 'text-orange-600',
    gradient: 'from-orange-50/70',
    row: 'bg-orange-50',
    hover: 'hover:bg-orange-50 dark:hover:bg-orange-950/30',
  },
  cotizaciones: {
    badge: 'bg-cyan-100',
    icon: 'text-cyan-600',
    gradient: 'from-cyan-50/70',
    row: 'bg-cyan-50',
    hover: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/30',
  },
  costeos: {
    badge: 'bg-zinc-100',
    icon: 'text-zinc-600',
    gradient: 'from-zinc-50/70',
    row: 'bg-zinc-100',
    hover: 'hover:bg-zinc-100 dark:hover:bg-zinc-800/40',
  },
  dashboard: {
    badge: 'bg-blue-100',
    icon: 'text-blue-600',
    gradient: 'from-blue-50/70',
    row: 'bg-blue-50',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
  },
} as const

export type ModuleAccent = (typeof MODULE_ACCENT)[keyof typeof MODULE_ACCENT]

/** Badge ámbar del modo editar, igual en todos los módulos. */
export const EDIT_BADGE = {
  badge: 'bg-amber-100',
  icon: 'text-amber-600',
} as const

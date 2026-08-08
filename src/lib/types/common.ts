/**
 * common.ts — Tipos compartidos por TODA la aplicación.
 *
 * REGLA: Nunca duplicar ActionResult<T> en los archivos de actions.
 * Siempre importar desde aquí.
 */

// ─── Resultado estándar de Server Actions ─────────────────────────────────────

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string }

// ─── Resultado paginado (para futuras listas con paginación) ──────────────────

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ─── Input de Concurrencia Optimística ────────────────────────────────────────
// Todos los formularios de edición deben incluir registroVersion.

export type OccInput = {
  registroVersion: number
}

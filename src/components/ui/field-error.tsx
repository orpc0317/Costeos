/**
 * FieldError — Componente centralizado para errores de campo.
 *
 * Renderiza los errores de validación de forma consistente en toda la app.
 * La fuente del error no importa (validación local, servidor, ERP, etc.);
 * solo se pasa el mensaje y aquí se define cómo se muestra al usuario.
 *
 * ─── Para cambiar la presentación visual de todos los errores de campo ────────
 * Editar ÚNICAMENTE UI_THEME.forms.fieldError en src/lib/theme.ts.
 * Este componente aplica esa clase sin modificación propia.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { UI_THEME } from "@/lib/theme"

interface FieldErrorProps {
  /** Mensaje de error a mostrar. Si es null/undefined/vacío, no renderiza nada. */
  message?: string | null
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p className={UI_THEME.forms.fieldError}>{message}</p>
  )
}

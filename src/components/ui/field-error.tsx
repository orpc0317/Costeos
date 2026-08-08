/**
 * FieldError — Componente centralizado para errores de campo.
 *
 * Renderiza los errores de validación de forma consistente en toda la app.
 * La fuente del error no importa (validación local, servidor, ERP, etc.);
 * solo se pasa el mensaje y aquí se define cómo se muestra al usuario.
 *
 * ─── Para cambiar la presentación visual de todos los errores de campo ────────
 * Editar únicamente este componente. El resto de la app no necesita cambios.
 * Ejemplos de cambios futuros: tooltip, burbuja flotante, ícono de advertencia.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface FieldErrorProps {
  /** Mensaje de error a mostrar. Si es null/undefined/vacío, no renderiza nada. */
  message?: string | null
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p className="text-xs text-red-500 !mt-0.5 leading-none">{message}</p>
  )
}

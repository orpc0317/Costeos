// src/lib/types/tipos-combo-rh.ts

/**
 * Tipo de fila para TipoComboRH — Tipos configurables de ítems adicionales
 * asociados a Recursos Humanos. Ej: Uniforme, Equipo Seguridad, Comunicación.
 */
export type TipoComboRHRow = {
  id:            number
  empresaId:     number
  empresaNombre?: string   // Resuelto en el service (join manual)
  nombre:        string
  icono:         string | null
  orden:         number
  requerido:     boolean
  activo:        boolean
  creadoEn:      Date
}

// src/lib/types/tipos-combo.ts

/**
 * TipoComboRow — Tipo configurable de ítem adicional.
 * Aplica a cualquier tipo de ítem (no solo RH).
 * Tabla: costeos_tipo_combo
 */
export type TipoComboRow = {
  id:              number
  empresaId:       number
  empresaNombre:   string        // Resuelto en el service (join manual)
  nombre:          string
  icono:           string | null
  usuarioCreo:     number
  fechaCreo:       Date
  registroVersion: number
}

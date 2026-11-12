import { ESTADO_COSTEO } from '@/lib/constants'

/** Versión que se abre al ver un contrato: vigente, si no la abierta, si no la última. */
export function costeoParaAbrir<T extends { id: number; version: number; estado: number }>(costeos: T[]): T | null {
  const ordenados = [...costeos].sort((a, b) => b.version - a.version)
  return ordenados.find(c => c.estado === ESTADO_COSTEO.VIGENTE)
    ?? ordenados.find(c => c.estado < ESTADO_COSTEO.HISTORICO)
    ?? ordenados[0]
    ?? null
}

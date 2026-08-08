/**
 * audit.repository.ts — Repositorio de Auditoría.
 *
 * REGLA CRÍTICA: Todas las funciones aceptan un parámetro opcional `tx`
 * (cliente de transacción de Prisma). Al pasarlo, el log de auditoría
 * queda dentro de la MISMA transacción que el registro principal.
 * Esto garantiza atomicidad: o se crean ambos, o no se crea ninguno.
 *
 * Uso correcto (atómico):
 *   await prisma.$transaction(async (tx) => {
 *     const reg = await tx.categoriaItem.create({ ... })
 *     await AuditRepository.logCreate('costeos_categoria', reg.id, userId, reg, tx)
 *   })
 *
 * Uso incorrecto (NO hacer):
 *   const reg = await prisma.categoriaItem.create({ ... })
 *   await AuditRepository.logCreate(...)  // ← sin tx, no es atómico
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// Campos que NUNCA deben aparecer en el historial de auditoría
const CAMPOS_IGNORADOS = [
  'passwordHash', 'password_hash',
  'creadoEn', 'modificadoEn', 'agregoFecha', 'modificoFecha',
  'fecha_creo', 'fechaCreo',
]

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (!CAMPOS_IGNORADOS.includes(k)) result[k] = v
  }
  return result
}

export const AuditRepository = {

  async logCreate(
    tabla: string,
    registroId: number,
    userId: number,
    datosDespues: Record<string, unknown>,
    tx: TxClient = prisma as unknown as TxClient,
  ): Promise<void> {
    await (tx as any).auditLog.create({
      data: {
        tabla,
        registroId,
        accion: 'CREATE',
        usuarioId: userId,
        datosDespues: JSON.stringify(sanitize(datosDespues)),
      },
    })
  },

  async logUpdate(
    tabla: string,
    registroId: number,
    userId: number,
    datosAntes: Record<string, unknown>,
    datosDespues: Record<string, unknown>,
    tx: TxClient = prisma as unknown as TxClient,
  ): Promise<void> {
    await (tx as any).auditLog.create({
      data: {
        tabla,
        registroId,
        accion: 'UPDATE',
        usuarioId: userId,
        datosAntes: JSON.stringify(sanitize(datosAntes)),
        datosDespues: JSON.stringify(sanitize(datosDespues)),
      },
    })
  },

  async logDelete(
    tabla: string,
    registroId: number,
    userId: number,
    datosAntes: Record<string, unknown>,
    tx: TxClient = prisma as unknown as TxClient,
  ): Promise<void> {
    await (tx as any).auditLog.create({
      data: {
        tabla,
        registroId,
        accion: 'DELETE',
        usuarioId: userId,
        datosAntes: JSON.stringify(sanitize(datosAntes)),
      },
    })
  },
}

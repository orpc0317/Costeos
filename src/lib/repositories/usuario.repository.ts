/**
 * usuario.repository.ts — Acceso a datos de la tabla t_usuario.
 *
 * NOTA DE SEGURIDAD: passwordHash NUNCA se incluye en los selects de lectura
 * general. Solo se usa en operaciones de auth (que están en lib/auth.ts).
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// Campos seguros para mostrar en UI (sin passwordHash)
const SELECT_PUBLICO = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  usuarioErp: true,
  agregoFecha: true,
  registroVersion: true,
}

export const UsuarioRepository = {

  async findAll() {
    return prisma.usuario.findMany({
      select: SELECT_PUBLICO,
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    })
  },

  async findById(id: number) {
    return prisma.usuario.findUnique({ where: { id } })
  },

  async findByEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } })
  },

  async findByEmailExcluding(email: string, excludeId: number) {
    return prisma.usuario.findFirst({ where: { email, NOT: { id: excludeId } } })
  },

  async create(
    data: { nombre: string; email: string; passwordHash: string; rol: string; usuarioErp: string },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).usuario.create({
      data: {
        ...data,
        activo: true,
        agregoUsuario: userId,
        modificoUsuario: userId,
      },
      select: SELECT_PUBLICO,
    })
  },

  async update(
    id: number,
    data: {
      nombre: string; email: string; rol: string; usuarioErp: string;
      passwordHash?: string; registroVersion: number;
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, ...rest } = data
    const result = await (tx as any).usuario.updateMany({
      where: { id, registroVersion },
      data: { ...rest, modificoUsuario: userId, registroVersion: { increment: 1 } },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).usuario.findUnique({ where: { id }, select: SELECT_PUBLICO })
  },

  async toggleActivo(
    id: number,
    activo: boolean,
    registroVersion: number,
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const result = await (tx as any).usuario.updateMany({
      where: { id, registroVersion },
      data: { activo: !activo, modificoUsuario: userId, registroVersion: { increment: 1 } },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).usuario.findUnique({
      where: { id },
      select: { activo: true, registroVersion: true },
    })
  },
}

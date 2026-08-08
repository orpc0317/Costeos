/**
 * usuario.service.ts — Lógica de negocio para Usuarios.
 *
 * Responsabilidades:
 * - Hash de contraseña (bcrypt)
 * - Validación de email único
 * - Validación de usuario en ERP
 * - Regla: admin no puede desactivarse a sí mismo
 * - Atomicidad (registro + audit log)
 * - OCC validation
 *
 * NOTA DE SEGURIDAD: passwordHash NUNCA aparece en los resultados retornados
 * ni en el audit log. El repositorio ya garantiza esto con SELECT_PUBLICO.
 */

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { erp } from '@/lib/erp'
import { UsuarioRepository } from '@/lib/repositories/usuario.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { UsuarioRow } from '@/lib/types/usuarios'

const TABLA = 't_usuario'

type CrearUsuarioData = {
  nombre: string
  email: string
  password: string
  rol: string
  usuarioErp: string
}

type EditarUsuarioData = {
  nombre: string
  email: string
  password?: string
  rol: string
  usuarioErp: string
  registroVersion: number
}

export const UsuarioService = {

  async listar(): Promise<UsuarioRow[]> {
    return UsuarioRepository.findAll()
  },

  async crear(data: CrearUsuarioData, userId: number): Promise<ActionResult<{ id: number }>> {
    // Verificar email único
    const existente = await UsuarioRepository.findByEmail(data.email)
    if (existente) {
      return { ok: false, error: 'Ya existe un usuario con ese correo electrónico', field: 'email' }
    }

    // Validar usuario en ERP si se provee
    if (data.usuarioErp) {
      const resultado = await erp.validarUsuario(data.usuarioErp)
      if (!resultado) {
        return { ok: false, error: 'El usuario no existe o no está activo en el ERP', field: 'usuarioErp' }
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await UsuarioRepository.create(
        { nombre: data.nombre, email: data.email, passwordHash, rol: data.rol, usuarioErp: data.usuarioErp },
        userId,
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, reg.id, userId, {
        nombre: reg.nombre, email: reg.email, rol: reg.rol,
        usuarioErp: reg.usuarioErp, activo: reg.activo,
      }, tx as any)
      return reg
    })

    return { ok: true, data: { id: nuevo.id } }
  },

  async editar(id: number, data: EditarUsuarioData, userId: number): Promise<ActionResult<UsuarioRow>> {
    const anterior = await UsuarioRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Usuario no encontrado' }

    // Verificar email único (excluyendo al mismo usuario)
    const emailDuplicado = await UsuarioRepository.findByEmailExcluding(data.email, id)
    if (emailDuplicado) {
      return { ok: false, error: 'Ya existe un usuario con ese correo electrónico', field: 'email' }
    }

    // Validar usuario ERP si se provee
    if (data.usuarioErp) {
      const resultado = await erp.validarUsuario(data.usuarioErp)
      if (!resultado) {
        return { ok: false, error: 'El usuario no existe o no está activo en el ERP', field: 'usuarioErp' }
      }
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await UsuarioRepository.update(
        id,
        { nombre: data.nombre, email: data.email, rol: data.rol, usuarioErp: data.usuarioErp, passwordHash, registroVersion: data.registroVersion },
        userId,
        tx as any,
      )
      if (!reg) return null
      const { passwordHash: _, agregoFecha: __, modificoFecha: ___, ...anteriorSeguro } = anterior as any
      await AuditRepository.logUpdate(TABLA, id, userId, anteriorSeguro, reg as any, tx as any)
      return reg
    })

    if (!actualizado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return { ok: true, data: actualizado as UsuarioRow }
  },

  async toggleActivo(id: number, registroVersion: number, requestorId: number): Promise<ActionResult> {
    // Regla de negocio: admin no puede desactivarse a sí mismo
    if (id === requestorId) {
      return { ok: false, error: 'No puedes desactivarte a ti mismo' }
    }

    const usuario = await UsuarioRepository.findById(id)
    if (!usuario) return { ok: false, error: 'Usuario no encontrado' }

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await UsuarioRepository.toggleActivo(id, usuario.activo, registroVersion, requestorId, tx as any)
      if (!reg) return null
      await AuditRepository.logUpdate(TABLA, id, requestorId,
        { activo: usuario.activo, registroVersion: usuario.registroVersion },
        { activo: reg.activo, registroVersion: reg.registroVersion },
        tx as any,
      )
      return reg
    })

    if (!actualizado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return { ok: true, data: undefined }
  },
}

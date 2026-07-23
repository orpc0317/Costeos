'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { ROLES } from '@/lib/permisos'
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  type UsuarioRow,
} from '@/lib/types/usuarios'
import { validarUsuarioERP } from '@/lib/erp-db'
import { erp } from '@/lib/erp'

// ─── Tipo de respuesta estándar ───────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ─── Guard: solo ADMIN puede gestionar usuarios ───────────────────────────────

async function soloAdmin(): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'No autenticado' }
  const rol = (session.user as { rol?: string }).rol
  if (rol !== ROLES.ADMIN) {
    return { ok: false, error: 'Solo los administradores pueden gestionar usuarios' }
  }
  return { ok: true, userId: Number(session.user.id) }
}

// ─── Listar usuarios ──────────────────────────────────────────────────────────

export async function listarUsuarios(busqueda?: string): Promise<UsuarioRow[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const usuarios = await prisma.usuario.findMany({
    where: busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda } },
            { email: { contains: busqueda } },
          ],
        }
      : undefined,
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      usuarioErp: true,
      agregoFecha: true,
    },
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
  })

  return usuarios
}

// ─── Crear usuario ────────────────────────────────────────────────────────────

export async function crearUsuario(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const guard = await soloAdmin()
  if (!guard.ok) return guard

  const raw = {
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    password: formData.get('password'),
    rol: formData.get('rol'),
    usuarioErp: formData.get('usuarioErp') || '',
  }

  const parsed = crearUsuarioSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message }
  }

  const { nombre, email, password, rol } = parsed.data

  // Verificar email único
  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) {
    return { ok: false, error: 'Ya existe un usuario con ese correo electrónico' }
  }

  // Validar contra ERP si se provee
  if (parsed.data.usuarioErp) {
    const esValidoERP = await validarUsuarioERP(parsed.data.usuarioErp)
    if (!esValidoERP) {
      return { ok: false, error: 'El usuario especificado no existe o no está activo en el ERP' }
    }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const usuario = await prisma.usuario.create({
    data: { nombre, email, passwordHash, rol, usuarioErp: parsed.data.usuarioErp ?? null, agregoUsuario: guard.userId, modificoUsuario: guard.userId },
    select: { id: true },
  })

  revalidatePath('/dashboard/configuracion/usuarios')
  return { ok: true, data: { id: usuario.id } }
}

// ─── Editar usuario ───────────────────────────────────────────────────────────

export async function editarUsuario(
  id: number,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await soloAdmin()
  if (!guard.ok) return guard

  const raw = {
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    password: formData.get('password') || '',
    rol: formData.get('rol'),
    usuarioErp: formData.get('usuarioErp') || '',
  }

  const parsed = editarUsuarioSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message }
  }

  const { nombre, email, password, rol } = parsed.data

  // Verificar email único (excluyendo al mismo usuario)
  const existente = await prisma.usuario.findFirst({
    where: { email, NOT: { id } },
  })
  if (existente) {
    return { ok: false, error: 'Ya existe un usuario con ese correo electrónico' }
  }

  // Verificar si usuarioErp cambió y validarlo en el ERP
  if (parsed.data.usuarioErp) {
    const usuarioActual = await prisma.usuario.findUnique({ where: { id } })
    if (usuarioActual && usuarioActual.usuarioErp !== parsed.data.usuarioErp) {
      const esValidoERP = await validarUsuarioERP(parsed.data.usuarioErp)
      if (!esValidoERP) {
        return { ok: false, error: 'El usuario especificado no existe o no está activo en el ERP' }
      }
    }
  }

  const updateData: {
    nombre: string
    email: string
    rol: string
    usuarioErp?: string | null
    passwordHash?: string
    modificoUsuario: number
  } = { nombre, email, rol, usuarioErp: parsed.data.usuarioErp ?? null, modificoUsuario: guard.userId }

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 12)
  }

  await prisma.usuario.update({ where: { id }, data: updateData })

  revalidatePath('/dashboard/configuracion/usuarios')
  return { ok: true, data: undefined }
}

// ─── Toggle activo / inactivo ─────────────────────────────────────────────────

export async function toggleActivo(id: number): Promise<ActionResult> {
  const guard = await soloAdmin()
  if (!guard.ok) return guard

  // Evitar que el admin se desactive a sí mismo
  if (id === guard.userId) {
    return { ok: false, error: 'No puedes desactivarte a ti mismo' }
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { activo: true },
  })
  if (!usuario) return { ok: false, error: 'Usuario no encontrado' }

  await prisma.usuario.update({
    where: { id },
    data: { 
      activo: !usuario.activo,
      modificoUsuario: guard.userId
    },
  })

  revalidatePath('/dashboard/configuracion/usuarios')
  return { ok: true, data: undefined }
}

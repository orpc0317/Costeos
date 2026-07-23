import { z } from 'zod'
import { ROLES } from '@/lib/permisos'

// ─── Esquemas Zod ─────────────────────────────────────────────────────────────

export const crearUsuarioSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre es demasiado largo')
    .trim(),
  email: z
    .string()
    .email('Correo electrónico inválido')
    .max(200, 'El correo es demasiado largo')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es demasiado larga'),
  rol: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALISTA, ROLES.VIEWER], {
    error: 'Rol inválido',
  }),
  usuarioErp: z
    .string()
    .max(10, 'El usuario ERP es demasiado largo (máx 10)')
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
})

export const editarUsuarioSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre es demasiado largo')
    .trim(),
  email: z
    .string()
    .email('Correo electrónico inválido')
    .max(200, 'El correo es demasiado largo')
    .toLowerCase()
    .trim(),
  // Password es opcional al editar — si viene vacío, no se cambia
  password: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  rol: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALISTA, ROLES.VIEWER], {
    error: 'Rol inválido',
  }),
  usuarioErp: z
    .string()
    .max(10, 'El usuario ERP es demasiado largo (máx 10)')
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
})

// ─── Tipos derivados ──────────────────────────────────────────────────────────

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>

// ─── Tipo de fila en la tabla ─────────────────────────────────────────────────

export type UsuarioRow = {
  id: number
  nombre: string
  email: string
  rol: string
  activo: boolean
  usuarioErp: string | null
  agregoFecha: Date
}

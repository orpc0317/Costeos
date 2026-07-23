/**
 * Constantes de permisos del sistema.
 *
 * Cada constante corresponde a un índice en la tabla de permisos por usuario.
 * Uso en Server Actions:
 *   import { PERMISOS } from '@/lib/permisos'
 *   const ok = await verificarPermiso(session.user.id, PERMISOS.COSTEOS.APROBAR)
 */

export const PERMISOS = {
  // Gestión de proyectos
  PROYECTOS: {
    VER: 'proyectos.ver',
    CREAR: 'proyectos.crear',
    EDITAR: 'proyectos.editar',
    ELIMINAR: 'proyectos.eliminar',
  },
  // Costeos
  COSTEOS: {
    VER: 'costeos.ver',
    CREAR: 'costeos.crear',
    EDITAR: 'costeos.editar',
    ELIMINAR: 'costeos.eliminar',
    APROBAR: 'costeos.aprobar',
    ACTUALIZAR_COSTOS: 'costeos.actualizar_costos',
  },
  // Catálogos (solo admins)
  CATALOGOS: {
    ROLES: {
      VER: 'catalogos.roles.ver',
      GESTIONAR: 'catalogos.roles.gestionar',
    },
    CATEGORIAS: {
      VER: 'catalogos.categorias.ver',
      GESTIONAR: 'catalogos.categorias.gestionar',
    },
  },
  // Admin del sistema
  ADMIN: {
    USUARIOS: 'admin.usuarios',
    CONFIGURACION: 'admin.configuracion',
  },
} as const

export type Permiso = string

// Roles del sistema
export const ROLES = {
  ADMIN: 'ADMIN',       // Acceso total
  MANAGER: 'MANAGER',   // Puede aprobar costeos
  ANALISTA: 'ANALISTA', // Puede crear y editar costeos
  VIEWER: 'VIEWER',     // Solo lectura
} as const

export type Rol = (typeof ROLES)[keyof typeof ROLES]

// Mapa de qué roles tienen qué permisos por defecto
export const ROL_PERMISOS: Record<Rol, string[]> = {
  ADMIN: ['*'], // acceso total
  MANAGER: [
    PERMISOS.PROYECTOS.VER,
    PERMISOS.PROYECTOS.CREAR,
    PERMISOS.PROYECTOS.EDITAR,
    PERMISOS.COSTEOS.VER,
    PERMISOS.COSTEOS.CREAR,
    PERMISOS.COSTEOS.EDITAR,
    PERMISOS.COSTEOS.APROBAR,
    PERMISOS.COSTEOS.ACTUALIZAR_COSTOS,
    PERMISOS.CATALOGOS.ROLES.VER,
    PERMISOS.CATALOGOS.CATEGORIAS.VER,
  ],
  ANALISTA: [
    PERMISOS.PROYECTOS.VER,
    PERMISOS.PROYECTOS.CREAR,
    PERMISOS.PROYECTOS.EDITAR,
    PERMISOS.COSTEOS.VER,
    PERMISOS.COSTEOS.CREAR,
    PERMISOS.COSTEOS.EDITAR,
    PERMISOS.CATALOGOS.ROLES.VER,
    PERMISOS.CATALOGOS.CATEGORIAS.VER,
  ],
  VIEWER: [
    PERMISOS.PROYECTOS.VER,
    PERMISOS.COSTEOS.VER,
  ],
}

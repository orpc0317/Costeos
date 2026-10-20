import { PrismaClient } from '@prisma/client'
import { MENUS, presetDeRol, ROLES } from '../src/lib/permisos'

const prisma = new PrismaClient()

async function main() {
  for (const menu of MENUS) {
    await prisma.menu.upsert({
      where: { indice: menu.indice },
      update: { nombre: menu.nombre, ruta: menu.ruta },
      create: menu,
    })
  }

  const usuarios = await prisma.usuario.findMany({ select: { id: true, rol: true } })
  for (const usuario of usuarios) {
    const existentes = await prisma.menuUsuario.count({ where: { usuarioId: usuario.id } })
    if (existentes > 0) continue
    if (usuario.rol === ROLES.ADMIN) continue
    const flags = presetDeRol(usuario.rol).filter((f) => f.consultar || f.agregar || f.modificar || f.eliminar)
    if (!flags.length) continue
    await prisma.menuUsuario.createMany({
      data: flags.map((f) => ({ usuarioId: usuario.id, ...f })),
    })
  }
  console.log(`Menus ${MENUS.length}. Usuarios revisados ${usuarios.length}.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

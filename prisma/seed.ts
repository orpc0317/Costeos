/**
 * Seed: crea el primer usuario ADMIN si no existe ningún usuario en la BD.
 *
 * Uso:
 *   npx tsx prisma/seed.ts
 *
 * Las credenciales iniciales se configuran por variable de entorno:
 *   SEED_ADMIN_EMAIL    (default: admin@costeos.local)
 *   SEED_ADMIN_PASSWORD (default: Costeos2024!)
 *   SEED_ADMIN_NOMBRE   (default: Administrador)
 */

import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const totalUsuarios = await prisma.usuario.count()

  if (totalUsuarios > 0) {
    console.log(`ℹ️  Ya existen ${totalUsuarios} usuario(s). Seed omitido.`)
    return
  }

  const email    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@costeos.local'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Costeos2024!'
  const nombre   = process.env.SEED_ADMIN_NOMBRE   ?? 'Administrador'

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.usuario.create({
    data: {
      nombre,
      email,
      passwordHash,
      rol: 'ADMIN',
      usuarioErp: 'ADMIN',
      activo: true,
    },
  })

  console.log(`✅ Usuario ADMIN creado:`)
  console.log(`   ID:      ${admin.id}`)
  console.log(`   Nombre:  ${admin.nombre}`)
  console.log(`   Email:   ${admin.email}`)
  console.log(`   Password: ${password}`)
  console.log(``)
  console.log(`⚠️  Cambia la contraseña en la primera sesión.`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

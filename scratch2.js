const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRaw`ALTER TABLE costeos_categoria ADD COLUMN codigo INT NOT NULL DEFAULT 0;`
  await prisma.$executeRaw`CREATE UNIQUE INDEX costeos_categoria_codigo_key ON costeos_categoria(codigo);`
  console.log('Success')
}

main().catch(console.error).finally(() => prisma.$disconnect())

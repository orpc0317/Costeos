const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const res = await prisma.$queryRaw`DESCRIBE costeos_categoria`
  console.log(res)
}

main().catch(console.error).finally(() => prisma.$disconnect())

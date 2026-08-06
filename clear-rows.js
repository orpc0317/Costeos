const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`DELETE FROM costeos_nodo_recurso`;
  await prisma.$executeRaw`DELETE FROM costeos_receta_snap`;
  console.log("Done");
}

main().catch(console.error).finally(() => prisma.$disconnect());

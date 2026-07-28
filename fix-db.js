const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('UPDATE costeos_costeo SET tipo_costeo_id = NULL;');
  console.log('Done');
}

main().catch(console.error).finally(() => prisma.$disconnect());

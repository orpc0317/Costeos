import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Borrando costeos...');
  
  await prisma.historialAutoGuardado.deleteMany({});
  await prisma.resultadoCategoria.deleteMany({});
  await prisma.resultado.deleteMany({});
  await prisma.recetaSnap.deleteMany({});
  await prisma.nodoRecurso.deleteMany({});
  await prisma.nodo.deleteMany({});
  
  await prisma.costeo.deleteMany({});
  await prisma.contrato.deleteMany({});
  
  console.log('Costeos borrados exitosamente.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const [empresas, categorias, tiposCombo, tiposComboRH, items] = await Promise.all([
    p.empresa.findMany({ select: { id: true, nombre: true, codigoErp: true } }),
    p.categoriaItem.findMany({ select: { id: true, empresaId: true, nombre: true }, orderBy: { nombre: 'asc' } }),
    p.tipoCombo.findMany({ select: { id: true, empresaId: true, nombre: true } }),
    p.tipoComboRH.findMany({ select: { id: true, empresaId: true, nombre: true } }),
    p.item.findMany({ select: { id: true, descripcion: true, tipoItem: true, venta: true, empresaId: true }, take: 20 }),
  ])
  console.log('EMPRESAS:', JSON.stringify(empresas, null, 2))
  console.log('CATEGORIAS:', JSON.stringify(categorias, null, 2))
  console.log('TIPOS_COMBO:', JSON.stringify(tiposCombo, null, 2))
  console.log('TIPOS_COMBO_RH:', JSON.stringify(tiposComboRH, null, 2))
  console.log('SAMPLE_ITEMS (20):', JSON.stringify(items, null, 2))
  await p.$disconnect()
}
main().catch(console.error)

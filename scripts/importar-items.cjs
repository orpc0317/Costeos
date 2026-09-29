#!/usr/bin/env node
/**
 * importar-items.cjs
 * ==================
 * Script de importación masiva de Items, Combos, Costos Manuales y Costos de Referencia
 * desde archivos CSV al sistema Costeador.
 *
 * USO:
 *   node scripts/importar-items.cjs [opciones]
 *
 * OPCIONES:
 *   --items              Importar plantilla_items.csv
 *   --combos             Importar plantilla_combos.csv
 *   --costos-manuales    Importar plantilla_costos_manuales.csv
 *   --costos-referencia  Importar plantilla_costos_referencia.csv
 *   --all                Importar todo en orden (items → combos → costos)
 *   --dry-run            Solo valida y muestra lo que importaría, sin escribir en BD
 *   --dir <ruta>         Directorio donde están los CSVs (default: scripts/plantillas)
 *
 * EJEMPLOS:
 *   node scripts/importar-items.cjs --all --dry-run
 *   node scripts/importar-items.cjs --items
 *   node scripts/importar-items.cjs --combos --dry-run
 *   node scripts/importar-items.cjs --all
 *
 * ORDEN RECOMENDADO:
 *   1. --items            (crea los items base)
 *   2. --combos           (relaciona items principales con sus componentes)
 *   3. --costos-manuales  (agrega costos a items con manejo_costos=2)
 *   4. --costos-referencia(agrega % de referencia a items con manejo_costos=3)
 */

'use strict'

const fs   = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

// ─── Configuración ────────────────────────────────────────────────────────────

const USUARIO_IMPORT_ID = 1  // ID del usuario que aparecerá como creador en el audit log

// ─── Parsear argumentos ───────────────────────────────────────────────────────

const args    = process.argv.slice(2)
const isDry   = args.includes('--dry-run')
const doAll   = args.includes('--all')
const doItems = doAll || args.includes('--items')
const doCombos= doAll || args.includes('--combos')
const doManuales = doAll || args.includes('--costos-manuales')
const doRefs  = doAll || args.includes('--costos-referencia')
const dirIdx  = args.indexOf('--dir')
const plantillasDir = dirIdx >= 0 ? args[dirIdx + 1] : path.join(__dirname, 'plantillas')

if (!doItems && !doCombos && !doManuales && !doRefs) {
  console.error('❌ Debes especificar al menos una opción: --items, --combos, --costos-manuales, --costos-referencia o --all')
  console.error('   Agrega --dry-run para solo validar sin escribir.')
  process.exit(1)
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Parsea un CSV (ignorando líneas que empiecen con ##) */
function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines   = content.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('##'))
  if (lines.length < 2) throw new Error(`El archivo ${filePath} está vacío o solo tiene encabezado.`)
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map((line, i) => {
    const vals = line.split(',')
    const row  = {}
    headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim() })
    row._lineaCSV = i + 2  // línea real en el archivo (con encabezado = línea 1)
    return row
  })
}

function bool(val)   { return val === '1' || val === 'true' }
function num(val)    { return Number(val) }
function numOrNull(val) { return val === '' || val == null ? null : Number(val) }
function strOrNull(val) { return val === '' || val == null ? null : String(val) }

const OK   = '✅'
const FAIL = '❌'
const SKIP = '⏭️ '
const DRY  = isDry ? '[DRY-RUN] ' : ''

// ─── Prisma ───────────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

// ─── IMPORTAR ITEMS ──────────────────────────────────────────────────────────

async function importarItems() {
  const archivo = path.join(plantillasDir, 'plantilla_items.csv')
  console.log(`\n📦 ${DRY}Importando Items desde: ${archivo}`)
  const filas = parseCsv(archivo)
  console.log(`   ${filas.length} filas encontradas.\n`)

  let ok = 0, errores = 0, omitidos = 0

  for (const fila of filas) {
    const lineaInfo = `Línea ${fila._lineaCSV}: "${fila.descripcion}"`

    // Validaciones básicas
    if (!fila.empresa_id)     { console.error(`${FAIL} ${lineaInfo} — empresa_id requerido`); errores++; continue }
    if (!fila.descripcion)    { console.error(`${FAIL} ${lineaInfo} — descripcion requerida`); errores++; continue }
    if (!fila.unidad_medida)  { console.error(`${FAIL} ${lineaInfo} — unidad_medida requerida`); errores++; continue }
    if (!fila.tipo_item)      { console.error(`${FAIL} ${lineaInfo} — tipo_item requerido`); errores++; continue }

    const empresaId   = num(fila.empresa_id)
    const categoriaId = numOrNull(fila.categoria_id)
    const tipoItem    = num(fila.tipo_item)
    const manejoCostos = fila.manejo_costos ? num(fila.manejo_costos) : 99

    // Verificar empresa
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
    if (!empresa) { console.error(`${FAIL} ${lineaInfo} — empresa_id=${empresaId} no existe`); errores++; continue }

    // Verificar categoría (si se especificó)
    if (categoriaId) {
      const cat = await prisma.categoriaItem.findUnique({ where: { id: categoriaId } })
      if (!cat) { console.error(`${FAIL} ${lineaInfo} — categoria_id=${categoriaId} no existe`); errores++; continue }
      if (cat.empresaId !== empresaId) {
        console.error(`${FAIL} ${lineaInfo} — categoria_id=${categoriaId} no pertenece a empresa ${empresaId}`)
        errores++; continue
      }
    } else {
      console.warn(`⚠️  ${lineaInfo} — sin categoria_id, se omite`)
      omitidos++; continue
    }

    // Verificar item de referencia (si aplica)
    const costoRefId = numOrNull(fila.costo_referencia_item_id)
    if (manejoCostos === 3 && costoRefId) {
      const refItem = await prisma.item.findUnique({ where: { id: costoRefId } })
      if (!refItem) { console.error(`${FAIL} ${lineaInfo} — costo_referencia_item_id=${costoRefId} no existe`); errores++; continue }
    }

    // Verificar tipo combo (si aplica)
    const tipoComboId = numOrNull(fila.tipo_combo_id)
    if (tipoComboId) {
      const tc = await prisma.tipoCombo.findUnique({ where: { id: tipoComboId } })
      if (!tc) { console.warn(`⚠️  ${lineaInfo} — tipo_combo_id=${tipoComboId} no existe, se ignora`); }
    }

    // Verificar duplicado (misma empresa + descripcion)
    const existe = await prisma.item.findFirst({
      where: { empresaId, descripcion: fila.descripcion.toUpperCase() }
    })
    if (existe) {
      console.warn(`${SKIP}${lineaInfo} — ya existe (id=${existe.id}), se omite`)
      omitidos++; continue
    }

    // Calcular tipo_producto fijo según tipo_item
    let tipoProducto = fila.tipo_producto ? num(fila.tipo_producto) : 0
    if (tipoItem === 1) tipoProducto = 0
    if (tipoItem === 2) tipoProducto = 1
    if (tipoItem === 4) tipoProducto = 1
    if (tipoItem === 5) tipoProducto = 0
    if (tipoItem === 6) tipoProducto = 0

    const data = {
      empresaId,
      descripcion:           fila.descripcion.toUpperCase(),
      unidadMedida:          fila.unidad_medida.toUpperCase(),
      tipoItem,
      tipoProducto,
      categoriaId,
      venta:                 bool(fila.venta) ? 1 : 0,
      recurrente:            bool(fila.recurrente) ? 1 : 0,
      recurrenteGasto:       bool(fila.recurrente_gasto) ? 1 : 0,
      manejoCostos,
      cotizacionScope:       manejoCostos === 1 ? (fila.cotizacion_scope || 'GENERAL') : 'GENERAL',
      porCosteo:             manejoCostos === 1 ? num(fila.por_costeo || '0') : 0,
      precioVentaCero:       bool(fila.precio_venta_cero),
      uniforme:              bool(fila.uniforme) ? 1 : 0,
      perfil:                bool(fila.perfil) ? 1 : 0,
      tipo:                  bool(fila.tipo) ? 1 : 0,
      activo:                fila.activo !== '0',
      codigoErp:             strOrNull(fila.codigo_erp),
      tipoComboId:           tipoComboId || null,
      costoReferenciaItemId: manejoCostos === 3 ? costoRefId : null,
      usuarioCreo:           USUARIO_IMPORT_ID,
    }

    if (isDry) {
      console.log(`${OK} ${DRY}${lineaInfo} — se crearía con datos:`, JSON.stringify(data))
      ok++
    } else {
      try {
        const item = await prisma.item.create({ data })
        console.log(`${OK} ${lineaInfo} — creado con id=${item.id}`)
        ok++
      } catch (e) {
        console.error(`${FAIL} ${lineaInfo} — error al crear:`, e.message)
        errores++
      }
    }
  }

  console.log(`\n📊 Items: ${ok} ${isDry ? 'serían importados' : 'importados'}, ${omitidos} omitidos, ${errores} errores`)
}

// ─── IMPORTAR COMBOS ─────────────────────────────────────────────────────────

async function importarCombos() {
  const archivo = path.join(plantillasDir, 'plantilla_combos.csv')
  console.log(`\n🔗 ${DRY}Importando Combos desde: ${archivo}`)
  const filas = parseCsv(archivo)
  console.log(`   ${filas.length} filas encontradas.\n`)

  let ok = 0, errores = 0, omitidos = 0

  for (const fila of filas) {
    const lineaInfo = `Línea ${fila._lineaCSV}: principal=${fila.item_principal_id} → secundario=${fila.item_secundario_id}`

    const empresaId      = num(fila.empresa_id)
    const tipoItem       = num(fila.tipo_item)
    const principalId    = num(fila.item_principal_id)
    const secundarioId   = num(fila.item_secundario_id)

    if (!principalId || !secundarioId) {
      console.error(`${FAIL} ${lineaInfo} — IDs de items requeridos`); errores++; continue
    }

    // Verificar items
    const [principal, secundario] = await Promise.all([
      prisma.item.findUnique({ where: { id: principalId } }),
      prisma.item.findUnique({ where: { id: secundarioId } }),
    ])
    if (!principal)  { console.error(`${FAIL} ${lineaInfo} — item_principal_id=${principalId} no existe`); errores++; continue }
    if (!secundario) { console.error(`${FAIL} ${lineaInfo} — item_secundario_id=${secundarioId} no existe`); errores++; continue }

    // Verificar duplicado
    const existe = await prisma.detalleCombo.findFirst({
      where: { productoPrincipalId: principalId, productoSecundarioId: secundarioId }
    })
    if (existe) {
      console.warn(`${SKIP}${lineaInfo} — ya existe (id=${existe.id}), se omite`)
      omitidos++; continue
    }

    const data = {
      empresaId,
      tipoItem,
      productoPrincipalId:  principalId,
      productoSecundarioId: secundarioId,
      nuevoCantidad:        fila.nuevo_cantidad ? parseFloat(fila.nuevo_cantidad) : 0,
      nuevoIncluido:        bool(fila.nuevo_incluido) ? 1 : 0,
      nuevoRequerido:       bool(fila.nuevo_requerido) ? 1 : 0,
      renovacionCantidad:   fila.renovacion_cantidad ? parseFloat(fila.renovacion_cantidad) : 0,
      renovacionIncluido:   bool(fila.renovacion_incluido) ? 1 : 0,
      renovacionRequerido:  bool(fila.renovacion_requerido) ? 1 : 0,
      usuarioCreo:          USUARIO_IMPORT_ID,
    }

    if (isDry) {
      console.log(`${OK} ${DRY}${lineaInfo} — se crearía ("${principal.descripcion}" → "${secundario.descripcion}")`)
      ok++
    } else {
      try {
        const combo = await prisma.detalleCombo.create({ data })
        console.log(`${OK} ${lineaInfo} — creado (id=${combo.id}) "${principal.descripcion}" → "${secundario.descripcion}"`)
        ok++
      } catch (e) {
        console.error(`${FAIL} ${lineaInfo} — error:`, e.message)
        errores++
      }
    }
  }

  console.log(`\n📊 Combos: ${ok} ${isDry ? 'serían importados' : 'importados'}, ${omitidos} omitidos, ${errores} errores`)
}

// ─── IMPORTAR COSTOS MANUALES ─────────────────────────────────────────────────

async function importarCostosManuales() {
  const archivo = path.join(plantillasDir, 'plantilla_costos_manuales.csv')
  console.log(`\n💰 ${DRY}Importando Costos Manuales desde: ${archivo}`)
  const filas = parseCsv(archivo)
  console.log(`   ${filas.length} filas encontradas.\n`)

  let ok = 0, errores = 0, omitidos = 0

  for (const fila of filas) {
    const itemId    = num(fila.item_id)
    const costo     = parseFloat(fila.costo)
    const fecha     = fila.fecha
    const usuarioId = num(fila.usuario_id) || USUARIO_IMPORT_ID
    const lineaInfo = `Línea ${fila._lineaCSV}: item_id=${itemId} costo=${costo} fecha=${fecha}`

    if (!itemId) { console.error(`${FAIL} ${lineaInfo} — item_id requerido`); errores++; continue }
    if (isNaN(costo) || costo <= 0) { console.error(`${FAIL} ${lineaInfo} — costo inválido`); errores++; continue }
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { console.error(`${FAIL} ${lineaInfo} — fecha inválida (formato: YYYY-MM-DD)`); errores++; continue }

    const item = await prisma.item.findUnique({ where: { id: itemId } })
    if (!item) { console.error(`${FAIL} ${lineaInfo} — item_id=${itemId} no existe`); errores++; continue }
    if (item.manejoCostos !== 2) {
      console.warn(`⚠️  ${lineaInfo} — item "${item.descripcion}" tiene manejo_costos=${item.manejoCostos} (no es Manual=2), se omite`)
      omitidos++; continue
    }

    // Verificar duplicado exacto (mismo item + fecha)
    const existe = await prisma.itemCosto.findFirst({ where: { itemId, fecha: new Date(fecha) } })
    if (existe) {
      console.warn(`${SKIP}${lineaInfo} — ya existe registro para esta fecha, se omite`)
      omitidos++; continue
    }

    const data = { itemId, costo, fecha: new Date(fecha), usuarioId }

    if (isDry) {
      console.log(`${OK} ${DRY}${lineaInfo} — se crearía para "${item.descripcion}"`)
      ok++
    } else {
      try {
        await prisma.itemCosto.create({ data })
        console.log(`${OK} ${lineaInfo} — creado para "${item.descripcion}"`)
        ok++
      } catch (e) {
        console.error(`${FAIL} ${lineaInfo} — error:`, e.message)
        errores++
      }
    }
  }

  console.log(`\n📊 Costos Manuales: ${ok} ${isDry ? 'serían importados' : 'importados'}, ${omitidos} omitidos, ${errores} errores`)
}

// ─── IMPORTAR COSTOS DE REFERENCIA ───────────────────────────────────────────

async function importarCostosReferencia() {
  const archivo = path.join(plantillasDir, 'plantilla_costos_referencia.csv')
  console.log(`\n📎 ${DRY}Importando Costos de Referencia desde: ${archivo}`)
  const filas = parseCsv(archivo)
  console.log(`   ${filas.length} filas encontradas.\n`)

  let ok = 0, errores = 0, omitidos = 0

  for (const fila of filas) {
    const itemId    = num(fila.item_id)
    const refItemId = numOrNull(fila.ref_item_id)
    const pct       = parseFloat(fila.pct)
    const fecha     = fila.fecha
    const usuarioId = num(fila.usuario_id) || USUARIO_IMPORT_ID
    const lineaInfo = `Línea ${fila._lineaCSV}: item_id=${itemId} pct=${pct}% fecha=${fecha}`

    if (!itemId) { console.error(`${FAIL} ${lineaInfo} — item_id requerido`); errores++; continue }
    if (isNaN(pct) || pct <= 0) { console.error(`${FAIL} ${lineaInfo} — pct inválido`); errores++; continue }
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { console.error(`${FAIL} ${lineaInfo} — fecha inválida`); errores++; continue }

    const item = await prisma.item.findUnique({ where: { id: itemId } })
    if (!item) { console.error(`${FAIL} ${lineaInfo} — item_id=${itemId} no existe`); errores++; continue }
    if (item.manejoCostos !== 3) {
      console.warn(`⚠️  ${lineaInfo} — item "${item.descripcion}" tiene manejo_costos=${item.manejoCostos} (no es Referencia=3), se omite`)
      omitidos++; continue
    }

    // Si se especifica ref_item_id en el CSV, actualizamos el item para apuntarlo (si no está ya apuntado)
    if (refItemId && item.costoReferenciaItemId !== refItemId) {
      const refItem = await prisma.item.findUnique({ where: { id: refItemId } })
      if (!refItem) {
        console.error(`${FAIL} ${lineaInfo} — ref_item_id=${refItemId} no existe`); errores++; continue
      }
      if (!isDry) {
        await prisma.item.update({ where: { id: itemId }, data: { costoReferenciaItemId: refItemId } })
        console.log(`   🔗 item_id=${itemId} apuntado a ref_item_id=${refItemId} ("${refItem.descripcion}")`)
      }
    }

    // Verificar duplicado exacto
    const existe = await prisma.itemCostoRef.findFirst({ where: { itemId, fecha: new Date(fecha) } })
    if (existe) {
      console.warn(`${SKIP}${lineaInfo} — ya existe registro para esta fecha, se omite`)
      omitidos++; continue
    }

    const data = { itemId, pct, fecha: new Date(fecha), usuarioId }

    if (isDry) {
      console.log(`${OK} ${DRY}${lineaInfo} — se crearía para "${item.descripcion}"`)
      ok++
    } else {
      try {
        await prisma.itemCostoRef.create({ data })
        console.log(`${OK} ${lineaInfo} — creado para "${item.descripcion}"`)
        ok++
      } catch (e) {
        console.error(`${FAIL} ${lineaInfo} — error:`, e.message)
        errores++
      }
    }
  }

  console.log(`\n📊 Costos Referencia: ${ok} ${isDry ? 'serían importados' : 'importados'}, ${omitidos} omitidos, ${errores} errores`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  🚀 Importador masivo — Costeador')
  console.log(`  Modo: ${isDry ? '🔍 DRY-RUN (solo validación)' : '✍️  ESCRITURA REAL'}`)
  console.log(`  Directorio plantillas: ${plantillasDir}`)
  console.log('='.repeat(60))

  try {
    if (doItems)    await importarItems()
    if (doCombos)   await importarCombos()
    if (doManuales) await importarCostosManuales()
    if (doRefs)     await importarCostosReferencia()
    console.log('\n✅ Proceso finalizado.')
  } catch (e) {
    console.error('\n❌ Error inesperado:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()

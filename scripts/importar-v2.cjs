#!/usr/bin/env node
/**
 * importar-v2.cjs — Importación masiva desde plantillas_v1
 * =========================================================
 * Decisiones aplicadas:
 *  - categoria_id=0 → crear/reutilizar categoría "SIN CATEGORIA" por empresa
 *  - manejo_costos=0 → reemplazar por 99 (No Aplica)
 *  - Encoding latin1/Windows-1252: leer archivo en latin1 y normalizar tildes
 *  - item_id / item_principal_id / item_secundario_id / item_erp / ref_item_erp
 *    contienen código ERP → se resuelven a id interno vía empresa_id + codigo_erp
 *  - Limpieza previa de items/combos/costos antes de importar
 *
 * USO:
 *   node scripts/importar-v2.cjs            → importar todo
 *   node scripts/importar-v2.cjs --dry-run  → solo validar (sin escribir en BD)
 */
'use strict'

const fs   = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const PLANTILLAS_DIR  = path.join(__dirname, 'plantillas')
const USUARIO_ID      = 1
const isDry           = process.argv.includes('--dry-run')

// ─── Normalización de texto ────────────────────────────────────────────────────
// Lee en latin1 → la normalización convierte vocales con tilde a sin tilde
function normalizeText(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quitar diacríticos combinados
    // reemplazos explícitos para caracteres latin1 frecuentes
    .replace(/[àáâãäåÀÁÂÃÄÅ]/g, 'A')
    .replace(/[èéêëÈÉÊË]/g, 'E')
    .replace(/[ìíîïÌÍÎÏ]/g, 'I')
    .replace(/[òóôõöÒÓÔÕÖ]/g, 'O')
    .replace(/[ùúûüÙÚÛÜ]/g, 'U')
    .replace(/[ñÑ]/g, 'N')
    .replace(/[çÇ]/g, 'C')
    .replace(/\?/g, '')                // limpiar restos de codificación rota
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── CSV Parser (soporta campos entre comillas con comas internas) ─────────────
function parseCsv(filePath) {
  // Leer como latin1 para manejar archivos guardados en Windows-1252
  const content = fs.readFileSync(filePath, 'latin1')
  const lines   = content.split(/\r?\n/).filter(l => l.trim())

  function parseRow(line) {
    const result = []
    let current  = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"' && !inQuotes) {
        inQuotes = true
      } else if (c === '"' && inQuotes) {
        if (line[i + 1] === '"') { current += '"'; i++ }  // comilla escapada ""
        else inQuotes = false
      } else if (c === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += c
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  return lines.slice(1).map((line, i) => {
    const vals = parseRow(line)
    const row  = {}
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] ?? '').trim() })
    row._line = i + 2
    return row
  })
}

// ─── tipo_producto fijo por tipo_item ──────────────────────────────────────────
function calcTipoProducto(tipoItem, tipoProdCSV) {
  switch (tipoItem) {
    case 1: return 0
    case 2: return 1
    case 3: return parseInt(tipoProdCSV) || 0   // seleccionable: 0=Estandar, 1=Outsourcing
    case 4: return 1
    case 5: return 0
    case 6: return 0
    default: return 0
  }
}

const prisma = new PrismaClient()

// ─── Categoría "SIN CATEGORIA" por empresa ────────────────────────────────────
const sinCatCache = {}
async function getSinCategoria(empresaId) {
  if (sinCatCache[empresaId]) return sinCatCache[empresaId]
  let cat = await prisma.categoriaItem.findFirst({
    where: { empresaId, nombre: 'SIN CATEGORIA' }
  })
  if (!cat) {
    if (isDry) {
      // En dry-run usamos un ID ficticio para no crear en BD
      sinCatCache[empresaId] = -empresaId
      console.log(`   📁 [DRY] Se crearía categoría "SIN CATEGORIA" para empresa ${empresaId}`)
      return sinCatCache[empresaId]
    }
    cat = await prisma.categoriaItem.create({
      data: { empresaId, nombre: 'SIN CATEGORIA', prioridad: 0, usuarioCreo: USUARIO_ID }
    })
    console.log(`   📁 Categoría "SIN CATEGORIA" creada para empresa ${empresaId} (id=${cat.id})`)
  }
  sinCatCache[empresaId] = cat.id
  return cat.id
}

// ─── PASO 0: Limpieza ─────────────────────────────────────────────────────────
async function limpiarDB() {
  console.log('\n🗑️  Limpiando registros existentes (orden FK)...')
  const steps = [
    { label: 'RecetaSnap',          fn: () => prisma.recetaSnap.deleteMany({}) },
    { label: 'NodoRecurso',         fn: () => prisma.nodoRecurso.deleteMany({}) },
    { label: 'DetalleCombo',        fn: () => prisma.detalleCombo.deleteMany({}) },
    { label: 'SolicitudCotizacion', fn: () => prisma.solicitudCotizacion.deleteMany({}) },
    { label: 'ItemTipoCombo',       fn: () => prisma.itemTipoCombo.deleteMany({}) },
    { label: 'ItemTipoComboRH',     fn: () => prisma.itemTipoComboRH.deleteMany({}) },
    { label: 'ItemCosto',           fn: () => prisma.itemCosto.deleteMany({}) },
    { label: 'ItemCostoRef',        fn: () => prisma.itemCostoRef.deleteMany({}) },
    { label: 'Item',                fn: () => prisma.item.deleteMany({}) },
  ]
  for (const step of steps) {
    const result = await step.fn()
    console.log(`   ✅ ${step.label}: ${result.count} eliminados`)
  }
}

// ─── PASO 1: Importar Items ────────────────────────────────────────────────────
async function importarItems() {
  console.log('\n📦 Importando Items desde plantilla_items_v1.csv...')
  const filas = parseCsv(path.join(PLANTILLAS_DIR, 'plantilla_items_v1.csv'))
  console.log(`   ${filas.length} filas en el CSV\n`)

  // Map para resolución ERP → id interno (usado por combos y costos)
  // clave: `${empresaId}:${codigoErp}`
  const itemMap = new Map()

  let ok = 0, errores = 0, sinErp = 0

  for (const fila of filas) {
    const empresaId   = parseInt(fila.empresa_id) || 0
    const descripcion = normalizeText(fila.descripcion)
    const codigoErp   = (fila.codigo_erp || '').trim()
    const unidadMedida = normalizeText(fila.unidad_medida) || 'UNI'
    const tipoItem    = parseInt(fila.tipo_item) || 1
    const tipoProducto = calcTipoProducto(tipoItem, fila.tipo_producto)
    const venta       = fila.venta === '1' ? 1 : 0
    const recurrente  = fila.recurrente === '1' ? 1 : 0
    const recurrenteGasto = fila.recurrente_gasto === '1' ? 1 : 0
    let manejoCostos  = parseInt(fila.manejo_costos)
    if (isNaN(manejoCostos) || manejoCostos === 0) manejoCostos = 99
    const cotizacionScope = manejoCostos === 1 ? (fila.cotizacion_scope || 'GENERAL') : 'GENERAL'
    const porCosteo   = manejoCostos === 1 ? (parseInt(fila.por_costeo) || 0) : 0
    const precioVentaCero = fila.precio_venta_cero === '1'
    const uniforme    = fila.uniforme === '1' ? 1 : 0
    const perfil      = fila.perfil === '1' ? 1 : 0
    const tipo        = fila.tipo === '1' ? 1 : 0
    const activo      = fila.activo !== '0'
    const tipoComboIdRaw = parseInt(fila.tipo_combo_id)
    const tipoComboId = (!isNaN(tipoComboIdRaw) && tipoComboIdRaw > 0) ? tipoComboIdRaw : null

    if (!empresaId || !descripcion) {
      console.error(`❌ L${fila._line}: empresa_id o descripcion vacíos — omitido`)
      errores++; continue
    }

    const categoriaIdCSV = parseInt(fila.categoria_id) || 0
    const categoriaId    = categoriaIdCSV > 0 ? categoriaIdCSV : await getSinCategoria(empresaId)

    if (isDry) {
      if (!codigoErp) sinErp++
      ok++
      if (ok % 1000 === 0) console.log(`   [DRY] ${ok} filas validadas...`)
      continue
    }

    try {
      const item = await prisma.item.create({
        data: {
          empresaId,
          descripcion,
          codigoErp:             codigoErp || null,
          categoriaId,
          unidadMedida,
          tipoItem,
          tipoProducto,
          venta,
          recurrente,
          recurrenteGasto,
          manejoCostos,
          cotizacionScope,
          porCosteo,
          precioVentaCero,
          uniforme,
          perfil,
          tipo,
          activo,
          tipoComboId,
          costoReferenciaItemId: null,   // se actualiza en paso 4
          usuarioCreo:           USUARIO_ID,
        },
      })

      if (codigoErp) {
        itemMap.set(`${empresaId}:${codigoErp}`, item.id)
      } else {
        sinErp++
      }
      ok++
      if (ok % 500 === 0) console.log(`   ... ${ok} items importados`)
    } catch (e) {
      console.error(`❌ L${fila._line} "${descripcion}" [${codigoErp}] — ${e.message}`)
      errores++
    }
  }

  console.log(`\n📊 Items: ${ok} importados | ${sinErp} sin codigo_erp (no se podrán resolver en combos/costos) | ${errores} errores`)
  return itemMap
}

// ─── PASO 2: Importar Combos ──────────────────────────────────────────────────
async function importarCombos(itemMap) {
  console.log('\n🔗 Importando Combos desde plantilla_combos_v1.csv...')
  const filas = parseCsv(path.join(PLANTILLAS_DIR, 'plantilla_combos_v1.csv'))
  console.log(`   ${filas.length} filas en el CSV\n`)

  let ok = 0, errores = 0

  for (const fila of filas) {
    const empresaId    = parseInt(fila.empresa_id) || 0
    const tipoItem     = parseInt(fila.tipo_item) || 3
    const erpPrincipal = (fila.item_principal_id || '').trim()
    const erpSecundario= (fila.item_secundario_id || '').trim()

    const principalId  = itemMap.get(`${empresaId}:${erpPrincipal}`)
    const secundarioId = itemMap.get(`${empresaId}:${erpSecundario}`)

    const lineaInfo = `L${fila._line}: ERP "${erpPrincipal}" → "${erpSecundario}" (empresa ${empresaId})`

    if (!principalId) {
      console.error(`❌ ${lineaInfo} — principal ERP no encontrado`)
      errores++; continue
    }
    if (!secundarioId) {
      console.error(`❌ ${lineaInfo} — secundario ERP no encontrado`)
      errores++; continue
    }

    if (isDry) { ok++; continue }

    try {
      await prisma.detalleCombo.create({
        data: {
          empresaId,
          tipoItem,
          productoPrincipalId:  principalId,
          productoSecundarioId: secundarioId,
          nuevoCantidad:        parseFloat(fila.nuevo_cantidad)      || 0,
          nuevoIncluido:        fila.nuevo_incluido      === '1' ? 1 : 0,
          nuevoRequerido:       fila.nuevo_requerido     === '1' ? 1 : 0,
          renovacionCantidad:   parseFloat(fila.renovacion_cantidad) || 0,
          renovacionIncluido:   fila.renovacion_incluido  === '1' ? 1 : 0,
          renovacionRequerido:  fila.renovacion_requerido === '1' ? 1 : 0,
          usuarioCreo: USUARIO_ID,
        },
      })
      ok++
    } catch (e) {
      console.error(`❌ ${lineaInfo} — ${e.message}`)
      errores++
    }
  }

  console.log(`\n📊 Combos: ${ok} importados | ${errores} errores`)
}

// ─── PASO 3: Costos Manuales ──────────────────────────────────────────────────
async function importarCostosManuales(itemMap) {
  console.log('\n💰 Importando Costos Manuales desde plantilla_costos_manuales_v1.csv...')
  const filas = parseCsv(path.join(PLANTILLAS_DIR, 'plantilla_costos_manuales_v1.csv'))
  console.log(`   ${filas.length} filas en el CSV\n`)

  let ok = 0, errores = 0

  for (const fila of filas) {
    const empresaId = parseInt(fila.empresa_id) || 0
    const erpItem   = (fila.item_id || '').trim()      // contiene codigo_erp
    const costo     = parseFloat(fila.costo)
    const fecha     = (fila.fecha || '').trim()
    const usuarioId = parseInt(fila.usuario_id) || USUARIO_ID

    const itemId    = itemMap.get(`${empresaId}:${erpItem}`)
    const lineaInfo = `L${fila._line}: ERP "${erpItem}" costo=${costo} fecha=${fecha}`

    if (!itemId) {
      console.error(`❌ ${lineaInfo} — ERP no encontrado para empresa ${empresaId}`)
      errores++; continue
    }
    if (isNaN(costo) || costo <= 0) {
      console.error(`❌ ${lineaInfo} — costo inválido`)
      errores++; continue
    }
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      console.error(`❌ ${lineaInfo} — fecha inválida (esperado YYYY-MM-DD)`)
      errores++; continue
    }

    if (isDry) { ok++; continue }

    try {
      await prisma.itemCosto.create({
        data: { itemId, costo, fecha: new Date(fecha + 'T12:00:00Z'), usuarioId },
      })
      ok++
    } catch (e) {
      console.error(`❌ ${lineaInfo} — ${e.message}`)
      errores++
    }
  }

  console.log(`\n📊 Costos Manuales: ${ok} importados | ${errores} errores`)
}

// ─── PASO 4: Costos Referencia ────────────────────────────────────────────────
async function importarCostosReferencia(itemMap) {
  console.log('\n📎 Importando Costos Referencia desde plantilla_costos_referencia_v1.csv...')
  const filas = parseCsv(path.join(PLANTILLAS_DIR, 'plantilla_costos_referencia_v1.csv'))
  console.log(`   ${filas.length} filas en el CSV\n`)

  let ok = 0, errores = 0
  const refActualizados = new Set()   // evitar actualizar costoReferenciaItemId múltiples veces

  for (const fila of filas) {
    const empresaId = parseInt(fila.empresa_id) || 0
    const erpItem   = (fila.item_erp   || '').trim()
    const erpRef    = (fila.ref_item_erp || '').trim()
    const pct       = parseFloat(fila.pct)
    const fecha     = (fila.fecha || '').trim()
    const usuarioId = parseInt(fila.usuario_id) || USUARIO_ID

    const itemId    = itemMap.get(`${empresaId}:${erpItem}`)
    const refItemId = itemMap.get(`${empresaId}:${erpRef}`)
    const lineaInfo = `L${fila._line}: ERP "${erpItem}" ${pct}% de "${erpRef}" fecha=${fecha}`

    if (!itemId)    { console.error(`❌ ${lineaInfo} — ERP item no encontrado`);   errores++; continue }
    if (!refItemId) { console.error(`❌ ${lineaInfo} — ERP ref no encontrado`);    errores++; continue }
    if (isNaN(pct) || pct <= 0) { console.error(`❌ ${lineaInfo} — pct inválido`); errores++; continue }
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      console.error(`❌ ${lineaInfo} — fecha inválida`)
      errores++; continue
    }

    if (isDry) { ok++; continue }

    try {
      // Actualizar costoReferenciaItemId en el item (solo la primera vez que aparece)
      const refKey = `${empresaId}:${erpItem}`
      if (!refActualizados.has(refKey)) {
        await prisma.item.update({
          where: { id: itemId },
          data:  { costoReferenciaItemId: refItemId },
        })
        refActualizados.add(refKey)
      }

      await prisma.itemCostoRef.create({
        data: { itemId, pct, fecha: new Date(fecha + 'T12:00:00Z'), usuarioId },
      })
      ok++
    } catch (e) {
      console.error(`❌ ${lineaInfo} — ${e.message}`)
      errores++
    }
  }

  console.log(`\n📊 Costos Referencia: ${ok} importados | ${errores} errores`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(62))
  console.log('  🚀 Importador v2 — Costeador (plantillas_v1)')
  console.log(`  Modo: ${isDry ? '🔍 DRY-RUN (solo validación, sin escribir)' : '✍️  ESCRITURA REAL'}`)
  console.log('='.repeat(62))

  try {
    if (!isDry) {
      await limpiarDB()
    }

    const itemMap = await importarItems()

    if (isDry) {
      console.log('\n✅ Dry-run completado. Revisa los mensajes de error arriba.')
      console.log('   Cuando estés listo, ejecuta sin --dry-run para importar.')
      return
    }

    await importarCombos(itemMap)
    await importarCostosManuales(itemMap)
    await importarCostosReferencia(itemMap)

    // Resumen final
    const [totalItems, totalCombos, totalManuales, totalRefs] = await Promise.all([
      prisma.item.count(),
      prisma.detalleCombo.count(),
      prisma.itemCosto.count(),
      prisma.itemCostoRef.count(),
    ])
    console.log('\n' + '='.repeat(62))
    console.log('  📊 RESUMEN FINAL EN BD')
    console.log(`  Items:            ${totalItems}`)
    console.log(`  Combos:           ${totalCombos}`)
    console.log(`  Costos Manuales:  ${totalManuales}`)
    console.log(`  Costos Ref:       ${totalRefs}`)
    console.log('='.repeat(62))
    console.log('\n✅ Importación completada.')

  } catch (e) {
    console.error('\n❌ Error inesperado:', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()

'use server'

import { prisma } from '@/lib/prisma'
import { erp } from '@/lib/erp'
import { normalizeText } from '@/lib/utils/text'

export type CatalogoTipo = 'ITEMS' | 'CATEGORIAS'

const MIN_MATCH_PERCENTAGE = 80

/**
 * Calcula el porcentaje de coincidencia entre dos cadenas de texto.
 * Utiliza una implementación de Distancia Levenshtein.
 */
function calculateMatchPercentage(str1: string, str2: string): number {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)
  
  if (s1 === s2) return 100
  if (s1.length === 0 || s2.length === 0) return 0
  
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null))

  for (let i = 0; i <= s1.length; i += 1) matrix[0][i] = i
  for (let j = 0; j <= s2.length; j += 1) matrix[j][0] = j

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, 
        matrix[j - 1][i] + 1, 
        matrix[j - 1][i - 1] + indicator
      )
    }
  }

  const distance = matrix[s2.length][s1.length]
  const maxLength = Math.max(s1.length, s2.length)
  return ((maxLength - distance) / maxLength) * 100
}

export async function buscarConFuzzyMatch(
  empresaId: number, 
  catalogo: CatalogoTipo, 
  busqueda: string
) {
  if (busqueda.length < 3) {
    return { data: [], error: 'Ingrese al menos 3 caracteres' }
  }

  try {
    const config = await prisma.empresaCatalogoSync.findUnique({
      where: {
        empresaId_catalogo: { empresaId, catalogo }
      }
    })
    const sincronizar = config?.sincronizar ?? false
    let resultados = []

    if (catalogo === 'CATEGORIAS') {
      const dbCosteos = await prisma.categoriaItem.findMany({
        where: {
          empresaId,
          activo: true,
          nombre: { contains: busqueda }
        }
      })

      let erpResultados: any[] = []
      if (sincronizar) {
        erpResultados = await erp.buscarCategorias(empresaId, busqueda)
      }

      const mergedMap = new Map()
      
      for (const item of dbCosteos) {
        const match = calculateMatchPercentage(item.nombre, busqueda)
        if (match >= MIN_MATCH_PERCENTAGE) {
          mergedMap.set(item.codigoErp || `local_${item.id}`, {
            ...item,
            isNewInCosteos: false,
            matchPercentage: match,
            source: 'costeos'
          })
        }
      }

      for (const erpItem of erpResultados) {
        const match = calculateMatchPercentage(erpItem.nombre, busqueda)
        if (match >= MIN_MATCH_PERCENTAGE) {
          const existing = mergedMap.get(erpItem.codigo)
          if (existing) {
             mergedMap.set(erpItem.codigo, {
               ...existing,
               nombre: erpItem.nombre,
               codigoErp: erpItem.codigo,
               source: 'both' 
             })
          } else {
             mergedMap.set(erpItem.codigo, {
               id: null,
               codigoErp: erpItem.codigo,
               nombre: erpItem.nombre,
               isNewInCosteos: true,
               matchPercentage: match,
               source: 'erp'
             })
          }
        }
      }
      resultados = Array.from(mergedMap.values()).sort((a, b) => b.matchPercentage - a.matchPercentage)
      return { data: resultados }

    } else if (catalogo === 'ITEMS') {
      const dbCosteos = await prisma.item.findMany({
        where: {
          empresaId,
          activo: true,
          descripcion: { contains: busqueda }
        }
      })

      let erpResultados: any[] = []
      if (sincronizar) {
        erpResultados = await erp.getItems({ empresaId, busqueda })
      }

      const mergedMap = new Map()
      
      for (const item of dbCosteos) {
        const match = calculateMatchPercentage(item.descripcion, busqueda)
        if (match >= MIN_MATCH_PERCENTAGE) {
          mergedMap.set(item.codigoErp || `local_${item.id}`, {
            ...item,
            isNewInCosteos: false,
            matchPercentage: match,
            source: 'costeos'
          })
        }
      }

      for (const erpItem of erpResultados) {
        const match = calculateMatchPercentage(erpItem.nombre, busqueda)
        if (match >= MIN_MATCH_PERCENTAGE) {
          const existing = mergedMap.get(erpItem.codigo)
          if (existing) {
             mergedMap.set(erpItem.codigo, {
               ...existing,
               descripcion: erpItem.nombre,
               codigoErp: erpItem.codigo,
               source: 'both' 
             })
          } else {
             mergedMap.set(erpItem.codigo, {
               id: null,
               codigoErp: erpItem.codigo,
               descripcion: erpItem.nombre,
               categoriaId: erpItem.categoriaId,
               tipoItem: erpItem.tipo === 'SERVICIO' ? 2 : 1, // Mapeo temporal según catálogo actual
               unidadMedida: erpItem.unidad,
               isNewInCosteos: true,
               matchPercentage: match,
               source: 'erp'
             })
          }
        }
      }
      resultados = Array.from(mergedMap.values()).sort((a, b) => b.matchPercentage - a.matchPercentage)
      return { data: resultados }
    }

    return { data: [] }
  } catch (error: any) {
    console.error('Error en buscarConFuzzyMatch:', error)
    return { error: 'Error al realizar la búsqueda' }
  }
}

export async function guardarRegistroCatalogo(
  empresaId: number, 
  catalogo: CatalogoTipo, 
  payload: any, 
  usuarioId: number
) {
  try {
    const config = await prisma.empresaCatalogoSync.findUnique({
      where: {
        empresaId_catalogo: { empresaId, catalogo }
      }
    })
    const sincronizar = config?.sincronizar ?? false

    if (catalogo === 'CATEGORIAS') {
      let codigoErp = 0
      
      if (sincronizar) {
        // Enviar al ERP y obtener código (Rollback si falla)
        try {
          const erpRes = await erp.crearCategoria(empresaId, payload.nombre)
          codigoErp = typeof erpRes.codigoErp === 'string' ? parseInt(erpRes.codigoErp, 10) : erpRes.codigoErp
        } catch (erpError: any) {
          console.error("Fallo al guardar Categoría en ERP:", erpError)
          return { error: 'Fallo al sincronizar con el ERP. No se guardó el registro.' }
        }
      }

      // Conseguir el siguiente código interno (Prisma)
      const lastCat = await prisma.categoriaItem.findFirst({
        where: { empresaId },
        orderBy: { codigo: 'desc' }
      })
      const nextCodigo = (lastCat?.codigo || 0) + 1

      const nuevaCategoria = await prisma.categoriaItem.create({
        data: {
          empresaId,
          codigo: nextCodigo,
          codigoErp: codigoErp,
          nombre: payload.nombre,
          usuarioCreo: usuarioId
        }
      })
      return { data: nuevaCategoria }

    } else if (catalogo === 'ITEMS') {
      let codigoErp: string | null = null
      
      if (sincronizar) {
        // Validación de Dependencia: Verificar Categoría
        const categoriaLocal = await prisma.categoriaItem.findUnique({
          where: { id: payload.categoriaId }
        })

        if (!categoriaLocal) {
          return { error: 'La categoría especificada no existe localmente.' }
        }

        try {
          const erpRes = await erp.crearItem(empresaId, {
            nombre: payload.descripcion,
            descripcion: payload.descripcion,
            categoriaId: categoriaLocal.codigoErp > 0 ? categoriaLocal.codigoErp : categoriaLocal.codigo, 
            tipo: payload.tipoItem === 2 ? 'SERVICIO' : 'ARTICULO',
            unidad: payload.unidadMedida
          })
          codigoErp = erpRes.codigoErp.toString()
        } catch (erpError: any) {
          console.error("Fallo al guardar Item en ERP:", erpError)
          return { error: 'Fallo al sincronizar ítem con el ERP. No se guardó el registro.' }
        }
      }

      const nuevoItem = await prisma.item.create({
        data: {
          empresaId,
          descripcion: payload.descripcion,
          unidadMedida: payload.unidadMedida,
          tipoItem: payload.tipoItem,
          codigoErp: codigoErp,
          categoriaId: payload.categoriaId,
          usuarioCreo: usuarioId
        }
      })
      return { data: nuevoItem }
    }

    return { error: 'Catálogo no soportado' }
  } catch (error: any) {
    console.error('Error en guardarRegistroCatalogo:', error)
    return { error: 'Error al intentar guardar el registro' }
  }
}

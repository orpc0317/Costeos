'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProyectoCosteo, SitioCosteo, PuestoCosteo, RecursoCosteo } from '@/lib/types/costeos'
import { revalidatePath } from 'next/cache'

export async function saveCosteoTree(proyecto: ProyectoCosteo) {
  // Mapa para devolver los IDs numéricos generados a la UI
  const idMap: {
    sitios: Record<string, string>;
    puestos: Record<string, string>;
    recursos: Record<string, string>;
  } = { sitios: {}, puestos: {}, recursos: {} };
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('No autorizado')
  }

  const costeoId = parseInt(proyecto.id, 10)
  if (isNaN(costeoId)) throw new Error('ID de costeo inválido')

  // Validar que el costeo pertenece a un contrato
  const costeo = await prisma.costeo.findUnique({
    where: { id: costeoId },
    include: { contrato: true }
  })

  if (!costeo) throw new Error('Costeo no encontrado')

  // Iniciar Transacción para guardar todo el árbol
  await prisma.$transaction(async (tx) => {
    // 1. Actualizar Contrato y Costeo
    await tx.contrato.update({
      where: { id: costeo.contratoId },
      data: {
        plazoMeses: proyecto.plazoMeses,
        nombre: proyecto.nombreProyecto,
        // fechaInicio, moneda, etc. si fuera necesario
      }
    })

    await tx.costeo.update({
      where: { id: costeoId },
      data: {
        overheadPct: proyecto.porcentajeOverhead,
        contingenciaPct: proyecto.porcentajeContingencia,
        // NOTA: Si hubiera `margenPct` en ProyectoCosteo, se actualizaría aquí
      }
    })

    // 2. Procesar Sitios
    const sitiosActuales = await tx.sitio.findMany({
      where: { contratoId: costeo.contratoId },
      select: { id: true }
    })
    
    // Extraer IDs numéricos que vienen del frontend
    const idsSitiosFrontend = proyecto.sitios
      .map(s => parseInt(s.id, 10))
      .filter(id => !isNaN(id))

    // Borrar sitios que ya no están en el frontend
    const sitiosABorrar = sitiosActuales.filter(s => !idsSitiosFrontend.includes(s.id))
    if (sitiosABorrar.length > 0) {
      await tx.sitio.deleteMany({
        where: { id: { in: sitiosABorrar.map(s => s.id) } }
      })
    }

    // Upsert Sitios
    for (const sitioFront of proyecto.sitios) {
      let sitioIdDb: number
      const sId = parseInt(sitioFront.id, 10)

      if (isNaN(sId)) {
        // CREAR NUEVO
        const nuevoSitio = await tx.sitio.create({
          data: {
            contratoId: costeo.contratoId,
            nombre: sitioFront.nombre,
            direccion: sitioFront.direccion || null,
            pais: sitioFront.pais || null,
            departamento: sitioFront.departamento || null,
            municipio: sitioFront.municipio || null,
          }
        })
        sitioIdDb = nuevoSitio.id
        idMap.sitios[sitioFront.id] = nuevoSitio.id.toString()
      } else {
        // ACTUALIZAR
        await tx.sitio.update({
          where: { id: sId },
          data: {
            nombre: sitioFront.nombre,
            direccion: sitioFront.direccion || null,
            pais: sitioFront.pais || null,
            departamento: sitioFront.departamento || null,
            municipio: sitioFront.municipio || null,
          }
        })
        sitioIdDb = sId
      }

      // 3. Procesar Puestos dentro de este Sitio
      const puestosActuales = await tx.puesto.findMany({
        where: { sitioId: sitioIdDb },
        select: { id: true }
      })

      const idsPuestosFrontend = sitioFront.puestos
        .map(p => parseInt(p.id, 10))
        .filter(id => !isNaN(id))

      const puestosABorrar = puestosActuales.filter(p => !idsPuestosFrontend.includes(p.id))
      if (puestosABorrar.length > 0) {
        await tx.puesto.deleteMany({
          where: { id: { in: puestosABorrar.map(p => p.id) } }
        })
      }

      for (const puestoFront of sitioFront.puestos) {
        let puestoIdDb: number
        const pId = parseInt(puestoFront.id, 10)

        if (isNaN(pId)) {
          // CREAR NUEVO
          const nuevoPuesto = await tx.puesto.create({
            data: {
              sitioId: sitioIdDb,
              nombre: puestoFront.nombre,
              codigo: null,
              diasCobertura: 'LUN-DOM',
              horaInicio: '06:00',
              horaFin: '18:00',
              personas: puestoFront.personas || 1,
              horasSemana: puestoFront.horasSemana || 0,
              turnoCodigo: puestoFront.turnoCodigo || null,
              uniformeCodigo: puestoFront.uniformeCodigo || null,
              cubreDescanso: puestoFront.cubreDescanso || 0,
            }
          })
          puestoIdDb = nuevoPuesto.id
          idMap.puestos[puestoFront.id] = nuevoPuesto.id.toString()
        } else {
          // ACTUALIZAR
          await tx.puesto.update({
            where: { id: pId },
            data: {
              nombre: puestoFront.nombre,
              codigo: null,
              diasCobertura: 'LUN-DOM',
              horaInicio: '06:00',
              horaFin: '18:00',
              personas: puestoFront.personas || 1,
              horasSemana: puestoFront.horasSemana || 0,
              turnoCodigo: puestoFront.turnoCodigo || null,
              uniformeCodigo: puestoFront.uniformeCodigo || null,
              cubreDescanso: puestoFront.cubreDescanso || 0,
            }
          })
          puestoIdDb = pId
        }

        // 4. Procesar Recursos dentro de este Puesto
        const recursosActuales = await tx.puestoRecurso.findMany({
          where: { puestoId: puestoIdDb },
          select: { id: true }
        })

        const idsRecursosFrontend = puestoFront.recursos
          .map(r => parseInt(r.id, 10))
          .filter(id => !isNaN(id))

        const recursosABorrar = recursosActuales.filter(r => !idsRecursosFrontend.includes(r.id))
        if (recursosABorrar.length > 0) {
          await tx.puestoRecurso.deleteMany({
            where: { id: { in: recursosABorrar.map(r => r.id) } }
          })
        }

        for (const recursoFront of puestoFront.recursos) {
          const rId = parseInt(recursoFront.id, 10)
          
          if (isNaN(rId)) {
            // CREAR NUEVO
            const nuevoRecurso = await tx.puestoRecurso.create({
              data: {
                puestoId: puestoIdDb,
                erpItemId: recursoFront.erpItemId,
                itemNombre: recursoFront.nombre,
                itemTipo: recursoFront.categoria,
                itemCategoria: 'N/A', // Opcional o usar otro campo si existe
                itemTipoCosto: recursoFront.tipoCosto,
                cantidad: recursoFront.cantidad,
                costoUnitarioErp: recursoFront.costoUnitario,
                precioVenta: recursoFront.precioVentaUnitario || null,
                precioVentaOrigen: recursoFront.precioVentaOrigen || 'MANUAL',
              }
            })
            idMap.recursos[recursoFront.id] = nuevoRecurso.id.toString()
          } else {
            // ACTUALIZAR
            await tx.puestoRecurso.update({
              where: { id: rId },
              data: {
                cantidad: recursoFront.cantidad,
                costoUnitarioErp: recursoFront.costoUnitario,
                precioVenta: recursoFront.precioVentaUnitario || null,
                precioVentaOrigen: recursoFront.precioVentaOrigen || 'MANUAL',
              }
            })
          }
        }
      }
    }

    // 5. Historial Auto-Guardado (Snapshot espaciado)
    // Verificamos si debemos crear un nuevo snapshot
    const ultimoHistorial = await tx.historialAutoGuardado.findFirst({
      where: { costeoId },
      orderBy: { creadoEn: 'desc' },
      select: { creadoEn: true }
    })

    const ahora = new Date()
    let debeGuardarSnapshot = true

    if (ultimoHistorial) {
      const diffMinutos = (ahora.getTime() - ultimoHistorial.creadoEn.getTime()) / 1000 / 60
      if (diffMinutos < 5) {
        debeGuardarSnapshot = false
      }
    }

    if (debeGuardarSnapshot) {
      await tx.historialAutoGuardado.create({
        data: {
          costeoId,
          usuarioId: parseInt(session.user.id, 10),
          datos: JSON.stringify(proyecto),
          creadoEn: ahora
        }
      })
    }
  })

  // Limpieza asíncrona (fuera de la transacción para no bloquear)
  // Borrar snapshots más antiguos de 7 días para este costeo
  const hace7Dias = new Date()
  hace7Dias.setDate(hace7Dias.getDate() - 7)
  
  prisma.historialAutoGuardado.deleteMany({
    where: {
      costeoId,
      creadoEn: { lt: hace7Dias }
    }
  }).catch(console.error)


  // NOTA: Eliminamos revalidatePath para no interrumpir el flujo del usuario.
  // El frontend se encargará de actualizar su estado (dispatch REPLACE_IDS).
  return { success: true, idMap }
}

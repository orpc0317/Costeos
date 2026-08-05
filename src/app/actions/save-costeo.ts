'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProyectoCosteo, NodoCosteo, RecursoCosteo } from '@/lib/types/costeos'

export async function saveCosteoTree(proyecto: ProyectoCosteo) {
  const idMap: {
    nodos: Record<string, string>;
    recursos: Record<string, string>;
  } = { nodos: {}, recursos: {} };
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')

  const costeoId = parseInt(proyecto.id, 10)
  if (isNaN(costeoId)) throw new Error('ID de costeo inválido')

  const costeo = await prisma.costeo.findUnique({
    where: { id: costeoId },
    include: { contrato: true }
  })
  if (!costeo) throw new Error('Costeo no encontrado')

  await prisma.$transaction(async (tx) => {
    await tx.contrato.update({
      where: { id: costeo.contratoId },
      data: {
        plazoMeses: proyecto.plazoMeses,
        nombre: proyecto.nombreProyecto,
      }
    })

    await tx.costeo.update({
      where: { id: costeoId },
      data: {
        overheadPct: proyecto.porcentajeOverhead,
        contingenciaPct: proyecto.porcentajeContingencia,
      }
    })

    const flatNodos: (NodoCosteo & { parentTempId: string | null })[] = [];
    const flatRecursos: (RecursoCosteo & { nodoTempId: string | null })[] = [];

    const walk = (nodos: NodoCosteo[], parentTempId: string | null) => {
      for (const n of nodos) {
        flatNodos.push({ ...n, parentTempId });
        for (const r of n.recursos) {
          flatRecursos.push({ ...r, nodoTempId: n.id });
        }
        walk(n.nodos, n.id);
      }
    };
    walk(proyecto.nodos, null);
    
    for (const r of proyecto.recursos) {
      flatRecursos.push({ ...r, nodoTempId: null });
    }

    const nodosActuales = await tx.nodo.findMany({
      where: { contratoId: costeo.contratoId },
      select: { id: true }
    });
    
    const idsNodosFront = flatNodos.map(n => parseInt(n.id, 10)).filter(id => !isNaN(id));
    const nodosABorrar = nodosActuales.filter(n => !idsNodosFront.includes(n.id));
    if (nodosABorrar.length > 0) {
      await tx.nodo.deleteMany({
        where: { id: { in: nodosABorrar.map(n => n.id) } }
      });
    }

    let currentNodos = flatNodos.filter(n => n.parentTempId === null);
    while(currentNodos.length > 0) {
      const nextNodos: typeof flatNodos = [];
      for (const nodoFront of currentNodos) {
        let nodoIdDb: number;
        const nId = parseInt(nodoFront.id, 10);
        const parentDbId = nodoFront.parentTempId ? parseInt(idMap.nodos[nodoFront.parentTempId] || nodoFront.parentTempId, 10) : null;

        if (isNaN(nId)) {
          const nuevo = await tx.nodo.create({
            data: {
              contratoId: costeo.contratoId,
              parentId: parentDbId,
              nivel: nodoFront.nivel,
              nombre: nodoFront.nombre,
              direccion: nodoFront.direccion || null,
              pais: nodoFront.pais || null,
              departamento: nodoFront.departamento || null,
              municipio: nodoFront.municipio || null,
              diasCobertura: nodoFront.diasCobertura || null,
              horaInicio: nodoFront.horaInicio || null,
              horaFin: nodoFront.horaFin || null,
              personas: nodoFront.personas || 1,
              horasSemana: nodoFront.horasSemana || 0,
              turnoCodigo: nodoFront.turnoCodigo || null,
              uniformeCodigo: nodoFront.uniformeCodigo || null,
              cubreDescanso: nodoFront.cubreDescanso || 0,
            }
          });
          nodoIdDb = nuevo.id;
          idMap.nodos[nodoFront.id] = nuevo.id.toString();
        } else {
          await tx.nodo.update({
            where: { id: nId },
            data: {
              parentId: parentDbId,
              nombre: nodoFront.nombre,
              direccion: nodoFront.direccion || null,
              pais: nodoFront.pais || null,
              departamento: nodoFront.departamento || null,
              municipio: nodoFront.municipio || null,
              diasCobertura: nodoFront.diasCobertura || null,
              horaInicio: nodoFront.horaInicio || null,
              horaFin: nodoFront.horaFin || null,
              personas: nodoFront.personas || 1,
              horasSemana: nodoFront.horasSemana || 0,
              turnoCodigo: nodoFront.turnoCodigo || null,
              uniformeCodigo: nodoFront.uniformeCodigo || null,
              cubreDescanso: nodoFront.cubreDescanso || 0,
            }
          });
          nodoIdDb = nId;
        }

        const children = flatNodos.filter(n => n.parentTempId === nodoFront.id);
        nextNodos.push(...children);
      }
      currentNodos = nextNodos;
    }

    let defaultNodoRaizId: number | null = null;
    if (flatRecursos.some(r => r.nodoTempId === null)) {
      let defNodo = await tx.nodo.findFirst({ where: { contratoId: costeo.contratoId, nombre: 'DEFAULT', parentId: null } });
      if (!defNodo) {
        defNodo = await tx.nodo.create({
           data: { contratoId: costeo.contratoId, nivel: 1, nombre: 'DEFAULT' }
        });
      }
      defaultNodoRaizId = defNodo.id;
    }

    const idsNodosDB = flatNodos.map(n => parseInt(idMap.nodos[n.id] || n.id, 10));
    if (defaultNodoRaizId) idsNodosDB.push(defaultNodoRaizId);
    
    if (idsNodosDB.length > 0) {
      const recursosActuales = await tx.nodoRecurso.findMany({
        where: { nodoId: { in: idsNodosDB } },
        select: { id: true }
      });

      const idsRecursosFront = flatRecursos.map(r => parseInt(r.id, 10)).filter(id => !isNaN(id));
      const recABorrar = recursosActuales.filter(r => !idsRecursosFront.includes(r.id));
      if (recABorrar.length > 0) {
        await tx.nodoRecurso.deleteMany({
          where: { id: { in: recABorrar.map(r => r.id) } }
        });
      }

      for (const rFront of flatRecursos) {
        const rId = parseInt(rFront.id, 10);
        let nDbId = rFront.nodoTempId ? parseInt(idMap.nodos[rFront.nodoTempId] || rFront.nodoTempId, 10) : defaultNodoRaizId;
        if (!nDbId) continue;

        if (isNaN(rId)) {
          const nuevoR = await tx.nodoRecurso.create({
            data: {
              nodo: { connect: { id: nDbId } },
              erpItemId: rFront.erpItemId,
              itemNombre: rFront.nombre,
              itemTipo: rFront.categoria,
              itemCategoria: 'N/A',
              itemTipoCosto: rFront.tipoCosto,
              cantidad: rFront.cantidad,
              costoUnitarioErp: rFront.costoUnitario,
              precioVenta: rFront.precioVentaUnitario || null,
              precioVentaOrigen: rFront.precioVentaOrigen || 'MANUAL',
              turnoCodigo: rFront.turnoCodigo || null,
              uniformeCodigo: rFront.uniformeCodigo || null,
              cubreDescanso: rFront.cubreDescanso || 0,
              personas: rFront.personas || 1,
              horasSemana: rFront.horasSemana || 0,
              bonos: (rFront.bonos && rFront.bonos.length > 0) ? JSON.stringify(rFront.bonos) : null,
            }
          });
          idMap.recursos[rFront.id] = nuevoR.id.toString();
        } else {
          await tx.nodoRecurso.update({
            where: { id: rId },
            data: {
              nodo: { connect: { id: nDbId } },
              cantidad: rFront.cantidad,
              costoUnitarioErp: rFront.costoUnitario,
              precioVenta: rFront.precioVentaUnitario || null,
              precioVentaOrigen: rFront.precioVentaOrigen || 'MANUAL',
              turnoCodigo: rFront.turnoCodigo || null,
              uniformeCodigo: rFront.uniformeCodigo || null,
              cubreDescanso: rFront.cubreDescanso || 0,
              personas: rFront.personas || 1,
              horasSemana: rFront.horasSemana || 0,
              bonos: (rFront.bonos && rFront.bonos.length > 0) ? JSON.stringify(rFront.bonos) : null,
            }
          });
        }
      }
    }

    const ultimoHistorial = await tx.historialAutoGuardado.findFirst({
      where: { costeoId },
      orderBy: { creadoEn: 'desc' },
      select: { creadoEn: true }
    });

    const ahora = new Date();
    let debeGuardar = true;
    if (ultimoHistorial) {
      if ((ahora.getTime() - ultimoHistorial.creadoEn.getTime()) / 60000 < 5) {
        debeGuardar = false;
      }
    }

    if (debeGuardar) {
      await tx.historialAutoGuardado.create({
        data: {
          costeoId,
          usuarioId: parseInt(session.user!.id as string, 10),
          datos: JSON.stringify(proyecto),
          creadoEn: ahora
        }
      });
    }
  });

  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  prisma.historialAutoGuardado.deleteMany({
    where: { costeoId, creadoEn: { lt: hace7Dias } }
  }).catch(console.error);

  return { success: true, idMap };
}

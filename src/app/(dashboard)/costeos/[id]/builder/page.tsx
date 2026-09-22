import React from 'react';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CosteoProvider } from '@/lib/context/CosteoContext';
import CosteoBuilderLayout from '@/components/costeos/CosteoBuilderLayout';
import { ProyectoCosteo, NodoCosteo, RecursoCosteo } from '@/lib/types/costeos';
import { resolveCategoria } from '@/lib/utils/combos';


export default async function CosteoBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const resolvedParams = await params
  const costeoId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(costeoId)) {
    redirect('/costeos');
  }

  const costeo = await prisma.costeo.findUnique({
    where: { id: costeoId },
    include: {
      tipoCosteo: true,
      contrato: {
        include: {
          cliente: true,
        }
      }
    }
  });

  if (!costeo) {
    redirect('/costeos');
  }

  // Cargar nodos y recursos del contrato en memoria para construir el arbol
  const dbNodos = await prisma.nodo.findMany({
    where: { contratoId: costeo.contratoId },
    include: {
      recursos: true,
    }
  });

  // Cargar todos los ítems referenciados para resolver la categoría real
  const itemIds = [...new Set(
    dbNodos.flatMap(n => n.recursos.map(r => r.itemId))
  )];
  const allItems = itemIds.length > 0
    ? await prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, tipoItem: true, tipoProducto: true } })
    : [];
  const itemMap = new Map(allItems.map(i => [i.id, i]));


  /** Resuelve la categoría real desde BD, usando resolveCategoria() de combos.ts */
  const resolveCategoriaBD = (itemId: number, fallback: string): RecursoCosteo['categoria'] => {
    const it = itemMap.get(itemId);
    if (!it) return fallback as RecursoCosteo['categoria'];
    return resolveCategoria(it.tipoItem, it.tipoProducto);
  };


  /** Mapea un NodoRecurso de BD al tipo RecursoCosteo del frontend */
  type DbRecurso = (typeof dbNodos)[number]['recursos'][number];
  const mapRecurso = (r: DbRecurso): RecursoCosteo => ({
    id: r.id.toString(),
    itemId: r.itemId,
    nombre: r.itemNombre,
    categoria: resolveCategoriaBD(r.itemId, r.itemTipo),
    tipoCosto: r.itemTipoCosto as any,
    cantidad: r.cantidad,
    costoUnitario: Number(r.costoUnitarioErp || 0),
    precioVentaUnitario: r.precioVenta ? Number(r.precioVenta) : undefined,
    precioVentaOrigen: r.precioVentaOrigen as 'LISTA' | 'MANUAL',
    turnoCodigo: r.turnoCodigo ?? undefined,
    uniformeCodigo: r.uniformeCodigo ?? undefined,
    combosRhSeleccionados: r.combosRhSelec
      ? (() => { try { return JSON.parse(r.combosRhSelec) } catch { return undefined } })()
      : undefined,
    esComboRHId: (r as any).esComboRhId ?? undefined,
    cubreDescanso: r.cubreDescanso || 0,
    personas: r.personas || 1,
    horasSemana: r.horasSemana || 0,
    recetas: [],
    bonos: r.bonos ? (typeof r.bonos === 'string' ? JSON.parse(r.bonos) : r.bonos) : [],
    esCombo: !!r.comboParentId,
    comboParentId: r.comboParentId?.toString() ?? undefined,
  });

  const buildNodoTree = (parentId: number | null): NodoCosteo[] => {
    return dbNodos
      .filter(n => n.parentId === parentId && n.nombre !== 'DEFAULT')
      .map(n => ({
        id: n.id.toString(),
        nombre: n.nombre,
        nivel: n.nivel,
        codigo: n.codigo || undefined,
        direccion: n.direccion || '',
        pais: n.pais || '',
        departamento: n.departamento || '',
        municipio: n.municipio || '',
        latitud: n.latitud ? Number(n.latitud) : undefined,
        longitud: n.longitud ? Number(n.longitud) : undefined,
        diasCobertura: n.diasCobertura || undefined,
        horaInicio: n.horaInicio || undefined,
        horaFin: n.horaFin || undefined,
        personas: n.personas || 1,
        horasSemana: n.horasSemana || 0,
        turnoCodigo: n.turnoCodigo ?? undefined,
        uniformeCodigo: n.uniformeCodigo ?? undefined,
        combosRhSeleccionados: (n as any).combosRhSelec
          ? (() => { try { return JSON.parse((n as any).combosRhSelec) } catch { return undefined } })()
          : undefined,
        cubreDescanso: n.cubreDescanso || 0,
        recursos: n.recursos.map(mapRecurso),
        nodos: buildNodoTree(n.id)
      }));
  };

  const nodos = buildNodoTree(null);

  // Recursos del nodo DEFAULT (nivel raíz del proyecto)
  const defaultNodo = dbNodos.find(n => n.parentId === null && n.nombre === 'DEFAULT');
  const recursos = defaultNodo ? defaultNodo.recursos.map(mapRecurso) : [];


  const dbProyecto: ProyectoCosteo = {
    id: costeo.id.toString(),
    empresaId: costeo.contrato.empresaId,
    cliente: {
      id: costeo.contrato.cliente.id.toString(),
      codigo: costeo.contrato.cliente.codigoErp?.toString(),
      razonSocial: costeo.contrato.cliente.razonSocial,
      nit: costeo.contrato.cliente.nit,
      direccionFiscal: costeo.contrato.cliente.direccionFiscal || '',
    },
    numeroContrato: costeo.contrato.numero,
    nombreProyecto: costeo.contrato.nombre,
    fechaInicio: costeo.contrato.fechaInicio.toISOString().split('T')[0],
    plazoMeses: costeo.contrato.plazoMeses,
    moneda: costeo.contrato.moneda as 'GTQ' | 'USD',
    estado: costeo.estado as 'BORRADOR' | 'APROBADO',
    porcentajeOverhead: Number(costeo.overheadPct),
    porcentajeContingencia: Number(costeo.contingenciaPct),
    tipoCosteo: costeo.tipoCosteo ? {
      id: costeo.tipoCosteo.id,
      nombre: costeo.tipoCosteo.nombre,
      cantidadNiveles: costeo.tipoCosteo.cantidadNiveles,
      etiquetasNiveles: costeo.tipoCosteo.etiquetasNiveles,
      coloresNiveles: costeo.tipoCosteo.coloresNiveles,
      iconosNiveles: costeo.tipoCosteo.iconosNiveles,
      nivelConDireccion: costeo.tipoCosteo.nivelConDireccion,
      lineaEtiqueta: costeo.tipoCosteo.lineaEtiqueta,
      baseEvaluacion: costeo.tipoCosteo.baseEvaluacion as 'MENSUAL' | 'GLOBAL',
      manejoPlazo: costeo.tipoCosteo.manejoPlazo as 'LIBRE' | 'FIJO' | 'NO_APLICA',
      fijarPlazo: costeo.tipoCosteo.fijarPlazo,
    } : undefined,
    nodos,
    recursos,
  };

  return (
    <CosteoProvider initialProyecto={dbProyecto}>
      {/* Negamos el padding del layout (p-6) y restamos el alto del header (h-14 = 56px) para evitar el scroll global */}
      <div className="flex h-[calc(100vh-56px)] w-[calc(100%+3rem)] -m-6 bg-slate-50 overflow-hidden text-slate-900">
        <CosteoBuilderLayout />
      </div>
    </CosteoProvider>
  );
}

import React from 'react';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CosteoProvider } from '@/lib/context/CosteoContext';
import CosteoBuilderLayout from '@/components/costeos/CosteoBuilderLayout';
import { ProyectoCosteo } from '@/lib/types/costeos';

export default async function CosteoBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const resolvedParams = await params
  const costeoId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(costeoId)) {
    redirect('/costeos');
  }

  // Cargar el Costeo y sus relaciones principales
  const costeo = await prisma.costeo.findUnique({
    where: { id: costeoId },
    include: {
      tipoCosteo: true,
      contrato: {
        include: {
          cliente: true,
          sitios: {
            include: {
              puestos: {
                include: {
                  recursos: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!costeo) {
    redirect('/costeos');
  }

  // Convertir a la interfaz de estado (ProyectoCosteo)
  const dbProyecto: ProyectoCosteo = {
    id: costeo.id.toString(),
    empresaId: costeo.contrato.empresaId,
    cliente: {
      id: costeo.contrato.cliente.id.toString(),
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
      nivel1Activo: costeo.tipoCosteo.nivel1Activo,
      nivel1Etiqueta: costeo.tipoCosteo.nivel1Etiqueta,
      nivel1ConDireccion: costeo.tipoCosteo.nivel1ConDireccion,
      nivel2Activo: costeo.tipoCosteo.nivel2Activo,
      nivel2Etiqueta: costeo.tipoCosteo.nivel2Etiqueta,
      recursosEtiqueta: costeo.tipoCosteo.recursosEtiqueta,
    } : undefined,
    sitios: costeo.contrato.sitios.map(s => ({
      id: s.id.toString(),
      nombre: s.nombre,
      codigo: s.codigo || undefined,
      direccion: s.direccion || '',
      pais: s.pais || '',
      departamento: s.departamento || '',
      municipio: s.municipio || '',
      latitud: s.latitud ? Number(s.latitud) : undefined,
      longitud: s.longitud ? Number(s.longitud) : undefined,
      recursosSinPuesto: [], // En la base de datos actual todo recurso pertenece a un puesto. Si en el futuro agregamos recursos a nivel sitio, se cargarían aquí.
      puestos: s.puestos.map(p => ({
        id: p.id.toString(),
        nombre: p.nombre,
        turnoCodigo: p.turnoCodigo ?? (p.codigo ? parseInt(p.codigo, 10) : undefined),
        uniformeCodigo: p.uniformeCodigo ?? undefined,
        cubreDescanso: p.cubreDescanso,
        personas: p.personas,
        horasSemana: p.horasSemana,
        recursos: p.recursos.map(r => ({
          id: r.id.toString(),
          erpItemId: r.erpItemId,
          nombre: r.itemNombre,
          categoria: r.itemTipo as any, // CategoriaItem
          tipoCosto: r.itemTipoCosto as any,
          cantidad: r.cantidad,
          costoUnitario: Number(r.costoUnitarioErp || 0),
          precioVentaUnitario: r.precioVenta ? Number(r.precioVenta) : undefined,
          precioVentaOrigen: r.precioVentaOrigen as 'LISTA' | 'MANUAL',
          recetas: [], // TODO: cargar recetas si se guardan en la bd o recalcularlas
        }))
      }))
    })),
  };

  return (
    <CosteoProvider initialProyecto={dbProyecto}>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
        <CosteoBuilderLayout />
      </div>
    </CosteoProvider>
  );
}

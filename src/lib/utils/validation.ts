import { ProyectoCosteo, SitioCosteo, PuestoCosteo, RecursoCosteo } from '@/lib/types/costeos';

export type NodeType = 'PROYECTO' | 'SITIO' | 'PUESTO' | 'RECURSO';

export function isNodeValid(nodeData: any, type: NodeType): boolean {
  if (!nodeData) return false;

  switch (type) {
    case 'PROYECTO':
      return !!nodeData.nombreProyecto?.trim();

    case 'SITIO':
      return !!(
        nodeData.nombre?.trim() &&
        nodeData.direccion?.trim() &&
        nodeData.departamento &&
        nodeData.municipio
      );

    case 'PUESTO':
      return !!(
        nodeData.nombre?.trim() &&
        nodeData.turnoCodigo !== undefined &&
        nodeData.uniformeCodigo?.trim()
      );

    case 'RECURSO':
      return (
        typeof nodeData.cantidad === 'number' && nodeData.cantidad > 0 &&
        typeof nodeData.costoUnitario === 'number' && nodeData.costoUnitario >= 0
      );

    default:
      return true;
  }
}

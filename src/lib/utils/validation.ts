import { ProyectoCosteo, NodoCosteo, RecursoCosteo } from '@/lib/types/costeos';

export type NodeType = 'PROYECTO' | 'NODO' | 'RECURSO';

export function isNodeValid(nodeData: any, type: NodeType, options?: { hasDireccion?: boolean }): boolean {
  if (!nodeData) return false;

  switch (type) {
    case 'PROYECTO':
      return !!nodeData.nombreProyecto?.trim();

    case 'NODO':
      if (options?.hasDireccion === false) {
        return !!nodeData.nombre?.trim();
      }
      return !!(
        nodeData.nombre?.trim() &&
        nodeData.direccion?.trim() &&
        nodeData.departamento &&
        nodeData.municipio
      );

    case 'RECURSO':
      const validBase = typeof nodeData.cantidad === 'number' && nodeData.cantidad > 0 &&
                        typeof nodeData.costoUnitario === 'number' && nodeData.costoUnitario >= 0;
      
      if (nodeData.categoria === 'RECURSO_HUMANO') {
        return validBase && nodeData.turnoCodigo !== undefined && !!nodeData.uniformeCodigo?.trim();
      }
      return validBase;

    default:
      return true;
  }
}

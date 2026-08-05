"use client";

import React from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { 
  MapPin, Briefcase, User, Box, Shield, Monitor, FileText, AlertTriangle,
  Building, Users, Layers, Component, Folder, ListTree, Tags, Network, Hash,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { CategoriaItem, NodoCosteo, RecursoCosteo } from '@/lib/types/costeos';

const ICON_COMPONENTS: Record<string, React.ElementType> = {
  Building, MapPin, Briefcase, Users, Layers, Shield,
  Box, Component, Folder, ListTree, Tags, Network, Hash
};
import { AddNodeDialog } from './modals/AddNodeDialog';
import { isNodeValid } from '@/lib/utils/validation';

export default function TreeViewSidebar() {
  const { proyecto, selectedNode, dispatch } = useCosteo();
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});

  if (!proyecto) return null;

  const tc = proyecto.tipoCosteo;
  const maxNiveles = tc?.cantidadNiveles ?? 2;
  const etiquetas = tc?.etiquetasNiveles ? tc.etiquetasNiveles.split(',') : [];
  const colores = tc?.coloresNiveles?.split(',') || [];
  const iconos = tc?.iconosNiveles?.split(',') || [];
  const lblR = tc?.lineaEtiqueta || 'Líneas';

  const handleSelectNode = (type: 'NODO' | 'RECURSO' | 'PROYECTO', id: string) => {
    dispatch({ type: 'SELECT_NODE', payload: { type, id } });
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const isExpanded = (id: string) => expandedNodes[id] !== false;

  const getIconForCategory = (categoria: CategoriaItem) => {
    switch (categoria) {
      case 'RECURSO_HUMANO': return <User className="w-3.5 h-3.5 text-blue-600" />;
      case 'EQUIPO': return <Monitor className="w-3.5 h-3.5 text-purple-600" />;
      case 'ARTICULO': return <Box className="w-3.5 h-3.5 text-orange-600" />;
      case 'SERVICIO': return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      default: return <Box className="w-3.5 h-3.5" />;
    }
  };

  const renderRecursos = (recursos: RecursoCosteo[]) => {
    if (!recursos || recursos.length === 0) return null;
    return (
      <div className="ml-3 border-l border-slate-200 pl-2 space-y-0.5 pb-1">
        {recursos.map(recurso => (
          <div 
            key={recurso.id}
            className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer ${selectedNode?.id === recurso.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100 text-slate-500'}`}
            onClick={() => handleSelectNode('RECURSO', recurso.id)}
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              {getIconForCategory(recurso.categoria)}
              <span className="truncate text-xs">{recurso.nombre}</span>
            </div>
            <div className="flex items-center gap-1">
              {!isNodeValid(recurso, 'RECURSO') && (
                <div title="Falta información requerida">
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                </div>
              )}
              {recurso.cantidad > 1 && (
                <span className="text-[10px] bg-slate-200 px-1 rounded font-medium text-slate-600 shrink-0">x{recurso.cantidad}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderNodos = (nodos: NodoCosteo[], nivelActual: number) => {
    if (!nodos || nodos.length === 0) return null;
    
    const idx = nivelActual - 1;
    const colorClass = colores[idx] || 'bg-blue-50 text-blue-700';
    const textMatch = colorClass.match(/text-[a-z]+-[0-9]+/);
    const textColor = textMatch ? textMatch[0] : 'text-slate-400';
    
    const IconName = iconos[idx] || (nivelActual === 1 ? 'MapPin' : 'Shield');
    const IconComponent = ICON_COMPONENTS[IconName] || MapPin;

    // Sort nodes by creation order or id (if needed, here we just map)
    return (
      <div className="ml-3 border-l border-slate-200 pl-2 space-y-1">
        {nodos.map(nodo => {
          const hasChildren = (nodo.nodos && nodo.nodos.length > 0) || (nodo.recursos && nodo.recursos.length > 0);
          const expanded = isExpanded(nodo.id);
          
          return (
            <div key={nodo.id} className="space-y-1">
              <div 
                className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer group ${selectedNode?.id === nodo.id ? `${colorClass} font-medium` : 'hover:bg-slate-100 text-slate-600'}`}
                onClick={() => handleSelectNode('NODO', nodo.id)}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {hasChildren ? (
                    <div onClick={(e) => toggleExpand(e, nodo.id)} className="p-0.5 hover:bg-slate-200 rounded text-slate-400">
                      {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  ) : (
                    <div className="w-[18px] h-[18px] flex-shrink-0" />
                  )}
                  <IconComponent className={`w-3.5 h-3.5 shrink-0 ${selectedNode?.id === nodo.id ? 'opacity-100' : textColor}`} />
                  <span className="truncate text-[13px]">{nodo.nombre || `Nuevo ${etiquetas[idx] || `Nivel ${nivelActual}`}`}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!isNodeValid(nodo, 'NODO', { hasDireccion: tc?.nivelConDireccion === nivelActual }) && (
                    <div title="Falta información requerida">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    </div>
                  )}
                  {/* Si estamos en el último nivel (maxNiveles), el siguiente es agregar un recurso (Línea) */}
                  {/* Si no, agregamos un nodo de nivelActual + 1 */}
                  <AddNodeDialog 
                    level={nivelActual >= maxNiveles ? maxNiveles + 1 : nivelActual + 1} 
                    parentId={nodo.id} 
                    parentName={nodo.nombre} 
                  />
                </div>
              </div>
              
              {/* Hijos */}
              {expanded && (
                <>
                  {renderNodos(nodo.nodos, nivelActual + 1)}
                  {renderRecursos(nodo.recursos)}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex justify-between items-center bg-slate-100/50 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estructura del Proyecto</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
        {/* Raíz del Proyecto */}
        <div 
          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer group ${selectedNode?.id === proyecto.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100 text-slate-700'}`}
          onClick={() => handleSelectNode('PROYECTO', proyecto.id)}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">{proyecto.nombreProyecto || 'Sin Nombre'}</span>
          </div>
          <div className="flex items-center gap-1">
            {!isNodeValid(proyecto, 'PROYECTO') && (
              <div title="Falta información requerida">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              </div>
            )}
            <AddNodeDialog level={1} parentId={proyecto.id} parentName={proyecto.nombreProyecto} />
          </div>
        </div>

        {/* Nodos del Proyecto */}
        <div className="ml-2 border-l border-slate-200 pl-2 mt-1 space-y-1">
          {/* Líneas directas de la raíz */}
          {proyecto.recursos && proyecto.recursos.length > 0 && (
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lblR} (Directas)</span>
              </div>
              {renderRecursos(proyecto.recursos)}
            </div>
          )}

          {/* Nodos (Empezando desde Nivel 1) */}
          {renderNodos(proyecto.nodos, 1)}
        </div>
      </div>
    </div>
  );
}

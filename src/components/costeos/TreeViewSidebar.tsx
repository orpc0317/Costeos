"use client";

import React from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { MapPin, Briefcase, User, Box, Shield, Monitor, FileText, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import { CategoriaItem } from '@/lib/types/costeos';
import { AddNodeDialog } from './modals/AddNodeDialog';
import { isNodeValid } from '@/lib/utils/validation';

export default function TreeViewSidebar() {
  const { proyecto, selectedNode, dispatch } = useCosteo();

  if (!proyecto) return null;

  const handleSelectNode = (type: 'SITIO' | 'PUESTO' | 'RECURSO' | 'PROYECTO', id: string) => {
    dispatch({ type: 'SELECT_NODE', payload: { type, id } });
  };

  const getIconForCategory = (categoria: CategoriaItem) => {
    switch (categoria) {
      case 'RECURSO_HUMANO': return <User className="w-3.5 h-3.5 text-blue-600" />;
      case 'EQUIPO': return <Monitor className="w-3.5 h-3.5 text-purple-600" />;
      case 'ARTICULO': return <Box className="w-3.5 h-3.5 text-orange-600" />;
      case 'SERVICIO': return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      default: return <Box className="w-3.5 h-3.5" />;
    }
  };

  const tc = proyecto.tipoCosteo;
  const hasN1 = tc?.nivel1Activo ?? true;
  const hasN2 = tc?.nivel2Activo ?? true;
  const lblN1 = tc?.nivel1Etiqueta || 'Sitio';
  const lblN2 = tc?.nivel2Etiqueta || 'Puesto';
  const lblR = tc?.lineaEtiqueta || 'Líneas';

  // Helper para renderizar los recursos (Nivel 3)
  const renderRecursos = (recursos: any[]) => {
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

  // Helper para renderizar los puestos (Nivel 2) y Líneas directas de Nivel 1
  const renderPuestos = (sitio: any) => {
    const n1DefaultPuesto = sitio.puestos.find((p: any) => p.nombre === 'DEFAULT');
    const n1Lines = n1DefaultPuesto?.recursos || [];
    const realPuestos = sitio.puestos.filter((p: any) => p.nombre !== 'DEFAULT');

    return (
      <div className="ml-3 border-l border-slate-200 pl-2 space-y-1">
        {/* Líneas directas del Nivel 1 */}
        {n1Lines.length > 0 && (
          <div className="mb-2 space-y-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lblR} (Directas)</span>
            </div>
            {renderRecursos(n1Lines)}
          </div>
        )}

        {/* Nivel 2 (Puestos) */}
        {hasN2 && realPuestos.map((puesto: any) => (
          <div key={puesto.id} className="space-y-1">
            <div 
              className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer group ${selectedNode?.id === puesto.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100 text-slate-600'}`}
              onClick={() => handleSelectNode('PUESTO', puesto.id)}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Shield className={`w-3.5 h-3.5 shrink-0 ${selectedNode?.id === puesto.id ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate text-[13px]">{puesto.nombre || `Nuevo ${lblN2}`}</span>
              </div>
              <div className="flex items-center gap-1">
                {!isNodeValid(puesto, 'PUESTO') && (
                  <div title="Falta información requerida">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  </div>
                )}
                <AddNodeDialog level={3} sitioId={sitio.id} puestoId={puesto.id} parentName={puesto.nombre} />
              </div>
            </div>
            {renderRecursos(puesto.recursos)}
          </div>
        ))}
      </div>
    );
  };

  const rootDefaultSitio = proyecto.sitios.find(s => s.nombre === 'DEFAULT');
  const rootLines = rootDefaultSitio?.puestos.find(p => p.nombre === 'DEFAULT')?.recursos || [];
  const realSitios = proyecto.sitios.filter(s => s.nombre !== 'DEFAULT');

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
            {/* El modal de Raíz se encarga de saber si agrega Nivel 1 o Línea */}
            <AddNodeDialog level={hasN1 ? 1 : 3} />
          </div>
        </div>

        {/* Nodos del Proyecto */}
        <div className="ml-2 border-l border-slate-200 pl-2 mt-1 space-y-1">
          {/* 1. Líneas directas de la raíz */}
          {rootLines.length > 0 && (
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lblR} (Directas)</span>
              </div>
              {renderRecursos(rootLines)}
            </div>
          )}

          {/* 2. Nivel 1 (Sitios) */}
          {hasN1 && realSitios.map(sitio => (
            <div key={sitio.id} className="space-y-1">
              <div 
                className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer group ${selectedNode?.id === sitio.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100 text-slate-700'}`}
                onClick={() => handleSelectNode('SITIO', sitio.id)}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <MapPin className={`w-4 h-4 shrink-0 ${selectedNode?.id === sitio.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{sitio.nombre || `Nuevo ${lblN1}`}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!isNodeValid(sitio, 'SITIO', { hasDireccion: tc?.nivel1ConDireccion ?? true }) && (
                    <div title="Falta información requerida">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mr-1" />
                    </div>
                  )}
                  {/* El modal de Puesto se encarga de agregar Nivel 2 o Línea */}
                  <AddNodeDialog level={hasN2 ? 2 : 3} sitioId={sitio.id} parentName={sitio.nombre} />
                </div>
              </div>
              {renderPuestos(sitio)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

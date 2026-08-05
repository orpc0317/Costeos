"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { NumericInput } from '@/components/ui/numeric-input';
import { normalizeText } from '@/lib/utils/text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDepartamentos, getMunicipios, UbicacionItem } from '@/app/actions/ubicaciones';
import { getTurnos, getUniformes, getBonos, TurnoItem, UniformeItem, BonoItem } from '@/app/actions/puestos';
import { getClienteDireccionesOperativas, DireccionOperativa } from '@/app/actions/ubicaciones';
import { AddressLookupModal } from './modals/AddressLookupModal';
import { Search } from 'lucide-react';
import { MapPin, Settings2, Calculator, Trash2, CornerUpRight } from 'lucide-react';
import { RecursosSummaryTable } from './RecursosSummaryTable';
import { ConfirmDeleteDialog } from './modals/ConfirmDeleteDialog';
import { MoveNodeDialog } from './modals/MoveNodeDialog';
import { TurnoCard } from './TurnoCard';
import { NodoCosteo, RecursoCosteo } from '@/lib/types/costeos';

const OPCIONES_CUBRE_DESCANSO = [
  { value: '0', label: '0 - No Aplica' },
  { value: '1', label: '1 - Descansero' },
  { value: '2', label: '2 - Extrero' },
  { value: '3', label: '3 - Bono Descanso' }
];

export default function EditorPanel() {
  const { proyecto, selectedNode, dispatch } = useCosteo();

  if (!proyecto) return null;

  if (!selectedNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
        <p>Selecciona un elemento en el árbol para editarlo</p>
      </div>
    );
  }

  const tc = proyecto.tipoCosteo;
  const maxNiveles = tc?.cantidadNiveles ?? 2;
  const etiquetas = tc?.etiquetasNiveles ? tc.etiquetasNiveles.split(',') : [];
  const lblR = tc?.lineaEtiqueta || 'Línea';

  let nodeData: any = null;
  let title = '';
  let parentId: string | null = null;
  let pathNames: string[] = [];
  
  // Buscar nodo recursivamente
  const findNodo = (nodos: NodoCosteo[], id: string, currentPath: string[]): NodoCosteo | null => {
    for (const n of nodos) {
      if (n.id === id) {
        pathNames = [...currentPath, n.nombre];
        return n;
      }
      const found = findNodo(n.nodos, id, [...currentPath, n.nombre]);
      if (found) return found;
    }
    return null;
  };

  const findParentOfNodo = (nodos: NodoCosteo[], targetId: string, currentParentId: string | null = null): string | null => {
    for (const n of nodos) {
      if (n.id === targetId) return currentParentId;
      const found = findParentOfNodo(n.nodos, targetId, n.id);
      if (found !== null) return found;
    }
    return null;
  };

  const findRecurso = (nodos: NodoCosteo[], id: string, currentPath: string[]): { recurso: RecursoCosteo, parentId: string } | null => {
    for (const n of nodos) {
      const r = n.recursos.find(rec => rec.id === id);
      if (r) {
        pathNames = [...currentPath, n.nombre];
        return { recurso: r, parentId: n.id };
      }
      const found = findRecurso(n.nodos, id, [...currentPath, n.nombre]);
      if (found) return found;
    }
    return null;
  };

  if (selectedNode.type === 'PROYECTO') {
    nodeData = proyecto;
    title = 'Configuración Proyecto';
  } else if (selectedNode.type === 'NODO') {
    const n = findNodo(proyecto.nodos, selectedNode.id, []);
    if (n) {
      nodeData = n;
      parentId = findParentOfNodo(proyecto.nodos, n.id, null);
      title = `Detalles ${etiquetas[n.nivel - 1] || `Nivel ${n.nivel}`}`;
    }
  } else if (selectedNode.type === 'RECURSO') {
    // Check in root first
    const rRoot = proyecto.recursos.find(r => r.id === selectedNode.id);
    if (rRoot) {
      nodeData = rRoot;
      parentId = null;
      title = `Detalle ${nodeData.nombre}`;
    } else {
      const res = findRecurso(proyecto.nodos, selectedNode.id, []);
      if (res) {
        nodeData = res.recurso;
        parentId = res.parentId;
        title = `Detalle ${nodeData.nombre}`;
      }
    }
  }

  if (!nodeData) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <p>Elemento no encontrado</p>
      </div>
    );
  }

  const handleChange = (field: string | Record<string, any>, value?: any) => {
    let data: Record<string, any> = {};
    if (typeof field === 'string') {
      let finalValue = value;
      if (typeof finalValue === 'string' && field !== 'id') {
        finalValue = normalizeText(finalValue);
      }
      data[field] = finalValue;
    } else {
      data = field;
    }
    
    if (selectedNode.type === 'PROYECTO') {
      dispatch({ type: 'UPDATE_PROYECTO', payload: data });
    } else if (selectedNode.type === 'NODO') {
      dispatch({ type: 'UPDATE_NODO', payload: { id: selectedNode.id, data } });
    } else if (selectedNode.type === 'RECURSO') {
      dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: selectedNode.id, data } });
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  const [bonosDisponibles, setBonosDisponibles] = useState<BonoItem[]>([]);
  const [selectedBonoId, setSelectedBonoId] = useState<string>('');
  const [selectedBonoPrecio, setSelectedBonoPrecio] = useState<number>(0);

  useEffect(() => {
    let active = true;
    if (proyecto?.empresaId) {
      getTurnos(proyecto.empresaId).then(data => { if (active) setTurnos(data); });
      getUniformes(proyecto.empresaId).then(data => { if (active) setUniformes(data); });
      getBonos().then(data => { if (active) setBonosDisponibles(data); });
    }
    return () => { active = false; };
  }, [proyecto?.empresaId]);

  const confirmDelete = () => {
    if (selectedNode.type === 'NODO') {
      dispatch({ type: 'REMOVE_NODO', payload: selectedNode.id });
    } else if (selectedNode.type === 'RECURSO') {
      dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: selectedNode.id } });
    }
    dispatch({ type: 'SELECT_NODE', payload: { type: 'PROYECTO', id: proyecto.id } });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          {pathNames.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              {pathNames.join(' > ')}
            </p>
          )}
          <p className="text-slate-500 mt-2 text-sm font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded">ID: {nodeData.id}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 overflow-hidden">
        
        {selectedNode.type === 'PROYECTO' && (
          <div className="p-6 pt-4 overflow-y-auto h-full w-full">
          <div className="max-w-4xl">
            <Tabs defaultValue="general" className="w-full">
              <TabsList variant="line" className="mb-4">
                <TabsTrigger value="general">
                  <Settings2 className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="resumen">
                  <Calculator className="w-4 h-4 mr-2" />
                  Resumen
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-3 outline-none min-h-[250px]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Proyecto</label>
                    <input 
                      type="text" 
                      className={`w-full border rounded-md p-2 outline-none transition-all ${!nodeData.nombreProyecto?.trim() ? 'border-red-400 focus:ring-2 focus:ring-red-400' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`} 
                      value={nodeData.nombreProyecto} 
                      onChange={(e) => handleChange('nombreProyecto', normalizeText(e.target.value))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plazo (meses)</label>
                    <NumericInput 
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white disabled:bg-slate-50" 
                      value={nodeData.plazoMeses}
                      isInteger={true}
                      disabled={nodeData.tipoCosteo?.manejoPlazo === 'FIJO' || nodeData.tipoCosteo?.manejoPlazo === 'NO_APLICA'}
                      onChange={(val) => handleChange('plazoMeses', val)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Overhead (%)</label>
                    <NumericInput 
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                      value={nodeData.porcentajeOverhead} 
                      onChange={(val) => handleChange('porcentajeOverhead', val)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contingencia (%)</label>
                    <NumericInput 
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                      value={nodeData.porcentajeContingencia} 
                      onChange={(val) => handleChange('porcentajeContingencia', val)} 
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="resumen" className="outline-none">
                {(() => {
                  const allRecursos: any[] = [];
                  const walk = (nodos: NodoCosteo[], path: string[]) => {
                    for (const n of nodos) {
                      const newPath = [...path, n.nombre];
                      n.recursos.forEach(r => allRecursos.push({ ...r, _path: newPath }));
                      walk(n.nodos, newPath);
                    }
                  };
                  proyecto.recursos.forEach(r => allRecursos.push({ ...r, _path: ['Proyecto'] }));
                  walk(proyecto.nodos, []);
                  return <RecursosSummaryTable recursos={allRecursos} />;
                })()}
              </TabsContent>
            </Tabs>
          </div>
          </div>
        )}

        {selectedNode.type === 'NODO' && (
          <div className="p-6 pt-4 overflow-y-auto h-full w-full">
          <NodoEditor 
            nodeData={nodeData} 
            handleChange={handleChange} 
            handleDelete={() => setIsDeleteDialogOpen(true)}
            tc={tc}
            etiquetas={etiquetas}
            proyecto={proyecto}
          />
          </div>
        )}

        {selectedNode.type === 'RECURSO' && (
          <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0 w-full">
            <div className="px-6 pt-4 shrink-0">
              <TabsList variant="line" className="mb-4">
                <TabsTrigger value="general">
                  <Settings2 className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                {nodeData.categoria === 'RECURSO_HUMANO' && (
                  <TabsTrigger value="bonos">
                    Bonos {(nodeData.bonos?.length || 0) > 0 && `(${nodeData.bonos.length})`}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            
            <TabsContent value="general" className="flex-1 overflow-y-auto px-6 pb-6 outline-none m-0">
              <div className="space-y-2 max-w-[460px]">
            {/* 1era fila solo Codigo y Descripcion */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4 flex flex-col gap-1.5">
                <Label>Código</Label>
                <Input type="text" className="bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-sm h-8 py-1" value={nodeData.itemServicio?.codigo || nodeData.erpItemId || 'N/A'} readOnly title="Código ERP" />
              </div>
              <div className="col-span-8 flex flex-col gap-1.5">
                <Label>Descripción</Label>
                <Input type="text" className="bg-slate-100 text-slate-500 cursor-not-allowed uppercase text-sm h-8 py-1" value={nodeData.nombre} readOnly title="No editable directamente" />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center mb-3 min-h-[24px]">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                  CONFIGURACION
                </h3>
                <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
              </div>
              
              {nodeData.categoria === 'RECURSO_HUMANO' ? (
                // RRHH layout (Turnos, etc)
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4 flex flex-col gap-1.5">
                    <Label>Cant. Turnos</Label>
                    <NumericInput 
                      className="flex h-8 w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100" 
                      value={nodeData.cantidad}
                      isInteger={true}
                      onChange={(val) => handleChange('cantidad', val || 1)} 
                      min="1"
                      disabled={proyecto?.estado !== 'BORRADOR'}
                    />
                  </div>
                  <div className="col-span-8 flex flex-col gap-1.5">
                    <Label>Turno</Label>
                    {proyecto?.estado === 'BORRADOR' ? (
                      <SearchableSelect
                        id="field-turno"
                        options={turnos.map(t => ({ value: String(t.codigo), label: t.descripcion }))}
                        value={nodeData.turnoCodigo !== undefined ? String(nodeData.turnoCodigo) : ''}
                        onChange={(val) => {
                          const code = parseInt(val, 10);
                          const t = turnos.find(x => x.codigo === code);
                          handleChange({
                            turnoCodigo: code,
                            personas: t?.personas || 1,
                            horasSemana: t?.totalHoras || 0
                          });
                        }}
                        placeholder="Seleccione..."
                      />
                    ) : (
                      <Input value={turnos.find(t => t.codigo === nodeData.turnoCodigo)?.descripcion || turnos.find(t => t.codigo === nodeData.turnoCodigo)?.nombre || `Cód: ${nodeData.turnoCodigo}`} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm uppercase h-8 py-1 px-2.5" />
                    )}
                  </div>
                </div>

                {nodeData.turnoCodigo && turnos.find(t => t.codigo === nodeData.turnoCodigo) && (
                  <TurnoCard turno={turnos.find(t => t.codigo === nodeData.turnoCodigo)!} cantidadTurnos={nodeData.cantidad || 1} />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Cubre Descanso</Label>
                    {proyecto?.estado === 'BORRADOR' ? (
                      <SearchableSelect
                        id="field-cubreDescanso"
                        options={OPCIONES_CUBRE_DESCANSO}
                        value={String(nodeData.cubreDescanso || 0)}
                        onChange={(val) => handleChange('cubreDescanso', parseInt(val, 10))}
                        placeholder="Seleccione..."
                      />
                    ) : (
                      <Input value={
                        nodeData.cubreDescanso === 1 ? '1 - Descansero' :
                        nodeData.cubreDescanso === 2 ? '2 - Extrero' :
                        nodeData.cubreDescanso === 3 ? '3 - Bono Descanso' : '0 - No Aplica'
                      } readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm h-8 py-1 px-2.5" />
                    )}
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Uniforme</Label>
                    {proyecto?.estado === 'BORRADOR' ? (
                      <SearchableSelect
                        id="field-uniforme"
                        options={uniformes.map(u => ({ value: u.codigo, label: u.descripcion }))}
                        value={nodeData.uniformeCodigo || ''}
                        onChange={(val) => handleChange('uniformeCodigo', val)}
                        placeholder="Seleccione..."
                      />
                    ) : (
                      <Input value={uniformes.find(u => u.codigo === nodeData.uniformeCodigo)?.descripcion || uniformes.find(u => u.codigo === nodeData.uniformeCodigo)?.nombre || `Cód: ${nodeData.uniformeCodigo}`} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm uppercase h-8 py-1 px-2.5" />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Estándar layout (Cantidad, Unidad Medida)
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Cantidad</Label>
                  <NumericInput 
                    className="flex h-8 w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100" 
                    value={nodeData.cantidad}
                    isInteger={true}
                    onChange={(val) => handleChange('cantidad', val || 1)} 
                    min="1"
                    disabled={proyecto?.estado !== 'BORRADOR'}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Unidad Medida</Label>
                  <Input value={nodeData.itemServicio?.unidad_medida || 'UNIDAD'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed uppercase text-sm h-8 py-1" />
                </div>
              </div>
            )}
            </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center mb-3 min-h-[24px]">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                  FINANCIERO
                </h3>
                <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Precio Venta ({proyecto?.moneda || 'Q'})</Label>
                  <NumericInput 
                    className="flex h-8 w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100" 
                    value={nodeData.precioVentaUnitario}
                    onChange={(val) => handleChange('precioVentaUnitario', val || 0)} 
                    min="0"
                    disabled={proyecto?.estado !== 'BORRADOR'}
                  />
                  {nodeData.categoria === 'RECURSO_HUMANO' && (
                    <p className="text-xs text-slate-500 italic">* Por Persona</p>
                  )}
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>SubTotal Venta</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * (nodeData.precioVentaUnitario || 0));
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Bonos Venta</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      const bonosTotal = (nodeData.bonos || []).reduce((sum: number, b: any) => sum + (b.precioVentaUnitario || 0), 0);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * bonosTotal);
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Total Venta</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      const subtotal = factor * (nodeData.precioVentaUnitario || 0);
                      const bonosTotal = factor * (nodeData.bonos || []).reduce((sum: number, b: any) => sum + (b.precioVentaUnitario || 0), 0);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(subtotal + bonosTotal);
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-blue-50/50 text-blue-700 font-bold border-blue-200 text-sm px-2.5 h-8 py-1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Costo Un. ({proyecto?.moneda || 'Q'})</Label>
                  <Input 
                    value={(nodeData.costoUnitario || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>SubTotal Costo</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * (nodeData.costoUnitario || 0));
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Bonos Costo</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      const bonosTotal = (nodeData.bonos || []).reduce((sum: number, b: any) => sum + (b.costoUnitario || 0), 0);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * bonosTotal);
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Total Costo</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      const subtotal = factor * (nodeData.costoUnitario || 0);
                      const bonosTotal = factor * (nodeData.bonos || []).reduce((sum: number, b: any) => sum + (b.costoUnitario || 0), 0);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(subtotal + bonosTotal);
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-red-50/50 text-red-600 font-bold border-red-200 text-sm px-2.5 h-8 py-1" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-[460px] mt-4">
            {nodeData.recetas && nodeData.recetas.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Recetas Asociadas</h3>
                {nodeData.recetas.map((receta: any) => (
                  <div key={receta.id} className="border rounded-md mb-4 bg-white overflow-hidden shadow-sm">
                    <div className="bg-slate-100 p-2 font-medium border-b text-sm">
                      {receta.nombre}
                    </div>
                    <div className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium">Item</th>
                            <th className="text-right py-2 px-3 font-medium">Cant. Base</th>
                            <th className="text-right py-2 px-3 font-medium">Costo Un.</th>
                            <th className="text-right py-2 px-3 font-medium">Costo Tot.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receta.items.map((item: any) => (
                            <tr key={item.id} className="border-t">
                              <td className="py-2 px-3">{item.nombre}</td>
                              <td className="py-2 px-3 text-right">{item.cantidad}</td>
                              <td className="py-2 px-3 text-right text-slate-600">{item.costoUnitario.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-red-600 font-medium">{(item.cantidad * item.costoUnitario * nodeData.cantidad).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </TabsContent>

          {nodeData.categoria === 'RECURSO_HUMANO' && (
            <TabsContent value="bonos" className="flex-1 overflow-y-auto px-6 pb-6 outline-none m-0">
              <div className="space-y-4 pt-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Label>Seleccionar Bono</Label>
                    <SearchableSelect
                      options={bonosDisponibles.map(b => ({ value: b.codigo, label: b.descripcion }))}
                      value={selectedBonoId}
                      onChange={(val) => setSelectedBonoId(val)}
                      placeholder="Seleccione..."
                    />
                  </div>
                  <div className="w-32 flex flex-col gap-1.5">
                    <Label>Precio Venta</Label>
                    <NumericInput
                      value={selectedBonoPrecio}
                      onChange={(val: number | undefined) => setSelectedBonoPrecio(val || 0)}
                      min="0"
                      className="flex h-8 w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => {
                      if (!selectedBonoId) return;
                      const bonoItem = bonosDisponibles.find(b => b.codigo === selectedBonoId);
                      if (bonoItem) {
                        const newBonos = [...(nodeData.bonos || []), {
                          id: crypto.randomUUID(),
                          erpBonoId: bonoItem.codigo,
                          nombre: bonoItem.descripcion,
                          costoUnitario: bonoItem.costo,
                          precioVentaUnitario: selectedBonoPrecio
                        }];
                        handleChange('bonos', newBonos);
                        setSelectedBonoId('');
                        setSelectedBonoPrecio(0);
                      }
                    }}
                    disabled={!selectedBonoId || proyecto?.estado !== 'BORRADOR'}
                  >
                    Agregar
                  </Button>
                </div>
                
                {(nodeData.bonos || []).length > 0 ? (
                  <div className="border rounded-md overflow-hidden bg-white">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                        <tr>
                          <th className="px-3 py-2">Bono</th>
                          <th className="px-3 py-2 text-right">Costo Un.</th>
                          <th className="px-3 py-2 text-right text-slate-700 font-semibold bg-slate-100">SubTotal Costo</th>
                          <th className="px-3 py-2 text-right">Venta Un.</th>
                          <th className="px-3 py-2 text-right text-blue-700 font-semibold bg-blue-50/50">SubTotal Venta</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(nodeData.bonos || []).map((b: any, idx: number) => {
                          const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                          const costoTotal = (b.costoUnitario || 0) * factor;
                          const ventaTotal = (b.precioVentaUnitario || 0) * factor;
                          return (
                            <tr key={idx} className="bg-white hover:bg-slate-50">
                              <td className="px-3 py-2">{b.nombre}</td>
                              <td className="px-3 py-2 text-right text-slate-500">{b.costoUnitario.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                              <td className="px-3 py-2 text-right text-slate-700 font-semibold bg-slate-100">{costoTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                              <td className="px-3 py-2 text-right text-slate-500">{(b.precioVentaUnitario || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                              <td className="px-3 py-2 text-right text-blue-700 font-semibold bg-blue-50/50">{ventaTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                              <td className="px-3 py-2 text-center">
                                <button 
                                  type="button" 
                                  className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50" 
                                  disabled={proyecto?.estado !== 'BORRADOR'}
                                  onClick={() => {
                                    const newBonos = (nodeData.bonos || []).filter((_: any, i: number) => i !== idx);
                                    handleChange('bonos', newBonos);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 border border-dashed rounded-md bg-slate-50">
                    No hay bonos agregados
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
        )}

      </div>
      
      {selectedNode.type !== 'PROYECTO' && (
        <div className="flex flex-row items-center justify-between px-6 py-4 border-t bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            {!(selectedNode.type === 'NODO' && nodeData?.nivel === 1) && (
              <Button 
                variant="outline"
                onClick={() => setIsMoveModalOpen(true)}
                className="text-slate-700"
              >
                <CornerUpRight className="w-4 h-4 mr-2" />
                Mover
              </Button>
            )}
            <Button 
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        onConfirm={confirmDelete} 
        nodeName={nodeData.nombre || 'Sin nombre'} 
        nodeType={
          selectedNode.type === 'NODO' ? (etiquetas[nodeData.nivel - 1] || 'Nodo') : lblR
        }
      />

      <MoveNodeDialog
        open={isMoveModalOpen}
        onOpenChange={setIsMoveModalOpen}
        itemToMove={nodeData && selectedNode.type !== 'PROYECTO' ? { id: selectedNode.id, type: selectedNode.type as 'NODO' | 'RECURSO', nivel: nodeData.nivel || 999, nombre: nodeData.nombre } : null}
      />
    </div>
  );
}

function NodoEditor({ nodeData, handleChange, handleDelete, tc, etiquetas, proyecto }: { nodeData: NodoCosteo, handleChange: (field: string | Record<string, any>, value?: any) => void, handleDelete: () => void, tc: any, etiquetas: string[], proyecto: any }) {
  const [departamentos, setDepartamentos] = useState<UbicacionItem[]>([]);
  const [municipios, setMunicipios] = useState<UbicacionItem[]>([]);
  const [loadingDeptos, setLoadingDeptos] = useState(true);
  const [loadingMunis, setLoadingMunis] = useState(false);
  const [direccionesOperativas, setDireccionesOperativas] = useState<DireccionOperativa[]>([]);
  const [loadingDirecciones, setLoadingDirecciones] = useState(false);
  const [showAddressLookup, setShowAddressLookup] = useState<boolean>(false);
  
  const hasDireccion = tc?.nivelConDireccion === nodeData.nivel;
  const nombreEtiqueta = etiquetas[nodeData.nivel - 1] || `Nivel ${nodeData.nivel}`;
  
  // Si no tiene secuencia pero ya tiene texto, asumimos que está en modo "Nueva" (fue editada). Si está vacío, por defecto mostrar el selector.
  const [isNewAddress, setIsNewAddress] = useState<boolean>(!nodeData.direccionSecuencia && !!nodeData.direccion);

  useEffect(() => {
    let active = true;
    if (hasDireccion && proyecto?.empresaId && proyecto?.cliente?.id) {
      setLoadingDirecciones(true);
      const clienteErpId = parseInt(proyecto.cliente.codigo || proyecto.cliente.id, 10);
      getClienteDireccionesOperativas(proyecto.empresaId, clienteErpId).then(dirs => {
        if (active) {
          setDireccionesOperativas(dirs);
          setLoadingDirecciones(false);
        }
      });
    }
    return () => { active = false; };
  }, [hasDireccion, proyecto?.empresaId, proyecto?.cliente?.id]);

  const isDireccionEnUso = (secuencia: number) => {
    let inUse = false;
    const walk = (nodos: NodoCosteo[]) => {
      for (const n of nodos) {
        if (n.id !== nodeData.id && n.direccionSecuencia === secuencia) {
          inUse = true;
        }
        walk(n.nodos);
      }
    };
    walk(proyecto.nodos);
    return inUse;
  };

  const handleSelectDireccion = (secuenciaStr: string) => {
    if (secuenciaStr === 'NEW') {
      setIsNewAddress(true);
      handleChange({
        direccionSecuencia: undefined,
        direccion: '',
        pais: 'GT',
        departamento: '',
        municipio: ''
      });
      return;
    }
    
    const secuencia = parseInt(secuenciaStr, 10);
    if (isDireccionEnUso(secuencia)) {
      alert('Esta dirección ya está en uso en otro nivel del costeo.');
      return;
    }
    
    const dir = direccionesOperativas.find(d => d.secuencia === secuencia);
    if (dir) {
      setIsNewAddress(false);
      handleChange({
        nombre: dir.nombre,
        direccionSecuencia: dir.secuencia,
        direccion: dir.direccion,
        pais: dir.pais || 'GT',
        departamento: dir.departamento,
        municipio: dir.municipio
      });
    }
  };

  useEffect(() => {
    let active = true;
    if (hasDireccion) {
      const fetchDeptos = async () => {
        setLoadingDeptos(true);
        const data = await getDepartamentos('GT');
        if (active) {
          setDepartamentos(data);
          setLoadingDeptos(false);
          if (!nodeData.departamento && data.length > 0) {
            handleChange('departamento', data[0].codigo);
          }
        }
      };
      fetchDeptos();
      
      if (nodeData.pais !== 'GT') {
        handleChange('pais', 'GT');
      }
    } else {
      setLoadingDeptos(false);
    }
    return () => { active = false; };
  }, [hasDireccion]);

  useEffect(() => {
    let active = true;
    if (!hasDireccion || !nodeData.departamento) {
      setMunicipios([]);
      return;
    }
    
    const fetchMunis = async () => {
      setLoadingMunis(true);
      const data = await getMunicipios('GT', nodeData.departamento!);
      if (active) {
        setMunicipios(data);
        setLoadingMunis(false);
        const muniExists = data.find(m => {
          const code1 = String(m.codigo).trim();
          const code2 = String(nodeData.municipio || '').trim();
          if (code1 === code2) return true;
          const num1 = parseInt(code1, 10);
          const num2 = parseInt(code2, 10);
          return !isNaN(num1) && !isNaN(num2) && num1 === num2;
        });
        
        if (!muniExists && data.length > 0) {
          handleChange('municipio', String(data[0].codigo));
        }
      }
    };
    fetchMunis();
    
    return () => { active = false; };
  }, [nodeData.departamento, hasDireccion]);

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="general" className="w-full">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="general">
            <Settings2 className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="resumen">
            <Calculator className="w-4 h-4 mr-2" />
            Resumen
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-3 outline-none min-h-[250px]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Nombre</Label>
              <Input 
                className="uppercase"
                value={nodeData.nombre || ''} 
                onChange={(e) => handleChange('nombre', normalizeText(e.target.value))} 
                maxLength={hasDireccion ? 20 : undefined}
                readOnly={hasDireccion && !isNewAddress}
                title={hasDireccion && !isNewAddress ? "El nombre proviene de la dirección operativa seleccionada" : undefined}
              />

            </div>
            
              {hasDireccion && (
                <div className="pt-4 border-t mt-4 col-span-2">
                  <div className="flex items-center mb-3">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                      Direccion
                    </h3>
                    <div className="flex-1 border-t border-blue-200 mx-3 mt-0.5"></div>
                    {!isNewAddress ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleSelectDireccion('NEW')} className="text-blue-600 h-6 text-xs px-2">
                        + Crear Nueva
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsNewAddress(false)} className="text-blue-600 h-6 text-xs px-2">
                        <Search className="mr-1.5 h-3.5 w-3.5" /> Buscar Existente
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {!isNewAddress && (
                      <div className="space-y-1.5 col-span-2">
                        <Label>Seleccionar Dirección</Label>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const selectedAddr = direccionesOperativas.find(d => d.secuencia === nodeData.direccionSecuencia);
                            return (
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full justify-start text-left font-normal" 
                                disabled={loadingDirecciones}
                                onClick={() => setShowAddressLookup(true)}
                              >
                                <Search className="mr-2 h-4 w-4" />
                                {loadingDirecciones ? "Cargando direcciones..." : selectedAddr ? selectedAddr.nombre : "Buscar dirección..."}
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 col-span-2">
                      <Label>Dirección</Label>
                      <Input 
                        className="uppercase"
                        value={nodeData.direccion || ''} 
                        onChange={(e) => handleChange('direccion', normalizeText(e.target.value))} 
                        readOnly={!isNewAddress}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-1">
                      <Label>País</Label>
                      <SearchableSelect
                        options={[{ value: 'GT', label: 'GUATEMALA' }]}
                        value={nodeData.pais || 'GT'}
                        onChange={() => {}}
                        disabled={true}
                      />
                    </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>
                    Departamento {loadingDeptos && <span className="text-xs text-slate-400">(cargando...)</span>}
                  </Label>
                  <SearchableSelect
                    options={departamentos.map(d => ({ value: d.codigo, label: d.nombre }))}
                    value={nodeData.departamento || ''}
                    onChange={(val) => handleChange('departamento', val)}
                    disabled={loadingDeptos || !isNewAddress}
                    placeholder="Seleccione un departamento"
                    error={!nodeData.departamento}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>
                    Municipio {loadingMunis && <span className="text-xs text-slate-400">(cargando...)</span>}
                  </Label>
                  <SearchableSelect
                    options={municipios.map(m => ({ value: String(m.codigo), label: m.nombre }))}
                    value={String(nodeData.municipio || '')}
                    onChange={(val) => handleChange('municipio', val)}
                    disabled={loadingMunis || !isNewAddress || !nodeData.departamento}
                    placeholder="Seleccione un municipio"
                  />
                </div>
              </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="resumen" className="outline-none">
          {(() => {
            const allRecursos: any[] = [];
            const walk = (nodos: NodoCosteo[], path: string[]) => {
              for (const n of nodos) {
                const newPath = [...path, n.nombre];
                n.recursos.forEach(r => allRecursos.push({ ...r, _path: newPath }));
                walk(n.nodos, newPath);
              }
            };
            nodeData.recursos.forEach(r => allRecursos.push({ ...r, _path: [nodeData.nombre] }));
            walk(nodeData.nodos, [nodeData.nombre]);
            return <RecursosSummaryTable recursos={allRecursos} />;
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

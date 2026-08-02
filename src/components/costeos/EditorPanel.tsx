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
import { getTurnos, getUniformes, TurnoItem, UniformeItem } from '@/app/actions/puestos';
import { MapPin, Settings2, Calculator, Trash2 } from 'lucide-react';
import { RecursosSummaryTable } from './RecursosSummaryTable';
import { ConfirmDeleteDialog } from './modals/ConfirmDeleteDialog';
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
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);

  useEffect(() => {
    let active = true;
    if (proyecto?.empresaId) {
      getTurnos(proyecto.empresaId).then(data => { if (active) setTurnos(data); });
      getUniformes(proyecto.empresaId).then(data => { if (active) setUniformes(data); });
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
              <div className="flex items-center mb-3">
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
                  <div className="py-2">
                    <TurnoCard turno={turnos.find(t => t.codigo === nodeData.turnoCodigo)!} cantidadTurnos={nodeData.cantidad || 1} />
                  </div>
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

            <div className="pt-2">
              <div className="flex items-center mb-3">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                  FINANCIERO
                </h3>
                <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
              </div>

              <div className="grid grid-cols-3 gap-3">
               <div className="flex flex-col gap-1.5">
                <Label>Precio Venta ({proyecto?.moneda || 'Q'})</Label>
                <NumericInput 
                  className="flex h-8 w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100" 
                  value={nodeData.precioVentaUnitario}
                  onChange={(val) => handleChange('precioVentaUnitario', val || 0)} 
                  min="0"
                  disabled={proyecto?.estado !== 'BORRADOR'}
                />
               </div>
               <div className="flex flex-col gap-1.5">
                <Label>Total Venta ({proyecto?.moneda || 'Q'})</Label>
                <Input value={((nodeData.cantidad || 0) * (nodeData.precioVentaUnitario || 0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} readOnly className="bg-blue-50/50 text-blue-700 font-bold border-blue-200 text-sm px-2.5 h-8 py-1" />
               </div>
               <div className="flex flex-col gap-1.5">
                <Label>Total Costo ({proyecto?.moneda || 'Q'})</Label>
                <Input value={(0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" />
               </div>
            </div>
            </div>

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
        </Tabs>
        )}

      </div>
      
      {selectedNode.type !== 'PROYECTO' && (
        <div className="flex flex-row items-center justify-between px-6 py-4 border-t bg-slate-50 shrink-0">
          <Button 
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
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
    </div>
  );
}

function NodoEditor({ nodeData, handleChange, handleDelete, tc, etiquetas }: { nodeData: NodoCosteo, handleChange: (field: string, value: any) => void, handleDelete: () => void, tc: any, etiquetas: string[] }) {
  const [departamentos, setDepartamentos] = useState<UbicacionItem[]>([]);
  const [municipios, setMunicipios] = useState<UbicacionItem[]>([]);
  const [loadingDeptos, setLoadingDeptos] = useState(true);
  const [loadingMunis, setLoadingMunis] = useState(false);
  
  const hasDireccion = tc?.nivelConDireccion === nodeData.nivel;
  const nombreEtiqueta = etiquetas[nodeData.nivel - 1] || `Nivel ${nodeData.nivel}`;

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
        const muniExists = data.find(m => m.codigo === nodeData.municipio);
        if (!muniExists && data.length > 0) {
          handleChange('municipio', data[0].codigo);
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
              />
            </div>
            
            {hasDireccion && (
              <>
                <div className="col-span-2 pt-2 pb-1 border-b border-slate-200 flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">UBICACION</h3>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label>Dirección</Label>
                  <Input 
                    className="uppercase"
                    value={nodeData.direccion || ''} 
                    onChange={(e) => handleChange('direccion', normalizeText(e.target.value))} 
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
                    disabled={loadingDeptos}
                    placeholder="Seleccione un departamento"
                    error={!nodeData.departamento}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>
                    Municipio {loadingMunis && <span className="text-xs text-slate-400">(cargando...)</span>}
                  </Label>
                  <SearchableSelect
                    options={municipios.map(m => ({ value: m.codigo, label: m.nombre }))}
                    value={nodeData.municipio || ''}
                    onChange={(val) => handleChange('municipio', val)}
                    disabled={loadingMunis || !nodeData.departamento}
                    placeholder="Seleccione un municipio"
                    error={!nodeData.municipio}
                  />
                </div>
              </>
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

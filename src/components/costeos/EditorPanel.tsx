"use client";

import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { NumericInput } from '@/components/ui/numeric-input';
import { normalizeText } from '@/lib/utils/text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDepartamentos, getMunicipios, UbicacionItem } from '@/app/actions/ubicaciones';
import { getTurnos, getUniformes, TurnoItem, UniformeItem } from '@/app/actions/puestos';
import { MapPin, Briefcase } from 'lucide-react';
import { TurnoCard } from './TurnoCard';

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

  // Encontrar el nodo en el árbol y guardar IDs padres
  let nodeData: any = null;
  let title = '';
  let parentSitioId: string | null = null;
  let parentPuestoId: string | null = null;

  if (selectedNode.type === 'PROYECTO') {
    nodeData = proyecto;
    title = 'Configuración del Proyecto';
  } else if (selectedNode.type === 'SITIO') {
    nodeData = proyecto.sitios.find(s => s.id === selectedNode.id);
    parentSitioId = selectedNode.id;
    title = 'Detalles del Sitio';
  } else if (selectedNode.type === 'PUESTO') {
    for (const sitio of proyecto.sitios) {
      const puesto = sitio.puestos.find(p => p.id === selectedNode.id);
      if (puesto) {
        nodeData = puesto;
        parentSitioId = sitio.id;
        parentPuestoId = puesto.id;
        title = 'Detalles del Puesto';
        break;
      }
    }
  } else if (selectedNode.type === 'RECURSO') {
    for (const sitio of proyecto.sitios) {
      for (const puesto of sitio.puestos) {
        const recurso = puesto.recursos.find(r => r.id === selectedNode.id);
        if (recurso) {
          nodeData = recurso;
          parentSitioId = sitio.id;
          parentPuestoId = puesto.id;
          title = 'Detalles del Recurso';
          break;
        }
      }
      if (!nodeData) {
        const recursoSp = sitio.recursosSinPuesto.find(r => r.id === selectedNode.id);
        if (recursoSp) {
          nodeData = recursoSp;
          parentSitioId = sitio.id;
          parentPuestoId = null;
          title = 'Detalles del Recurso (Sin Puesto)';
          break;
        }
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

  // Handlers para interactividad
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
    } else if (selectedNode.type === 'SITIO' && parentSitioId) {
      dispatch({ type: 'UPDATE_SITIO', payload: { sitioId: parentSitioId, data } });
    } else if (selectedNode.type === 'PUESTO' && parentSitioId && parentPuestoId) {
      dispatch({ type: 'UPDATE_PUESTO', payload: { sitioId: parentSitioId, puestoId: parentPuestoId, data } });
    } else if (selectedNode.type === 'RECURSO' && parentSitioId) {
      dispatch({ 
        type: 'UPDATE_RECURSO', 
        payload: { 
          sitioId: parentSitioId, 
          puestoId: parentPuestoId, 
          recursoId: selectedNode.id, 
          data 
        } 
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <p className="text-slate-500 mt-1 text-sm font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded">ID: {nodeData.id}</p>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
        
        {selectedNode.type === 'PROYECTO' && (
          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
                <input 
                  type="text" 
                  className={`w-full border rounded-md p-2 outline-none transition-all ${!nodeData.nombreProyecto?.trim() ? 'border-red-400 focus:ring-2 focus:ring-red-400' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`} 
                  value={nodeData.nombreProyecto} 
                  onChange={(e) => handleChange('nombreProyecto', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plazo (meses)</label>
                <NumericInput 
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  value={nodeData.plazoMeses} 
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
          </div>
        )}

        {selectedNode.type === 'SITIO' && (
          <SitioEditor 
            nodeData={nodeData} 
            handleChange={handleChange} 
          />
        )}

        {selectedNode.type === 'PUESTO' && (
          <PuestoEditor 
            nodeData={nodeData} 
            handleChange={handleChange} 
          />
        )}

        {selectedNode.type === 'RECURSO' && (
          <div className="space-y-6 max-w-3xl">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Item / Recurso</label>
                <input type="text" className="w-full border rounded-md p-2 bg-slate-100 text-slate-500 cursor-not-allowed" value={nodeData.nombre} readOnly title="No editable directamente" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                <NumericInput 
                  className="w-full border rounded-md p-2 font-medium text-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  value={nodeData.cantidad} 
                  onChange={(val) => handleChange('cantidad', val)} 
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">{proyecto.moneda === 'GTQ' ? 'Q' : '$'}</span>
                  <NumericInput 
                    className="w-full border rounded-md p-2 pl-8 text-red-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" 
                    value={nodeData.costoUnitario} 
                    onChange={(val) => handleChange('costoUnitario', val)} 
                  />
                </div>
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio de Venta</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">{proyecto.moneda === 'GTQ' ? 'Q' : '$'}</span>
                  <NumericInput 
                    className="w-full border rounded-md p-2 pl-8 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
                    value={nodeData.precioVentaUnitario} 
                    onChange={(val) => handleChange('precioVentaUnitario', val)} 
                  />
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
        )}

      </div>
    </div>
  );
}

function SitioEditor({ nodeData, handleChange }: { nodeData: any, handleChange: (field: string, value: any) => void }) {
  const [departamentos, setDepartamentos] = useState<UbicacionItem[]>([]);
  const [municipios, setMunicipios] = useState<UbicacionItem[]>([]);
  const [loadingDeptos, setLoadingDeptos] = useState(true);
  const [loadingMunis, setLoadingMunis] = useState(false);

  // Cargar departamentos al inicio (País fijo a 'GT')
  useEffect(() => {
    let active = true;
    const fetchDeptos = async () => {
      setLoadingDeptos(true);
      const data = await getDepartamentos('GT');
      if (active) {
        setDepartamentos(data);
        setLoadingDeptos(false);
        // Regla 3: Autoseleccionar si está vacío
        if (!nodeData.departamento && data.length > 0) {
          handleChange('departamento', data[0].codigo);
        }
      }
    };
    fetchDeptos();
    
    // Si país no es GT, forzarlo
    if (nodeData.pais !== 'GT') {
      handleChange('pais', 'GT');
    }
    
    return () => { active = false; };
  }, []);

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    let active = true;
    if (!nodeData.departamento) {
      setMunicipios([]);
      return;
    }
    
    const fetchMunis = async () => {
      setLoadingMunis(true);
      const data = await getMunicipios('GT', nodeData.departamento);
      if (active) {
        setMunicipios(data);
        setLoadingMunis(false);
        // Si el municipio actual no está en la nueva lista, limpiarlo y autoseleccionar el primero
        const muniExists = data.find(m => m.codigo === nodeData.municipio);
        if (!muniExists && data.length > 0) {
          handleChange('municipio', data[0].codigo);
        }
      }
    };
    fetchMunis();
    
    return () => { active = false; };
  }, [nodeData.departamento]);

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4 outline-none">
          <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input 
            type="text" 
            className={`w-full border rounded-md p-2 outline-none transition-all uppercase ${!nodeData.nombre?.trim() ? 'border-red-400 focus:ring-2 focus:ring-red-400' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
            value={nodeData.nombre || ''} 
            onChange={(e) => handleChange('nombre', e.target.value)} 
          />
        </div>
        
        <div className="col-span-2 pt-4 pb-1 border-b border-slate-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">UBICACION</h3>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
          <input 
            type="text" 
            className={`w-full border rounded-md p-2 outline-none transition-all uppercase ${!nodeData.direccion?.trim() ? 'border-red-400 focus:ring-2 focus:ring-red-400' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
            value={nodeData.direccion} 
            onChange={(e) => handleChange('direccion', e.target.value)} 
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
          <SearchableSelect
            options={[{ value: 'GT', label: 'GUATEMALA' }]}
            value={nodeData.pais}
            onChange={(val) => handleChange('pais', val)}
            disabled={true}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Departamento {loadingDeptos && <span className="text-xs text-slate-400">(cargando...)</span>}
          </label>
          <SearchableSelect
            options={departamentos.map(d => ({ value: d.codigo, label: d.nombre }))}
            value={nodeData.departamento}
            onChange={(val) => handleChange('departamento', val)}
            disabled={loadingDeptos}
            placeholder="Seleccione un departamento"
            error={!nodeData.departamento}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Municipio {loadingMunis && <span className="text-xs text-slate-400">(cargando...)</span>}
          </label>
          <SearchableSelect
            options={municipios.map(m => ({ value: m.codigo, label: m.nombre }))}
            value={nodeData.municipio}
            onChange={(val) => handleChange('municipio', val)}
            disabled={loadingMunis || !nodeData.departamento}
            placeholder="Seleccione un municipio"
            error={!nodeData.municipio}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Latitud</label>
          <NumericInput 
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
            value={nodeData.latitud} 
            onChange={(val) => handleChange('latitud', val)} 
            placeholder="Ej: 14.6349"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Longitud</label>
          <NumericInput 
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
            value={nodeData.longitud} 
            onChange={(val) => handleChange('longitud', val)} 
            placeholder="Ej: -90.5069"
          />
        </div>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PuestoEditor({ nodeData, handleChange }: { nodeData: any, handleChange: (field: string, value: any) => void }) {
  const { proyecto } = useCosteo();
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!proyecto?.empresaId) return;
    
    const fetchData = async () => {
      setLoading(true);
      const [tData, uData] = await Promise.all([
        getTurnos(proyecto.empresaId),
        getUniformes(proyecto.empresaId)
      ]);
      if (active) {
        setTurnos(tData);
        setUniformes(uData);
        setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  const selectedTurno = turnos.find(t => t.codigo === nodeData.turnoCodigo);

  const diasSemana = [
    { label: 'L', name: 'lunes', val: selectedTurno?.lunes, hrs: selectedTurno?.lunes_horas },
    { label: 'M', name: 'martes', val: selectedTurno?.martes, hrs: selectedTurno?.martes_horas },
    { label: 'M', name: 'miercoles', val: selectedTurno?.miercoles, hrs: selectedTurno?.miercoles_horas },
    { label: 'J', name: 'jueves', val: selectedTurno?.jueves, hrs: selectedTurno?.jueves_horas },
    { label: 'V', name: 'viernes', val: selectedTurno?.viernes, hrs: selectedTurno?.viernes_horas },
    { label: 'S', name: 'sabado', val: selectedTurno?.sabado, hrs: selectedTurno?.sabado_horas },
    { label: 'D', name: 'domingo', val: selectedTurno?.domingo, hrs: selectedTurno?.domingo_horas },
  ];

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-6 outline-none">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input 
                type="text" 
                className={`w-full border rounded-md p-2 outline-none transition-all uppercase ${!nodeData.nombre?.trim() ? 'border-red-400 focus:ring-2 focus:ring-red-400' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                value={nodeData.nombre || ''} 
                onChange={(e) => handleChange('nombre', e.target.value)} 
              />
            </div>
            
            <div className="col-span-2 pt-2 pb-1 border-b border-slate-200 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Configuración</h3>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Turno {loading && <span className="text-xs text-slate-400">(cargando...)</span>}
              </label>
              <SearchableSelect
                options={turnos.map(t => ({ value: String(t.codigo), label: t.descripcion }))}
                value={nodeData.turnoCodigo !== undefined ? String(nodeData.turnoCodigo) : ''}
                onChange={(val) => {
                  const numVal = parseInt(val, 10);
                  const turnoSeleccionado = turnos.find(t => t.codigo === numVal);
                  let personas = 1;
                  let horasSemana = 0;
                  
                  if (turnoSeleccionado) {
                    personas = turnoSeleccionado.personas;
                    horasSemana = 
                      (turnoSeleccionado.lunes === 1 ? turnoSeleccionado.lunes_horas : 0) +
                      (turnoSeleccionado.martes === 1 ? turnoSeleccionado.martes_horas : 0) +
                      (turnoSeleccionado.miercoles === 1 ? turnoSeleccionado.miercoles_horas : 0) +
                      (turnoSeleccionado.jueves === 1 ? turnoSeleccionado.jueves_horas : 0) +
                      (turnoSeleccionado.viernes === 1 ? turnoSeleccionado.viernes_horas : 0) +
                      (turnoSeleccionado.sabado === 1 ? turnoSeleccionado.sabado_horas : 0) +
                      (turnoSeleccionado.domingo === 1 ? turnoSeleccionado.domingo_horas : 0);
                  }
                  
                  handleChange({
                    turnoCodigo: numVal,
                    personas,
                    horasSemana
                  });
                }}
                disabled={loading}
                placeholder="Seleccione..."
                error={nodeData.turnoCodigo === undefined}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Uniforme {loading && <span className="text-xs text-slate-400">(cargando...)</span>}
              </label>
              <SearchableSelect
                options={uniformes.map(u => ({ value: u.codigo, label: u.descripcion }))}
                value={nodeData.uniformeCodigo}
                onChange={(val) => handleChange('uniformeCodigo', val)}
                disabled={loading}
                placeholder="Seleccione..."
                error={!nodeData.uniformeCodigo}
              />
            </div>
          </div>

          {/* TARJETA VISUAL DE TURNO */}
          {selectedTurno && (
            <div className="mt-6">
              <TurnoCard turno={selectedTurno} />
            </div>
          )}

        </TabsContent>
      </Tabs>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { SitioCosteo } from '@/lib/types/costeos';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

import { normalizeText } from '@/lib/utils/text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getDepartamentos, getMunicipios, UbicacionItem } from '@/app/actions/ubicaciones';

export function AddSitioDialog() {
  const { dispatch } = useCosteo();
  const [open, setOpen] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');

  const [departamentos, setDepartamentos] = useState<UbicacionItem[]>([]);
  const [municipios, setMunicipios] = useState<UbicacionItem[]>([]);
  const [loadingDeptos, setLoadingDeptos] = useState(false);
  const [loadingMunis, setLoadingMunis] = useState(false);

  // Cargar departamentos al abrir el modal
  useEffect(() => {
    let active = true;
    if (open) {
      const fetchDeptos = async () => {
        setLoadingDeptos(true);
        const data = await getDepartamentos('GT');
        if (active) {
          setDepartamentos(data);
          setLoadingDeptos(false);
          if (data.length > 0) setDepartamento(data[0].codigo);
        }
      };
      fetchDeptos();
    } else {
      // Limpiar al cerrar
      setNombre('');
      setDireccion('');
      setDepartamento('');
      setMunicipio('');
    }
    return () => { active = false; };
  }, [open]);

  // Cargar municipios al cambiar departamento
  useEffect(() => {
    let active = true;
    if (open && departamento) {
      const fetchMunis = async () => {
        setLoadingMunis(true);
        const data = await getMunicipios('GT', departamento);
        if (active) {
          setMunicipios(data);
          setLoadingMunis(false);
          if (data.length > 0) setMunicipio(data[0].codigo);
          else setMunicipio('');
        }
      };
      fetchMunis();
    } else {
      setMunicipios([]);
      setMunicipio('');
    }
    return () => { active = false; };
  }, [open, departamento]);

  const handleAdd = () => {
    const cleanNombre = normalizeText(nombre);
    if (!cleanNombre) return;
    
    const nuevoSitio: SitioCosteo = {
      id: `SIT-${Date.now()}`,
      nombre: cleanNombre,
      direccion: normalizeText(direccion),
      pais: 'GT',
      departamento: departamento,
      municipio: municipio,
      puestos: [],
      recursosSinPuesto: []
    };

    dispatch({ type: 'ADD_SITIO', payload: nuevoSitio });
    dispatch({ type: 'SELECT_NODE', payload: { type: 'SITIO', id: nuevoSitio.id } });
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="p-1 hover:bg-slate-200 rounded text-slate-500" title="Agregar Sitio" />}>
        <Plus className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Sitio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input 
              value={nombre} 
              onChange={e => setNombre(e.target.value)} 
              placeholder="Ej: OFICINAS CENTRALES" 
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dirección</label>
            <Input 
              value={direccion} 
              onChange={e => setDireccion(e.target.value)} 
              placeholder="Ej: ZONA 10, CIUDAD" 
              className="uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
              <SearchableSelect
                options={[{ value: 'GT', label: 'GUATEMALA' }]}
                value="GT"
                onChange={() => {}}
                disabled={true}
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Departamento {loadingDeptos && <span className="text-xs text-slate-400">(cargando...)</span>}
              </label>
              <SearchableSelect
                options={departamentos.map(d => ({ value: d.codigo, label: d.nombre }))}
                value={departamento}
                onChange={setDepartamento}
                disabled={loadingDeptos || departamentos.length === 0}
                placeholder="Seleccione..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Municipio {loadingMunis && <span className="text-xs text-slate-400">(cargando...)</span>}
              </label>
              <SearchableSelect
                options={municipios.map(m => ({ value: m.codigo, label: m.nombre }))}
                value={municipio}
                onChange={setMunicipio}
                disabled={loadingMunis || !departamento || municipios.length === 0}
                placeholder="Seleccione..."
              />
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            onClick={handleAdd}
            disabled={!nombre.trim() || !direccion.trim() || !departamento || !municipio}
          >
            Crear Sitio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { PuestoCosteo } from '@/lib/types/costeos';
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
import { getTurnos, getUniformes, TurnoItem, UniformeItem } from '@/app/actions/puestos';
import { TurnoCard } from '../TurnoCard';

interface AddPuestoDialogProps {
  sitioId: string;
}

export function AddPuestoDialog({ sitioId }: AddPuestoDialogProps) {
  const { proyecto, dispatch } = useCosteo();
  const [open, setOpen] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [turnoCodigo, setTurnoCodigo] = useState<number | undefined>();
  const [uniformeCodigo, setUniformeCodigo] = useState('');

  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [loadingUniformes, setLoadingUniformes] = useState(false);

  useEffect(() => {
    let active = true;
    if (open && proyecto?.empresaId) {
      const fetchData = async () => {
        setLoadingTurnos(true);
        setLoadingUniformes(true);
        const [turnosData, uniformesData] = await Promise.all([
          getTurnos(proyecto.empresaId),
          getUniformes(proyecto.empresaId)
        ]);
        if (active) {
          setTurnos(turnosData);
          setUniformes(uniformesData);
          setLoadingTurnos(false);
          setLoadingUniformes(false);
        }
      };
      fetchData();
    } else {
      setNombre('');
      setTurnoCodigo(undefined);
      setUniformeCodigo('');
    }
    return () => { active = false; };
  }, [open]);

  const handleAdd = () => {
    const cleanNombre = normalizeText(nombre);
    if (!cleanNombre || turnoCodigo === undefined || !uniformeCodigo) return;
    
    const turnoSeleccionado = turnos.find(t => t.codigo === turnoCodigo);
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
    
    const nuevoPuesto: PuestoCosteo = {
      id: `PUE-${Date.now()}`,
      nombre: cleanNombre,
      turnoCodigo,
      uniformeCodigo,
      personas,
      horasSemana,
      recursos: []
    };

    dispatch({ type: 'ADD_PUESTO', payload: { sitioId, puesto: nuevoPuesto } });
    dispatch({ type: 'SELECT_NODE', payload: { type: 'PUESTO', id: nuevoPuesto.id } });
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={<button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-opacity" title="Agregar Puesto" />}
      >
        <Plus className="w-3.5 h-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] sm:w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Puesto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input 
              value={nombre} 
              onChange={e => setNombre(e.target.value)} 
              placeholder="Ej: GARITA PRINCIPAL" 
              className="uppercase"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Turno {loadingTurnos && <span className="text-xs text-slate-400">(cargando...)</span>}
            </label>
            <SearchableSelect
              options={turnos.map(t => ({ value: String(t.codigo), label: t.descripcion }))}
              value={turnoCodigo !== undefined ? String(turnoCodigo) : ''}
              onChange={(val) => setTurnoCodigo(parseInt(val, 10))}
              disabled={loadingTurnos || turnos.length === 0}
              placeholder="Seleccione..."
            />
          </div>
          
          {turnoCodigo !== undefined && (
            <div className="py-2">
              <TurnoCard turno={turnos.find(t => t.codigo === turnoCodigo)!} />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Uniforme {loadingUniformes && <span className="text-xs text-slate-400">(cargando...)</span>}
            </label>
            <SearchableSelect
              options={uniformes.map(u => ({ value: u.codigo, label: u.descripcion }))}
              value={uniformeCodigo}
              onChange={setUniformeCodigo}
              disabled={loadingUniformes || uniformes.length === 0}
              placeholder="Seleccione..."
            />
          </div>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            onClick={handleAdd}
            disabled={!nombre.trim() || turnoCodigo === undefined || !uniformeCodigo}
          >
            Crear Puesto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

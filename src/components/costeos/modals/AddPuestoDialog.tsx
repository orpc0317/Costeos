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
import { NumericInput } from '@/components/ui/numeric-input';
import { Plus } from 'lucide-react';
import { normalizeText } from '@/lib/utils/text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getTurnos, getUniformes, TurnoItem, UniformeItem, getServiciosVenta, ServicioVentaItem } from '@/app/actions/puestos';
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
  const [cubreDescanso, setCubreDescanso] = useState<number>(0);
  const [cantidadTurnos, setCantidadTurnos] = useState<number>(1);
  const [cantidad, setCantidad] = useState<number>(1);
  const [nombreGenerico, setNombreGenerico] = useState(false);

  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  const [servicios, setServicios] = useState<ServicioVentaItem[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [loadingUniformes, setLoadingUniformes] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [itemServicioCodigo, setItemServicioCodigo] = useState('');
  const [precioVenta, setPrecioVenta] = useState<number | undefined>();

  useEffect(() => {
    let active = true;
    if (open && proyecto?.empresaId) {
      const fetchData = async () => {
        setLoadingTurnos(true);
        setLoadingUniformes(true);
        setLoadingServicios(true);
        const [turnosData, uniformesData, serviciosData] = await Promise.all([
          getTurnos(proyecto.empresaId),
          getUniformes(proyecto.empresaId),
          getServiciosVenta(proyecto.empresaId)
        ]);
        if (active) {
          setTurnos(turnosData);
          setUniformes(uniformesData);
          setServicios(serviciosData);
          setLoadingTurnos(false);
          setLoadingUniformes(false);
          setLoadingServicios(false);
        }
      };
      fetchData();
    } else {
      setNombre('');
      setTurnoCodigo(undefined);
      setUniformeCodigo('');
      setCubreDescanso(0);
      setCantidadTurnos(1);
      setCantidad(1);
      setNombreGenerico(false);
      setItemServicioCodigo('');
      setPrecioVenta(undefined);
    }
    return () => { active = false; };
  }, [open]);

  const servicioSeleccionado = servicios.find(s => s.codigo === itemServicioCodigo);
  const isEstandar = servicioSeleccionado?.item_registro !== 1; // 0 o 2
  const turnoSeleccionado = turnos.find(t => t.codigo === turnoCodigo);
  const diasTrabajo = turnoSeleccionado 
    ? ((turnoSeleccionado.lunes || 0) + (turnoSeleccionado.martes || 0) + (turnoSeleccionado.miercoles || 0) + (turnoSeleccionado.jueves || 0) + (turnoSeleccionado.viernes || 0) + (turnoSeleccionado.sabado || 0) + (turnoSeleccionado.domingo || 0)) 
    : 0;
  const trabaja7Dias = diasTrabajo === 7;

  useEffect(() => {
    if (!trabaja7Dias) {
      setCubreDescanso(0);
    }
  }, [trabaja7Dias]);

  const OPCIONES_CUBRE_DESCANSO = [
    { value: '0', label: '0 - No Aplica' },
    { value: '1', label: '1 - Descansero' },
    { value: '2', label: '2 - Extrero' },
    { value: '3', label: '3 - Bono Descanso' }
  ];

  const handleAdd = () => {
    if (!itemServicioCodigo || !servicioSeleccionado) return;
    const cleanNombre = normalizeText(nombre);
    
    const nuevoPuesto: PuestoCosteo = {
      id: `TMP-PUESTO-${Date.now()}`,
      nombre: cleanNombre,
      recursos: [],
      turnoCodigo,
      uniformeCodigo,
      cubreDescanso,
      personas: 0,
      horasSemana: 0
    };

    if (isEstandar) {
      if (!cleanNombre || precioVenta === undefined || cantidad === undefined) return;
      
      const itemRegistro = servicioSeleccionado.item_registro;

      if (itemRegistro === 2) {
        // Activo: crear N recursos de cantidad 1
        for(let i = 0; i < cantidad; i++) {
          nuevoPuesto.recursos.push({
            id: `REC-${Date.now()}-${i}`,
            erpItemId: parseInt(servicioSeleccionado.codigo, 10) || 0,
            nombre: servicioSeleccionado.descripcion,
            categoria: 'SERVICIO',
            tipoCosto: 'MENSUAL',
            cantidad: 1,
            costoUnitario: 0,
            precioVentaUnitario: precioVenta,
            precioVentaOrigen: 'MANUAL',
            itemServicio: servicioSeleccionado,
            recetas: []
          });
        }
      } else {
        // Estandar u otros: crear 1 recurso de cantidad N
        nuevoPuesto.recursos.push({
          id: `REC-${Date.now()}`,
          erpItemId: parseInt(servicioSeleccionado.codigo, 10) || 0,
          nombre: servicioSeleccionado.descripcion,
          categoria: 'SERVICIO',
          tipoCosto: 'MENSUAL',
          cantidad: cantidad || 1,
          costoUnitario: 0,
          precioVentaUnitario: precioVenta,
          precioVentaOrigen: 'MANUAL',
          itemServicio: servicioSeleccionado,
          recetas: []
        });
      }

      dispatch({ type: 'ADD_PUESTO', payload: { sitioId, puesto: nuevoPuesto } });
      dispatch({ type: 'SELECT_NODE', payload: { type: 'PUESTO', id: nuevoPuesto.id } });
      
      setOpen(false);
      return;
    }

    if (!cleanNombre || turnoCodigo === undefined || !uniformeCodigo) return;
    
    const turno = turnos.find(t => t.codigo === turnoCodigo);
    let personas = 1;
    let horasSemana = 0;
    
    if (turno) {
      personas = turno.personas; // Personas por turno individual
      horasSemana = 
        (turno.lunes === 1 ? turno.lunes_horas : 0) +
        (turno.martes === 1 ? turno.martes_horas : 0) +
        (turno.miercoles === 1 ? turno.miercoles_horas : 0) +
        (turno.jueves === 1 ? turno.jueves_horas : 0) +
        (turno.viernes === 1 ? turno.viernes_horas : 0) +
        (turno.sabado === 1 ? turno.sabado_horas : 0) +
        (turno.domingo === 1 ? turno.domingo_horas : 0);
    }
    
    nuevoPuesto.turnoCodigo = turnoCodigo;
    nuevoPuesto.uniformeCodigo = uniformeCodigo;
    nuevoPuesto.cubreDescanso = cubreDescanso;
    nuevoPuesto.personas = personas;
    nuevoPuesto.horasSemana = horasSemana;
    
    // RRHH: crear (cantidadTurnos * personas) recursos agrupados por turno
    for (let t = 0; t < cantidadTurnos; t++) {
      const grupoTurnoId = `GT-${Date.now()}-${t}`; // Agrupar las N personas de este turno
      
      for(let p = 0; p < personas; p++) {
        nuevoPuesto.recursos.push({
          id: `REC-${Date.now()}-${t}-${p}`,
          erpItemId: parseInt(servicioSeleccionado.codigo, 10) || 0,
          nombre: servicioSeleccionado.descripcion,
          categoria: 'RECURSO_HUMANO',
          tipoCosto: 'MENSUAL',
          cantidad: 1,
          costoUnitario: 0,
          precioVentaUnitario: precioVenta,
          precioVentaOrigen: 'MANUAL',
          itemServicio: servicioSeleccionado,
          turnoCodigo,
          uniformeCodigo,
          personas: 1, // Ya desglosado a 1 persona por linea
          horasSemana,
          cubreDescanso,
          recetas: [],
          grupoTurnoId // Enlace lógico para eliminar en cascada
        });
      }
    }

    dispatch({ type: 'ADD_PUESTO', payload: { sitioId, puesto: nuevoPuesto } });
    dispatch({ type: 'SELECT_NODE', payload: { type: 'PUESTO', id: nuevoPuesto.id } });
    
    setOpen(false);
  };

  const tc = proyecto?.tipoCosteo;
  const lblN2 = tc?.nivel2Etiqueta || 'Puesto';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={<button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-opacity" title={`Agregar ${lblN2}`} />}
      >
        <Plus className="w-3.5 h-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] sm:w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo {lblN2}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Item {loadingServicios && <span className="text-xs text-slate-400">(cargando...)</span>}
              </label>
              <SearchableSelect
                options={servicios.map(s => ({ value: s.codigo, label: s.descripcion }))}
                value={itemServicioCodigo}
                onChange={setItemServicioCodigo}
                disabled={loadingServicios || servicios.length === 0}
                placeholder="Seleccione..."
                autoFocus
              />
            </div>
            <div className="w-32 shrink-0 space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-1 truncate">Unidad Medida</label>
              <div className="h-9 flex items-center px-3 bg-slate-100 border border-slate-200 rounded-md text-sm text-slate-600 font-medium truncate" title={servicioSeleccionado ? servicioSeleccionado.unidad_medida : ''}>
                {servicioSeleccionado ? servicioSeleccionado.unidad_medida : '-'}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <div className="flex items-center gap-4">
              <Input 
                value={nombre} 
                onChange={e => {
                  setNombre(e.target.value);
                  if (nombreGenerico) setNombreGenerico(false);
                }} 
                placeholder="Ej: GARITA PRINCIPAL" 
                className="uppercase flex-1"
                disabled={nombreGenerico}
              />
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="checkbox"
                  id="nombre-generico"
                  checked={nombreGenerico}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNombreGenerico(checked);
                    if (checked) {
                      setNombre('PUESTO 001');
                    } else {
                      setNombre('');
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="nombre-generico" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                  Genérico
                </label>
              </div>
            </div>
          </div>

          {isEstandar ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cantidad
                  </label>
                  <NumericInput
                    value={cantidad}
                    onChange={(val) => setCantidad(val || 1)}
                    min="0"
                    isInteger={false}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Precio Venta ({proyecto?.moneda})
                  </label>
                  <NumericInput
                    value={precioVenta}
                    onChange={setPrecioVenta}
                    min="0"
                    placeholder="0.00"
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Venta ({proyecto?.moneda})
                </label>
                {(() => {
                  const total = (precioVenta || 0) * (cantidad || 1);
                  const formatCurrency = (val: number) => {
                    try {
                      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
                    } catch(e) {
                      return val.toFixed(2);
                    }
                  };
                  return (
                    <input
                      type="text"
                      value={formatCurrency(total)}
                      readOnly
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-100 font-bold text-blue-700 px-3 py-1 text-sm shadow-sm outline-none cursor-not-allowed"
                    />
                  );
                })()}
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={handleAdd}
                disabled={!nombre.trim() || precioVenta === undefined || cantidad === undefined || !itemServicioCodigo}
              >
                Crear Puesto
              </Button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Precio Venta ({proyecto?.moneda})
                  </label>
                  <NumericInput
                    value={precioVenta}
                    onChange={setPrecioVenta}
                    min="0"
                    placeholder="0.00"
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Venta ({proyecto?.moneda})
                  </label>
                  {(() => {
                    const turno = turnos.find(t => t.codigo === turnoCodigo);
                    const personas = turno ? turno.personas : 1;
                    const total = (precioVenta || 0) * (cantidadTurnos || 1) * personas;
                    const formatCurrency = (val: number) => {
                      try {
                        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
                      } catch(e) {
                        return val.toFixed(2);
                      }
                    };
                    return (
                      <input
                        type="text"
                        value={formatCurrency(total)}
                        readOnly
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-100 font-bold text-blue-700 px-3 py-1 text-sm shadow-sm outline-none cursor-not-allowed"
                      />
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cant. Turnos
                  </label>
                  <NumericInput
                    value={cantidadTurnos}
                    onChange={(val) => setCantidadTurnos(val || 1)}
                    min="1"
                    isInteger={true}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="col-span-8 space-y-2">
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
              </div>
              
              {turnoCodigo !== undefined && (
                <div className="py-2">
                  <TurnoCard turno={turnos.find(t => t.codigo === turnoCodigo)!} cantidadTurnos={cantidadTurnos} />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cubre Descanso
                </label>
                <SearchableSelect
                  options={OPCIONES_CUBRE_DESCANSO}
                  value={String(cubreDescanso)}
                  onChange={(val) => setCubreDescanso(parseInt(val, 10))}
                  disabled={!trabaja7Dias}
                  placeholder="Seleccione..."
                />
              </div>

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
                disabled={!nombre.trim() || turnoCodigo === undefined || !uniformeCodigo || !itemServicioCodigo || (trabaja7Dias && cubreDescanso === 0)}
              >
                Crear {lblN2}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

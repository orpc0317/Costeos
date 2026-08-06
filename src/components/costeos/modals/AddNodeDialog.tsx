import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { NodoCosteo, RecursoCosteo, BonoCosteo } from '@/lib/types/costeos';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { Plus, Loader2, Trash } from 'lucide-react';
import { normalizeText } from '@/lib/utils/text';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getDepartamentos, getMunicipios, UbicacionItem, getClienteDireccionesOperativas, DireccionOperativa } from '@/app/actions/ubicaciones';
import { getTurnos, getUniformes, TurnoItem, UniformeItem, getServiciosVenta, ServicioVentaItem, getBonos, BonoItem } from '@/app/actions/puestos';
import { AddressLookupModal } from './AddressLookupModal';
import { Search } from 'lucide-react';
import { TurnoCard } from '../TurnoCard';
import { listarItems } from '@/app/actions/items';
import { ItemRow } from '@/lib/types/items';

export interface AddNodeDialogProps {
  level: number;
  parentId: string | null;
  parentName?: string;
}

export function AddNodeDialog({ level, parentId, parentName }: AddNodeDialogProps) {
  const { proyecto, dispatch } = useCosteo();
  const [open, setOpen] = useState(false);
  
  // Estado para Nivel
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  
  const [departamentos, setDepartamentos] = useState<UbicacionItem[]>([]);
  const [municipios, setMunicipios] = useState<UbicacionItem[]>([]);
  const [loadingDeptos, setLoadingDeptos] = useState(false);
  const [loadingMunis, setLoadingMunis] = useState(false);

  const [direccionesOperativas, setDireccionesOperativas] = useState<DireccionOperativa[]>([]);
  const [loadingDirecciones, setLoadingDirecciones] = useState(false);
  const [direccionSecuencia, setDireccionSecuencia] = useState<number | undefined>(undefined);
  const [isNewAddress, setIsNewAddress] = useState<boolean>(false);
  const [showAddressLookup, setShowAddressLookup] = useState<boolean>(false);

  // Estado para Línea (Catálogo local)
  const [items, setItems] = useState<ItemRow[]>([]);
  const [servicios, setServicios] = useState<ServicioVentaItem[]>([]);
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [loadingUniformes, setLoadingUniformes] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  
  // Dynamic Fields for Línea
  const [cantidad, setCantidad] = useState<number>(1);
  const [precioVenta, setPrecioVenta] = useState<number | undefined>();
  const [turnoCodigo, setTurnoCodigo] = useState<number | undefined>();
  const [uniformeCodigo, setUniformeCodigo] = useState('');
  const [cubreDescanso, setCubreDescanso] = useState<number>(0);
  
  const [bonosDisponibles, setBonosDisponibles] = useState<BonoItem[]>([]);
  const [bonosAgregados, setBonosAgregados] = useState<BonoCosteo[]>([]);
  const [selectedBonoId, setSelectedBonoId] = useState<string>('');
  const [selectedBonoPrecio, setSelectedBonoPrecio] = useState<number>(0);
  const [cantidadTurnos, setCantidadTurnos] = useState<number>(1);

  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tc = proyecto?.tipoCosteo;
  const maxNiveles = tc?.cantidadNiveles ?? 2;
  const etiquetas = tc?.etiquetasNiveles ? tc.etiquetasNiveles.split(',') : [];
  const lblN = etiquetas[level - 1] || `Nivel ${level}`;
  const lblR = tc?.lineaEtiqueta || 'Línea';
  
  const isLineLevel = level > maxNiveles;
  const hasDireccion = tc?.nivelConDireccion === level;
  
  const title = level === 1 ? `Agregar ${lblN}` : `Agregar ${isLineLevel ? lblR : lblN} a ${parentName}`;

  const OPCIONES_CUBRE_DESCANSO = [
    { value: '0', label: '0 - No Aplica' },
    { value: '1', label: '1 - Descansero' },
    { value: '2', label: '2 - Extrero' },
    { value: '3', label: '3 - Bono Descanso' }
  ];

  useEffect(() => {
    let active = true;
    if (open) {
      if (hasDireccion) {
        setLoadingDeptos(true);
        getDepartamentos('GT').then(data => {
          if (active) {
            setDepartamentos(data);
            setLoadingDeptos(false);
            if (data.length > 0 && !departamento) setDepartamento(data[0].codigo);
          }
        });

        if (proyecto?.empresaId && proyecto?.cliente?.id) {
          setLoadingDirecciones(true);
          const clienteErpId = parseInt(proyecto.cliente.codigo || proyecto.cliente.id, 10);
          getClienteDireccionesOperativas(proyecto.empresaId, clienteErpId).then(dirs => {
            if (active) {
              setDireccionesOperativas(dirs);
              setLoadingDirecciones(false);
            }
          });
        }
      }
      
      if (proyecto?.empresaId) {
        setIsLoadingCatalogo(true);
        setLoadingTurnos(true);
        setLoadingUniformes(true);
        setLoadingServicios(true);
        
        Promise.all([
          listarItems(),
          getServiciosVenta(proyecto.empresaId),
          getTurnos(proyecto.empresaId),
          getUniformes(proyecto.empresaId),
          getBonos()
        ]).then(([itemsData, serviciosData, turnosData, uniformesData, bonosData]) => {
          if (active) {
            setItems(itemsData);
            setServicios(serviciosData);
            setTurnos(turnosData);
            setUniformes(uniformesData);
            setBonosDisponibles(bonosData);
            setIsLoadingCatalogo(false);
            setLoadingServicios(false);
            setLoadingTurnos(false);
            setLoadingUniformes(false);
          }
        }).catch(err => {
          console.error("Error al cargar dependencias:", err);
          if (active) {
            setIsLoadingCatalogo(false);
            setLoadingServicios(false);
            setLoadingTurnos(false);
            setLoadingUniformes(false);
          }
        });
      }
    } else {
      setNombre('');
      setDireccion('');
      setDepartamento('');
      setMunicipio('');
      setDireccionSecuencia(undefined);
      setIsNewAddress(false);
      setShowAddressLookup(false);
      setSelectedItemId('');
      setError(null);
      setCantidad(1);
      setPrecioVenta(undefined);
      setTurnoCodigo(undefined);
      setUniformeCodigo('');
      setCubreDescanso(0);
      setCantidadTurnos(1);
      setBonosAgregados([]);
      setSelectedBonoId('');
      setSelectedBonoPrecio(0);
    }
    return () => { active = false; };
  }, [open, hasDireccion, proyecto?.empresaId, proyecto?.cliente?.id]);

  useEffect(() => {
    let active = true;
    if (open && departamento && hasDireccion) {
      setLoadingMunis(true);
      getMunicipios('GT', departamento).then(data => {
        if (active) {
          setMunicipios(data);
          setLoadingMunis(false);
          setMunicipio(prev => {
            const muniExists = data.find(m => {
              const code1 = String(m.codigo).trim();
              const code2 = String(prev || '').trim();
              if (code1 === code2) return true;
              const num1 = parseInt(code1, 10);
              const num2 = parseInt(code2, 10);
              return !isNaN(num1) && !isNaN(num2) && num1 === num2;
            });
            return muniExists ? prev : (data.length > 0 ? String(data[0].codigo) : '');
          });
        }
      });
    } else if (!open || !hasDireccion) {
      setMunicipios([]);
      setMunicipio('');
    }
    return () => { active = false; };
  }, [open, departamento, hasDireccion]);

  const isDireccionEnUso = (secuencia: number) => {
    let inUse = false;
    const walk = (nodos: NodoCosteo[]) => {
      for (const n of nodos) {
        if (n.direccionSecuencia === secuencia) {
          inUse = true;
        }
        walk(n.nodos);
      }
    };
    if (proyecto?.nodos) walk(proyecto.nodos);
    return inUse;
  };

  const handleSelectDireccion = (secuenciaStr: string) => {
    const secuencia = parseInt(secuenciaStr, 10);
    if (isDireccionEnUso(secuencia)) {
      alert('Esta dirección ya está en uso en otro nivel del costeo.');
      return;
    }
    
    const dir = direccionesOperativas.find(d => d.secuencia === secuencia);
    if (dir) {
      setIsNewAddress(false);
      setNombre(dir.nombre);
      setDireccionSecuencia(dir.secuencia);
      setDireccion(dir.direccion);
      setDepartamento(dir.departamento);
      setMunicipio(dir.municipio);
      setError(null);
      setFieldErrors({});
    }
  };

  const servicioSeleccionado = servicios.find(s => s.codigo === selectedItemId);
  const erpItem = items.find(i => i.id.toString() === selectedItemId);
  const isEstandar = servicioSeleccionado?.item_registro !== 1; // 0 o 2 (no RRHH)

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

  // Si cambia el item seleccionado, resetear precio si es 0 por defecto
  useEffect(() => {
    if (servicioSeleccionado) {
      if (servicioSeleccionado.precio_venta_cero === 1) {
        setPrecioVenta(0);
      } else {
        setPrecioVenta(undefined); // Obligamos a que lo pongan si no es 0
      }
    }
  }, [servicioSeleccionado]);

  const handleAdd = async () => {
    setError(null);
    setFieldErrors({});
    const cleanNombre = normalizeText(nombre);
    const cleanDireccion = normalizeText(direccion);
    
    const hasLineaInfo = !!selectedItemId;
    const creatingNode = !isLineLevel && (!!cleanNombre || (hasDireccion && (!!cleanDireccion || !!direccionSecuencia || !!departamento || !!municipio)));
    
    let hasFieldErrors = false;
    const newFieldErrors: Record<string, string> = {};

    if (!creatingNode && !hasLineaInfo) {
      if (!isLineLevel) {
        setError(`Debe ingresar el Nombre para crear un ${lblN} o seleccionar un Item para agregarlo directo.`);
        return;
      } else {
        newFieldErrors.selectedItemId = `Debe realizar la Selección Item.`;
        hasFieldErrors = true;
      }
    }

    if (creatingNode) {
      if (!cleanNombre) {
        newFieldErrors.nombre = `El nombre es obligatorio.`;
        hasFieldErrors = true;
      }
      if (hasDireccion) {
        if (!isNewAddress && !direccionSecuencia) {
          newFieldErrors.direccion = `Debe seleccionar una dirección o crear una nueva.`;
          hasFieldErrors = true;
        } else {
          if (!cleanDireccion) {
            newFieldErrors.direccion = `La dirección es obligatoria.`;
            hasFieldErrors = true;
          }
          if (!departamento) {
            newFieldErrors.departamento = `Seleccione un departamento.`;
            hasFieldErrors = true;
          }
          if (!municipio) {
            newFieldErrors.municipio = `Seleccione un municipio.`;
            hasFieldErrors = true;
          }
        }
      }
    }
    
    if (hasLineaInfo) {
      if (!servicioSeleccionado || !erpItem) {
        newFieldErrors.selectedItemId = "Item no válido.";
        hasFieldErrors = true;
      } else {
        if (precioVenta === undefined) {
          newFieldErrors.precioVenta = "El Precio de Venta es requerido.";
          hasFieldErrors = true;
        }
        if (isEstandar) {
          if (cantidad === undefined || cantidad <= 0) {
            newFieldErrors.cantidad = "La Cantidad debe ser mayor a 0.";
            hasFieldErrors = true;
          }
        } else {
          if (turnoCodigo === undefined) {
            newFieldErrors.turnoCodigo = "Debe seleccionar un Turno.";
            hasFieldErrors = true;
          }
          if (!uniformeCodigo) {
            newFieldErrors.uniformeCodigo = "Debe seleccionar un Uniforme.";
            hasFieldErrors = true;
          }
          if (trabaja7Dias && cubreDescanso === 0) {
            newFieldErrors.cubreDescanso = "Debe seleccionar una opción válida para Cubre Descanso.";
            hasFieldErrors = true;
          }
        }
      }
    }

    if (hasFieldErrors) {
      setFieldErrors(newFieldErrors);
      setTimeout(() => {
        const firstErrorField = Object.keys(newFieldErrors)[0];
        const el = document.getElementById(`field-${firstErrorField}`);
        if (el) el.focus();
      }, 100);
      return;
    }
    
    setIsAdding(true);
    try {
      const recursosNuevos: RecursoCosteo[] = [];

      if (hasLineaInfo && servicioSeleccionado && erpItem) {
        let recetasDelRecurso: any[] = [];
        
        // Determinar categoría basada en tipoItem y tipoServicio
        // 1 Producto -> ARTICULO, 2 Servicio -> SERVICIO/RECURSO_HUMANO, 3 Equipo -> EQUIPO, 4 Financiero -> SERVICIO
        let catStr = 'SERVICIO';
        if (erpItem.tipoItem === 1) catStr = 'ARTICULO';
        if (erpItem.tipoItem === 3) catStr = 'EQUIPO';
        if (erpItem.tipoItem === 2) {
          catStr = erpItem.tipoServicio === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';
        }

        if (isEstandar) {
          if (servicioSeleccionado.item_registro === 2) {
            // Activo: N recursos de cantidad 1
            for(let i = 0; i < cantidad; i++) {
              recursosNuevos.push({
                id: `REC-${Date.now()}-${i}`,
                itemId: erpItem.id,
                nombre: erpItem.descripcion,
                categoria: catStr as any,
                tipoCosto: 'MENSUAL',
                cantidad: 1,
                costoUnitario: 0,
                precioVentaUnitario: precioVenta,
                precioVentaOrigen: 'MANUAL',
                itemServicio: servicioSeleccionado,
                recetas: recetasDelRecurso
              });
            }
          } else {
            // Estándar u otros: 1 recurso de cantidad N
            recursosNuevos.push({
              id: `REC-${Date.now()}`,
              itemId: erpItem.id,
              nombre: erpItem.descripcion,
              categoria: catStr as any,
              tipoCosto: 'MENSUAL',
              cantidad: cantidad,
              costoUnitario: 0,
              precioVentaUnitario: precioVenta,
              precioVentaOrigen: 'MANUAL',
              itemServicio: servicioSeleccionado,
              recetas: recetasDelRecurso
            });
          }
        } else {
          // RRHH
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

          recursosNuevos.push({
            id: `REC-${Date.now()}`,
            itemId: erpItem.id,
            nombre: erpItem.descripcion,
            categoria: 'RECURSO_HUMANO',
            tipoCosto: 'MENSUAL',
            cantidad: cantidadTurnos,
            costoUnitario: 0,
            precioVentaUnitario: precioVenta,
            precioVentaOrigen: 'MANUAL',
            itemServicio: servicioSeleccionado,
            turnoCodigo,
            uniformeCodigo,
            personas,
            horasSemana,
            cubreDescanso,
            bonos: bonosAgregados,
            recetas: recetasDelRecurso
          });
        }
      }

      if (creatingNode) {
        // Opción: Crear Nodo (y asignarle los recursos si los hay)
        const nuevoNodo: NodoCosteo = {
          id: `NOD-${Date.now()}`,
          nivel: level,
          nombre: cleanNombre,
          direccion: hasDireccion ? cleanDireccion : undefined,
          direccionSecuencia: hasDireccion && !isNewAddress ? direccionSecuencia : undefined,
          pais: hasDireccion ? 'GT' : undefined,
          departamento: hasDireccion ? departamento : undefined,
          municipio: hasDireccion ? municipio : undefined,
          nodos: [],
          recursos: recursosNuevos
        };
        dispatch({ type: 'ADD_NODO', payload: { parentId, nodo: nuevoNodo } });
        dispatch({ type: 'SELECT_NODE', payload: { type: 'NODO', id: nuevoNodo.id } });
      } else {
        // Opción: Agregar recursos directos a parentId (el nodo actual)
        recursosNuevos.forEach((recurso, idx) => {
          dispatch({ type: 'ADD_RECURSO', payload: { nodoId: parentId, recurso } });
          if (idx === 0) dispatch({ type: 'SELECT_NODE', payload: { type: 'RECURSO', id: recurso.id } });
        });
      }
      
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al procesar la solicitud.");
    } finally {
      setIsAdding(false);
    }
  };

  const renderBonosContent = () => (
    <div className="space-y-4 pt-2 pr-2 animate-in fade-in slide-in-from-top-2">
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
            className="flex h-8 w-full rounded-sm border border-slate-200 bg-transparent px-2.5 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
          />
        </div>
        <Button 
          type="button" 
          variant="secondary"
          onClick={() => {
            if (!selectedBonoId) return;
            const bonoItem = bonosDisponibles.find(b => b.codigo === selectedBonoId);
            if (bonoItem) {
              setBonosAgregados(prev => [...prev, {
                id: crypto.randomUUID(),
                erpBonoId: bonoItem.codigo,
                nombre: bonoItem.descripcion,
                costoUnitario: bonoItem.costo,
                precioVentaUnitario: selectedBonoPrecio
              }]);
              setSelectedBonoId('');
              setSelectedBonoPrecio(0);
            }
          }}
          disabled={!selectedBonoId}
        >
          Agregar
        </Button>
      </div>
      
      {bonosAgregados.length > 0 ? (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b">
              <tr>
                <th className="px-3 py-2">Bono</th>
                <th className="px-3 py-2 text-center">Personas</th>
                <th className="px-3 py-2 text-right">Costo</th>
                <th className="px-3 py-2 text-right text-slate-700 font-semibold bg-slate-100">Total Costo</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-right text-blue-700 font-semibold bg-blue-50/50">Total Venta</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bonosAgregados.map((b, idx) => {
                const factor = isEstandar ? (cantidad || 1) : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));
                const costoTotal = (b.costoUnitario || 0) * factor;
                const ventaTotal = (b.precioVentaUnitario || 0) * factor;
                return (
                  <tr key={idx} className="bg-white hover:bg-slate-50">
                    <td className="px-3 py-2">{b.nombre}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{factor}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{b.costoUnitario.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                    <td className="px-3 py-2 text-right text-slate-700 font-semibold bg-slate-100">{costoTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{(b.precioVentaUnitario || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                    <td className="px-3 py-2 text-right text-blue-700 font-semibold bg-blue-50/50">{ventaTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => setBonosAgregados(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash className="w-4 h-4" />
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
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="p-1 hover:bg-slate-200 rounded text-slate-500" title={level === 1 ? `Agregar a Proyecto` : `Agregar a ${parentName || 'Nodo'}`} />}>
        <Plus className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className={cn(!isLineLevel ? "sm:max-w-[1200px] w-[95vw]" : "sm:max-w-[1000px] w-[95vw]", "h-[90vh] sm:h-[600px] flex flex-col")}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-2 border border-red-200 shrink-0">
            {error}
          </div>
        )}
        
        <div className={cn(!isLineLevel ? "grid grid-cols-[3.5fr_6.5fr] gap-0" : "", "flex-1 overflow-y-auto pr-2 py-2")}>
          {!isLineLevel && (
            <div className="space-y-2 pr-6 border-r border-slate-200">
              <div className="flex flex-col gap-1.5">
                <Label>Nombre</Label>
                <Input 
                  id="field-nombre"
                  value={nombre} 
                  onChange={e => {
                    setNombre(e.target.value);
                    setError(null);
                    setFieldErrors(prev => ({ ...prev, nombre: '' }));
                  }} 
                  placeholder="Ej: OFICINAS CENTRALES" 
                  className="uppercase"
                  aria-invalid={!!fieldErrors.nombre}
                  maxLength={hasDireccion ? 20 : undefined}
                  readOnly={hasDireccion && !isNewAddress && !!direccionSecuencia}
                  title={hasDireccion && !isNewAddress && !!direccionSecuencia ? "El nombre proviene de la dirección operativa seleccionada" : undefined}
                />

                {fieldErrors.nombre && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nombre}</p>}
              </div>
              
              {hasDireccion && (
                <div className="pt-2">
                  <div className="flex items-center mb-3">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                      Direccion
                    </h3>
                    <div className="flex-1 border-t border-blue-200 mx-3 mt-0.5"></div>
                    {!isNewAddress ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setIsNewAddress(true); setDireccionSecuencia(undefined); setDireccion(''); setDepartamento(''); setMunicipio(''); }} className="text-blue-600 h-6 text-xs px-2">
                        + Crear Nueva
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setIsNewAddress(false); }} className="text-blue-600 h-6 text-xs px-2">
                        <Search className="mr-1.5 h-3.5 w-3.5" /> Buscar Existente
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {!isNewAddress && (
                      <div className="flex flex-col gap-1.5">
                        <Label>Seleccionar Dirección</Label>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const selectedAddr = direccionesOperativas.find(d => d.secuencia === direccionSecuencia);
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

                    <div className="flex flex-col gap-1.5">
                    <Label>Dirección</Label>
                    <Input 
                      id="field-direccion"
                      value={direccion} 
                      onChange={e => {
                        setDireccion(e.target.value);
                        setError(null);
                        setFieldErrors(prev => ({ ...prev, direccion: '' }));
                      }} 
                      placeholder="Ej: ZONA 10, CIUDAD" 
                      className="uppercase"
                      aria-invalid={!!fieldErrors.direccion}
                      readOnly={!isNewAddress}
                    />
                    {fieldErrors.direccion && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.direccion}</p>}
                  </div>
    
                  <div className="flex flex-col gap-1.5">
                    <Label>País</Label>
                    <SearchableSelect
                      options={[{ value: 'GT', label: 'GUATEMALA' }]}
                      value="GT"
                      onChange={() => {}}
                      disabled={true}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Departamento {loadingDeptos && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                    </Label>
                    <SearchableSelect
                      id="field-departamento"
                      options={departamentos.map(d => ({ value: d.codigo, label: d.nombre }))}
                      value={departamento}
                      onChange={val => {
                        setDepartamento(val);
                        setError(null);
                        setFieldErrors(prev => ({ ...prev, departamento: '' }));
                      }}
                      disabled={loadingDeptos || (!isNewAddress)}
                      placeholder="Seleccione..."
                      error={!!fieldErrors.departamento}
                    />
                    {fieldErrors.departamento && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.departamento}</p>}
                  </div>
  
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Municipio {loadingMunis && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                    </Label>
                    <SearchableSelect
                      id="field-municipio"
                      options={municipios.map(m => ({ value: m.codigo, label: m.nombre }))}
                      value={municipio}
                      onChange={val => {
                        setMunicipio(val);
                        setError(null);
                        setFieldErrors(prev => ({ ...prev, municipio: '' }));
                      }}
                      disabled={loadingMunis || !departamento || (!isNewAddress)}
                      placeholder="Seleccione..."
                      error={!!fieldErrors.municipio}
                    />
                    {fieldErrors.municipio && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.municipio}</p>}
                  </div>
                </div>
              </div>
            )}
            </div>
          )}

          <div className={cn("space-y-4", !isLineLevel ? "pl-6" : "")}>
            <div className="w-full lg:w-[60%]">
              <div className="flex flex-col gap-1.5">
                <Label>Item</Label>
              {(isLoadingCatalogo || loadingServicios) ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando catálogo...
                </div>
              ) : (
                <>
                  <SearchableSelect
                    id="field-selectedItemId"
                    options={items.map(item => ({
                      value: item.id.toString(),
                      label: `${item.codigoErp || item.id} - ${item.descripcion}`
                    }))}
                    value={selectedItemId}
                    onChange={(val) => {
                      setSelectedItemId(val || '');
                      setError(null);
                      setFieldErrors(prev => ({ ...prev, selectedItemId: '' }));
                    }}
                    placeholder={`Selecciona un Registro`}
                    error={!!fieldErrors.selectedItemId}
                  />
                  {fieldErrors.selectedItemId && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.selectedItemId}</p>}
                </>
              )}
              </div>
            </div>

            {selectedItemId && servicioSeleccionado && (() => {
              const generalContent = (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pr-2">
                  <div className="w-full lg:w-[60%]">
                    <div className="pt-2">
                  <div className="flex items-center mb-3 min-h-[24px]">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                      CONFIGURACION
                    </h3>
                    <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  {isEstandar ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label>
                          Cantidad
                        </Label>
                        <NumericInput
                          id="field-cantidad"
                          value={cantidad}
                          onChange={(val: number | undefined) => { setCantidad(val || 1); setFieldErrors(prev => ({ ...prev, cantidad: '' })); }}
                          min="1"
                          isInteger={true}
                          className={cn(
                            "flex h-8 w-full rounded-sm border bg-transparent px-2.5 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
                            fieldErrors.cantidad ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 focus-visible:ring-slate-950"
                          )}
                        />
                        {fieldErrors.cantidad && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.cantidad}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>
                          Unidad Medida
                        </Label>
                        <input
                          type="text"
                          value={servicioSeleccionado?.unidad_medida || ''}
                          readOnly
                          tabIndex={-1}
                          className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2.5 py-1 text-sm shadow-sm outline-none cursor-not-allowed uppercase"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 grid grid-cols-12 gap-4">
                      <div className="col-span-4 flex flex-col gap-1">
                        <Label>
                          Cant. Turnos
                        </Label>
                        <NumericInput
                          value={cantidadTurnos}
                          onChange={(val: number | undefined) => setCantidadTurnos(val || 1)}
                          min="1"
                          isInteger={true}
                          className="flex h-8 w-full rounded-sm border border-slate-200 bg-transparent px-2.5 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <div className="col-span-8 flex flex-col gap-1">
                        <Label>
                          Turno {loadingTurnos && <span className="text-xs text-slate-400">(cargando...)</span>}
                        </Label>
                        <SearchableSelect
                          id="field-turnoCodigo"
                          options={turnos.map(t => ({ value: String(t.codigo), label: t.descripcion }))}
                          value={turnoCodigo !== undefined ? String(turnoCodigo) : ''}
                          onChange={(val) => { setTurnoCodigo(parseInt(val, 10)); setFieldErrors(prev => ({ ...prev, turnoCodigo: '' })); }}
                          disabled={loadingTurnos || turnos.length === 0}
                          placeholder="Seleccione..."
                          error={!!fieldErrors.turnoCodigo}
                        />
                        {fieldErrors.turnoCodigo && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.turnoCodigo}</p>}
                      </div>
                    </div>
                  )}

                  {!isEstandar && turnoCodigo !== undefined && (
                    <div className="col-span-2 -my-2">
                      <TurnoCard turno={turnos.find(t => t.codigo === turnoCodigo)!} cantidadTurnos={cantidadTurnos} />
                    </div>
                  )}
                  {!isEstandar && (
                    <>
                      <div className="col-span-1 flex flex-col gap-1">
                        <Label>
                          Cubre Descanso
                        </Label>
                        <SearchableSelect
                          id="field-cubreDescanso"
                          options={OPCIONES_CUBRE_DESCANSO}
                          value={String(cubreDescanso)}
                          onChange={(val) => { setCubreDescanso(parseInt(val, 10)); setFieldErrors(prev => ({ ...prev, cubreDescanso: '' })); }}
                          disabled={!trabaja7Dias}
                          placeholder="Seleccione..."
                          error={!!fieldErrors.cubreDescanso}
                        />
                        {fieldErrors.cubreDescanso && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.cubreDescanso}</p>}
                      </div>
  
                      <div className="col-span-1 flex flex-col gap-1">
                        <Label>
                          Uniforme {loadingUniformes && <span className="text-xs text-slate-400">(cargando...)</span>}
                        </Label>
                        <SearchableSelect
                          id="field-uniformeCodigo"
                          options={uniformes.map(u => ({ value: u.codigo, label: u.descripcion }))}
                          value={uniformeCodigo}
                          onChange={(val) => { setUniformeCodigo(val); setFieldErrors(prev => ({ ...prev, uniformeCodigo: '' })); }}
                          disabled={loadingUniformes || uniformes.length === 0}
                          placeholder="Seleccione..."
                          error={!!fieldErrors.uniformeCodigo}
                        />
                        {fieldErrors.uniformeCodigo && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.uniformeCodigo}</p>}
                      </div>
                    </>
                  )}
                  </div>
                </div>
                  </div>

                <div className="pt-2">
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
                        id="field-precioVenta"
                        value={precioVenta ?? 0}
                        onChange={(val: number | undefined) => { setPrecioVenta(val); setFieldErrors(prev => ({ ...prev, precioVenta: '' })); }}
                        min="0"
                        className={cn(
                          "flex h-8 w-full rounded-sm border bg-transparent px-2.5 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
                          fieldErrors.precioVenta ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 focus-visible:ring-slate-950"
                        )}
                      />
                      {fieldErrors.precioVenta && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.precioVenta}</p>}
                      {!isEstandar && <p className="text-xs text-slate-500 italic">* Por Persona</p>}
                    </div>
                    <div className="col-span-1 flex flex-col gap-1.5">
                      <Label>SubTotal Venta</Label>
                      <input
                        type="text"
                        value={(() => {
                          const factor = isEstandar ? (cantidad || 1) : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));
                          return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * (precioVenta || 0));
                        })()}
                        readOnly tabIndex={-1}
                        className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="col-span-1 flex flex-col gap-1.5">
                      <Label>Bonos Venta</Label>
                      <input
                        type="text"
                        value={(() => {
                          const factor = isEstandar ? (cantidad || 1) : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));
                          const bonosTotal = bonosAgregados.reduce((sum, b) => sum + (b.precioVentaUnitario || 0), 0);
                          return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * bonosTotal);
                        })()}
                        readOnly tabIndex={-1}
                        className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="col-span-1 flex flex-col gap-1.5">
                      <Label>Total Venta</Label>
                      <input
                        type="text"
                        value={(() => {
                          const factor = isEstandar ? (cantidad || 1) : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));
                          const subtotal = factor * (precioVenta || 0);
                          const bonosTotal = factor * bonosAgregados.reduce((sum, b) => sum + (b.precioVentaUnitario || 0), 0);
                          return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(subtotal + bonosTotal);
                        })()}
                        readOnly tabIndex={-1}
                        className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 font-bold text-blue-700 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="col-span-1 flex flex-col gap-1.5">
                      <Label>Costo Un. ({proyecto?.moneda || 'Q'})</Label>
                      <input
                        type="text"
                        value={(0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        readOnly tabIndex={-1}
                        className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="col-span-1 flex flex-col gap-1.5">
                      <Label>SubTotal Costo</Label>
                      <input
                        type="text"
                        value={(() => {
                          const factor = isEstandar ? (cantidad || 1) : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));
                          return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * 0);
                        })()}
                        readOnly tabIndex={-1}
                        className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="col-span-1 flex flex-col gap-1.5">
                      <Label>Bonos Costo</Label>
                      <input
                        type="text"
                        value={(() => {
                          const factor = isEstandar ? (cantidad || 1) : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));
                          const bonosTotal = bonosAgregados.reduce((sum, b) => sum + (b.costoUnitario || 0), 0);
                          return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * bonosTotal);
                        })()}
                        readOnly tabIndex={-1}
                        className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="col-span-1 flex flex-col gap-1.5">
                      <Label>Total Costo</Label>
                      <input
                        type="text"
                        value={(() => {
                          const factor = isEstandar ? (cantidad || 1) : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));
                          const subtotal = factor * 0;
                          const bonosTotal = factor * bonosAgregados.reduce((sum, b) => sum + (b.costoUnitario || 0), 0);
                          return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(subtotal + bonosTotal);
                        })()}
                        readOnly tabIndex={-1}
                        className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 font-bold text-red-600 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                  </div>
                </div>
              );

              return !isEstandar ? (
                <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-top-2">
                  <Tabs defaultValue="general" className="w-full flex-1 flex flex-col min-h-0">
                    <TabsList variant="line" className="mb-2 shrink-0">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="bonos">
                        Bonos {bonosAgregados.length > 0 && `(${bonosAgregados.length})`}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="flex-1 overflow-visible outline-none">
                      {generalContent}
                    </TabsContent>
                    <TabsContent value="bonos" className="flex-1 overflow-visible outline-none">
                      {renderBonosContent()}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="flex-1 overflow-visible">
                  {generalContent}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-auto flex justify-end gap-3 pt-4 border-t shrink-0">
          <Button 
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isAdding}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 px-6" 
            onClick={handleAdd}
            disabled={isAdding}
          >
            {isAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
      {hasDireccion && (
        <AddressLookupModal 
          open={showAddressLookup}
          onOpenChange={setShowAddressLookup}
          direcciones={direccionesOperativas}
          onSelect={(secuencia) => handleSelectDireccion(String(secuencia))}
        />
      )}
    </Dialog>
  );
}

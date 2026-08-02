import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { NodoCosteo, RecursoCosteo } from '@/lib/types/costeos';
import { Button } from '@/components/ui/button';
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
import { Plus, Loader2 } from 'lucide-react';
import { normalizeText } from '@/lib/utils/text';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getDepartamentos, getMunicipios, UbicacionItem } from '@/app/actions/ubicaciones';
import { getCatalogoItems, getRecetaDeItem } from '@/app/actions/erp';
import { getTurnos, getUniformes, TurnoItem, UniformeItem, getServiciosVenta, ServicioVentaItem } from '@/app/actions/puestos';
import { TurnoCard } from '../TurnoCard';
import { ErpItem } from '@/lib/erp/types';

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

  // Estado para Línea (Catálogo ERP)
  const [items, setItems] = useState<ErpItem[]>([]);
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
            if (data.length > 0) setDepartamento(data[0].codigo);
          }
        });
      }
      
      if (proyecto?.empresaId) {
        setIsLoadingCatalogo(true);
        setLoadingTurnos(true);
        setLoadingUniformes(true);
        setLoadingServicios(true);
        
        Promise.all([
          getCatalogoItems(proyecto.empresaId),
          getServiciosVenta(proyecto.empresaId),
          getTurnos(proyecto.empresaId),
          getUniformes(proyecto.empresaId)
        ]).then(([itemsData, serviciosData, turnosData, uniformesData]) => {
          if (active) {
            setItems(itemsData);
            setServicios(serviciosData);
            setTurnos(turnosData);
            setUniformes(uniformesData);
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
      setSelectedItemId('');
      setError(null);
      setCantidad(1);
      setPrecioVenta(undefined);
      setTurnoCodigo(undefined);
      setUniformeCodigo('');
      setCubreDescanso(0);
      setCantidadTurnos(1);
    }
    return () => { active = false; };
  }, [open, hasDireccion, proyecto?.empresaId]);

  useEffect(() => {
    let active = true;
    if (open && departamento && hasDireccion) {
      setLoadingMunis(true);
      getMunicipios('GT', departamento).then(data => {
        if (active) {
          setMunicipios(data);
          setLoadingMunis(false);
          if (data.length > 0) setMunicipio(data[0].codigo);
          else setMunicipio('');
        }
      });
    } else if (!open || !hasDireccion) {
      setMunicipios([]);
      setMunicipio('');
    }
    return () => { active = false; };
  }, [open, departamento, hasDireccion]);

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
    const creatingNode = !isLineLevel && !!cleanNombre;
    
    if (!creatingNode && !hasLineaInfo) {
      if (!isLineLevel) {
        setError(`Debe ingresar el Nombre para crear un ${lblN} o seleccionar un Item para agregarlo directo.`);
      } else {
        setError(`Debe realizar la Selección Item.`);
      }
      return;
    }

    let hasFieldErrors = false;
    const newFieldErrors: Record<string, string> = {};
    
    if (creatingNode) {
      if (hasDireccion) {
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
        if (erpItem.tieneReceta) {
          const componentes = await getRecetaDeItem(erpItem.id);
          if (componentes.length > 0) {
            recetasDelRecurso.push({
              id: `RECC-${Date.now()}`,
              recetaCatalogoId: `ERP-${erpItem.id}`,
              nombre: `Componentes de ${erpItem.nombre}`,
              items: componentes.map(comp => ({
                id: `ITR-${Date.now()}-${Math.random()}`,
                erpItemId: comp.itemId,
                nombre: comp.itemNombre,
                categoria: comp.itemCategoria as any,
                tipoCosto: comp.itemTipoCosto as any,
                cantidad: comp.cantidad,
                costoUnitario: comp.costoUnitario,
              }))
            });
          }
        }

        if (isEstandar) {
          if (servicioSeleccionado.item_registro === 2) {
            // Activo: N recursos de cantidad 1
            for(let i = 0; i < cantidad; i++) {
              recursosNuevos.push({
                id: `REC-${Date.now()}-${i}`,
                erpItemId: erpItem.id,
                nombre: erpItem.nombre,
                categoria: erpItem.tipo as any,
                tipoCosto: erpItem.tipoCosto as any,
                cantidad: 1,
                costoUnitario: erpItem.costoUnitario,
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
              erpItemId: erpItem.id,
              nombre: erpItem.nombre,
              categoria: erpItem.tipo as any,
              tipoCosto: erpItem.tipoCosto as any,
              cantidad: cantidad,
              costoUnitario: erpItem.costoUnitario,
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
            erpItemId: erpItem.id,
            nombre: erpItem.nombre,
            categoria: 'RECURSO_HUMANO',
            tipoCosto: erpItem.tipoCosto as any,
            cantidad: cantidadTurnos,
            costoUnitario: erpItem.costoUnitario,
            precioVentaUnitario: precioVenta,
            precioVentaOrigen: 'MANUAL',
            itemServicio: servicioSeleccionado,
            turnoCodigo,
            uniformeCodigo,
            personas,
            horasSemana,
            cubreDescanso,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="p-1 hover:bg-slate-200 rounded text-slate-500" title={level === 1 ? `Agregar a Proyecto` : `Agregar a ${parentName || 'Nodo'}`} />}>
        <Plus className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className={cn(!isLineLevel ? "sm:max-w-[950px] w-[95vw]" : "sm:max-w-[500px]", "h-[90vh] sm:h-[600px] flex flex-col")}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-2 border border-red-200 shrink-0">
            {error}
          </div>
        )}
        
        <div className={cn(!isLineLevel ? "grid grid-cols-2 gap-0" : "", "flex-1 overflow-y-auto pr-2 py-2")}>
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
                />
                {fieldErrors.nombre && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nombre}</p>}
              </div>
              
              {hasDireccion && (
                <div className="pt-2">
                  <div className="flex items-center mb-3">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                      UBICACION
                    </h3>
                    <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
                  </div>
                  <div className="space-y-2">
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
                      disabled={loadingDeptos || departamentos.length === 0}
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
                      disabled={loadingMunis || !departamento || municipios.length === 0}
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

          <div className={cn("space-y-2", !isLineLevel ? "pl-6" : "")}>

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
                      label: `${item.codigo} - ${item.nombre} ${item.tieneReceta ? '(Con Receta)' : ''}`
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

            {selectedItemId && servicioSeleccionado && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="pt-2">
                  <div className="flex items-center mb-3">
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
                    <div className="col-span-2 py-2">
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

                <div className="pt-2">
                  <div className="flex items-center mb-3">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                      FINANCIERO
                    </h3>
                    <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>
                      Precio Venta ({proyecto?.moneda || 'Q'})
                    </Label>
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
                    {!isEstandar && (
                      <p className="text-xs text-slate-500 italic">
                        * Por Persona
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 flex flex-col gap-1">
                    <Label>
                      Total Venta ({proyecto?.moneda || 'Q'})
                    </Label>
                    <input
                      type="text"
                      value={(() => {
                        let total = 0;
                        if (isEstandar) {
                          total = (cantidad || 1) * (precioVenta || 0);
                        } else {
                          const personas = turnoSeleccionado?.personas || 1;
                          total = (cantidadTurnos || 1) * personas * (precioVenta || 0);
                        }
                        return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total);
                      })()}
                      readOnly
                      tabIndex={-1}
                      className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 font-bold text-blue-700 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
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
    </Dialog>
  );
}

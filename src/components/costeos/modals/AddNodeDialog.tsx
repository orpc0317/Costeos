import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { NodoCosteo, RecursoCosteo, BonoCosteo, ComboDisponible } from '@/lib/types/costeos';
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
import { FieldError } from '@/components/ui/field-error';
import { Plus, Loader2, Trash, Settings2, Gift, Layers } from 'lucide-react';
import { normalizeText } from '@/lib/utils/text';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getDepartamentosERP, getMunicipiosERP, getTurnosERP, getServiciosVentaERP, getClienteDireccionesERP } from '@/app/actions/erp';
import { crearOObtenerSolicitud, getCostoVigente } from '@/app/actions/solicitudes';
import type { ErpTurno, ErpServicioVenta, ErpDireccionOperativa } from '@/lib/erp';
import { AddressLookupModal } from './AddressLookupModal';
import { Search } from 'lucide-react';
import { TurnoCard } from '../TurnoCard';
import { listarItems, getCostosUltimosManual } from '@/app/actions/items';
import { ItemRow, DetalleComboRow } from '@/lib/types/items';
import { buildCombosDisponibles } from '@/lib/utils/combos';
import { listarTiposComboRHPorEmpresa } from '@/app/actions/tipos-combo-rh';
import { listarTiposCombosPorEmpresa } from '@/app/actions/tipos-combo';
import type { TipoComboRHRow } from '@/lib/types/tipos-combo-rh';

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
  
  const [departamentos, setDepartamentos] = useState<import('@/lib/erp').ErpDepartamento[]>([]);
  const [municipios, setMunicipios] = useState<import('@/lib/erp').ErpMunicipio[]>([]);;
  const [loadingDeptos, setLoadingDeptos] = useState(false);
  const [loadingMunis, setLoadingMunis] = useState(false);

  const [direccionesOperativas, setDireccionesOperativas] = useState<ErpDireccionOperativa[]>([]);
  const [loadingDirecciones, setLoadingDirecciones] = useState(false);
  const [direccionSecuencia, setDireccionSecuencia] = useState<number | undefined>(undefined);
  const [isNewAddress, setIsNewAddress] = useState<boolean>(false);
  const [showAddressLookup, setShowAddressLookup] = useState<boolean>(false);

  // Estado para Línea (Catálogo local)
  const [items, setItems] = useState<ItemRow[]>([]);
  const [servicios, setServicios] = useState<ErpServicioVenta[]>([]);
  const [turnos, setTurnos] = useState<ErpTurno[]>([]);
  
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // State for TiposComboRH (legacy / compatibility)
  const [tiposComboRH, setTiposComboRH] = useState<TipoComboRHRow[]>([]);
  // Map: tipoComboRHId -> selected itemId (as string)
  const [combosRHSeleccionados, setCombosRHSeleccionados] = useState<Record<number, string>>({});

  // Nueva arquitectura: Tipos Combo del ítem primario
  // Map: tipoComboId → itemId seleccionado (string)
  const [combosSeleccionados, setCombosSeleccionados] = useState<Record<number, string>>({});
  // Map: tipoComboId → true si el usuario marcó incluir (solo relevante para obligatorio=false)
  const [combosIncluidos, setCombosIncluidos] = useState<Record<number, boolean>>({});
  // Mapa id→nombre de TiposCombos de la empresa (para mostrar nombre en la tabla)
  const [tiposCombosNombres, setTiposCombosNombres] = useState<Record<number, string>>({});

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  // Nombre ingresado manualmente para ítems Genéricos (tipoItem=2)
  const [nombreGenerico, setNombreGenerico] = useState<string>('');
  
  // Dynamic Fields for Línea
  const [cantidad, setCantidad] = useState<number>(1);
  const [precioVenta, setPrecioVenta] = useState<number | undefined>();
  const [costoUnitario, setCostoUnitario] = useState<number | undefined>(); // editable solo si manejoCostos=4
  const [turnoCodigo, setTurnoCodigo] = useState<number | undefined>();
  const [cubreDescanso, setCubreDescanso] = useState<number>(0);
  
  const [bonosDisponibles, setBonosDisponibles] = useState<{ codigo: string; descripcion: string; costo: number; manejoCostos: number; precioVentaCero: boolean }[]>([]);
  const [bonosAgregados, setBonosAgregados] = useState<BonoCosteo[]>([]);
  const [selectedBonoId, setSelectedBonoId] = useState<string>('');
  const [selectedBonoCosto, setSelectedBonoCosto] = useState<number>(0);  // costo del bono (si manejoCostos=4)
  const [cantidadTurnos, setCantidadTurnos] = useState<number>(1);

  // Mapa itemId → último costo manual (manejoCostos=2) cargado al abrir el dialog
  const [costosManuales, setCostosManuales] = useState<Record<number, number>>({});

  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('general');

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
        getDepartamentosERP().then(data => {
          if (active) {
            setDepartamentos(data);
            setLoadingDeptos(false);
            if (data.length > 0 && !departamento) setDepartamento(String(data[0].codigo));
          }
        });

        if (proyecto?.empresaId && proyecto?.cliente?.id) {
          setLoadingDirecciones(true);
          const clienteErpId = parseInt(proyecto.cliente.codigo || proyecto.cliente.id, 10);
          getClienteDireccionesERP(proyecto.empresaId, clienteErpId).then(dirs => {
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
        setLoadingServicios(true);
        
        Promise.all([
          listarItems(),
          getServiciosVentaERP(proyecto.empresaId),
          getTurnosERP(proyecto.empresaId),
          listarTiposComboRHPorEmpresa(proyecto.empresaId),
          listarTiposCombosPorEmpresa(proyecto.empresaId),
        ]).then(async ([itemsData, serviciosData, turnosData, tiposData, tiposCombosData]) => {
          if (!active) return;
          const itemsDeEmpresa = itemsData.filter(i => i.empresaId === proyecto!.empresaId);

          // Cargar costos manuales en batch para todos los ítems con manejoCostos=2
          const idsManual = itemsDeEmpresa
            .filter(i => i.manejoCostos === 2)
            .map(i => i.id);
          const costosMap = idsManual.length > 0
            ? await getCostosUltimosManual(idsManual)
            : {};
          if (active) setCostosManuales(costosMap);

          // Separar bonos (tipoItem=6) del catálogo principal
          const bonosItems = itemsDeEmpresa.filter(i => i.tipoItem === 6);
          if (active) {
            setItems(itemsDeEmpresa);
            setBonosDisponibles(bonosItems.map(b => ({
              codigo:          b.codigoErp ?? String(b.id),
              descripcion:     b.descripcion,
              costo:           b.manejoCostos === 2 ? (costosMap[b.id] ?? 0) : 0,
              manejoCostos:    b.manejoCostos,
              precioVentaCero: b.precioVentaCero,
            })));
            setServicios(serviciosData);
            setTurnos(turnosData);
            setTiposComboRH(tiposData);
            // Mapa id→nombre para TiposCombos
            const nombresMap: Record<number, string> = {};
            tiposCombosData.forEach(t => { nombresMap[t.id] = t.nombre; });
            setTiposCombosNombres(nombresMap);
            setIsLoadingCatalogo(false);
            setLoadingServicios(false);
            setLoadingTurnos(false);
          }
        }).catch(err => {
          console.error("Error al cargar dependencias:", err);
          if (active) {
            setIsLoadingCatalogo(false);
            setLoadingServicios(false);
            setLoadingTurnos(false);
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
      setNombreGenerico('');
      setError(null);
      setFieldErrors({});
      setActiveTab('general');
      setCantidad(1);
      setPrecioVenta(undefined);
      setCostoUnitario(undefined);
      setTurnoCodigo(undefined);
      setCombosRHSeleccionados({});
      setCombosSeleccionados({});
      setCombosIncluidos({});
      setCubreDescanso(0);
      setCantidadTurnos(1);
      setBonosAgregados([]);
      setSelectedBonoId('');
      setSelectedBonoCosto(0);
      setTiposComboRH([]);
    }
    return () => { active = false; };
  }, [open, hasDireccion, proyecto?.empresaId, proyecto?.cliente?.id]);

  useEffect(() => {
    let active = true;
    if (open && departamento && hasDireccion) {
      setLoadingMunis(true);
      getMunicipiosERP(Number(departamento)).then(data => {
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

  // localItem: ítem local (BD Costeos), selectedItemId es su id numérico como string
  const localItem = items.find(i => i.id.toString() === selectedItemId);

  // sinErp: el ítem no tiene codigoErp — no existe en el ERP (aún o nunca)
  // Se trata siempre como Estándar simple, costo según manejoCostos
  const sinErp = !!localItem && !localItem.codigoErp;

  // manejoCostos=99 → 'No Aplica': el ítem no tiene manejo de costos en este sistema
  // Se incluye en la estructura con Costo 0.00 (campo bloqueado, no editable)
  const sinManejoCotos = localItem?.manejoCostos === 99;

  // tipoItem=2 → Ítem Genérico: el usuario debe ingresar un nombre/descripción libre
  // Manejo Costos siempre es 4 (Solicitar Usuario). NO genera Solicitudes ni Cotizaciones.
  const isGenerico = localItem?.tipoItem === 2;

  // servicioSeleccionado: complemento del ERP — se busca por el codigoErp del ítem local,
  // que coincide con el campo `codigo` del SP sp_buscar_items
  const servicioSeleccionado = localItem?.codigoErp
    ? servicios.find(s => s.codigo === localItem.codigoErp)
    : undefined;

  // RRHH: tipoItem=3 (Servicio) + tipoProducto=1 (Outsourcing) → formulario de turno/uniforme/personas
  // Para todo lo demás (incluyendo sinErp, tipoItem≠3, tipoProducto≠1) → formulario estándar
  const isEstandar = !localItem || localItem.tipoItem !== 3 || localItem.tipoProducto !== 1;

  // manejoCostos=4 → 'Solicitar Usuario': el campo Costo Un. es editable
  // manejoCostos=99 → No Aplica: nunca editable, siempre 0
  const solicitarCosto = !sinManejoCotos && localItem?.manejoCostos === 4;

  // Bono actualmente seleccionado en el tab Bonos
  const bonoSeleccionado = bonosDisponibles.find(b => b.codigo === selectedBonoId);
  const bonoSolicitaCosto = bonoSeleccionado?.manejoCostos === 4;

  const turnoSeleccionado = turnos.find(t => t.codigo === turnoCodigo);
  const diasTrabajo = turnoSeleccionado
    ? ((turnoSeleccionado.lunes || 0) + (turnoSeleccionado.martes || 0) + (turnoSeleccionado.miercoles || 0) + (turnoSeleccionado.jueves || 0) + (turnoSeleccionado.viernes || 0) + (turnoSeleccionado.sabado || 0) + (turnoSeleccionado.domingo || 0))
    : 0;
  const trabaja7Dias = diasTrabajo === 7;

  // Factor de multiplicación del costo (igual al de precio)
  const factorCosto = isEstandar
    ? (cantidad || 1)
    : ((cantidadTurnos || 1) * (turnoSeleccionado?.personas || 1));

  // Items disponibles por tipo (solo rol DISPONIBLE — excluye items RH que tienen NECESITA)
  const itemsPorTipoComboRH = React.useMemo(() => {
    const map: Record<number, ItemRow[]> = {};
    for (const tipo of tiposComboRH) {
      map[tipo.id] = items.filter(item =>
        item.tiposComboRH?.some(t => t.tipoComboRHId === tipo.id && t.rol === 'DISPONIBLE')
      );
    }
    return map;
  }, [tiposComboRH, items]);

  // TiposComboRH que el ítem RH necesita (rol NECESITA) — determina qué selects mostrar
  const tiposComboRHDelItem = tiposComboRH.filter(t =>
    localItem?.tiposComboRH?.some(pt => pt.tipoComboRHId === t.id && pt.rol === 'NECESITA')
  );

  // Nueva arquitectura: items disponibles por TipoCombo (campo tipoComboId en Parámetros)
  const itemsPorTipoCombo = React.useMemo(() => {
    const map: Record<number, ItemRow[]> = {};
    if (!localItem?.tiposCombo) return map;
    for (const asoc of localItem.tiposCombo) {
      map[asoc.tipoComboId] = items
        .filter(i => i.tipoComboId === asoc.tipoComboId)
        .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    }
    return map;
  }, [localItem, items]);

  // Resetear selecciones de combos cuando cambia el item primario
  useEffect(() => {
    setCombosSeleccionados({});
    setCombosIncluidos({});
    setNombreGenerico('');
  }, [selectedItemId]);

  useEffect(() => {
    if (!trabaja7Dias) {
      setCubreDescanso(0);
    }
  }, [trabaja7Dias]);

  // Al cambiar de item: resetear precio y costo
  useEffect(() => {
    // Precio: usar precioVentaCero del servicio ERP (si existe) o del ítem local
    const esPrecioVentaCero = servicioSeleccionado
      ? servicioSeleccionado.precioVentaCero === 1
      : localItem?.precioVentaCero === true;

    if (esPrecioVentaCero) {
      setPrecioVenta(0);
    } else {
      setPrecioVenta(undefined);
    }
    // manejoCostos=1 (Compras): intentar obtener el último costo vigente de las cotizaciones
    // manejoCostos=2 (Manual): auto-cargar el último costo registrado
    // manejoCostos=99 (No Aplica): forzar siempre 0
    if (localItem?.manejoCostos === 1) {
      // Async fetch
      getCostoVigente(localItem.id, proyecto?.id ? Number(proyecto.id) : undefined).then(costo => {
        setCostoUnitario(costo ?? undefined);
      });
    } else if (localItem?.manejoCostos === 2) {
      setCostoUnitario(costosManuales[localItem.id] ?? 0);
    } else if (localItem?.manejoCostos === 99) {
      setCostoUnitario(0);
    } else {
      setCostoUnitario(undefined); // siempre resetear al cambiar item
    }
  }, [servicioSeleccionado, localItem?.id, localItem?.manejoCostos, proyecto?.id]);

  // Al cambiar el bono seleccionado: resetear costo del bono
  useEffect(() => {
    setSelectedBonoCosto(0);
  }, [selectedBonoId]);

  const handleAdd = async () => {
    setError(null);
    setFieldErrors({});
    const cleanNombre = normalizeText(nombre);
    const cleanDireccion = normalizeText(direccion);
    
    const hasLineaInfo = !!selectedItemId;
    // creatingNode = true solo si el usuario llenó el nombre O ingresó datos de dirección explícitamente
    const userFilledDireccion = hasDireccion && (!!cleanDireccion || !!direccionSecuencia);
    const creatingNode = !isLineLevel && (!!cleanNombre || userFilledDireccion);
    
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
      // Inválido solo si: (a) no hay localItem en BD local, o
      // (b) tiene codigoErp pero no se encontró en el ERP (puede ser código obsoleto)
      if (!localItem || (localItem.codigoErp && !servicioSeleccionado)) {
        newFieldErrors.selectedItemId = !localItem
          ? "Item no encontrado en el catálogo."
          : "Item no válido: el código ERP ya no existe en el sistema.";
        hasFieldErrors = true;
      } else {
        // Precio Venta: requerido; solo puede ser 0 si el item tiene precioVentaCero=true
        if (precioVenta === undefined || (precioVenta === 0 && !localItem.precioVentaCero)) {
          newFieldErrors.precioVenta = precioVenta === 0
            ? "El Precio de Venta no puede ser 0.00 para este item."
            : "El Precio de Venta es requerido.";
          hasFieldErrors = true;
        }
        // Costo Unitario: requerido y > 0 cuando manejoCostos = 4 (Solicitar Usuario)
        if (solicitarCosto && (!costoUnitario || costoUnitario <= 0)) {
          newFieldErrors.costoUnitario = "El Costo Unitario es requerido y debe ser mayor a 0.00.";
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
          // Check all REQUIRED TipoComboRH types have a selection
          for (const tipo of tiposComboRHDelItem) {
            if (tipo.requerido && !combosRHSeleccionados[tipo.id]) {
              newFieldErrors[`comboRH_${tipo.id}`] = `Debe seleccionar ${tipo.nombre}.`;
              hasFieldErrors = true;
            }
          }
          if (trabaja7Dias && cubreDescanso === 0) {
            newFieldErrors.cubreDescanso = "Debe seleccionar una opción válida para Cubre Descanso.";
            hasFieldErrors = true;
          }
        }

        // Validar Tipos Combo: solo los obligatorios o los que el usuario marcó incluir
        if (localItem?.tiposCombo) {
          for (const asoc of localItem.tiposCombo) {
            const incluido = asoc.obligatorio ? true : (combosIncluidos[asoc.tipoComboId] ?? false);
            if (incluido && !combosSeleccionados[asoc.tipoComboId]) {
              const nombre = tiposCombosNombres[asoc.tipoComboId] || `Tipo ${asoc.tipoComboId}`;
              newFieldErrors[`tipoCombo_${asoc.tipoComboId}`] = `Debe seleccionar un ítem para "${nombre}".`;
              hasFieldErrors = true;
            }
          }
        }

        // Ítem Genérico: nombre/descripción es obligatorio
        if (isGenerico && !normalizeText(nombreGenerico).trim()) {
          newFieldErrors.nombreGenerico = 'Debe ingresar una descripción para el ítem genérico.';
          hasFieldErrors = true;
        }

      }
    }

    // Validar bonos agregados: si el bono tiene manejoCostos=4 y costoUnitario=0 → error
    const bonosConCostoFaltante = bonosAgregados.filter(b => {
      const bonoConfig = bonosDisponibles.find(bd => bd.codigo === b.erpBonoId);
      return bonoConfig?.manejoCostos === 4 && (b.costoUnitario ?? 0) <= 0;
    });
    if (bonosConCostoFaltante.length > 0) {
      newFieldErrors.bonosCosto = `${bonosConCostoFaltante.length > 1 ? `${bonosConCostoFaltante.length} bonos requieren` : `El bono "${bonosConCostoFaltante[0].nombre}" requiere`} un Costo Unitario mayor a 0.00.`;
      hasFieldErrors = true;
    }

    if (hasFieldErrors) {
      setFieldErrors(newFieldErrors);
      // Navegar al tab que contiene el primer error
      const primerError = Object.keys(newFieldErrors)[0];
      if (primerError === 'bonosCosto') {
        setActiveTab('bonos');
      } else {
        setActiveTab('general');
      }
      setTimeout(() => {
        const el = document.getElementById(`field-${primerError}`);
        if (el) el.focus();
      }, 100);
      return;
    }
    
    setIsAdding(true);
    try {
      const recursosNuevos: RecursoCosteo[] = [];

      if (hasLineaInfo && localItem) {
        let recetasDelRecurso: any[] = [];
        
        // Determinar categoría basada en tipoItem y tipoProducto (nueva taxonomía 1-6)
        // 1=Producto → ARTICULO, 2=ProdGenérico → ARTICULO
        // 3=Servicio+tipoProducto=1 → RECURSO_HUMANO, 3=Servicio → SERVICIO
        // 4=Equipo → EQUIPO, 5=Financiero/6=Bono → SERVICIO
        let catStr = 'SERVICIO';
        if (localItem.tipoItem === 1 || localItem.tipoItem === 2) catStr = 'ARTICULO';
        if (localItem.tipoItem === 4) catStr = 'EQUIPO';
        if (localItem.tipoItem === 3) {
          catStr = localItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';
        }

        // costoFinal: 0 cuando manejoCostos=99, de lo contrario el valor ingresado/auto-cargado
        const costoFinal = sinManejoCotos ? 0 : (costoUnitario || 0);

        // Nombre del recurso: para Genéricos, usar el nombre ingresado manualmente
        const nombreRecurso = isGenerico ? normalizeText(nombreGenerico).trim() : localItem.descripcion;

        if (isEstandar) {
          // Para Equipos (tipoItem=4): N recursos de cantidad 1 (Activo)
          if (localItem.tipoItem === 4) {
            // Activo: N recursos de cantidad 1
            for(let i = 0; i < cantidad; i++) {
              recursosNuevos.push({
                id: `REC-${Date.now()}-${i}`,
                itemId: localItem.id,
                nombre: nombreRecurso,
                categoria: catStr as any,
                tipoCosto: 'MENSUAL',
                cantidad: 1,
                costoUnitario: costoFinal,
                precioVentaUnitario: precioVenta,
                precioVentaOrigen: 'MANUAL',
                itemServicio: servicioSeleccionado,
                recetas: recetasDelRecurso
              });
            }
          } else {
          // Estándar u otros (incluyendo sinErp y Genérico): 1 recurso de cantidad N
            recursosNuevos.push({
              id: `REC-${Date.now()}`,
              itemId: localItem.id,
              nombre: nombreRecurso,
              categoria: catStr as any,
              tipoCosto: 'MENSUAL',
              cantidad: cantidad,
              costoUnitario: costoFinal,
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
              (turnoSeleccionado.lunes === 1 ? turnoSeleccionado.lunesHoras : 0) +
              (turnoSeleccionado.martes === 1 ? turnoSeleccionado.martesHoras : 0) +
              (turnoSeleccionado.miercoles === 1 ? turnoSeleccionado.miercolesHoras : 0) +
              (turnoSeleccionado.jueves === 1 ? turnoSeleccionado.juevesHoras : 0) +
              (turnoSeleccionado.viernes === 1 ? turnoSeleccionado.viernesHoras : 0) +
              (turnoSeleccionado.sabado === 1 ? turnoSeleccionado.sabadoHoras : 0) +
              (turnoSeleccionado.domingo === 1 ? turnoSeleccionado.domingoHoras : 0);
          }

          recursosNuevos.push({
            id: `REC-${Date.now()}`,
            itemId: localItem.id,
            nombre: localItem.descripcion,
            categoria: 'RECURSO_HUMANO',
            tipoCosto: 'MENSUAL',
            cantidad: cantidadTurnos,
            costoUnitario: costoFinal,
            precioVentaUnitario: precioVenta,
            precioVentaOrigen: 'MANUAL',
            itemServicio: servicioSeleccionado,
            turnoCodigo,
            combosRhSeleccionados: Object.fromEntries(
              Object.entries(combosRHSeleccionados)
                .filter(([, v]) => v)
                .map(([k, v]) => [k, v])
            ),
            // Backward compat: derive uniformeCodigo from the tipo named 'UNIFORME' if it exists
            uniformeCodigo: String(combosRHSeleccionados[tiposComboRH.find(t => t.nombre === 'UNIFORME')?.id ?? 0] || ''),
            personas,
            horasSemana,
            cubreDescanso,
            bonos: bonosAgregados,
            recetas: recetasDelRecurso
          });

        }
      }

      // Adjuntar combosDisponibles al recurso primario (árbol completo del catálogo,
      // incluidos opcionales e hijos anidados) para que el EditorPanel pueda mostrarlos
      if (recursosNuevos.length > 0 && localItem && localItem.combosPrincipal?.length) {
        recursosNuevos[0] = {
          ...recursosNuevos[0],
          combosDisponibles: buildCombosDisponibles(localItem.combosPrincipal, items, costosManuales),
        };
      }

      // Auto-agregar ítems del combo si el ítem primario tiene combos definidos
      if (hasLineaInfo && localItem && localItem.combosPrincipal && localItem.combosPrincipal.length > 0 && recursosNuevos.length > 0) {
        // El primario es siempre el primer recurso del array (para el caso de Activos, solo se enlaza al primero)
        const primaryId = recursosNuevos[0].id;

        for (const combo of localItem.combosPrincipal) {
          // Solo incluir combos con Incluir Nuevo activo y cantidad > 0
          if (!combo.nuevoIncluido || Number(combo.nuevoCantidad) <= 0) continue;

          const secItem = items.find(i => i.id === combo.productoSecundarioId);
          if (!secItem) continue; // Item secundario no encontrado en el catálogo local

          let secCat = 'SERVICIO';
          if (secItem.tipoItem === 1 || secItem.tipoItem === 2) secCat = 'ARTICULO';
          if (secItem.tipoItem === 4) secCat = 'EQUIPO';
          if (secItem.tipoItem === 3) {
            secCat = secItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';
          }

          const comboCantidad = Math.max(1, Math.round((Number(combo.nuevoCantidad) || 1) * factorCosto));

          recursosNuevos.push({
            id: `REC-${Date.now()}-C${combo.productoSecundarioId}`,
            itemId: secItem.id,
            nombre: secItem.descripcion,
            categoria: secCat as any,
            tipoCosto: 'MENSUAL',
            cantidad: comboCantidad,
            costoUnitario: secItem.manejoCostos === 2 ? (costosManuales[secItem.id] ?? 0) : 0,
            precioVentaUnitario: 0,
            precioVentaOrigen: 'MANUAL',
            esCombo: true,
            comboParentId: primaryId,
            recetas: [],
          });
        }
      }

      // Auto-agregar ítems de Combos RH cuando es RRHH
      // Para cada tipo que el usuario seleccionó un ítem
      if (!isEstandar && recursosNuevos.length > 0) {
        const primaryId = recursosNuevos[0].id;

        for (const tipo of tiposComboRHDelItem) {
          const selectedComboItemId = combosRHSeleccionados[tipo.id];
          if (!selectedComboItemId) continue; // optional, not selected

          const comboItemId = parseInt(selectedComboItemId, 10);
          const comboItem = items.find(i => i.id === comboItemId);
          if (!comboItem) continue;


          const comboRecursoId = `REC-${Date.now()}-RH${tipo.id}`;

          let comboCat = 'ARTICULO';
          if (comboItem.tipoItem === 4) comboCat = 'EQUIPO';
          if (comboItem.tipoItem === 3)
            comboCat = comboItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';

          // Add the combo RH item as a child of the primary resource
          recursosNuevos.push({
            id: comboRecursoId,
            itemId: comboItem.id,
            nombre: comboItem.descripcion,
            categoria: comboCat as any,
            tipoCosto: 'MENSUAL',
            cantidad: factorCosto,
            costoUnitario: comboItem.manejoCostos === 2 ? (costosManuales[comboItem.id] ?? 0) : 0,
            precioVentaUnitario: 0,
            precioVentaOrigen: 'MANUAL',
            esCombo: true,
            esComboRHId: tipo.id,
            // Keep esUniforme=true for backward compat when tipo.nombre === 'UNIFORME'
            esUniforme: tipo.nombre === 'UNIFORME',
            comboParentId: primaryId,
            recetas: [],
          });

          // Add the sub-combos of this combo item, scaled by factorCosto
          for (const subCombo of comboItem.combosPrincipal ?? []) {
            if (!subCombo.nuevoIncluido || Number(subCombo.nuevoCantidad) <= 0) continue;
            const secItem = items.find(i => i.id === subCombo.productoSecundarioId);
            if (!secItem) continue;

            let secCat = 'SERVICIO';
            if (secItem.tipoItem === 1 || secItem.tipoItem === 2) secCat = 'ARTICULO';
            if (secItem.tipoItem === 4) secCat = 'EQUIPO';
            if (secItem.tipoItem === 3)
              secCat = secItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';

            recursosNuevos.push({
              id: `REC-${Date.now()}-RH${tipo.id}C${subCombo.productoSecundarioId}`,
              itemId: secItem.id,
              nombre: secItem.descripcion,
              categoria: secCat as any,
              tipoCosto: 'MENSUAL',
              cantidad: Math.max(1, Math.round(Number(subCombo.nuevoCantidad) * factorCosto)),
              costoUnitario: secItem.manejoCostos === 2 ? (costosManuales[secItem.id] ?? 0) : 0,
              precioVentaUnitario: 0,
              precioVentaOrigen: 'MANUAL',
              esCombo: true,
              comboParentId: comboRecursoId,
              recetas: [],
            });
          }
        }
      }

      // ── Auto-agregar ítems de Tipos Combo (nueva arquitectura) ─────────────────
      // Para cada tipo que tiene selección en combosSeleccionados
      if (recursosNuevos.length > 0 && localItem?.tiposCombo && localItem.tiposCombo.length > 0) {
        const primaryId = recursosNuevos[0].id;

        for (const asoc of localItem.tiposCombo) {
          const incluido = asoc.obligatorio ? true : (combosIncluidos[asoc.tipoComboId] ?? false);
          if (!incluido) continue; // opcional no marcado — no agregar

          const selectedItemIdStr = combosSeleccionados[asoc.tipoComboId];
          if (!selectedItemIdStr) continue; // incluido pero sin ítem seleccionado

          const comboItemId = parseInt(selectedItemIdStr, 10);
          const comboItem = items.find(i => i.id === comboItemId);
          if (!comboItem) continue;

          const comboRecursoId = `REC-${Date.now()}-TC${asoc.tipoComboId}`;

          let comboCat: RecursoCosteo['categoria'] = 'ARTICULO';
          if (comboItem.tipoItem === 4) comboCat = 'EQUIPO';
          if (comboItem.tipoItem === 3)
            comboCat = comboItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';

          recursosNuevos.push({
            id: comboRecursoId,
            itemId: comboItem.id,
            nombre: comboItem.descripcion,
            categoria: comboCat,
            tipoCosto: 'MENSUAL',
            cantidad: factorCosto,
            costoUnitario: comboItem.manejoCostos === 2 ? (costosManuales[comboItem.id] ?? 0) : 0,
            precioVentaUnitario: 0,
            precioVentaOrigen: 'MANUAL',
            esCombo: true,
            comboParentId: primaryId,
            recetas: [],
          });

          // Sub-combos del item combo seleccionado
          for (const subCombo of comboItem.combosPrincipal ?? []) {
            if (!subCombo.nuevoIncluido || Number(subCombo.nuevoCantidad) <= 0) continue;
            const secItem = items.find(i => i.id === subCombo.productoSecundarioId);
            if (!secItem) continue;

            let secCat: RecursoCosteo['categoria'] = 'SERVICIO';
            if (secItem.tipoItem === 1 || secItem.tipoItem === 2) secCat = 'ARTICULO';
            if (secItem.tipoItem === 4) secCat = 'EQUIPO';
            if (secItem.tipoItem === 3)
              secCat = secItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';

            recursosNuevos.push({
              id: `REC-${Date.now()}-TC${asoc.tipoComboId}C${subCombo.productoSecundarioId}`,
              itemId: secItem.id,
              nombre: secItem.descripcion,
              categoria: secCat,
              tipoCosto: 'MENSUAL',
              cantidad: Math.max(1, Math.round(Number(subCombo.nuevoCantidad) * factorCosto)),
              costoUnitario: secItem.manejoCostos === 2 ? (costosManuales[secItem.id] ?? 0) : 0,
              precioVentaUnitario: 0,
              precioVentaOrigen: 'MANUAL',
              esCombo: true,
              comboParentId: comboRecursoId,
              recetas: [],
            });
          }
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
        recursosNuevos.forEach((recurso, idx) => {
          dispatch({ type: 'ADD_RECURSO', payload: { nodoId: parentId, recurso } });
          if (idx === 0) dispatch({ type: 'SELECT_NODE', payload: { type: 'RECURSO', id: recurso.id } });
        });
      }

      // ── Módulo Compras: Generar Solicitud de Cotización ──────────────────────
      // Si algún recurso agregado usa manejoCostos = 1 (Compras), intentar crear solicitud.
      // EXCEPCIÓN: ítems Genéricos (tipoItem=2) NO generan solicitudes ni cotizaciones.
      const empresasSet = new Set(recursosNuevos.map(r => items.find(i => i.id === r.itemId)?.empresaId).filter(Boolean));
      // Toma la primera empresa de los ítems (todos deberían ser de la misma empresa)
      const empId = empresasSet.values().next().value;
      if (empId) {
        for (const recurso of recursosNuevos) {
          const it = items.find(i => i.id === recurso.itemId);
          if (it?.manejoCostos === 1 && it.tipoItem !== 2) {
            crearOObtenerSolicitud({
              itemId: it.id,
              costeoId: proyecto?.id ? Number(proyecto.id) : undefined,
              scope: it.cotizacionScope ?? 'GENERAL',
              empresaId: Number(empId),
            }).catch(e => console.error('Error auto-creando solicitud cotización:', e));
          }
        }
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

      {/* Selector de bono */}
      <div className="flex flex-col gap-1.5">
        <Label>Seleccionar Bono</Label>
        <SearchableSelect
          options={[
            { value: '', label: 'Seleccione...' },
            ...bonosDisponibles
              .slice()
              .sort((a, b) => a.descripcion.localeCompare(b.descripcion))
              .map(b => ({ value: b.codigo, label: b.descripcion }))
          ]}
          value={selectedBonoId}
          onChange={(val) => setSelectedBonoId(val)}
          placeholder="Seleccione..."
          searchable={false}
        />
      </div>

      {/* Sección FINANCIERO — solo Costo */}
      <div className="pt-1">
        <div className="flex items-center mb-3 min-h-[24px]">
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
            FINANCIERO
          </h3>
          <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5" />
        </div>

        {/* Fila Costo */}
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label>Costo Unitario ({proyecto?.moneda || 'Q'})</Label>
            {bonoSolicitaCosto ? (
              <NumericInput
                value={selectedBonoCosto}
                onChange={(val: number | undefined) => setSelectedBonoCosto(val || 0)}
                min="0"
                className="flex h-8 w-full rounded-sm border border-indigo-300 bg-white px-2.5 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            ) : (
              <input
                type="text"
                readOnly tabIndex={-1}
                value={(bonoSeleccionado?.costo ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
              />
            )}
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label>SubTotal Costo</Label>
            <input
              type="text"
              readOnly tabIndex={-1}
              value={new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                factorCosto * (bonoSolicitaCosto ? selectedBonoCosto : (bonoSeleccionado?.costo ?? 0))
              )}
              className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 font-bold text-red-600 px-2.5 py-1 text-sm outline-none cursor-not-allowed"
            />
          </div>
          <div className="col-span-2" />
        </div>

        {/* Botón Agregar */}
        <div className="flex justify-end mt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const bono = bonosDisponibles.find(b => b.codigo === selectedBonoId);
              if (bono) {
                setBonosAgregados(prev => [...prev, {
                  id: crypto.randomUUID(),
                  erpBonoId: bono.codigo,
                  nombre: bono.descripcion,
                  costoUnitario: bonoSolicitaCosto ? selectedBonoCosto : bono.costo,
                }]);
                setSelectedBonoId('');
                setSelectedBonoCosto(0);
              }
            }}
            disabled={!selectedBonoId}
          >
            Agregar Bono
          </Button>
        </div>
      </div>

      {/* Tabla de bonos agregados */}
      {fieldErrors.bonosCosto && (
        <div id="field-bonosCosto">
          <FieldError message={fieldErrors.bonosCosto} />
        </div>
      )}
      {bonosAgregados.length > 0 ? (
        <div className="-mt-2 border rounded-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b">
              <tr>
                <th className="px-3 py-2">Bono</th>
                <th className="px-3 py-2 text-center">Factor</th>
                <th className="px-3 py-2 text-right">Costo</th>
                <th className="px-3 py-2 text-right text-slate-700 font-semibold bg-slate-100">Total Costo</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bonosAgregados.map((b, idx) => {
                const costoTotal = (b.costoUnitario || 0) * factorCosto;
                return (
                  <tr key={idx} className="bg-white hover:bg-slate-50">
                    <td className="px-3 py-2">{b.nombre}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{factorCosto}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{b.costoUnitario.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                    <td className="px-3 py-2 text-right text-slate-700 font-semibold bg-slate-100">{costoTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
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
      <DialogTrigger render={<button className="p-1 hover:bg-slate-200 rounded text-slate-500" title={level === 1 ? `Agregar Sitio` : `Agregar a ${parentName || 'Nodo'}`} />}>
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

                {fieldErrors.nombre && <FieldError message={fieldErrors.nombre} />}
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
                    {fieldErrors.direccion && <FieldError message={fieldErrors.direccion} />}
                  </div>
    
                  <div className="flex flex-col gap-1.5">
                    <Label>País</Label>
                    <Input
                      value="GUATEMALA"
                      disabled
                      className="bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Departamento {loadingDeptos && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                    </Label>
                    <SearchableSelect
                      id="field-departamento"
                      options={departamentos.map(d => ({ value: String(d.codigo), label: d.nombre })).sort((a, b) => a.label.localeCompare(b.label))}
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
                    {fieldErrors.departamento && <FieldError message={fieldErrors.departamento} />}
                  </div>
  
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Municipio {loadingMunis && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                    </Label>
                    <SearchableSelect
                      id="field-municipio"
                      options={municipios.map(m => ({ value: String(m.codigo), label: m.nombre })).sort((a, b) => a.label.localeCompare(b.label))}
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
                    {fieldErrors.municipio && <FieldError message={fieldErrors.municipio} />}
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
                    options={items
                      .filter(item => item.venta === 1)
                      .map(item => ({
                        value: item.id.toString(),
                        label: `${item.codigoErp || item.id} - ${item.descripcion}`
                      })).sort((a, b) => a.label.localeCompare(b.label))}
                    value={selectedItemId}
                    onChange={(val) => {
                      setSelectedItemId(val || '');
                      setError(null);
                      setFieldErrors(prev => ({ ...prev, selectedItemId: '' }));
                    }}
                    placeholder={`Selecciona un Registro`}
                    error={!!fieldErrors.selectedItemId}
                  />
                  {fieldErrors.selectedItemId && <FieldError message={fieldErrors.selectedItemId} />}
                </>
              )}
              </div>

              {/* ── Campo Descripción para Ítem Genérico ── */}
              {selectedItemId && localItem && isGenerico && (
                <div className="flex flex-col gap-1.5 mt-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider border-l-2 border-amber-500 pl-2 leading-none">
                      ÍTEM
                    </span>
                    <div className="flex-1 border-t border-amber-200 mt-0.5" />
                  </div>
                  <Label htmlFor="field-nombreGenerico">
                    Descripción <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="field-nombreGenerico"
                    value={nombreGenerico}
                    onChange={e => {
                      setNombreGenerico(e.target.value);
                      setFieldErrors(prev => ({ ...prev, nombreGenerico: '' }));
                    }}
                    placeholder="Ej. CABLE TIPO THW 12 AWG"
                    className="uppercase"
                    aria-invalid={!!fieldErrors.nombreGenerico}
                    autoFocus
                  />
                  <p className="text-xs text-amber-700">
                    Este ítem es temporal. Ingrese la descripción del recurso que necesita y aún no está en catálogo.
                  </p>
                  {fieldErrors.nombreGenerico && <FieldError message={fieldErrors.nombreGenerico} />}
                </div>
              )}
            </div>

            {selectedItemId && localItem && (() => {
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
                          aria-invalid={!!fieldErrors.cantidad}
                        />
                        {fieldErrors.cantidad && <FieldError message={fieldErrors.cantidad} />}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>
                          Unidad Medida
                        </Label>
                        <Input
                          value={servicioSeleccionado?.unidadMedida || localItem?.unidadMedida || ''}
                          readOnly
                          tabIndex={-1}
                          className="bg-slate-100 text-slate-500 cursor-not-allowed uppercase"
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
                        />
                      </div>
                      <div className="col-span-8 flex flex-col gap-1">
                        <Label>
                          Turno {loadingTurnos && <span className="text-xs text-slate-400">(cargando...)</span>}
                        </Label>
                        <SearchableSelect
                          id="field-turnoCodigo"
                          options={turnos.map(t => ({ value: String(t.codigo), label: t.descripcion })).sort((a, b) => a.label.localeCompare(b.label))}
                          value={turnoCodigo !== undefined ? String(turnoCodigo) : ''}
                          onChange={(val) => { setTurnoCodigo(parseInt(val, 10)); setFieldErrors(prev => ({ ...prev, turnoCodigo: '' })); }}
                          disabled={loadingTurnos || turnos.length === 0}
                          placeholder="Seleccione..."
                          error={!!fieldErrors.turnoCodigo}
                        />
                        {fieldErrors.turnoCodigo && <FieldError message={fieldErrors.turnoCodigo} />}
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
                          options={OPCIONES_CUBRE_DESCANSO.map(o => ({ value: o.value, label: o.label }))}
                          value={String(cubreDescanso)}
                          onChange={(val) => { setCubreDescanso(parseInt(val, 10)); setFieldErrors(prev => ({ ...prev, cubreDescanso: '' })); }}
                          disabled={!trabaja7Dias}
                          searchable={false}
                          error={!!fieldErrors.cubreDescanso}
                        />
                        {fieldErrors.cubreDescanso && <FieldError message={fieldErrors.cubreDescanso} />}
                      </div>

                    </>
                  )}
                       </div>
                </div>
              </div>

              {/* ── TABLA TIPOS COMBO (nueva arquitectura) ──────────────────────────
                  Se muestra para cualquier ítem que tenga Tipos Combo configurados.
                  Col 1: nombre del tipo | Col 2: select con ítems que tienen ese tipoComboId */}
              {localItem?.tiposCombo && localItem.tiposCombo.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center mb-3 min-h-[24px]">
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-l-2 border-indigo-500 pl-2 leading-none">
                      ITEMS ADICIONALES
                    </h3>
                    <div className="flex-1 border-t border-indigo-200 ml-3 mt-0.5" />
                  </div>
                  <div className="border rounded-md">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                        <tr>
                          <th className="px-3 py-2 w-2/5">Item Adicional</th>
                          <th className="px-3 py-2">Ítem</th>
                          <th className="px-3 py-2 w-20 text-center">Incluido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {localItem.tiposCombo.map(asoc => {
                          const nombreTipo = tiposCombosNombres[asoc.tipoComboId] || `Tipo ${asoc.tipoComboId}`;
                          const opcionesCombo = (itemsPorTipoCombo[asoc.tipoComboId] ?? [])
                            .map(i => ({ value: String(i.id), label: i.descripcion }));
                          const fieldKey = `tipoCombo_${asoc.tipoComboId}`;
                          const estaIncluido = asoc.obligatorio ? true : (combosIncluidos[asoc.tipoComboId] ?? false);
                          return (
                            <tr key={asoc.tipoComboId} className="bg-white">
                              {/* Columna Item Adicional */}
                              <td className="px-3 py-2 font-medium text-slate-700">
                                {nombreTipo}
                              </td>

                              {/* Columna Ítem */}
                              <td className="px-3 py-2">
                                <SearchableSelect
                                  id={`field-${fieldKey}`}
                                  options={[
                                    { value: '', label: opcionesCombo.length === 0 ? 'Sin ítems disponibles' : '— Sin seleccionar —' },
                                    ...opcionesCombo,
                                  ]}
                                  value={combosSeleccionados[asoc.tipoComboId] ?? ''}
                                  disabled={isLoadingCatalogo || !estaIncluido}
                                  onChange={(val) => {
                                    setCombosSeleccionados(prev => ({ ...prev, [asoc.tipoComboId]: val }));
                                    setFieldErrors(prev => ({ ...prev, [fieldKey]: '' }));
                                  }}
                                  error={!!fieldErrors[fieldKey]}
                                />
                                {fieldErrors[fieldKey] && (
                                  <FieldError message={fieldErrors[fieldKey]} />
                                )}
                              </td>

                              {/* Columna Incluido — última */}
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={estaIncluido}
                                  disabled={!!asoc.obligatorio}
                                  onChange={(e) => {
                                    setCombosIncluidos(prev => ({ ...prev, [asoc.tipoComboId]: e.target.checked }));
                                    if (!e.target.checked) {
                                      setCombosSeleccionados(prev => ({ ...prev, [asoc.tipoComboId]: '' }));
                                      setFieldErrors(prev => ({ ...prev, [fieldKey]: '' }));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <div className="flex items-center mb-3 min-h-[24px]">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                    FINANCIERO
                  </h3>
                  <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Precio Venta ({proyecto?.moneda || 'Q'})</Label>
                    <NumericInput
                      id="field-precioVenta"
                      value={precioVenta ?? 0}
                      onChange={(val: number | undefined) => { setPrecioVenta(val); setFieldErrors(prev => ({ ...prev, precioVenta: '' })); }}
                      min="0"
                      aria-invalid={!!fieldErrors.precioVenta}
                    />
                    {fieldErrors.precioVenta && <FieldError message={fieldErrors.precioVenta} />}
                    {!isEstandar && <p className="text-xs text-slate-500 italic">* Por Persona</p>}
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>SubTotal Venta</Label>
                    <Input
                      value={new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factorCosto * (precioVenta || 0))}
                      readOnly tabIndex={-1}
                      className="bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Total Venta</Label>
                    <Input
                      value={new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factorCosto * (precioVenta || 0))}
                      readOnly tabIndex={-1}
                      className="bg-slate-100 font-bold text-blue-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Costo Un. ({proyecto?.moneda || 'Q'})</Label>
                    {solicitarCosto ? (
                      <NumericInput
                        id="field-costoUnitario"
                        value={costoUnitario}
                        onChange={(val) => { setCostoUnitario(val); setFieldErrors(prev => ({ ...prev, costoUnitario: '' })); }}
                        min="0"
                        aria-invalid={!!fieldErrors.costoUnitario}
                      />
                    ) : (
                      <Input
                        value={(sinManejoCotos ? 0 : (costoUnitario || 0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        readOnly tabIndex={-1}
                        className="bg-slate-100 text-slate-500 cursor-not-allowed"
                      />
                    )}
                    {fieldErrors.costoUnitario && <FieldError message={fieldErrors.costoUnitario} />}
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>SubTotal Costo</Label>
                    <Input
                      value={new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factorCosto * (costoUnitario || 0))}
                      readOnly tabIndex={-1}
                      className="bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Bonos Costo</Label>
                    <Input
                      value={(() => {
                        const bonosTotal = bonosAgregados.reduce((sum, b) => sum + (b.costoUnitario || 0), 0);
                        return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factorCosto * bonosTotal);
                      })()}
                      readOnly tabIndex={-1}
                      className="bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Total Costo</Label>
                    <Input
                      value={(() => {
                        const subtotal = factorCosto * (costoUnitario || 0);
                        const bonosTotal = factorCosto * bonosAgregados.reduce((sum, b) => sum + (b.costoUnitario || 0), 0);
                        return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(subtotal + bonosTotal);
                      })()}
                      readOnly tabIndex={-1}
                      className="bg-slate-100 font-bold text-red-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
              );

              return (
                <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-top-2">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
                    <TabsList variant="line" className="mb-4 shrink-0">
                      <TabsTrigger value="general"><Settings2 className="w-4 h-4 mr-2" />General</TabsTrigger>
                      {!isEstandar && (
                        <TabsTrigger value="bonos">
                          <Gift className="w-4 h-4 mr-2" />Bonos
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="combo">
                        <Layers className="w-4 h-4 mr-2" />Combo
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" keepMounted className="flex-1 overflow-visible outline-none">
                      {generalContent}
                    </TabsContent>
                    {!isEstandar && (
                      <TabsContent value="bonos" className="flex-1 overflow-visible outline-none">
                        {renderBonosContent()}
                      </TabsContent>
                    )}
                    {(() => {
                      const combosPrincipal = localItem.combosPrincipal ?? [];
                      if (combosPrincipal.length === 0) {
                        return (
                          <TabsContent value="combo" className="flex-1 overflow-auto outline-none">
                            <div className="pt-2">
                              <p className="text-xs text-slate-500">
                                Este ítem no tiene combo configurado en el sistema. Podrás agregarle
                                sub-ítems manualmente desde la pestaña Combo una vez que sea guardado
                                en el costeo.
                              </p>
                            </div>
                          </TabsContent>
                        );
                      }

                      // Construir árbol recursivo igual que EditorPanel/ComboTab
                      const comboTree = buildCombosDisponibles(combosPrincipal, items, costosManuales);

                      // Guías visuales de árbol (igual que ComboTab)
                      const TreeGuide = ({ depth }: { depth: number }) => {
                        if (depth === 0) return null;
                        return (
                          <span className="flex items-center shrink-0" style={{ width: depth * 20 }}>
                            {Array.from({ length: depth - 1 }).map((_, i) => (
                              <span key={i} className="inline-block w-5 shrink-0 border-l border-dashed border-slate-200 h-5" />
                            ))}
                            <span className="inline-flex items-center shrink-0 w-5">
                              <span className="w-5 border-t border-dashed border-slate-300" />
                            </span>
                          </span>
                        );
                      };

                      // Render recursivo de cada fila
                      const renderRow = (combo: typeof comboTree[0], depth: number): React.ReactNode => {
                        const incluido = combo.nuevoIncluido === 1 && combo.nuevoCantidad > 0;
                        return (
                          <React.Fragment key={`${combo.comboId}-${depth}`}>
                            <tr className="border-t hover:bg-slate-50/50">
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <TreeGuide depth={depth} />
                                  <span className={`text-sm ${incluido ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                    {combo.nombre}
                                  </span>
                                  {!incluido && (
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 font-medium shrink-0">
                                      Opcional
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-left w-20">
                                <span className="text-xs text-slate-400">{combo.unidadMedida ?? '—'}</span>
                              </td>
                              <td className="px-3 py-1.5 text-center w-24">
                                <span className={`text-sm ${incluido ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                  {combo.nuevoCantidad}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-center w-20">
                                {incluido ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                    Incluido
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
                                    Opcional
                                  </span>
                                )}
                              </td>
                            </tr>
                            {combo.hijos?.map(hijo => renderRow(hijo, depth + 1))}
                          </React.Fragment>
                        );
                      };

                      return (
                        <TabsContent value="combo" className="flex-1 overflow-auto outline-none">
                          <div className="space-y-3">
                            <p className="text-xs text-slate-500 italic">
                              Vista previa del combo. Las personalizaciones se gestionan desde el árbol del costeo una vez guardado.
                            </p>
                            <div className="border rounded-md overflow-hidden bg-white">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Sub-ítem</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-20">Medida</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 w-24">Cantidad</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 w-20">Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {comboTree.map(combo => renderRow(combo, 0))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TabsContent>
                      );
                    })()}
                  </Tabs>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
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


"use client";

import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import { ProyectoCosteo, SitioCosteo, PuestoCosteo, RecursoCosteo } from '../types/costeos';
import { calcularResumenFinanciero, ResumenFinanciero } from '../utils/financial-calculations';

// Definir los tipos de acciones para el reducer
export type CosteoAction =
  | { type: 'SET_PROYECTO'; payload: ProyectoCosteo }
  | { type: 'UPDATE_PROYECTO'; payload: Partial<ProyectoCosteo> }
  | { type: 'ADD_SITIO'; payload: SitioCosteo }
  | { type: 'UPDATE_SITIO'; payload: { sitioId: string; data: Partial<SitioCosteo> } }
  | { type: 'REMOVE_SITIO'; payload: string }
  | { type: 'ADD_PUESTO'; payload: { sitioId: string; puesto: PuestoCosteo } }
  | { type: 'UPDATE_PUESTO'; payload: { sitioId: string; puestoId: string; data: Partial<PuestoCosteo> } }
  | { type: 'ADD_RECURSO'; payload: { sitioId: string | null; puestoId: string | null; recurso: RecursoCosteo } }
  | { type: 'UPDATE_RECURSO'; payload: { sitioId: string | null; puestoId: string | null; recursoId: string; data: Partial<RecursoCosteo> } }
  | { type: 'REMOVE_PUESTO'; payload: { sitioId: string; puestoId: string } }
  | { type: 'REMOVE_RECURSO'; payload: { sitioId: string | null; puestoId: string | null; recursoId: string } }
  | { type: 'SELECT_NODE'; payload: { type: 'SITIO' | 'PUESTO' | 'RECURSO' | 'PROYECTO'; id: string } }
  | { type: 'REPLACE_IDS'; payload: { sitios: Record<string, string>; puestos: Record<string, string>; recursos: Record<string, string> } };

interface CosteoState {
  proyecto: ProyectoCosteo | null;
  resumen: ResumenFinanciero | null;
  selectedNode: { type: 'SITIO' | 'PUESTO' | 'RECURSO' | 'PROYECTO'; id: string } | null;
}

const initialState: CosteoState = {
  proyecto: null,
  resumen: null,
  selectedNode: null,
};

function costeoReducer(state: CosteoState, action: CosteoAction): CosteoState {
  switch (action.type) {
    case 'SET_PROYECTO':
      return {
        ...state,
        proyecto: action.payload,
        resumen: calcularResumenFinanciero(action.payload),
        selectedNode: { type: 'PROYECTO', id: action.payload.id }
      };
    case 'UPDATE_PROYECTO':
      if (!state.proyecto) return state;
      const updatedProyecto = { ...state.proyecto, ...action.payload };
      return {
        ...state,
        proyecto: updatedProyecto,
        resumen: calcularResumenFinanciero(updatedProyecto),
      };
    case 'ADD_SITIO':
      if (!state.proyecto) return state;
      const proyectoConSitioNuevo = { ...state.proyecto, sitios: [...state.proyecto.sitios, action.payload] };
      return {
        ...state,
        proyecto: proyectoConSitioNuevo,
        resumen: calcularResumenFinanciero(proyectoConSitioNuevo),
      };
    case 'UPDATE_SITIO':
      if (!state.proyecto) return state;
      const sitiosModificados = state.proyecto.sitios.map(s => 
        s.id === action.payload.sitioId ? { ...s, ...action.payload.data } : s
      );
      const proyectoConSitios = { ...state.proyecto, sitios: sitiosModificados };
      return {
        ...state,
        proyecto: proyectoConSitios,
        resumen: calcularResumenFinanciero(proyectoConSitios),
      };
    case 'ADD_PUESTO':
      if (!state.proyecto) return state;
      const sitiosConPuestoAgregado = state.proyecto.sitios.map(s => {
        if (s.id !== action.payload.sitioId) return s;
        return { ...s, puestos: [...s.puestos, action.payload.puesto] };
      });
      const proyectoPuestoNuevo = { ...state.proyecto, sitios: sitiosConPuestoAgregado };
      return {
        ...state,
        proyecto: proyectoPuestoNuevo,
        resumen: calcularResumenFinanciero(proyectoPuestoNuevo),
      };
    case 'UPDATE_PUESTO':
      if (!state.proyecto) return state;
      const sitiosConPuestoUpdated = state.proyecto.sitios.map(s => {
        if (s.id !== action.payload.sitioId) return s;
        const puestosActualizados = s.puestos.map(p => 
          p.id === action.payload.puestoId ? { ...p, ...action.payload.data } : p
        );
        return { ...s, puestos: puestosActualizados };
      });
      const proyectoConPuestos = { ...state.proyecto, sitios: sitiosConPuestoUpdated };
      return {
        ...state,
        proyecto: proyectoConPuestos,
        resumen: calcularResumenFinanciero(proyectoConPuestos),
      };
    case 'ADD_RECURSO':
      if (!state.proyecto) return state;
      let targetSitioId = action.payload.sitioId;
      let targetPuestoId = action.payload.puestoId;
      let proyectoMod = { ...state.proyecto, sitios: [...state.proyecto.sitios] };

      if (!targetSitioId) {
        // Línea en la Raíz: va en Sitio DEFAULT -> Puesto DEFAULT
        let defSitioIndex = proyectoMod.sitios.findIndex(s => s.nombre === 'DEFAULT');
        if (defSitioIndex === -1) {
          const nuevoSitioDef: SitioCosteo = { id: `SIT-DEF-${Date.now()}`, nombre: 'DEFAULT', direccion: '', pais: '', departamento: '', municipio: '', puestos: [], recursosSinPuesto: [] };
          proyectoMod.sitios.push(nuevoSitioDef);
          defSitioIndex = proyectoMod.sitios.length - 1;
        }
        let defSitio = { ...proyectoMod.sitios[defSitioIndex], puestos: [...proyectoMod.sitios[defSitioIndex].puestos] };
        
        let defPuestoIndex = defSitio.puestos.findIndex(p => p.nombre === 'DEFAULT');
        if (defPuestoIndex === -1) {
          const nuevoPuestoDef: PuestoCosteo = { id: `PST-DEF-${Date.now()}`, nombre: 'DEFAULT', recursos: [] };
          defSitio.puestos.push(nuevoPuestoDef);
          defPuestoIndex = defSitio.puestos.length - 1;
        }
        let defPuesto = { ...defSitio.puestos[defPuestoIndex], recursos: [...defSitio.puestos[defPuestoIndex].recursos, action.payload.recurso] };
        defSitio.puestos[defPuestoIndex] = defPuesto;
        proyectoMod.sitios[defSitioIndex] = defSitio;
        
      } else {
        // Tiene Sitio
        const sIndex = proyectoMod.sitios.findIndex(s => s.id === targetSitioId);
        if (sIndex > -1) {
          let sitioEdit = { ...proyectoMod.sitios[sIndex], puestos: [...proyectoMod.sitios[sIndex].puestos] };
          
          if (!targetPuestoId) {
            // Línea en Nivel 1: va en Puesto DEFAULT del Sitio
            let defPuestoIndex = sitioEdit.puestos.findIndex(p => p.nombre === 'DEFAULT');
            if (defPuestoIndex === -1) {
              const nuevoPuestoDef: PuestoCosteo = { id: `PST-DEF-${Date.now()}`, nombre: 'DEFAULT', recursos: [] };
              sitioEdit.puestos.push(nuevoPuestoDef);
              defPuestoIndex = sitioEdit.puestos.length - 1;
            }
            let defPuesto = { ...sitioEdit.puestos[defPuestoIndex], recursos: [...sitioEdit.puestos[defPuestoIndex].recursos, action.payload.recurso] };
            sitioEdit.puestos[defPuestoIndex] = defPuesto;
          } else {
            // Línea en Nivel 2
            const pIndex = sitioEdit.puestos.findIndex(p => p.id === targetPuestoId);
            if (pIndex > -1) {
              let puestoEdit = { ...sitioEdit.puestos[pIndex], recursos: [...sitioEdit.puestos[pIndex].recursos, action.payload.recurso] };
              sitioEdit.puestos[pIndex] = puestoEdit;
            }
          }
          proyectoMod.sitios[sIndex] = sitioEdit;
        }
      }

      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };

    case 'UPDATE_RECURSO':
      if (!state.proyecto) return state;
      const sitiosConRecursoUpdated = state.proyecto.sitios.map(s => {
        // En UPDATE_RECURSO, si sitioId/puestoId vienen null, tendríamos que buscar por todo el árbol.
        // Pero idealmente, la UI debe enviar el id del Sitio/Puesto DEFAULT correspondiente (ya que existen en el árbol visualmente "aplastados").
        // Si por alguna razón envía null, ignoramos para no sobre-complicar y asumimos que la UI enviará los verdaderos IDs.
        if (action.payload.sitioId && s.id !== action.payload.sitioId) return s;
        
        if (action.payload.puestoId) {
          const puestosAct = s.puestos.map(p => {
            if (p.id !== action.payload.puestoId) return p;
            const recursosAct = p.recursos.map(r => 
              r.id === action.payload.recursoId ? { ...r, ...action.payload.data } : r
            );
            return { ...p, recursos: recursosAct };
          });
          return { ...s, puestos: puestosAct };
        } else {
          // Si por retrocompatibilidad usan recursosSinPuesto (aunque lo descontinuemos lógicamente)
          const recursosSinPuestoAct = s.recursosSinPuesto.map(r => 
            r.id === action.payload.recursoId ? { ...r, ...action.payload.data } : r
          );
          return { ...s, recursosSinPuesto: recursosSinPuestoAct };
        }
      });
      const proyectoConRecursos = { ...state.proyecto, sitios: sitiosConRecursoUpdated };
      return {
        ...state,
        proyecto: proyectoConRecursos,
        resumen: calcularResumenFinanciero(proyectoConRecursos),
      };
    case 'REMOVE_SITIO':
      if (!state.proyecto) return state;
      const proyectoSinSitio = { 
        ...state.proyecto, 
        sitios: state.proyecto.sitios.filter(s => s.id !== action.payload) 
      };
      return {
        ...state,
        proyecto: proyectoSinSitio,
        resumen: calcularResumenFinanciero(proyectoSinSitio),
      };
    case 'REMOVE_PUESTO':
      if (!state.proyecto) return state;
      const sitiosSinPuesto = state.proyecto.sitios.map(s => {
        if (s.id !== action.payload.sitioId) return s;
        return { ...s, puestos: s.puestos.filter(p => p.id !== action.payload.puestoId) };
      });
      const proyectoSinPuesto = { ...state.proyecto, sitios: sitiosSinPuesto };
      return {
        ...state,
        proyecto: proyectoSinPuesto,
        resumen: calcularResumenFinanciero(proyectoSinPuesto),
      };
    case 'REMOVE_RECURSO':
      if (!state.proyecto) return state;
      
      let grupoTurnoIdToRemove: string | undefined = undefined;
      const proyectoSinRecurso = { ...state.proyecto, sitios: state.proyecto.sitios.map(s => {
        // Manejamos buscar en todo lado si no pasan ids para estar seguros (por si acaso).
        // Pero priorizamos usar los IDs si vienen.
        if (action.payload.sitioId && s.id !== action.payload.sitioId) return s;
        
        const puestosAct = s.puestos.map(p => {
          if (action.payload.puestoId && p.id !== action.payload.puestoId) return p;
          
          const targetRec = p.recursos.find(r => r.id === action.payload.recursoId);
          if (targetRec && targetRec.grupoTurnoId) {
            grupoTurnoIdToRemove = targetRec.grupoTurnoId;
          }
          
          const recursosFiltrados = p.recursos.filter(r => {
            if (grupoTurnoIdToRemove && r.grupoTurnoId === grupoTurnoIdToRemove) return false;
            if (r.id === action.payload.recursoId) return false;
            return true;
          });
          return { ...p, recursos: recursosFiltrados };
        });

        const recursosSinPuestoFiltrados = s.recursosSinPuesto.filter(r => {
          if (r.id === action.payload.recursoId && r.grupoTurnoId) grupoTurnoIdToRemove = r.grupoTurnoId;
          if (grupoTurnoIdToRemove && r.grupoTurnoId === grupoTurnoIdToRemove) return false;
          if (r.id === action.payload.recursoId) return false;
          return true;
        });

        return { ...s, puestos: puestosAct, recursosSinPuesto: recursosSinPuestoFiltrados };
      })};

      return {
        ...state,
        proyecto: proyectoSinRecurso,
        resumen: calcularResumenFinanciero(proyectoSinRecurso),
      };
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNode: action.payload,
      };
    case 'REPLACE_IDS':
      if (!state.proyecto) return state;
      const { sitios, puestos, recursos } = action.payload;

      // Actualizar el selectedNode si su ID fue reemplazado
      let newSelectedNode = state.selectedNode;
      if (newSelectedNode) {
        if (newSelectedNode.type === 'SITIO' && sitios[newSelectedNode.id]) {
          newSelectedNode = { ...newSelectedNode, id: sitios[newSelectedNode.id] };
        } else if (newSelectedNode.type === 'PUESTO' && puestos[newSelectedNode.id]) {
          newSelectedNode = { ...newSelectedNode, id: puestos[newSelectedNode.id] };
        } else if (newSelectedNode.type === 'RECURSO' && recursos[newSelectedNode.id]) {
          newSelectedNode = { ...newSelectedNode, id: recursos[newSelectedNode.id] };
        }
      }

      const proyectoConIdsReemplazados = {
        ...state.proyecto,
        sitios: state.proyecto.sitios.map(s => {
          const sId = sitios[s.id] || s.id;
          return {
            ...s,
            id: sId,
            puestos: s.puestos.map(p => {
              const pId = puestos[p.id] || p.id;
              return {
                ...p,
                id: pId,
                recursos: p.recursos.map(r => ({
                  ...r,
                  id: recursos[r.id] || r.id
                }))
              };
            }),
            recursosSinPuesto: s.recursosSinPuesto.map(r => ({
              ...r,
              id: recursos[r.id] || r.id
            }))
          };
        })
      };

      return {
        ...state,
        proyecto: proyectoConIdsReemplazados,
        // No es estrictamente necesario recalcular resumen porque los IDs no afectan valores financieros
        selectedNode: newSelectedNode,
      };
    default:
      return state;
  }
}

// Contexto
interface CosteoContextProps extends CosteoState {
  dispatch: React.Dispatch<CosteoAction>;
}

const CosteoContext = createContext<CosteoContextProps | undefined>(undefined);

export function CosteoProvider({ children, initialProyecto }: { children: ReactNode; initialProyecto?: ProyectoCosteo }) {
  const [state, dispatch] = useReducer(costeoReducer, initialState);

  // Inicializar si se pasa un proyecto
  React.useEffect(() => {
    if (initialProyecto) {
      dispatch({ type: 'SET_PROYECTO', payload: initialProyecto });
    }
  }, [initialProyecto]);

  const value = useMemo(() => ({ ...state, dispatch }), [state]);

  return (
    <CosteoContext.Provider value={value}>
      {children}
    </CosteoContext.Provider>
  );
}

export function useCosteo() {
  const context = useContext(CosteoContext);
  if (context === undefined) {
    throw new Error('useCosteo debe usarse dentro de un CosteoProvider');
  }
  return context;
}

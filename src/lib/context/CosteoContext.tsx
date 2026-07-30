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
  | { type: 'ADD_RECURSO'; payload: { sitioId: string; puestoId: string | null; recurso: RecursoCosteo } }
  | { type: 'UPDATE_RECURSO'; payload: { sitioId: string; puestoId: string | null; recursoId: string; data: Partial<RecursoCosteo> } }
  | { type: 'REMOVE_PUESTO'; payload: { sitioId: string; puestoId: string } }
  | { type: 'REMOVE_RECURSO'; payload: { sitioId: string; puestoId: string | null; recursoId: string } }
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
      const sitiosConRecursoAgregado = state.proyecto.sitios.map(s => {
        if (s.id !== action.payload.sitioId) return s;
        
        if (action.payload.puestoId) {
          const puestosAgregados = s.puestos.map(p => {
            if (p.id !== action.payload.puestoId) return p;
            return { ...p, recursos: [...p.recursos, action.payload.recurso] };
          });
          return { ...s, puestos: puestosAgregados };
        } else {
          return { ...s, recursosSinPuesto: [...s.recursosSinPuesto, action.payload.recurso] };
        }
      });
      const proyectoRecursoNuevo = { ...state.proyecto, sitios: sitiosConRecursoAgregado };
      return {
        ...state,
        proyecto: proyectoRecursoNuevo,
        resumen: calcularResumenFinanciero(proyectoRecursoNuevo),
      };
    case 'UPDATE_RECURSO':
      if (!state.proyecto) return state;
      const sitiosConRecursoUpdated = state.proyecto.sitios.map(s => {
        if (s.id !== action.payload.sitioId) return s;
        
        if (action.payload.puestoId) {
          // Es un recurso dentro de un puesto
          const puestosAct = s.puestos.map(p => {
            if (p.id !== action.payload.puestoId) return p;
            const recursosAct = p.recursos.map(r => 
              r.id === action.payload.recursoId ? { ...r, ...action.payload.data } : r
            );
            return { ...p, recursos: recursosAct };
          });
          return { ...s, puestos: puestosAct };
        } else {
          // Es un recurso sin puesto
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
      
      // Encontrar el recurso para saber si tiene grupoTurnoId
      let grupoTurnoIdToRemove: string | undefined = undefined;
      const sitioTarget = state.proyecto.sitios.find(s => s.id === action.payload.sitioId);
      if (sitioTarget) {
        if (action.payload.puestoId) {
          const puestoTarget = sitioTarget.puestos.find(p => p.id === action.payload.puestoId);
          if (puestoTarget) {
            const recursoTarget = puestoTarget.recursos.find(r => r.id === action.payload.recursoId);
            if (recursoTarget && recursoTarget.grupoTurnoId) {
              grupoTurnoIdToRemove = recursoTarget.grupoTurnoId;
            }
          }
        } else {
          const recursoTarget = sitioTarget.recursosSinPuesto.find(r => r.id === action.payload.recursoId);
          if (recursoTarget && recursoTarget.grupoTurnoId) {
            grupoTurnoIdToRemove = recursoTarget.grupoTurnoId;
          }
        }
      }

      const sitiosSinRecurso = state.proyecto.sitios.map(s => {
        if (s.id !== action.payload.sitioId) return s;
        
        if (action.payload.puestoId) {
          const puestosAct = s.puestos.map(p => {
            if (p.id !== action.payload.puestoId) return p;
            const recursosFiltrados = p.recursos.filter(r => {
              if (grupoTurnoIdToRemove && r.grupoTurnoId === grupoTurnoIdToRemove) return false;
              if (!grupoTurnoIdToRemove && r.id === action.payload.recursoId) return false;
              return true;
            });
            return { ...p, recursos: recursosFiltrados };
          });
          return { ...s, puestos: puestosAct };
        } else {
          const recursosSinPuestoFiltrados = s.recursosSinPuesto.filter(r => {
            if (grupoTurnoIdToRemove && r.grupoTurnoId === grupoTurnoIdToRemove) return false;
            if (!grupoTurnoIdToRemove && r.id === action.payload.recursoId) return false;
            return true;
          });
          return { ...s, recursosSinPuesto: recursosSinPuestoFiltrados };
        }
      });
      const proyectoSinRecurso = { ...state.proyecto, sitios: sitiosSinRecurso };
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

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
  | { type: 'SELECT_NODE'; payload: { type: 'SITIO' | 'PUESTO' | 'RECURSO' | 'PROYECTO'; id: string } };

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
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNode: action.payload,
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

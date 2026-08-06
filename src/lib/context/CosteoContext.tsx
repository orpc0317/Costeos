"use client";

import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import { ProyectoCosteo, NodoCosteo, RecursoCosteo } from '../types/costeos';
import { calcularResumenFinanciero, ResumenFinanciero } from '../utils/financial-calculations';

// Definir los tipos de acciones para el reducer
export type CosteoAction =
  | { type: 'SET_PROYECTO'; payload: ProyectoCosteo }
  | { type: 'UPDATE_PROYECTO'; payload: Partial<ProyectoCosteo> }
  | { type: 'ADD_NODO'; payload: { parentId: string | null; nodo: NodoCosteo } }
  | { type: 'UPDATE_NODO'; payload: { id: string; data: Partial<NodoCosteo> } }
  | { type: 'REMOVE_NODO'; payload: string }
  | { type: 'ADD_RECURSO'; payload: { nodoId: string | null; recurso: RecursoCosteo } }
  | { type: 'UPDATE_RECURSO'; payload: { recursoId: string; data: Partial<RecursoCosteo> } }
  | { type: 'REMOVE_RECURSO'; payload: { recursoId: string } }
  | { type: 'SELECT_NODE'; payload: { type: 'NODO' | 'RECURSO' | 'PROYECTO'; id: string } }
  | { type: 'REPLACE_IDS'; payload: { nodos: Record<string, string>; recursos: Record<string, string> } }
  | { type: 'MOVE_NODO'; payload: { id: string; newParentId: string | null } }
  | { type: 'MOVE_RECURSO'; payload: { id: string; newParentId: string | null } };

interface CosteoState {
  proyecto: ProyectoCosteo | null;
  resumen: ResumenFinanciero | null;
  selectedNode: { type: 'NODO' | 'RECURSO' | 'PROYECTO'; id: string } | null;
}

const initialState: CosteoState = {
  proyecto: null,
  resumen: null,
  selectedNode: null,
};

// Funciones recursivas de utilidad
function mapNodos(nodos: NodoCosteo[], mapFn: (n: NodoCosteo) => NodoCosteo): NodoCosteo[] {
  return nodos.map(n => {
    const updated = mapFn(n);
    return { ...updated, nodos: mapNodos(updated.nodos, mapFn) };
  });
}

function findNodo(nodos: NodoCosteo[], id: string): NodoCosteo | undefined {
  for (const n of nodos) {
    if (n.id === id) return n;
    const child = findNodo(n.nodos, id);
    if (child) return child;
  }
  return undefined;
}

function findRecurso(proyecto: ProyectoCosteo, id: string): RecursoCosteo | undefined {
  const rootR = proyecto.recursos.find(r => r.id === id);
  if (rootR) return rootR;
  
  const searchNodos = (nodos: NodoCosteo[]): RecursoCosteo | undefined => {
    for (const n of nodos) {
      const r = n.recursos.find(r => r.id === id);
      if (r) return r;
      const child = searchNodos(n.nodos);
      if (child) return child;
    }
    return undefined;
  };
  return searchNodos(proyecto.nodos);
}

function costeoReducer(state: CosteoState, action: CosteoAction): CosteoState {
  switch (action.type) {
    case 'SET_PROYECTO':
      return {
        ...state,
        proyecto: action.payload,
        resumen: calcularResumenFinanciero(action.payload),
        selectedNode: { type: 'PROYECTO', id: action.payload.id }
      };
    case 'UPDATE_PROYECTO': {
      if (!state.proyecto) return state;
      const updatedProyecto = { ...state.proyecto, ...action.payload };
      return {
        ...state,
        proyecto: updatedProyecto,
        resumen: calcularResumenFinanciero(updatedProyecto),
      };
    }
    case 'ADD_NODO': {
      if (!state.proyecto) return state;
      let nuevosNodos = state.proyecto.nodos;
      
      if (!action.payload.parentId || action.payload.parentId === state.proyecto.id) {
        // Añadir a la raíz
        nuevosNodos = [...state.proyecto.nodos, action.payload.nodo];
      } else {
        // Añadir a un padre específico
        nuevosNodos = mapNodos(state.proyecto.nodos, n => {
          if (n.id === action.payload.parentId) {
            return { ...n, nodos: [...n.nodos, action.payload.nodo] };
          }
          return n;
        });
      }

      const proyectoMod = { ...state.proyecto, nodos: nuevosNodos };
      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
    case 'UPDATE_NODO': {
      if (!state.proyecto) return state;
      const nuevosNodos = mapNodos(state.proyecto.nodos, n => {
        if (n.id === action.payload.id) {
          return { ...n, ...action.payload.data };
        }
        return n;
      });
      const proyectoMod = { ...state.proyecto, nodos: nuevosNodos };
      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
    case 'REMOVE_NODO': {
      if (!state.proyecto) return state;
      // Filtramos en la raíz por si acaso
      const rootFilter = state.proyecto.nodos.filter(n => n.id !== action.payload);
      const nuevosNodos = mapNodos(rootFilter, n => {
        return { ...n, nodos: n.nodos.filter(child => child.id !== action.payload) };
      });
      const proyectoMod = { ...state.proyecto, nodos: nuevosNodos };
      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
    case 'ADD_RECURSO': {
      if (!state.proyecto) return state;
      let proyectoMod = { ...state.proyecto };
      
      if (!action.payload.nodoId) {
        proyectoMod.recursos = [...proyectoMod.recursos, action.payload.recurso];
      } else {
        proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => {
          if (n.id === action.payload.nodoId) {
            return { ...n, recursos: [...n.recursos, action.payload.recurso] };
          }
          return n;
        });
      }
      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
    case 'UPDATE_RECURSO': {
      if (!state.proyecto) return state;
      const rId = action.payload.recursoId;
      const rData = action.payload.data;
      
      let proyectoMod = { ...state.proyecto };
      // Actualizar si está en la raíz
      proyectoMod.recursos = proyectoMod.recursos.map(r => r.id === rId ? { ...r, ...rData } : r);
      // Actualizar si está en algún nodo
      proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => {
        return {
          ...n,
          recursos: n.recursos.map(r => r.id === rId ? { ...r, ...rData } : r)
        };
      });

      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
    case 'REMOVE_RECURSO': {
      if (!state.proyecto) return state;
      const rId = action.payload.recursoId;
      let proyectoMod = { ...state.proyecto };
      
      const filterRecursos = (recursos: RecursoCosteo[]) => recursos.filter(r => r.id !== rId);

      proyectoMod.recursos = filterRecursos(proyectoMod.recursos);
      proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => {
        return { ...n, recursos: filterRecursos(n.recursos) };
      });

      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNode: action.payload,
      };
    case 'REPLACE_IDS': {
      if (!state.proyecto) return state;
      const { nodos, recursos } = action.payload;

      let newSelectedNode = state.selectedNode;
      if (newSelectedNode) {
        if (newSelectedNode.type === 'NODO' && nodos[newSelectedNode.id]) {
          newSelectedNode = { ...newSelectedNode, id: nodos[newSelectedNode.id] };
        } else if (newSelectedNode.type === 'RECURSO' && recursos[newSelectedNode.id]) {
          newSelectedNode = { ...newSelectedNode, id: recursos[newSelectedNode.id] };
        }
      }

      const replaceNodos = (nodosArr: NodoCosteo[]): NodoCosteo[] => {
        return nodosArr.map(n => ({
          ...n,
          id: nodos[n.id] || n.id,
          recursos: n.recursos.map(r => ({ ...r, id: recursos[r.id] || r.id })),
          nodos: replaceNodos(n.nodos)
        }));
      };

      const proyectoMod = {
        ...state.proyecto,
        nodos: replaceNodos(state.proyecto.nodos),
        recursos: state.proyecto.recursos.map(r => ({ ...r, id: recursos[r.id] || r.id }))
      };

      return {
        ...state,
        proyecto: proyectoMod,
        selectedNode: newSelectedNode,
      };
    }
    case 'MOVE_NODO': {
      if (!state.proyecto) return state;
      const { id, newParentId } = action.payload;
      
      const nodoToMove = findNodo(state.proyecto.nodos, id);
      if (!nodoToMove) return state;
      
      // 1. Remove from old place
      const rootFilter = state.proyecto.nodos.filter(n => n.id !== id);
      const cleanNodos = mapNodos(rootFilter, n => {
        return { ...n, nodos: n.nodos.filter(child => child.id !== id) };
      });
      
      // 2. Adjust level
      let nuevoNivel = 1;
      if (newParentId) {
         const newParent = findNodo(cleanNodos, newParentId);
         if (newParent) nuevoNivel = newParent.nivel + 1;
      }
      
      const updateNiveles = (n: NodoCosteo, currentNivel: number): NodoCosteo => {
        return {
          ...n,
          nivel: currentNivel,
          nodos: n.nodos.map(child => updateNiveles(child, currentNivel + 1))
        };
      };
      
      const movedNodo = updateNiveles(nodoToMove, nuevoNivel);
      
      // 3. Add to new place
      let finalNodos = cleanNodos;
      if (!newParentId) {
        finalNodos = [...cleanNodos, movedNodo];
      } else {
        finalNodos = mapNodos(cleanNodos, n => {
          if (n.id === newParentId) {
            return { ...n, nodos: [...n.nodos, movedNodo] };
          }
          return n;
        });
      }
      
      const proyectoMod = { ...state.proyecto, nodos: finalNodos };
      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
    case 'MOVE_RECURSO': {
      if (!state.proyecto) return state;
      const { id, newParentId } = action.payload;
      
      const recursoToMove = findRecurso(state.proyecto, id);
      if (!recursoToMove) return state;
      
      // 1. Remove
      let proyectoMod = { ...state.proyecto };
      const filterRecursos = (recursos: RecursoCosteo[]) => recursos.filter(r => r.id !== id);
      proyectoMod.recursos = filterRecursos(proyectoMod.recursos);
      proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => {
        return { ...n, recursos: filterRecursos(n.recursos) };
      });
      
      // 2. Add
      if (!newParentId) {
        proyectoMod.recursos = [...proyectoMod.recursos, recursoToMove];
      } else {
        proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => {
          if (n.id === newParentId) {
            return { ...n, recursos: [...n.recursos, recursoToMove] };
          }
          return n;
        });
      }
      
      return {
        ...state,
        proyecto: proyectoMod,
        resumen: calcularResumenFinanciero(proyectoMod),
      };
    }
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

"use client";

import React, { createContext, useContext, useReducer, useRef, ReactNode, useMemo } from 'react';
import { ProyectoCosteo, NodoCosteo, RecursoCosteo } from '../types/costeos';

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
  | { type: 'MOVE_RECURSO'; payload: { id: string; newParentId: string | null } }
  /** Actualiza costoUnitario masivamente para todos los recursos cuyo itemId
   *  aparezca en el mapa. También actualiza bonos si hay ítems bono en el mapa. */
  | { type: 'ACTUALIZAR_COSTOS_MASIVO'; payload: Record<number, number> };

interface CosteoState {
  proyecto: ProyectoCosteo | null;
  // resumen eliminado: FinancialSummaryPanel lo calcula localmente con calcularResumenFinanciero()
  selectedNode: { type: 'NODO' | 'RECURSO' | 'PROYECTO'; id: string } | null;
}

const initialState: CosteoState = {
  proyecto: null,
  selectedNode: null,
};

// -- Funciones recursivas de utilidad -----------------------------------------

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

// -- Reducer ------------------------------------------------------------------

function costeoReducer(state: CosteoState, action: CosteoAction): CosteoState {
  switch (action.type) {
    case 'SET_PROYECTO':
      return {
        ...state,
        proyecto: action.payload,
        selectedNode: { type: 'PROYECTO', id: action.payload.id },
      };

    case 'UPDATE_PROYECTO': {
      if (!state.proyecto) return state;
      return { ...state, proyecto: { ...state.proyecto, ...action.payload } };
    }

    case 'ADD_NODO': {
      if (!state.proyecto) return state;
      let nuevosNodos = state.proyecto.nodos;
      if (!action.payload.parentId || action.payload.parentId === state.proyecto.id) {
        nuevosNodos = [...state.proyecto.nodos, action.payload.nodo];
      } else {
        nuevosNodos = mapNodos(state.proyecto.nodos, n => {
          if (n.id === action.payload.parentId) {
            return { ...n, nodos: [...n.nodos, action.payload.nodo] };
          }
          return n;
        });
      }
      return { ...state, proyecto: { ...state.proyecto, nodos: nuevosNodos } };
    }

    case 'UPDATE_NODO': {
      if (!state.proyecto) return state;
      const nuevosNodos = mapNodos(state.proyecto.nodos, n =>
        n.id === action.payload.id ? { ...n, ...action.payload.data } : n
      );
      return { ...state, proyecto: { ...state.proyecto, nodos: nuevosNodos } };
    }

    case 'REMOVE_NODO': {
      if (!state.proyecto) return state;
      const rootFilter = state.proyecto.nodos.filter(n => n.id !== action.payload);
      const nuevosNodos = mapNodos(rootFilter, n => ({
        ...n,
        nodos: n.nodos.filter(child => child.id !== action.payload),
      }));
      return { ...state, proyecto: { ...state.proyecto, nodos: nuevosNodos } };
    }

    case 'ADD_RECURSO': {
      if (!state.proyecto) return state;
      let proyectoMod = { ...state.proyecto };
      if (!action.payload.nodoId || action.payload.nodoId === state.proyecto.id) {
        proyectoMod.recursos = [...proyectoMod.recursos, action.payload.recurso];
      } else {
        proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => {
          if (n.id === action.payload.nodoId) {
            return { ...n, recursos: [...n.recursos, action.payload.recurso] };
          }
          return n;
        });
      }
      return { ...state, proyecto: proyectoMod };
    }

    case 'UPDATE_RECURSO': {
      if (!state.proyecto) return state;
      const rId = action.payload.recursoId;
      const rData = action.payload.data;
      let proyectoMod = { ...state.proyecto };
      proyectoMod.recursos = proyectoMod.recursos.map(r => r.id === rId ? { ...r, ...rData } : r);
      proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => ({
        ...n,
        recursos: n.recursos.map(r => r.id === rId ? { ...r, ...rData } : r),
      }));
      return { ...state, proyecto: proyectoMod };
    }

    case 'REMOVE_RECURSO': {
      if (!state.proyecto) return state;
      const rId = action.payload.recursoId;
      let proyectoMod = { ...state.proyecto };

      // Recopilar todos los recursos del proyecto en plano para resolver cadena de combos
      const todosLosRecursos: RecursoCosteo[] = [...proyectoMod.recursos];
      const walkAll = (nodos: NodoCosteo[]) =>
        nodos.forEach(n => { todosLosRecursos.push(...n.recursos); walkAll(n.nodos); });
      walkAll(proyectoMod.nodos);

      // Colectar IDs a eliminar: el recurso + todos sus descendientes combo
      const idsAEliminar = new Set([rId]);
      const collectDescendants = (parentId: string) => {
        todosLosRecursos.forEach(r => {
          if (r.comboParentId === parentId && !idsAEliminar.has(r.id)) {
            idsAEliminar.add(r.id);
            collectDescendants(r.id);
          }
        });
      };
      collectDescendants(rId);

      const filterRecursos = (recursos: RecursoCosteo[]) =>
        recursos.filter(r => !idsAEliminar.has(r.id));
      proyectoMod.recursos = filterRecursos(proyectoMod.recursos);
      proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => ({
        ...n,
        recursos: filterRecursos(n.recursos),
      }));
      return { ...state, proyecto: proyectoMod };
    }

    case 'SELECT_NODE':
      return { ...state, selectedNode: action.payload };

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

      const replaceRecurso = (r: RecursoCosteo): RecursoCosteo => ({
        ...r,
        id: recursos[r.id] || r.id,
        comboParentId: r.comboParentId ? (recursos[r.comboParentId] || r.comboParentId) : undefined,
      });

      const replaceNodos = (nodosArr: NodoCosteo[]): NodoCosteo[] =>
        nodosArr.map(n => ({
          ...n,
          id: nodos[n.id] || n.id,
          recursos: n.recursos.map(replaceRecurso),
          nodos: replaceNodos(n.nodos),
        }));

      return {
        ...state,
        proyecto: {
          ...state.proyecto,
          nodos: replaceNodos(state.proyecto.nodos),
          recursos: state.proyecto.recursos.map(replaceRecurso),
        },
        selectedNode: newSelectedNode,
      };
    }

    case 'MOVE_NODO': {
      if (!state.proyecto) return state;
      const { id, newParentId } = action.payload;
      const nodoToMove = findNodo(state.proyecto.nodos, id);
      if (!nodoToMove) return state;

      const rootFilter = state.proyecto.nodos.filter(n => n.id !== id);
      const cleanNodos = mapNodos(rootFilter, n => ({
        ...n,
        nodos: n.nodos.filter(child => child.id !== id),
      }));

      let nuevoNivel = 1;
      if (newParentId) {
        const newParent = findNodo(cleanNodos, newParentId);
        if (newParent) nuevoNivel = newParent.nivel + 1;
      }

      const updateNiveles = (n: NodoCosteo, currentNivel: number): NodoCosteo => ({
        ...n,
        nivel: currentNivel,
        nodos: n.nodos.map(child => updateNiveles(child, currentNivel + 1)),
      });

      const movedNodo = updateNiveles(nodoToMove, nuevoNivel);
      const finalNodos = !newParentId
        ? [...cleanNodos, movedNodo]
        : mapNodos(cleanNodos, n =>
            n.id === newParentId ? { ...n, nodos: [...n.nodos, movedNodo] } : n
          );

      return { ...state, proyecto: { ...state.proyecto, nodos: finalNodos } };
    }

    case 'MOVE_RECURSO': {
      if (!state.proyecto) return state;
      const { id, newParentId } = action.payload;
      const recursoToMove = findRecurso(state.proyecto, id);
      if (!recursoToMove) return state;

      // Recopilar combos hijos del primario en todo el arbol
      const combosHijos: RecursoCosteo[] = [];
      const collectHijos = (recursos: RecursoCosteo[]) =>
        recursos.forEach(r => { if (r.comboParentId === id) combosHijos.push(r); });
      collectHijos(state.proyecto.recursos);
      const walkNodos = (nodos: NodoCosteo[]) =>
        nodos.forEach(n => { collectHijos(n.recursos); walkNodos(n.nodos); });
      walkNodos(state.proyecto.nodos);

      let proyectoMod = { ...state.proyecto };
      const idsAMover = new Set([id, ...combosHijos.map(c => c.id)]);
      const filterRecursos = (recursos: RecursoCosteo[]) =>
        recursos.filter(r => !idsAMover.has(r.id));
      proyectoMod.recursos = filterRecursos(proyectoMod.recursos);
      proyectoMod.nodos = mapNodos(proyectoMod.nodos, n => ({
        ...n,
        recursos: filterRecursos(n.recursos),
      }));

      const recursosAInsertar = [recursoToMove, ...combosHijos];
      if (!newParentId) {
        proyectoMod.recursos = [...proyectoMod.recursos, ...recursosAInsertar];
      } else {
        proyectoMod.nodos = mapNodos(proyectoMod.nodos, n =>
          n.id === newParentId
            ? { ...n, recursos: [...n.recursos, ...recursosAInsertar] }
            : n
        );
      }
      return { ...state, proyecto: proyectoMod };
    }

    case 'ACTUALIZAR_COSTOS_MASIVO': {
      if (!state.proyecto) return state;
      const costosMap = action.payload; // itemId → costoUnitario

      const actualizarRecursos = (recursos: RecursoCosteo[]): RecursoCosteo[] =>
        recursos.map(r => {
          const nuevoCosto = costosMap[r.itemId];
          if (nuevoCosto === undefined) return r;
          return { ...r, costoUnitario: nuevoCosto };
        });

      const actualizarNodos = (nodos: NodoCosteo[]): NodoCosteo[] =>
        nodos.map(n => ({
          ...n,
          recursos: actualizarRecursos(n.recursos),
          nodos: actualizarNodos(n.nodos),
        }));

      return {
        ...state,
        proyecto: {
          ...state.proyecto,
          recursos: actualizarRecursos(state.proyecto.recursos),
          nodos: actualizarNodos(state.proyecto.nodos),
        },
      };
    }

    default:
      return state;
  }
}


// -- Contexto -----------------------------------------------------------------

interface CosteoContextProps extends CosteoState {
  dispatch: React.Dispatch<CosteoAction>;
}

const CosteoContext = createContext<CosteoContextProps | undefined>(undefined);

export function CosteoProvider({ children, initialProyecto }: { children: ReactNode; initialProyecto?: ProyectoCosteo }) {
  const [state, dispatch] = useReducer(costeoReducer, initialState);
  const initialized = useRef(false);

  // Inicializar una sola vez. useRef guard evita re-disparos si el padre re-renderiza.
  React.useEffect(() => {
    if (initialized.current || !initialProyecto) return;
    initialized.current = true;
    dispatch({ type: 'SET_PROYECTO', payload: initialProyecto });
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

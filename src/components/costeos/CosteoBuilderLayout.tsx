"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import TreeViewSidebar from './TreeViewSidebar';
import FinancialSummaryPanel from './FinancialSummaryPanel';
import EditorPanel from './EditorPanel';
import { Layers, Cloud, CloudUpload, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveCosteoTree } from '@/app/actions/save-costeo';
import HistorialSheet from './modals/HistorialSheet';

type SaveState = 'saved' | 'saving' | 'error' | 'idle';

export default function CosteoBuilderLayout() {
  const { proyecto, dispatch } = useCosteo();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const suppressNextSave = useRef(false);
  
  // Track previous tree string to detect real mutations
  const lastSavedState = useRef<string>('');

  useEffect(() => {
    if (!proyecto) return;

    if (suppressNextSave.current) {
      suppressNextSave.current = false;
      lastSavedState.current = JSON.stringify(proyecto);
      return;
    }

    const currentString = JSON.stringify(proyecto);
    
    // Si es la primera vez que carga, inicializamos el state
    if (!lastSavedState.current) {
      lastSavedState.current = currentString;
      setSaveState('saved');
      return;
    }

    // Si no ha cambiado nada sustancial, no hacemos nada
    if (currentString === lastSavedState.current) {
      return;
    }

    // Detectamos cambios
    setSaveState('saving'); // O 'modificado' si queremos mostrar algo antes

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        setSaveState('saving');
        const res = await saveCosteoTree(proyecto);
        
        if (res.success && res.idMap) {
          suppressNextSave.current = true; // El proximo cambio de 'proyecto' es por REPLACE_IDS
          dispatch({ type: 'REPLACE_IDS', payload: res.idMap });
          setSaveState('saved');
        } else {
          setSaveState('error');
        }
      } catch (error) {
        console.error("Error al auto-guardar:", error);
        setSaveState('error');
      }
    }, 2000); // 2 segundos de debounce

    // Cleanup
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [proyecto, dispatch]);

  if (!proyecto) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-slate-500 animate-pulse">Cargando proyecto...</p>
      </div>
    );
  }



  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <h1 className="font-semibold text-sm">
            Costeo: <span className="font-normal text-slate-600">{proyecto.nombreProyecto}</span>
          </h1>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            {proyecto.estado}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-slate-500 mr-1">Cliente:</span>
            <span className="font-medium">{proyecto.cliente.razonSocial}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">Moneda:</span>
            <span className="font-medium">{proyecto.moneda}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">Plazo:</span>
            <span className="font-medium">{proyecto.plazoMeses} meses</span>
          </div>
          <div className="pl-4 border-l flex items-center min-w-[120px] justify-end">
            {saveState === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <Cloud className="w-3.5 h-3.5" /> Guardado
              </span>
            )}
            {saveState === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                <CloudUpload className="w-3.5 h-3.5 animate-pulse" /> Guardando...
              </span>
            )}
            {saveState === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <CloudOff className="w-3.5 h-3.5" /> Error
              </span>
            )}
            {saveState === 'idle' && (
              <span className="text-xs text-slate-400">...</span>
            )}
            <div className="ml-2 pl-2 border-l border-slate-200">
              <HistorialSheet costeoId={proyecto.id} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area: 3 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Tree Navigation */}
        <aside className="w-72 border-r bg-slate-50/50 flex flex-col shrink-0">
          <TreeViewSidebar />
        </aside>

        {/* Center: Main Editor */}
        <main className="flex-1 bg-white flex flex-col min-w-0 overflow-y-auto">
          <EditorPanel />
        </main>

        {/* Right Sidebar: Financial Summary */}
        <aside className="w-80 border-l bg-slate-50 flex flex-col shrink-0">
          <FinancialSummaryPanel />
        </aside>
      </div>
    </div>
  );
}

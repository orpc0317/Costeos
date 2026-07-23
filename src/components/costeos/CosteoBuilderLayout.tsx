"use client";

import React from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import TreeViewSidebar from './TreeViewSidebar';
import FinancialSummaryPanel from './FinancialSummaryPanel';
import EditorPanel from './EditorPanel';
import { Layers, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveCosteoTree } from '@/app/actions/save-costeo';

export default function CosteoBuilderLayout() {
  const { proyecto } = useCosteo();
  const [isSaving, setIsSaving] = React.useState(false);

  if (!proyecto) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-slate-500 animate-pulse">Cargando proyecto...</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!proyecto) return;
    setIsSaving(true);
    try {
      await saveCosteoTree(proyecto);
      // Opcional: Mostrar un toast de éxito aquí
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setIsSaving(false);
    }
  };

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
          <div className="pl-4 border-l">
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-8 gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar Progreso"}
            </Button>
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

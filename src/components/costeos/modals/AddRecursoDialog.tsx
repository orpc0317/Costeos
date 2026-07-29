import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { RecursoCosteo, ItemCatalogo } from '@/lib/types/costeos';
import { ErpItem } from '@/lib/erp/types';
import { Button } from '@/components/ui/button';
import { getCatalogoItems, getRecetaDeItem } from '@/app/actions/erp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';

interface AddRecursoDialogProps {
  sitioId: string;
  puestoId: string | null;
}

export function AddRecursoDialog({ sitioId, puestoId }: AddRecursoDialogProps) {
  const { proyecto, dispatch } = useCosteo();
  const tc = proyecto?.tipoCosteo;
  const lblR = tc?.lineaEtiqueta || 'Línea';
  const lblN2 = tc?.nivel2Etiqueta || 'Puesto';
  const [open, setOpen] = useState(false);
  
  const [items, setItems] = useState<ErpItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  // Cargar catálogo al abrir el modal
  useEffect(() => {
    if (open && items.length === 0) {
      setIsLoading(true);
      getCatalogoItems()
        .then(data => setItems(data))
        .catch(err => console.error("Error al cargar catálogo:", err))
        .finally(() => setIsLoading(false));
    }
  }, [open, items.length]);

  const handleAdd = async () => {
    if (!selectedItemId) return;
    setIsAdding(true);

    try {
      const erpItem = items.find(i => i.id.toString() === selectedItemId);
      if (!erpItem) return;

      let recetasDelRecurso: any[] = [];

      // Si tiene receta, hacemos fetch al ERP para traer sus componentes
      if (erpItem.tieneReceta) {
        const componentes = await getRecetaDeItem(erpItem.id);
        
        // El estado de RecursoCosteo requiere esta estructura de recetas
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

      const nuevoRecurso: RecursoCosteo = {
        id: `REC-${Date.now()}`,
        erpItemId: erpItem.id,
        nombre: erpItem.nombre,
        categoria: erpItem.tipo as any,
        tipoCosto: erpItem.tipoCosto as any,
        cantidad: 1,
        costoUnitario: erpItem.costoUnitario,
        precioVentaUnitario: erpItem.precioVenta || 0,
        recetas: recetasDelRecurso
      };

      dispatch({ type: 'ADD_RECURSO', payload: { sitioId, puestoId, recurso: nuevoRecurso } });
      dispatch({ type: 'SELECT_NODE', payload: { type: 'RECURSO', id: nuevoRecurso.id } });
      
      setSelectedItemId('');
      setOpen(false);
    } catch (error) {
      console.error("Error al agregar recurso:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={<button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium mt-1 ml-2" />}
      >
        <Plus className="w-3 h-3" /> Agregar {lblR}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar {lblR} al {puestoId ? lblN2 : tc?.nivel1Etiqueta || 'Sitio'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seleccionar del Catálogo ERP</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando catálogo...
              </div>
            ) : (
              <Select onValueChange={setSelectedItemId} value={selectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un item..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.codigo} - {item.nombre} {item.tieneReceta ? '(Con Receta)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 gap-2" 
            onClick={handleAdd}
            disabled={!selectedItemId || isAdding}
          >
            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAdding ? "Agregando..." : `Agregar ${lblR}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

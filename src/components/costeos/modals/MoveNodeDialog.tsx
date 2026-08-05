import React, { useState, useEffect } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { NodoCosteo } from '@/lib/types/costeos';

interface MoveNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToMove: { id: string; type: 'NODO' | 'RECURSO'; nivel: number; nombre: string } | null;
}

export function MoveNodeDialog({ open, onOpenChange, itemToMove }: MoveNodeDialogProps) {
  const { proyecto, dispatch } = useCosteo();
  const [selectedParentId, setSelectedParentId] = useState<string>('root');

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedParentId('root');
    }
  }, [open]);

  if (!proyecto || !itemToMove) return null;

  // Compute valid destinations
  const validOptions: { value: string; label: string }[] = [];
  
  validOptions.push({ value: 'root', label: 'Raíz del Proyecto' });

  const flattenValidNodes = (nodos: NodoCosteo[], prefix: string = '') => {
    nodos.forEach(n => {
      // Regla: No puede moverse a sí mismo ni a sus hijos (lo cortamos aquí)
      if (itemToMove.type === 'NODO' && n.id === itemToMove.id) return;
      
      // Regla de nivel para Nodos: Solo puede moverse a un nivel Y, donde Y < X
      let isValid = true;
      if (itemToMove.type === 'NODO') {
         if (n.nivel >= itemToMove.nivel) {
           isValid = false;
         }
      }
      
      if (isValid) {
        validOptions.push({
          value: n.id,
          label: `${prefix}${n.nombre} (Nivel ${n.nivel})`
        });
        // Si este nodo es válido como destino, revisar también sus hijos
        flattenValidNodes(n.nodos, prefix + n.nombre + ' > ');
      } else {
        // Aunque este nodo NO sea válido como destino (por ej. mismo nivel), 
        // revisamos sus hijos.
        flattenValidNodes(n.nodos, prefix + n.nombre + ' > ');
      }
    });
  };

  flattenValidNodes(proyecto.nodos);

  const handleMove = () => {
    const newParentId = selectedParentId === 'root' ? null : selectedParentId;
    if (itemToMove.type === 'NODO') {
      dispatch({ type: 'MOVE_NODO', payload: { id: itemToMove.id, newParentId } });
    } else {
      dispatch({ type: 'MOVE_RECURSO', payload: { id: itemToMove.id, newParentId } });
    }
    
    // Al mover, deseleccionamos el nodo temporalmente o forzamos actualización
    // dispatch({ type: 'SELECT_NODE', payload: null }); (opcional)
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mover "{itemToMove.nombre}"</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-500 mb-4">
            Selecciona el nuevo destino para este {itemToMove.type === 'NODO' ? 'nodo' : 'recurso'}.
          </p>
          <div className="space-y-4">
            <SearchableSelect
              options={validOptions}
              value={selectedParentId}
              onChange={(val) => setSelectedParentId(val)}
              placeholder="Seleccionar destino..."
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleMove} className="bg-blue-600 hover:bg-blue-700">
            Mover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

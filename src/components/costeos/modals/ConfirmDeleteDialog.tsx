import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  nodeName: string;
  nodeType: string;
}

export function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, nodeName, nodeType }: ConfirmDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  
  // Normalize strings for comparison: uppercase, trim, and remove extra spaces
  const normalizedTarget = nodeName ? nodeName.trim().toUpperCase() : 'ELIMINAR';
  const normalizedInput = confirmText.trim().toUpperCase();
  
  const isMatch = normalizedInput === normalizedTarget;

  useEffect(() => {
    if (!open) {
      setConfirmText('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar {nodeType}
          </DialogTitle>
          <DialogDescription className="pt-3">
            Esta acción no se puede deshacer. Esto eliminará permanentemente el {nodeType.toLowerCase()} 
            <strong className="text-slate-900"> {nodeName}</strong> y todos los elementos que dependan de él.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-slate-700 mb-2">
            Para confirmar, por favor escribe el nombre del {nodeType.toLowerCase()} (<span className="font-mono font-bold">{normalizedTarget}</span>) a continuación:
          </p>
          <Input 
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={normalizedTarget}
            className="uppercase"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isMatch) {
                handleConfirm();
              }
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            className="px-4 py-2 border rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isMatch}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleConfirm}
          >
            Eliminar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

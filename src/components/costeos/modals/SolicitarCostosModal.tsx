"use client";

/**
 * SolicitarCostosModal.tsx
 *
 * Se muestra durante el proceso de Costear cuando hay ítems con
 * manejoCostos=4 (Solicitar Usuario) que tienen costoUnitario=0.
 *
 * Presenta una tabla editable con todos esos ítems únicos.
 * El usuario ingresa el costo para cada uno y confirma.
 * El sistema aplica ese costo a TODOS los recursos del árbol que
 * usan ese ítem.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { DollarSign, Save, X } from "lucide-react";
import { UI_THEME } from "@/lib/theme";

export interface ItemSolicitarCosto {
  itemId:   number;
  nombre:   string;
  /** cantidad total (informativa) */
  cantidad: number;
  /** costo actual en el árbol (puede ser 0) */
  costoActual: number;
}

interface SolicitarCostosModalProps {
  open:     boolean;
  items:    ItemSolicitarCosto[];
  onConfirm: (costos: Record<number, number>) => void;
  onCancel:  () => void;
}

export function SolicitarCostosModal({
  open,
  items,
  onConfirm,
  onCancel,
}: SolicitarCostosModalProps) {
  // Estado local: mapa itemId → costo ingresado por el usuario
  const [costos, setCostos] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.map(i => [i.itemId, i.costoActual]))
  );

  // Re-inicializar cuando cambia la lista de ítems
  React.useEffect(() => {
    setCostos(Object.fromEntries(items.map(i => [i.itemId, i.costoActual])));
  }, [items]);

  const handleConfirm = () => {
    onConfirm(costos);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { if (!newOpen) onCancel(); }}>
      <DialogContent className="h-auto sm:max-w-2xl flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogTitle className={UI_THEME.modal.title}>
          <DollarSign className="h-5 w-5" />
          Ingresar Costos Solicitados
        </DialogTitle>

        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Los siguientes ítems requieren que ingrese su costo unitario para continuar con el Costeo.
          Si un ítem se repite en varias líneas del proyecto, el costo se aplicará a todas.
        </p>

        {/* Tabla editable */}
        <div className="flex-1 overflow-y-auto pr-1 pb-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium w-8">#</th>
                <th className="py-2 pr-3 font-medium">Ítem</th>
                <th className="py-2 pr-3 font-medium text-right w-28">Cant. Total</th>
                <th className="py-2 font-medium text-right w-40">Costo Unitario</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.itemId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 pr-3 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2 pr-3 font-medium">{item.nombre}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">{item.cantidad}</td>
                  <td className="py-2">
                    <NumericInput
                      value={costos[item.itemId] ?? 0}
                      onChange={(val) =>
                        setCostos(prev => ({ ...prev, [item.itemId]: val ?? 0 }))
                      }
                      className="text-right h-8"
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No hay ítems pendientes de costo.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className={UI_THEME.modal.footer}>
          <div />
          <div className={UI_THEME.modal.buttons.rightGroup}>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              <Save className="h-4 w-4 mr-1" />
              Confirmar y Costear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

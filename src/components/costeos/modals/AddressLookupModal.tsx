import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { DireccionOperativa } from '@/app/actions/ubicaciones';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface AddressLookupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direcciones: DireccionOperativa[];
  onSelect: (secuencia: number) => void;
}

export function AddressLookupModal({ open, onOpenChange, direcciones, onSelect }: AddressLookupModalProps) {
  const columns: ColumnDef<DireccionOperativa>[] = [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
    },
    {
      accessorKey: 'direccion',
      header: 'Dirección',
    },
    {
      accessorKey: 'departamentoNombre',
      header: 'Departamento',
      cell: ({ row }) => row.original.departamentoNombre || row.original.departamento,
    },
    {
      accessorKey: 'municipioNombre',
      header: 'Municipio',
      cell: ({ row }) => row.original.municipioNombre || row.original.municipio,
    },
    {
      id: 'actions',
      header: 'Acción',
      meta: { align: 'right' },
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end w-full">
          <Button 
            variant="ghost" 
            size="icon" 
            title="Seleccionar dirección"
            onClick={() => {
              onSelect(row.original.secuencia);
              onOpenChange(false);
            }}
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>
      ),
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Direcciones Operativas</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          <DataTable 
            columns={columns}
            data={direcciones}
            tableId="address-lookup-table-v3"
            searchPlaceholder="Buscar dirección..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

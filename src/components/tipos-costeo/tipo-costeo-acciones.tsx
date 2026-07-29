'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TipoCosteoDialog } from './tipo-costeo-dialog'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'

interface TipoCosteoAccionesProps {
  tipoCosteo: TipoCosteoRow
}

export function TipoCosteoAcciones({ tipoCosteo }: TipoCosteoAccionesProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        title="Ver detalles" 
        onClick={() => setEditOpen(true)}
      >
        <Eye className="h-4 w-4 text-blue-600" />
      </Button>
      <TipoCosteoDialog
        tipoCosteo={tipoCosteo}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

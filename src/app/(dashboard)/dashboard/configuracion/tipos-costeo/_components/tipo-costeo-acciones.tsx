'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormTipoCosteo } from './form-tipo-costeo'

interface TipoCosteoAccionesProps {
  tipo: any
}

export function TipoCosteoAcciones({ tipo }: TipoCosteoAccionesProps) {
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

      <FormTipoCosteo
        open={editOpen}
        onOpenChange={setEditOpen}
        tipo={tipo}
      />
    </>
  )
}

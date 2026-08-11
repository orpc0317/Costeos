'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TipoCosteoDialog } from './tipo-costeo-dialog'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'

interface TipoCosteoAccionesProps {
  tipoCosteo: TipoCosteoRow
}

export function TipoCosteoAcciones({ tipoCosteo }: TipoCosteoAccionesProps) {
  return (
    <TipoCosteoDialog
      tipoCosteo={tipoCosteo}
      trigger={
        <Button variant="ghost" size="icon" title="Ver detalles">
          <Eye className="h-4 w-4 text-blue-600" />
        </Button>
      }
    />
  )
}

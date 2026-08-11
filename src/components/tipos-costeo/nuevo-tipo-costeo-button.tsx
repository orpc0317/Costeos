'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TipoCosteoDialog } from './tipo-costeo-dialog'

export function NuevoTipoCosteoButton() {
  return (
    <TipoCosteoDialog
      trigger={
        <Button id="btn-nuevo-tipo-costeo">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo
        </Button>
      }
    />
  )
}

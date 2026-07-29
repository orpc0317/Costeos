'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TipoCosteoDialog } from './tipo-costeo-dialog'

export function NuevoTipoCosteoButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button id="btn-nuevo-tipo-costeo" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo Tipo
      </Button>
      <TipoCosteoDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

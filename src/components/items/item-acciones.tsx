'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItemModal } from './item-modal'
import type { ItemRow } from '@/lib/types/items'
import type { CategoriaRow } from '@/lib/types/categorias'

interface ItemAccionesProps {
  item: ItemRow
  categorias: CategoriaRow[]
}

export function ItemAcciones({ item, categorias }: ItemAccionesProps) {
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
      <ItemModal
        item={item}
        categorias={categorias}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CosteosTableActions({ costeoId, estado }: { costeoId: number, estado: string }) {
  const router = useRouter()

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      title={estado === 'BORRADOR' ? 'Editar' : 'Ver detalles'}
      onClick={() => router.push(`/costeos/${costeoId}/builder`)}
    >
      <Search className="h-4 w-4 text-blue-600" />
    </Button>
  )
}

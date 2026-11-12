"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { esBorradorCosteo } from '@/lib/constants'

export function CosteosTableActions({ costeoId, estado }: { costeoId: number, estado: number }) {
  const router = useRouter()

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      title={esBorradorCosteo(estado) ? 'Editar' : 'Ver detalles'}
      onClick={() => router.push(`/costeos/${costeoId}/builder`)}
    >
      <Eye className="h-4 w-4 text-blue-600" />
    </Button>
  )
}

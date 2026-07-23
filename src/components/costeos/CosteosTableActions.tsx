"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Edit, FileText } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function CosteosTableActions({ costeoId, estado }: { costeoId: number, estado: string }) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium hover:bg-slate-100 h-8 w-8 text-slate-700" />
        }
      >
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">Abrir menú</span>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => {
            setTimeout(() => router.push(`/costeos/${costeoId}/builder`), 0)
          }}
        >
          <Edit className="mr-2 h-4 w-4" />
          <span>{estado === 'BORRADOR' ? 'Editar' : 'Ver'}</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => {
            setTimeout(() => router.push(`/costeos/${costeoId}/log`), 0)
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Log (Auditoría)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

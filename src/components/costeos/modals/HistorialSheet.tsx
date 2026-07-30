'use client'

import React, { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { History, Clock, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getHistorialAutoGuardado, getSnapshotAutoGuardado, HistorialEntry } from '@/app/actions/historial'
import { useCosteo } from '@/lib/context/CosteoContext'

interface HistorialSheetProps {
  costeoId: string
}

export default function HistorialSheet({ costeoId }: HistorialSheetProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [history, setHistory] = useState<HistorialEntry[]>([])
  const { dispatch } = useCosteo()

  const loadHistory = async () => {
    setLoading(true)
    const res = await getHistorialAutoGuardado(costeoId)
    if (res.success && res.data) {
      setHistory(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      loadHistory()
    }
  }, [open, costeoId])

  const handleRestore = async (historialId: number) => {
    if (!confirm('¿Estás seguro de restaurar esta versión? Se sobrescribirá el estado actual y se auto-guardará.')) return
    
    setRestoring(true)
    const res = await getSnapshotAutoGuardado(historialId)
    if (res.success && res.data) {
      // Dispatch REPLACE_IDS isn't needed here, we fully replace the project state
      dispatch({ type: 'SET_PROYECTO', payload: res.data })
      setOpen(false)
    } else {
      console.error(res.error || "No se pudo restaurar la versión")
      alert("No se pudo restaurar la versión: " + res.error)
    }
    setRestoring(false)
  }

  const formatGroupDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
    
    return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  }

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-GT', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
  }

  // Agrupar por fecha
  const grouped = history.reduce((acc, curr) => {
    const groupKey = formatGroupDate(curr.creadoEn)
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(curr)
    return acc
  }, {} as Record<string, HistorialEntry[]>)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger 
        render={
          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-slate-500 hover:text-slate-900" />
        }
      >
        <History className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Historial</span>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-blue-900">
            <History className="h-5 w-5 text-blue-600" />
            Historial de Versiones
          </SheetTitle>
          <p className="text-sm text-slate-500">
            Se guarda una versión automáticamente cada 5 minutos de inactividad durante la edición.
          </p>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-8 text-sm text-slate-500">
            No hay versiones guardadas aún.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, items]) => (
              <div key={groupName}>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  {groupName}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-start justify-between p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors group"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatTime(item.creadoEn)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          por {item.usuarioNombre}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                        disabled={restoring}
                        onClick={() => handleRestore(item.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

import { useState, useEffect } from 'react'
import { History, UserCircle2, Clock, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { obtenerHistorial, type HistorialEntry } from '@/app/actions/auditoria'

interface HistorialDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entidadId: string | number
  entidadTipo: string
  tabla?: string
}

export function HistorialDrawer({
  open,
  onOpenChange,
  entidadId,
  entidadTipo,
  tabla
}: HistorialDrawerProps) {
  const [history, setHistory] = useState<HistorialEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!open || !entidadId) return
      setLoading(true)
      try {
        const data = await obtenerHistorial(tabla || entidadTipo, Number(entidadId))
        setHistory(data)
      } catch (err) {
        console.error("Error al cargar historial", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, entidadId, entidadTipo])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-slate-50/50">
          <SheetTitle className="flex items-center gap-2 text-slate-800">
            <History className="h-5 w-5 text-sky-600" />
            Historial de Cambios
          </SheetTitle>
          <SheetDescription>
            Mostrando bitácora para {entidadTipo} ({entidadId})
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-sm">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <History className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay historial registrado.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
              {history.map((item) => (
                <div key={item.id} className="relative flex items-start gap-4 group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-sky-50 text-sky-600 shadow-sm shrink-0 z-10">
                    <UserCircle2 className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 text-sm">{item.accion}</span>
                      <div className="flex flex-col items-end text-xs text-slate-500">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(item.fecha).toLocaleDateString()}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 mb-2">
                      Por: <span className="font-medium text-slate-700">{item.usuario}</span>
                    </div>
                    {item.detalle && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.detalle}
                      </p>
                    )}
                    
                    {item.cambios && item.cambios.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Campos Modificados
                        </div>
                        <div className="border border-slate-100 rounded-md overflow-hidden bg-slate-50/50">
                          {item.cambios.map((c, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center text-xs p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                              <div className="font-medium text-slate-700 w-1/3 mb-1 sm:mb-0">
                                {c.campo}
                              </div>
                              <div className="flex-1 flex items-center flex-wrap gap-1 text-slate-500">
                                {c.anterior && (
                                  <>
                                    <span className="line-through decoration-slate-300 px-1.5 py-0.5 rounded bg-slate-100">{c.anterior}</span>
                                    <span className="text-slate-400">→</span>
                                  </>
                                )}
                                <span className="font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{c.nuevo}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

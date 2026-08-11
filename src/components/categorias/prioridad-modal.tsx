'use client'
import React, { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, GripVertical, Check, Loader2, AlertTriangle } from 'lucide-react'
import { listarCategoriasPorEmpresa, reordenarPrioridades } from '@/app/actions/categorias'
import type { CategoriaRow } from '@/lib/types/categorias'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PrioridadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresaId: number
  empresaNombre: string
  onSuccess?: () => void
}

interface SortableItemProps {
  categoria: CategoriaRow
  index: number
  guardando: boolean
}

// ─── Item arrastrable ─────────────────────────────────────────────────────────

function SortableItem({ categoria, index, guardando }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoria.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-white select-none
        ${isDragging
          ? 'shadow-lg border-indigo-300 ring-2 ring-indigo-200'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
        }
        transition-colors`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`touch-none shrink-0 p-0.5 rounded transition-colors
          ${guardando
            ? 'cursor-not-allowed text-slate-300'
            : 'cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600'
          }`}
        aria-label="Arrastrar para reordenar"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
        {index + 1}
      </span>

      <span className="flex-1 text-sm font-medium text-slate-800 truncate">
        {categoria.nombre}
      </span>
    </div>
  )
}

// ─── Overlay de conflicto OCC ─────────────────────────────────────────────────

function ConflictoOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl">
      <div className="flex flex-col items-center gap-4 px-8 text-center max-w-xs">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">
            Conflicto de concurrencia
          </p>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Otro usuario modificó las prioridades mientras estabas trabajando.
            Debes volver a abrir el modal para ver el orden actualizado.
          </p>
        </div>
        <Button
          size="sm"
          onClick={onClose}
          className="bg-indigo-600 hover:bg-indigo-700 w-full"
        >
          Entendido
        </Button>
      </div>
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function PrioridadModal({
  open,
  onOpenChange,
  empresaId,
  empresaNombre,
  onSuccess,
}: PrioridadModalProps) {
  const [categorias, setCategorias] = useState<CategoriaRow[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [conflicto, setConflicto] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Ref para acceder al orden actual dentro del handler async sin stale closure
  const categoriasRef = useRef<CategoriaRow[]>([])
  const guardadoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { categoriasRef.current = categorias }, [categorias])

  // Cargar categorías de la empresa cuando abre
  useEffect(() => {
    if (!open) return
    setCargando(true)
    setGlobalError(null)
    setGuardado(false)
    setConflicto(false)
    listarCategoriasPorEmpresa(empresaId)
      .then(data => {
        const conPrioridad = data.filter(c => c.prioridad > 0).sort((a, b) => a.prioridad - b.prioridad)
        const sinPrioridad = data.filter(c => c.prioridad === 0)
        let next = conPrioridad.length
        const sinPrioOrdenados = sinPrioridad.map(c => ({ ...c, prioridad: ++next }))
        setCategorias([...conPrioridad, ...sinPrioOrdenados])
      })
      .catch(() => setGlobalError('Error al cargar las categorías.'))
      .finally(() => setCargando(false))
  }, [open, empresaId])

  useEffect(() => {
    return () => { if (guardadoTimerRef.current) clearTimeout(guardadoTimerRef.current) }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // 1. Reordenar UI inmediatamente
    const prev = categoriasRef.current
    const oldIndex = prev.findIndex(c => c.id === active.id)
    const newIndex = prev.findIndex(c => c.id === over.id)
    const nuevas = arrayMove(prev, oldIndex, newIndex)
    setCategorias(nuevas)

    // 2. Guardar con OCC: enviamos { id, registroVersion } de cada categoría
    setGuardando(true)
    setGuardado(false)
    setGlobalError(null)
    if (guardadoTimerRef.current) clearTimeout(guardadoTimerRef.current)

    try {
      const orden = nuevas.map(c => ({ id: c.id, registroVersion: c.registroVersion }))
      const res = await reordenarPrioridades(empresaId, orden)

      if (!res.ok) {
        if (res.error === 'OCC_CONFLICT') {
          // Conflicto de concurrencia: mostrar overlay y cerrar al confirmar
          setConflicto(true)
        } else {
          setGlobalError(res.error)
        }
        return
      }

      // Actualizar registroVersion local para que el próximo arrastre use la versión correcta
      setCategorias(current =>
        current.map((c, i) => ({ ...c, registroVersion: c.registroVersion + 1, prioridad: i + 1 }))
      )

      setGuardado(true)
      onSuccess?.()
      guardadoTimerRef.current = setTimeout(() => setGuardado(false), 2000)
    } catch {
      setGlobalError('Error inesperado al guardar el orden.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] flex flex-col max-h-[80vh] p-0 overflow-hidden">
        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Overlay de conflicto OCC */}
        {conflicto && (
          <ConflictoOverlay onClose={() => onOpenChange(false)} />
        )}

        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowUpDown className="w-4 h-4 text-indigo-500" />
            Prioridad
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {empresaNombre} — arrastra para reordenar, se guarda al instante
          </p>
        </DialogHeader>

        {/* Error general (no OCC) */}
        {globalError && (
          <div className="mx-5 bg-red-50 text-red-500 text-sm p-3 rounded-md border border-red-200 shrink-0">
            {globalError}
          </div>
        )}

        {/* Lista sortable */}
        <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
          {cargando ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Cargando categorías...
            </div>
          ) : categorias.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              No hay categorías para esta empresa.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categorias.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1.5">
                  {categorias.map((categoria, index) => (
                    <SortableItem
                      key={categoria.id}
                      categoria={categoria}
                      index={index}
                      guardando={guardando}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer — solo indicador de estado */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50 shrink-0">
          <span className="text-xs text-muted-foreground">
            {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
          </span>
          <span className="text-xs flex items-center gap-1.5">
            {guardando && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                <span className="text-indigo-600">Guardando...</span>
              </>
            )}
            {!guardando && guardado && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600">Guardado</span>
              </>
            )}
            {!guardando && !guardado && !globalError && !conflicto && (
              <span className="text-slate-400">Arrastra para reordenar</span>
            )}
          </span>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

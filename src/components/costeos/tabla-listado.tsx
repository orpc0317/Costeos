'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { UI_THEME } from '@/lib/theme'

/** Fila de tabla del Costeador: blanco y gris, el mismo criterio que DataTable. */
export function claseFilaTabla(index: number) {
  const zebra = index % 2 === 1 ? UI_THEME.table.rowStripe : UI_THEME.table.rowBase
  return `${UI_THEME.table.rowHover} ${UI_THEME.table.border} ${zebra}`
}

export function BuscadorTabla({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative w-[300px] max-w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar..."
        className={`${UI_THEME.forms.inputBase} pl-9`}
      />
    </div>
  )
}

export function incluyeTexto(q: string, ...partes: Array<string | number | null | undefined>) {
  const n = q.trim().toLowerCase()
  if (!n) return true
  return partes.some((p) => String(p ?? '').toLowerCase().includes(n))
}

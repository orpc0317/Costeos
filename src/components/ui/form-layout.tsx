import React from 'react'
import { UI_THEME } from '@/lib/theme'

export function ViewField({ label, value, locked = false }: { label: string; value?: string | null; locked?: boolean }) {
  return (
    <div className="grid gap-1">
      <span
        className="font-semibold tracking-wider leading-none text-muted-foreground"
        style={{ fontSize: 'var(--ui-viewfield-label)' }}
      >
        {label}
      </span>
      <div
        className="flex items-center rounded-none bg-transparent border-0 border-b border-primary/50 px-2"
        style={{ height: 'var(--ui-field-height)' }}
      >
        <span
          className="block truncate font-medium"
          style={{ fontSize: 'var(--ui-viewfield-value)', color: locked ? '#b4bec9' : 'var(--foreground)' }}
        >
          {value || ''}
        </span>
      </div>
    </div>
  )
}

export function SegmentCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="col-span-2 grid gap-1.5">
      <div className="flex items-center gap-2">
        <div className="h-4 w-0.5 rounded-full bg-primary/40" />
        <span
          className="font-semibold uppercase tracking-wider text-primary"
          style={{ fontSize: 'var(--ui-section-divider)' }}
        >
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
        {children}
      </div>
    </div>
  )
}

/** Una sola columna de segmentos. Catálogos chicos. */
export function SingleColumn({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

/** Dos lados dentro de una pestaña, separados por una línea. */
export function TwoColumns({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className={UI_THEME.modal.columns}>
      <div className={UI_THEME.modal.column}>{left}</div>
      <div className={UI_THEME.modal.divider} />
      <div className={UI_THEME.modal.column}>{right}</div>
    </div>
  )
}

export function FieldShell({
  children,
  span = 'full',
}: {
  children: React.ReactNode
  span?: 'full' | 'half' | 'third'
}) {
  const cls = span === 'half' ? '' : span === 'third' ? '' : 'col-span-2'
  return <div className={`grid gap-1 ${cls}`}>{children}</div>
}

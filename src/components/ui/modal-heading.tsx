import React from 'react'
import { Pencil, Plus, type LucideIcon } from 'lucide-react'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UI_THEME } from '@/lib/theme'
import { EDIT_BADGE, type ModuleAccent } from '@/lib/ui-accent'

type Mode = 'create' | 'edit' | 'view'

export function ModalHeading({
  accent,
  icon: Icon,
  mode,
  title,
  subtitle,
}: {
  accent: ModuleAccent
  icon: LucideIcon
  mode: Mode
  title: string
  subtitle?: string | null
}) {
  const creating = mode === 'create'
  const editing = mode === 'edit'
  const badge = editing ? EDIT_BADGE.badge : accent.badge
  const iconColor = editing ? EDIT_BADGE.icon : accent.icon
  const Shown = creating ? Plus : editing ? Pencil : Icon

  return (
    <DialogHeader className={`${UI_THEME.modal.header} ${accent.gradient}`}>
      <div className="flex items-center gap-3 pr-8">
        <div className={`${UI_THEME.modal.iconBadge} ${badge}`}>
          <Shown className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <DialogTitle className={UI_THEME.modal.title}>{title}</DialogTitle>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </DialogHeader>
  )
}

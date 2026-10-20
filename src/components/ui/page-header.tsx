/**
 * Encabezado de pantalla: badge de color del módulo, título en color de texto
 * y acciones (Nuevo) solo aquí.
 */

import React from 'react'
import { UI_THEME } from '@/lib/theme'
import type { ModuleAccent } from '@/lib/ui-accent'

interface PageHeaderProps {
  icon: React.ElementType
  title: string
  subtitle?: string
  actions?: React.ReactNode
  accent: ModuleAccent
}

export function PageHeader({ icon: Icon, title, subtitle, actions, accent }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className={UI_THEME.page.headingRow}>
          <div className={`${UI_THEME.page.headingBadge} ${accent.badge}`}>
            <Icon className={`${UI_THEME.page.headingIcon} ${accent.icon}`} />
          </div>
          <h1 className={UI_THEME.page.headingText}>{title}</h1>
        </div>
        {subtitle ? <p className={UI_THEME.page.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

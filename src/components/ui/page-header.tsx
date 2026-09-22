/**
 * PageHeader — Encabezado estándar para páginas CRUD.
 *
 * Centraliza el markup del encabezado (ícono + título + subtítulo) que
 * se repite en todos los `*-client.tsx`. Para cambiar el estilo visual
 * de todos los encabezados, editar UI_THEME.page en `src/lib/theme.ts`.
 *
 * Uso:
 *   <PageHeader icon={Tags} title="Categorias" subtitle="5 categorías registradas" />
 */

import React from 'react'
import { UI_THEME } from '@/lib/theme'

interface PageHeaderProps {
  /** Componente de ícono de lucide-react (ej. Tags, Building2, Users) */
  icon: React.ElementType
  /** Título principal de la página */
  title: string
  /** Subtítulo / conteo de registros */
  subtitle?: string
  /** Acciones adicionales a la derecha (botón "Nuevo", etc.) */
  actions?: React.ReactNode
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className={UI_THEME.page.headingRow}>
          <Icon className={UI_THEME.page.headingIcon} />
          <h1 className={UI_THEME.page.headingText}>{title}</h1>
        </div>
        {subtitle && (
          <p className={UI_THEME.page.subtitle}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div>{actions}</div>
      )}
    </div>
  )
}

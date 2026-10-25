'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { modulosPortada } from '@/lib/nav'
import { UI_THEME } from '@/lib/theme'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import { cn } from '@/lib/utils'

export function PortadaClient({ nombre, permisos }: { nombre: string; permisos: string[] }) {
  const modulos = modulosPortada(permisos)
  const [tab, setTab] = useState(modulos[0]?.href ?? '')

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={`Buen día, ${nombre}`}
        accent={MODULE_ACCENT.dashboard}
      />

      {modulos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No hay pantallas disponibles con tus permisos.
          </p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" className={UI_THEME.tabs.listClass}>
            {modulos.map((modulo) => {
              const Icon = modulo.icon
              return (
                <TabsTrigger key={modulo.href} value={modulo.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {modulo.titulo}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {modulos.map((modulo) => (
            <TabsContent key={modulo.href} value={modulo.href} className="mt-6">
              <section className="space-y-3">
                <h2 className={UI_THEME.forms.sectionTitle}>{modulo.titulo}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {modulo.tarjetas.map((tarjeta) => {
                    const Icon = tarjeta.icon
                    return (
                      <Link
                        key={tarjeta.href}
                        href={tarjeta.href}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors',
                          tarjeta.acento.hover,
                        )}
                      >
                        <div className={cn('shrink-0 rounded-xl p-2', tarjeta.acento.badge)}>
                          <Icon className={cn('h-5 w-5', tarjeta.acento.icon)} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{tarjeta.titulo}</p>
                          {tarjeta.detalle ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">{tarjeta.detalle}</p>
                          ) : null}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

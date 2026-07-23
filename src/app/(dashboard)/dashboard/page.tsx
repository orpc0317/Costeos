import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FileText, Users, Building2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()

  // Estadísticas rápidas (safe — si la BD no existe aún retorna 0)
  const [totalUsuarios, totalContratos] = await Promise.all([
    prisma.usuario.count().catch(() => 0),
    prisma.contrato.count().catch(() => 0),
  ])

  const stats = [
    {
      label: 'Contratos activos',
      value: totalContratos,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Usuarios del sistema',
      value: totalUsuarios,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Clientes',
      value: '—',
      icon: Building2,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Costeos este mes',
      value: '—',
      icon: TrendingUp,
      color: 'text-rose-600',
      bg: 'bg-rose-500/10',
    },
  ]

  return (
    <div className="space-y-6 animate-in-up">
      {/* Saludo */}
      <div>
        <h2 className="text-2xl font-bold">
          Buen día, {session?.user?.name?.split(' ')[0] ?? 'Usuario'} 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Aquí tienes un resumen de la actividad del sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <span className="text-3xl font-bold">{stat.value}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Placeholder para próximas secciones */}
      <Card className="border-border/60 shadow-sm border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Los contratos y costeos aparecerán aquí
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Próximamente — Fase 3
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

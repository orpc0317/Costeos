'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Shield,
  ChevronRight,
  Building2,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Costeos',
    href: '/costeos',
    icon: Calculator,
  },
  {
    label: 'Contratos',
    href: '/dashboard/contratos',
    icon: FileText,
  },
  {
    label: 'Clientes',
    href: '/dashboard/clientes',
    icon: Building2,
  },
  {
    label: 'Configuración',
    href: '/dashboard/configuracion',
    icon: Settings,
    children: [
      { label: 'Usuarios', href: '/dashboard/configuracion/usuarios' },
    ],
  },
]

interface NavUser {
  name?: string | null
  email?: string | null
  rol?: string
}

export function AppSidebar({ user }: { user: NavUser }) {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-sm">
            <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold text-sidebar-foreground text-base tracking-tight">
            Costeos
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Usuario */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-sidebar-primary-foreground">
              {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name ?? 'Usuario'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user.rol ?? 'ANALISTA'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

interface NavItemDef {
  label: string
  href: string
  icon?: React.ElementType
  exact?: boolean
  children?: { label: string; href: string }[]
}

function NavItem({ item, pathname }: { item: NavItemDef; pathname: string }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href)

  const hasChildren = item.children && item.children.length > 0
  const childActive = item.children?.some((c) => pathname.startsWith(c.href))
  const Icon = item.icon

  return (
    <div>
      <Link
        href={hasChildren ? item.children![0].href : item.href}
        className={cn(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-100',
          isActive || childActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              'w-4 h-4 shrink-0',
              isActive || childActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50',
            )}
          />
        )}
        <span className="flex-1">{item.label}</span>
        {hasChildren && (
          <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground/40" />
        )}
      </Link>

      {/* Sub-items */}
      {hasChildren && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-sidebar-border/50 space-y-0.5">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                pathname === child.href || pathname.startsWith(child.href)
                  ? 'text-sidebar-primary bg-sidebar-accent/80'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

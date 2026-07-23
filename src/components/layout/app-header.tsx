'use client'

import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { LogOut, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Mapa de rutas → títulos de página
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':                          'Dashboard',
  '/dashboard/contratos':                'Contratos',
  '/dashboard/clientes':                 'Clientes',
  '/dashboard/configuracion':            'Configuración',
  '/dashboard/configuracion/usuarios':   'Usuarios',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Fallback: buscar el prefijo más largo que coincida
  const match = Object.keys(PAGE_TITLES)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? PAGE_TITLES[match] : 'Costeos'
}

interface AppUser {
  name?: string | null
  email?: string | null
  rol?: string
}

export function AppHeader({ user }: { user: AppUser }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Título de la página */}
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      {/* Acciones */}
      <div className="flex items-center gap-2">
        {/* Notificaciones (placeholder) */}
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" aria-label="Notificaciones">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Menú de usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
                aria-label="Menú de usuario"
              />
            }
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {user.name?.split(' ')[0] ?? 'Usuario'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <span className="inline-flex mt-1 items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {user.rol}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer gap-2"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

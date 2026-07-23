import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
}

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-in-up">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-7 h-7 text-primary-foreground"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Costeos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de costeo de proyectos
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/5 p-8">
          <h2 className="text-lg font-semibold mb-1">Bienvenido de vuelta</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ingresa tus credenciales para continuar
          </p>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Costeos — Uso interno
        </p>
      </div>
    </main>
  )
}

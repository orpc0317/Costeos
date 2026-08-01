import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Costeos',
    template: '%s | Costeos',
  },
  description: 'Sistema de costeo de proyectos de seguridad',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="h-full">
        <TooltipProvider delay={300}>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  )
}

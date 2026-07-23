import NextAuth from 'next-auth'
import { auth } from '@/lib/auth'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Rutas públicas (no requieren auth)
  const isPublicRoute =
    nextUrl.pathname.startsWith('/login') ||
    nextUrl.pathname.startsWith('/api/auth')

  if (isPublicRoute) return

  // Si no está autenticado y no es ruta pública → redirigir a login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
    return Response.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todo EXCEPTO:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos de fuentes e imágenes públicas
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

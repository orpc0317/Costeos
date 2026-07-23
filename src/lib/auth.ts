import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const usuario = await prisma.usuario.findUnique({
          where: { email: String(credentials.email) },
          select: {
            id: true,
            nombre: true,
            email: true,
            passwordHash: true,
            rol: true,
            activo: true,
          },
        })

        if (!usuario || !usuario.activo) return null

        const passwordOk = await bcrypt.compare(
          String(credentials.password),
          usuario.passwordHash,
        )

        if (!passwordOk) return null

        return {
          id: String(usuario.id),
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = (user as { rol?: string }).rol
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.rol = token.rol as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
})

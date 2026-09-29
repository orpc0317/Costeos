/**
 * API Route: GET /api/cotizaciones/[filename]
 *
 * Sirve un PDF almacenado en ./uploads/cotizaciones/.
 * Requiere sesión autenticada.
 * Previene path traversal verificando que el archivo esté dentro del directorio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'cotizaciones')

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  // Auth
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse('No autenticado', { status: 401 })
  }

  const { filename } = await params

  // Sanitizar: solo letras, dígitos, guiones y punto
  if (!/^[\w\-]+\.pdf$/i.test(filename)) {
    return new NextResponse('Nombre de archivo inválido.', { status: 400 })
  }

  const filePath = path.join(UPLOAD_DIR, filename)

  // Prevenir path traversal
  if (!filePath.startsWith(UPLOAD_DIR + path.sep) && filePath !== UPLOAD_DIR) {
    return new NextResponse('Acceso denegado.', { status: 403 })
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Archivo no encontrado.', { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length':      String(fileBuffer.length),
      'Cache-Control':       'private, max-age=3600',
    },
  })
}

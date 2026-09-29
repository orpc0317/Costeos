/**
 * API Route: POST /api/cotizaciones/upload
 *
 * Recibe un multipart/form-data con el campo "file" (PDF).
 * Validaciones de seguridad:
 *   - Tipo MIME: solo application/pdf
 *   - Magic bytes: %PDF en los primeros bytes
 *   - Tamaño máximo: 10 MB
 *   - Nombre de archivo: generado con nanoid (evita path traversal)
 * Almacena en ./uploads/cotizaciones/ y devuelve { url, nombre }.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import path from 'path'
import fs from 'fs'
import { randomBytes } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'cotizaciones')
const MAX_SIZE   = 10 * 1024 * 1024 // 10 MB
const PDF_MAGIC  = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF

function generateFilename(): string {
  return `cot-${randomBytes(12).toString('hex')}.pdf`
}

export async function POST(req: NextRequest) {
  // Auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })
  }

  // Validar tipo MIME declarado
  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Solo se permiten archivos PDF.' },
      { status: 422 },
    )
  }

  // Validar tamaño
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `El archivo no puede superar los 10 MB. Tamaño recibido: ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
      { status: 422 },
    )
  }

  // Leer bytes y validar magic bytes (%PDF)
  const arrayBuffer = await file.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  if (buffer.length < 4 || !buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json(
      { error: 'El archivo no es un PDF válido.' },
      { status: 422 },
    )
  }

  // Crear directorio si no existe
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  // Guardar con nombre seguro
  const filename   = generateFilename()
  const targetPath = path.join(UPLOAD_DIR, filename)
  fs.writeFileSync(targetPath, buffer)

  return NextResponse.json({
    url:    `/api/cotizaciones/${filename}`,
    nombre: file.name,
  })
}

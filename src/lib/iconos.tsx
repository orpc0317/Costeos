'use client'

import catalogo from './iconos-dibujo.json'

/**
 * Dibujos de game-icons.net (CC BY 3.0), un trazo distinto por idea.
 * El JSON lo arma scripts/extraer-iconos-dibujo.mjs.
 * Se pintan directo en un SVG, sin la librería de Iconify, para no
 * frenar la compilación del servidor de desarrollo.
 */
const datos = catalogo as {
  width: number
  height: number
  icons: Record<string, { body: string }>
}

export const CATALOGO_ICONOS: string[] = Object.keys(datos.icons).sort((a, b) => a.localeCompare(b))

const CATALOGO = new Set<string>(CATALOGO_ICONOS)

/** Nombres que se guardaron con Lucide y tienen un dibujo equivalente. */
const ALIAS: Record<string, string> = {
  swords: 'crossed-swords',
  gun: 'pistol-gun',
}

export function nombreIcono(valor: string | null | undefined): string | null {
  if (!valor) return null
  const limpio = valor.trim()
  if (!limpio) return null
  const candidatos = [
    limpio.toLowerCase(),
    limpio
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase(),
  ]
  for (const candidato of candidatos) {
    const nombre = ALIAS[candidato] ?? candidato
    if (CATALOGO.has(nombre)) return nombre
  }
  return null
}

export function etiquetaIcono(nombre: string): string {
  return nombre
    .split('-')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
}

export function IconoDibujo({
  nombre,
  className,
}: {
  nombre?: string | null
  className?: string
}) {
  const name = nombreIcono(nombre)
  if (!name) return null
  const body = datos.icons[name]?.body
  if (!body) return null
  return (
    <svg
      viewBox={`0 0 ${datos.width} ${datos.height}`}
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}

/** Nombre de un tipo combo con el dibujo elegido, si tiene uno. */
export function NombreTipoCombo({
  nombre,
  icono,
}: {
  nombre: string
  icono?: string | null
}) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <IconoDibujo nombre={icono} className="h-4 w-4 shrink-0" />
      <span className="truncate">{nombre}</span>
    </span>
  )
}

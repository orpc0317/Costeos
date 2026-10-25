import { describe, expect, it } from 'vitest'
import { PERMISOS } from '@/lib/permisos'
import { menuVisible, modulosPortada } from '@/lib/nav'

const TODOS = Object.values(PERMISOS)

describe('menuVisible', () => {
  it('con todos los códigos arma Costeos, Compras y Configuracion', () => {
    const modulos = modulosPortada(TODOS)

    expect(modulos.map((modulo) => modulo.titulo)).toEqual(['Costeos', 'Compras', 'Configuracion'])
    expect(modulos[0].tarjetas.map((tarjeta) => tarjeta.href)).toEqual(['/costeos'])
    expect(modulos[1].tarjetas.map((tarjeta) => tarjeta.titulo)).toEqual(['Solicitudes', 'Cotizaciones'])
    expect(modulos[2].tarjetas.map((tarjeta) => tarjeta.titulo)).toEqual([
      'Empresas',
      'Clientes',
      'Proveedores',
      'Tipos Costeo',
      'Categorias',
      'Tipos Combo',
      'Items',
      'Usuarios',
    ])
  })

  it('un código ausente oculta esa tarjeta', () => {
    const modulos = modulosPortada(TODOS.filter((codigo) => codigo !== PERMISOS.SOL_COM))
    const compras = modulos.find((modulo) => modulo.titulo === 'Compras')

    expect(compras?.tarjetas.map((tarjeta) => tarjeta.titulo)).toEqual(['Cotizaciones'])
  })

  it('si el módulo queda sin opciones, oculta la pestaña', () => {
    const modulos = modulosPortada(
      TODOS.filter((codigo) => codigo !== PERMISOS.SOL_COM && codigo !== PERMISOS.COT_COM),
    )

    expect(modulos.map((modulo) => modulo.titulo)).toEqual(['Costeos', 'Configuracion'])
  })

  it('COS.NEW y DAS.HOM no crean tarjeta', () => {
    const modulos = modulosPortada([PERMISOS.COS_NEW, PERMISOS.DAS_HOM])
    const hrefs = modulos.flatMap((modulo) => modulo.tarjetas.map((tarjeta) => tarjeta.href))

    expect(modulos).toEqual([])
    expect(hrefs).not.toContain('/costeos/nuevo')
    expect(hrefs).not.toContain('/dashboard')
  })

  it('el sidebar sigue mostrando Dashboard cuando hay DAS.HOM', () => {
    const etiquetas = menuVisible([PERMISOS.DAS_HOM, PERMISOS.COS_CAT]).map((item) => item.label)

    expect(etiquetas).toEqual(['DASHBOARD', 'COSTEOS'])
  })
})

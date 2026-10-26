import { afterEach, describe, expect, it } from 'vitest'
import { erpDbConfigurado } from './erp-db'

const claves = ['ERP_DB_USER', 'ERP_DB_SERVER', 'ERP_DB_NAME'] as const

describe('erpDbConfigurado', () => {
  const previo = Object.fromEntries(claves.map((clave) => [clave, process.env[clave]]))

  afterEach(() => {
    for (const clave of claves) {
      if (previo[clave] === undefined) delete process.env[clave]
      else process.env[clave] = previo[clave]
    }
  })

  it('es falso si falta usuario, servidor o base', () => {
    delete process.env.ERP_DB_USER
    delete process.env.ERP_DB_SERVER
    delete process.env.ERP_DB_NAME
    expect(erpDbConfigurado()).toBe(false)

    process.env.ERP_DB_USER = 'u'
    process.env.ERP_DB_SERVER = 's'
    expect(erpDbConfigurado()).toBe(false)
  })

  it('es verdadero cuando usuario, servidor y base estan presentes', () => {
    process.env.ERP_DB_USER = 'u'
    process.env.ERP_DB_SERVER = 's'
    process.env.ERP_DB_NAME = 'd'
    expect(erpDbConfigurado()).toBe(true)
  })
})

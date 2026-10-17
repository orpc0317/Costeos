import { describe, expect, it } from 'vitest'
import { normalizeText, sanitizeForMatch, stripDesignacionSocietaria } from './text'

describe('normalizeText', () => {
  it('pasa a mayúsculas y quita tildes', () => {
    expect(normalizeText('José Pérez')).toBe('JOSE PEREZ')
  })

  it('devuelve vacío si no hay texto', () => {
    expect(normalizeText(null)).toBe('')
    expect(normalizeText(undefined)).toBe('')
    expect(normalizeText('')).toBe('')
  })
})

describe('sanitizeForMatch', () => {
  it('quita tildes, signos y colapsa espacios', () => {
    expect(sanitizeForMatch("Téllez & Asociados")).toBe('TELLEZ ASOCIADOS')
    expect(sanitizeForMatch("O'Brien Corp.")).toBe('OBRIEN CORP')
    expect(sanitizeForMatch('EMPRESA\u00A0S.A.')).toBe('EMPRESA SA')
  })
})

describe('stripDesignacionSocietaria', () => {
  it('quita S.A., S.R.L. y LTDA al final', () => {
    expect(stripDesignacionSocietaria('CONSTRUCTORA SOLIDA, S.A.')).toBe('CONSTRUCTORA SOLIDA')
    expect(stripDesignacionSocietaria('SERVICIOS XYZ S.R.L')).toBe('SERVICIOS XYZ')
    expect(stripDesignacionSocietaria('EMPRESA LTDA')).toBe('EMPRESA')
  })
})

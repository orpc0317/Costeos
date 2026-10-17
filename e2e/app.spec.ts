import { test, expect } from '@playwright/test'
import { e2eCredentials, login } from './helpers'

const creds = e2eCredentials()

test.describe('App autenticada', () => {
  test.skip(!creds, 'Faltan E2E_EMAIL y E2E_PASSWORD — ver docs/ai-index.md')

  test('entra al dashboard', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('link', { name: 'COSTEOS' })).toBeVisible()
  })

  test('Categorías: lista gold + modal Nuevo sin guardar', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/configuracion/categorias')
    await expect(page.getByRole('heading', { name: 'Categorias' })).toBeVisible()
    await expect(page.getByPlaceholder('Buscar por nombre...')).toBeVisible()

    await page.getByRole('button', { name: 'Nueva Categoría' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Nueva Categoria')).toBeVisible()
    await expect(page.getByRole('tab', { name: /General/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible()
  })
})

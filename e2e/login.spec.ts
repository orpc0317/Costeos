import { test, expect } from '@playwright/test'

test.describe('Login (público)', () => {
  test('muestra el formulario de Costeos', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Costeos' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  test('visita a /dashboard sin sesión redirige a login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test('credenciales inválidas muestran error inline (no toast)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nobody@costeos.invalid')
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('clave-incorrecta')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Credenciales incorrectas', { exact: false })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page).toHaveURL(/\/login/)
  })
})

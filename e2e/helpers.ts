import { expect, type Page } from '@playwright/test'

export function e2eCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_EMAIL?.trim()
  const password = process.env.E2E_PASSWORD
  if (!email || !password) return null
  return { email, password }
}

export async function login(page: Page) {
  const creds = e2eCredentials()
  if (!creds) {
    throw new Error('Define E2E_EMAIL y E2E_PASSWORD en .env / .env.local para tests autenticados')
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(creds.email)
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(creds.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: /Buen día/ })).toBeVisible()
}

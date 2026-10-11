import { expect, test } from '@playwright/test';

// Stack real: frontend (nginx) → backend (NestJS) → PostgreSQL.
// Ejecutar con: E2E_BASE_URL=http://localhost:8080 npx playwright test fullstack
test.skip(!process.env.E2E_BASE_URL, 'Requiere E2E_BASE_URL apuntando al stack de docker compose');

test('registro y autenticación contra el backend real', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const fullName = 'Usuario E2E';

  await page.goto('/register');
  await page.getByLabel('Nombre completo').fill(fullName);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('input[name=password]').fill('Secreta123');
  await page.getByLabel('Confirmar contraseña').fill('Secreta123');
  await page.getByRole('button', { name: 'Registrarse' }).click();

  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Contraseña').fill('Secreta123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/profile/);
  await expect(page.locator('[data-test=fullName]')).toHaveText(fullName);
  await expect(page.locator('[data-test=email]')).toHaveText(email);

  const encrypted = page.locator('[data-test=emailEncrypted]');
  await expect(encrypted).toHaveText(/^v1:/);
  await expect(encrypted).not.toContainText(email);
  await expect(page.locator('[data-test=passwordHash]')).toHaveText(/^\$2[aby]\$/);
});

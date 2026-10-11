import { expect, test, type Page } from '@playwright/test';

// Flujo completo del frontend con la API simulada (no necesita backend).
test.skip(!!process.env.E2E_BASE_URL, 'Solo con la API simulada');

const user = {
  id: 'uuid-1',
  fullName: 'Ana López',
  email: 'ana@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
};

async function mockApi(page: Page) {
  const accounts = new Map<string, { password: string }>();

  await page.route('**/api/auth/register', async (route) => {
    const body = route.request().postDataJSON();
    if (accounts.has(body.email)) {
      return route.fulfill({ status: 409, json: { message: 'El correo ya está registrado' } });
    }
    accounts.set(body.email, { password: body.password });
    return route.fulfill({ status: 201, json: { ...user, fullName: body.fullName, email: body.email } });
  });

  await page.route('**/api/auth/login', async (route) => {
    const { email, password } = route.request().postDataJSON();
    if (accounts.get(email)?.password !== password) {
      return route.fulfill({ status: 401, json: { message: 'Credenciales inválidas' } });
    }
    return route.fulfill({ json: { accessToken: 'fake-jwt', user } });
  });

  await page.route('**/api/auth/me', (route) =>
    route.request().headers().authorization === 'Bearer fake-jwt'
      ? route.fulfill({ json: user })
      : route.fulfill({ status: 401, json: { message: 'Token inválido' } }),
  );

  await page.route('**/api/auth/me/stored', (route) =>
    route.fulfill({
      json: {
        id: user.id,
        emailHash: 'f'.repeat(64),
        emailEncrypted: 'v1:aXY=:dGFn:ZW1haWw=',
        fullNameEncrypted: 'v1:aXY=:dGFn:bm9tYnJl',
        passwordHash: '$2b$12$abcdefghijklmnopqrstuuvwxyz0123456789ABCDEFGHIJK',
        createdAt: user.createdAt,
      },
    }),
  );
}

async function register(page: Page, email = user.email) {
  await page.goto('/register');
  await page.getByLabel('Nombre completo').fill(user.fullName);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('input[name=password]').fill('Secreta123');
  await page.getByLabel('Confirmar contraseña').fill('Secreta123');
  await page.getByRole('button', { name: 'Registrarse' }).click();
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('registro, login y perfil con datos cifrados', async ({ page }) => {
  await register(page);

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('status')).toContainText('Cuenta creada');
  await expect(page.getByLabel('Correo electrónico')).toHaveValue(user.email);

  await page.getByLabel('Contraseña').fill('Secreta123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/profile/);
  await expect(page.locator('[data-test=fullName]')).toHaveText(user.fullName);
  await expect(page.locator('[data-test=email]')).toHaveText(user.email);
  await expect(page.locator('[data-test=emailEncrypted]')).toHaveText(/^v1:/);
  await expect(page.locator('[data-test=passwordHash]')).toHaveText(/^\$2b\$/);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('muestra error con credenciales inválidas', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('nadie@example.com');
  await page.getByLabel('Contraseña').fill('Incorrecta1');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert')).toHaveText('Credenciales inválidas');
  await expect(page).toHaveURL(/\/login/);
});

test('valida en el cliente que las contraseñas coincidan', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Nombre completo').fill(user.fullName);
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.locator('input[name=password]').fill('Secreta123');
  await page.getByLabel('Confirmar contraseña').fill('Otra12345');
  await page.getByRole('button', { name: 'Registrarse' }).click();

  await expect(page.getByRole('alert')).toHaveText('Las contraseñas no coinciden');
});

test('el perfil exige sesión', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login/);
});

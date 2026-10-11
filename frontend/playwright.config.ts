import { defineConfig, devices } from '@playwright/test';

// Sin E2E_BASE_URL se levanta Vite y la API se simula (e2e/auth.spec.ts).
// Con E2E_BASE_URL (p. ej. http://localhost:8080 con docker compose) se prueba el stack completo.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npx vite --port 5173 --strictPort',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});

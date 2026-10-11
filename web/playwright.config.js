import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4173/', headless: true, testIdAttribute: 'data-test' },
  webServer: {
    // Modo e2e: sesion simulada via window.__E2E_USER__, sin Auth0 ni red.
    command: 'npx vite build --mode e2e && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

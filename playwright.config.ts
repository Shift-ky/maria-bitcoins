import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.e2e.ts',
  use: {
    browserName: 'chromium',
    serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.MAR_CHROMIUM_PATH },
  },
})

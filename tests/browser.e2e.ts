import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const origin = 'http://localhost:4180'
const mime: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
}

test.beforeEach(async ({ context }) => {
  const now = Date.now()
  let requests = 0
  // Serve the built bytes from memory without a preview server.
  await context.route(origin + '/**', async route => {
    const url = new URL(route.request().url())
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)
    await route.fulfill({
      body: await readFile(path.resolve('dist', file)),
      contentType: mime[path.extname(file)] ?? 'application/octet-stream',
    })
  })
  await context.route('https://api.coingecko.com/**', async route => {
    await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: route.request().url().includes('simple/price')
      ? { bitcoin: { brl: 350000, usd: 65000, brl_24h_change: 2, brl_24h_vol: 1000000000, last_updated_at: Math.floor(now / 1000) + requests++ } }
      : { prices: Array.from({ length: 20 }, (_, i) => [now - (20 - i) * 3600000, 320000 + i * 1700]) } })
  })
})

test('desktop: carteira persistente, simulação, exportação e backtesting', async ({ page }) => {
  const failures: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  await page.goto(origin)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText(/350\.000,00/)).toBeVisible()
  await expect(page.locator('.chart canvas').first()).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Minha carteira' }).click()
  await page.getByLabel('Valor em reais virtuais').fill('250')
  await page.getByRole('button', { name: 'Adicionar saldo' }).click()
  await expect(page.getByText(/10\.250,00/).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText(/10\.250,00/).first()).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Robô IA' }).click()
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click()
  await expect(page.getByText(/Última decisão · Compra/)).toBeVisible()
  await page.getByRole('button', { name: 'Pausar' }).click()
  await expect(page.getByText('Pausado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Executar teste' }).click()
  await expect(page.getByText('Patrimônio final')).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Operações' }).click()
  await expect(page.getByRole('cell', { name: 'Compra', exact: true })).toHaveCount(1)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  expect((await download).suggestedFilename()).toBe('operacoes-mar-bitcoin-ia.csv')
  expect(failures).toEqual([])
})

test('celular: navegação, tema e suspensão offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(origin)
  await expect(page.getByText(/350\.000,00/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  await page.getByRole('button', { name: 'Ativar tema claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await context.setOffline(true)
  await expect(page.getByText('Offline', { exact: true })).toBeVisible()
  await expect(page.getByText(/350\.000,00/)).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Robô IA' }).click()
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click()
  await expect(page.getByText('Em execução', { exact: true })).toBeVisible()
  await expect(page.getByText(/Aguardando dados de mercado recentes/)).toBeVisible()
  await expect(page.getByText(/Última decisão/)).toHaveCount(0)
  await page.getByRole('navigation').getByRole('link', { name: 'Configurações' }).click()
  await expect(page.getByRole('heading', { name: 'Configurações', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
})

test('preserva a cotação durante falha de rede e recupera com Atualizar', async ({ page, context }) => {
  await page.goto(origin)
  const quote = page.getByText(/350\.000,00/)
  await expect(quote).toBeVisible()
  const quoteUrl = 'https://api.coingecko.com/api/v3/simple/price?**'
  const fail = (route: import('@playwright/test').Route) => route.abort('failed')
  await context.route(quoteUrl, fail)
  await page.getByRole('button', { name: 'Atualizar' }).click()
  const notice = page.getByText(/Não foi possível conectar ao CoinGecko/)
  await expect(notice).toBeVisible()
  await expect(quote).toBeVisible()
  await expect(page.getByText(/Cotação armazenada de/)).toBeVisible()
  await context.unroute(quoteUrl, fail)
  await page.getByRole('button', { name: 'Atualizar' }).click()
  await expect(notice).toHaveCount(0)
  await expect(page.getByText(/Cotação de/)).toBeVisible()
})

import type { Point, Quote } from '../types'

const endpoint = 'https://api.coingecko.com/api/v3'
async function request(path: string) {
  const fetchWithTimeout = () => fetch(endpoint + path, { signal: AbortSignal.timeout(12000) })
  let response: Response
  try {
    response = await fetchWithTimeout()
  } catch {
    if (globalThis.navigator?.onLine === false) throw new Error('Sem conexão para consultar o CoinGecko.')
    await new Promise(resolve => setTimeout(resolve, 1500))
    try {
      response = await fetchWithTimeout()
    } catch {
      throw new Error('Não foi possível conectar ao CoinGecko. Use Atualizar ou aguarde a próxima tentativa automática.')
    }
  }
  if (response.status === 429) throw new Error('Limite de consultas do CoinGecko atingido. Uma nova tentativa será feita em breve.')
  if (!response.ok) throw new Error('CoinGecko temporariamente indisponível.')
  try {
    return await response.json()
  } catch {
    throw new Error('O CoinGecko enviou uma resposta inválida. Tente atualizar em instantes.')
  }
}
export async function fetchQuote(): Promise<Quote> {
  const data = await request('/simple/price?ids=bitcoin&vs_currencies=brl,usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true')
  const { brl, usd, brl_24h_change: change, brl_24h_vol: volume, last_updated_at: updated } = data.bitcoin ?? {}
  if (![brl, usd, change, volume, updated].every(Number.isFinite) || brl <= 0 || usd <= 0 || updated <= 0) throw new Error('Cotação recebida incompleta.')
  return { brl, usd, change, volume, time: updated * 1000 }
}
export async function fetchHistory(days: number): Promise<Point[]> {
  const data = await request('/coins/bitcoin/market_chart?vs_currency=brl&days=' + days)
  if (!Array.isArray(data.prices)) throw new Error('Histórico indisponível.')
  const points = new Map<number, Point>()
  for (const [rawTime, price] of data.prices) {
    const time = Math.floor(rawTime / 1000) * 1000
    if (Number.isFinite(time) && Number.isFinite(price) && price > 0) points.set(time, { time, price })
  }
  if (!points.size) throw new Error('Histórico indisponível.')
  return [...points.values()].sort((a, b) => a.time - b.time)
}

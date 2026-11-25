import type { Point, Side } from '../types'

export const profitGiveback = 0.30

export function analyze(previous: number | undefined, price: number, position?: { profit: number; peak: number }): { side: Side; reason: string } {
  if (position) {
    if (position.peak > 0 && position.profit <= position.peak * (1 - profitGiveback) + 1e-8) {
      return { side: 'Venda', reason: 'O lucro líquido recuou pelo menos 30% em relação ao pico da posição.' }
    }
    return { side: 'Manutenção', reason: 'Posição em aberto. Aguardando recuo de 30% a partir do pico de lucro líquido.' }
  }
  if (previous === undefined) return { side: 'Manutenção', reason: 'Primeira cotação registrada como referência.' }
  if (price > previous) return { side: 'Compra', reason: 'O preço do Bitcoin subiu em relação à cotação anterior.' }
  return { side: 'Manutenção', reason: 'Aguardando uma alta para iniciar nova posição.' }
}

export function volatility(points: Point[]) {
  const returns = points.slice(1).map((point, i) => point.price / points[i].price - 1)
  if (returns.length < 2) return null
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  return Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length) * 100
}

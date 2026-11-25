import type { Point, Side } from '../types'

export function analyze(history: Point[]): { side: Side; reason: string } {
  if (history.length < 8) return { side: 'Manutenção', reason: 'Amostra insuficiente para calcular as médias.' }
  const recent = history.slice(-8)
  const mean = (points: Point[]) => points.reduce((sum, point) => sum + point.price, 0) / points.length
  const spread = mean(recent.slice(-3)) / mean(recent) - 1
  if (spread > 0.005) return { side: 'Compra', reason: 'A média curta superou a média longa em mais de 0,5%.' }
  if (spread < -0.005) return { side: 'Venda', reason: 'A média curta ficou mais de 0,5% abaixo da média longa.' }
  return { side: 'Manutenção', reason: 'A diferença entre as médias ficou dentro de ±0,5%.' }
}

export function volatility(points: Point[]) {
  const returns = points.slice(1).map((point, i) => point.price / points[i].price - 1)
  if (returns.length < 2) return null
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  return Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length) * 100
}

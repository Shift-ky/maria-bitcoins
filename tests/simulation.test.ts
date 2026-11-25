import { describe, expect, it } from 'vitest'
import { addFunds, backtest, createWallet, equity, evaluatePrice, execute } from '../src/engine/simulation'

const buy = { side: 'Compra', reason: 'Tendência de teste' } as const
const sell = { side: 'Venda', reason: 'Tendência de teste' } as const

describe('execução simulada', () => {
  it('debita compras, registra custos e realiza o resultado líquido de uma venda', () => {
    const initial = createWallet(1000, 0)
    const bought = execute(initial, { time: 1, price: 100 }, buy)
    const invested = 1000 / 1.0025
    expect(bought.btc).toBeCloseTo(invested / 100)
    expect(bought.cash).toBeCloseTo(0)
    expect(equity(bought, 100)).toBeCloseTo(invested)
    const sold = execute(bought, { time: 2, price: 120 }, sell)
    const proceeds = invested * 1.2 * 0.9975
    expect(sold.operations.at(-1)?.result).toBeCloseTo(proceeds - 1000)
    expect(sold.cash).toBeCloseTo(proceeds)
    expect(sold.fees).toBeCloseTo(invested * 2.2 * 0.0025)
    expect(sold.btc).toBe(0)
  })

  it('impõe limites de exposição, impede repetição e interrompe quando o limite de perda é atingido', () => {
    const state = { ...createWallet(1000, 0), risk: { fee: 1, exposure: 10, loss: 2 } }
    const point = { time: 1, price: 100 }
    const bought = execute(state, point, buy)
    expect(bought.btc * point.price / equity(bought, point.price)).toBeCloseTo(0.1)
    expect(execute(bought, point, buy)).toBe(bought)
    expect(execute(bought, { time: 0, price: 100 }, buy)).toBe(bought)
    const stopped = execute(bought, { time: 2, price: 40 }, buy)
    expect(stopped.status).toBe('Limite atingido')
    expect(stopped.operations.at(-1)?.side).toBe('Manutenção')
    expect(stopped.drawdown).toBeGreaterThan(2)
  })

  it('conserva posição não alavancada mesmo com exposição de 100% e taxas', () => {
    let state = { ...createWallet(1000, 0), risk: { fee: 2, exposure: 100, loss: 100 } }
    for (let time = 1; time <= 20; time++) state = execute(state, { time, price: 100 }, buy)
    expect(state.cash).toBeGreaterThanOrEqual(0)
    expect(state.cash).toBeLessThan(0.01)
    expect(state.cash + 100 * state.btc + state.fees).toBeCloseTo(1000)
  })

  it('ajusta o capital e a referência pelos aportes e rejeita entradas inválidas', () => {
    const state = execute(createWallet(1000, 0), { time: 1, price: 100 }, buy)
    const credited = addFunds(state, 100, 200, 2)
    expect(credited.contributed).toBe(1100)
    expect(credited.peak).toBe(state.peak + 100)
    expect(credited.benchmark).toBe(10.5)
    expect(() => addFunds(state, NaN, 200)).toThrow()
    expect(() => createWallet(-1)).toThrow()
  })

  it('vende a R$ 121 depois de comprar com R$ 100 e registrar pico de R$ 130', () => {
    let state = { ...createWallet(100, 0), risk: { fee: 0, exposure: 100, loss: 10 } }
    for (const [i, price] of [99, 100, 98, 130, 122].entries()) {
      state = evaluatePrice(state, { time: i + 1, price })
    }
    expect(state.btc).toBe(1)
    expect(state.profitPeak).toBe(30)
    expect(state.operations.at(-1)?.side).toBe('Manutenção')
    const sold = evaluatePrice(state, { time: 6, price: 121 })
    expect(sold.btc).toBe(0)
    expect(sold.cash).toBe(121)
    expect(sold.operations.at(-1)?.result).toBe(21)
    expect(sold.profitPeak).toBe(0)
    expect(evaluatePrice(sold, { time: 6, price: 121 })).toBe(sold)
  })

  it('usa somente amostras anteriores ao preço de execução no backtesting', () => {
    const risk = createWallet().risk
    const points = Array.from({ length: 2 }, (_, time) => ({ time, price: 100 }))
    const short = backtest([...points, { time: 2, price: 300 }], 1000, risk)
    const long = backtest([...points, { time: 2, price: 300 }, { time: 3, price: 500 }], 1000, risk)
    expect(short.state.operations[0].side).toBe('Manutenção')
    expect(long.state.operations[0]).toEqual(short.state.operations[0])
    expect(long.state.operations[1].side).toBe('Compra')
    expect(long.hold).toBeCloseTo(1000 * 500 / 300)
  })
})

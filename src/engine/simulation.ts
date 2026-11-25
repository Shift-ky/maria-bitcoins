import type { State, Side, Point } from '../types'
import { analyze } from './analysis'

export function createWallet(amount = 10000, time = Date.now()): State {
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 1e9) throw new Error('Informe um capital entre R$ 0,01 e R$ 1 bilhão.')
  return {
    cash: amount, contributed: amount, btc: 0, cost: 0, peak: amount, drawdown: 0,
    fees: 0, benchmark: 0, operations: [], movements: [{ time, amount, equity: amount, kind: 'Saldo inicial' }],
    status: 'Parado', risk: { fee: 0.25, exposure: 40, loss: 10 }, theme: 'dark',
  }
}

export const equity = (state: State, price: number) => state.cash + state.btc * price

export function addFunds(state: State, amount: number, price: number, time = Date.now()) {
  if (!Number.isFinite(amount) || amount < 0.01 || state.contributed + amount > 1e9) throw new Error('Informe um valor positivo. O total de aportes pode chegar a R$ 1 bilhão.')
  return {
    ...state, cash: state.cash + amount, contributed: state.contributed + amount, peak: state.peak + amount,
    benchmark: state.benchmark && price > 0 ? state.benchmark + amount / price : state.benchmark,
    movements: [...state.movements, { time, amount, equity: equity(state, price) + amount, kind: 'Aporte virtual' }],
  }
}

export function execute(state: State, point: Point, decision: { side: Side; reason: string }): State {
  const { time, price } = point
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(time) || time <= (state.operations.at(-1)?.time ?? -Infinity)) return state
  const total = equity(state, price)
  const peak = Math.max(state.peak, total)
  const limit = (peak - total) / peak * 100 >= state.risk.loss
  const feeRate = state.risk.fee / 100
  let { side, reason } = decision
  let { cash, btc, cost } = state
  let quantity = 0, value = 0, fee = 0
  let result: number | null = null
  if (limit) {
    side = 'Manutenção'
    reason = 'Simulação interrompida pelo limite de perda desde o pico.'
  }
  const maxExposure = state.risk.exposure / 100
  const room = (total * maxExposure - btc * price) / (1 + maxExposure * feeRate)
  if (!limit && btc > 0 && room < -0.01) {
    side = 'Venda'
    reason = 'Redução da posição porque a exposição ultrapassou o limite configurado.'
  }
  if (side === 'Compra') {
    value = Math.max(0, Math.min(room, cash / (1 + feeRate), total * 0.15))
    if (value >= 0.01) {
      quantity = value / price
      fee = value * feeRate
      cash = Math.max(0, cash - value - fee)
      btc += quantity
      cost += value + fee
    } else {
      side = 'Manutenção'
      value = 0
      reason += ' Saldo ou margem de exposição insuficiente.'
    }
  }
  if (side === 'Venda') {
    if (btc > 0) {
      quantity = btc
      value = btc * price
      fee = value * feeRate
      result = value - fee - cost
      cash += value - fee
      btc = 0
      cost = 0
    } else {
      side = 'Manutenção'
      reason += ' A carteira está sem BTC virtual.'
    }
  }
  const current = cash + btc * price
  const drawdown = Math.max(state.drawdown, (peak - current) / peak * 100)
  return {
    ...state, cash, btc, cost, peak, drawdown, fees: state.fees + fee,
    benchmark: state.benchmark || state.contributed / price,
    status: limit || (peak - current) / peak * 100 >= state.risk.loss ? 'Limite atingido' : state.status,
    operations: [...state.operations, { id: String(time), time, side, price, btc: quantity, value, fee, result, reason, before: state.cash, after: cash, equity: current }],
  }
}

export function backtest(points: Point[], capital: number, risk: State['risk']) {
  if (points.length < 9) throw new Error('O teste precisa de pelo menos nove preços históricos.')
  let state = { ...createWallet(capital, points[0].time), risk }
  for (let i = 8; i < points.length; i++) {
    if (state.status === 'Limite atingido') {
      const total = equity(state, points[i].price)
      const peak = Math.max(state.peak, total)
      state = { ...state, peak, drawdown: Math.max(state.drawdown, (peak - total) / peak * 100) }
      continue
    }
    state = execute(state, points[i], analyze(points.slice(i - 8, i)))
  }
  return { state, total: equity(state, points.at(-1)!.price), hold: capital / points[8].price * points.at(-1)!.price }
}

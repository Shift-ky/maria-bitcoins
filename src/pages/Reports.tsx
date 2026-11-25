import { Chart } from '../components/Chart'
import { Metric } from '../components/Metric'
import { equity } from '../engine/simulation'
import type { State } from '../types'
import { money, percent } from '../utils/format'

export function Reports({ state, price }: { state: State; price?: number }) {
  const trades = state.operations.filter(op => op.side !== 'Manutenção')
  const positives = trades.filter(op => op.result !== null && op.result > 0).length
  const negatives = trades.filter(op => op.result !== null && op.result < 0).length
  const total = price || !state.btc ? equity(state, price ?? 0) : undefined
  const benchmark = state.benchmark && price ? state.benchmark * price : undefined
  const points = [
    ...state.movements.map(entry => ({ time: entry.time, price: entry.equity })),
    ...state.operations.map(entry => ({ time: entry.time, price: entry.equity })),
  ].sort((a, b) => a.time - b.time)
  return <>
    <div className="grid metrics three">
      {[['Diário', 1], ['Semanal', 7], ['Mensal', 30]].map(([label, days]) => {
        const since = Date.now() - Number(days) * 86400000
        const realized = trades.filter(op => op.time >= since).reduce((sum, op) => sum + (op.result ?? 0), 0)
        return <Metric key={label} label={'Resultado ' + String(label).toLowerCase()} value={money(realized)} detail={'Resultado realizado · últimos ' + days + (days === 1 ? ' dia' : ' dias')} tone={realized < 0 ? 'negative' : realized > 0 ? 'positive' : ''} />
      })}
    </div>
    <section className="panel chart-panel"><div className="section-head"><div><h2>Evolução patrimonial</h2><p>Patrimônio virtual registrado em decisões e aportes</p></div></div><Chart points={points} theme={state.theme} /></section>
    <div className="grid metrics four">
      <Metric label="Operações executadas" value={trades.length} detail={state.operations.length - trades.length + ' decisões de manutenção'} />
      <Metric label="Vendas com resultado" value={positives + ' / ' + negatives} detail="Positivas / negativas" />
      <Metric label="Taxas acumuladas" value={money(state.fees)} />
      <Metric label="Maior queda desde o pico" value={percent(state.drawdown)} />
    </div>
    <section className="panel form"><h2>Comparação de estratégias</h2>
      <div className="grid metrics two"><Metric label="Simulador de tendências" value={total === undefined ? '—' : money(total)} detail={total === undefined ? '' : 'Resultado: ' + money(total - state.contributed)} />
        <Metric label="Manter Bitcoin" value={benchmark === undefined ? '—' : money(benchmark)} detail="Referência sem taxas" /></div>
      <p>A referência usa o mesmo capital no primeiro preço observado pelo simulador e incorpora os aportes seguintes ao preço registrado. As taxas de compra e venda entram no resultado realizado ao encerrar a posição.</p>
    </section>
  </>
}

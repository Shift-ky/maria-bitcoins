import { useState, type FormEvent } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { backtest, netPositionProfit } from '../engine/simulation'
import { volatility } from '../engine/analysis'
import { fetchHistory } from '../services/market'
import { storage } from '../storage/database'
import { Metric } from '../components/Metric'
import type { Point, State } from '../types'
import { money, percent, timestamp } from '../utils/format'
import type { Change } from './Wallet'

export function Robot({ state, change, ready, signals, price, notificationPermission, enableNotifications }: { state: State; change: Change; ready: boolean; signals?: Point[]; price?: number; notificationPermission: string; enableNotifications: () => void }) {
  const deviation = volatility(signals ?? [])
  const last = state.operations.at(-1)
  const purchase = state.operations.findLast(operation => operation.side === 'Compra')
  const sale = state.operations.findLast(operation => operation.side === 'Venda')
  const realized = state.operations.reduce((sum, operation) => sum + (operation.result ?? 0), 0)
  const estimated = state.btc > 0 && price !== undefined ? netPositionProfit(state, price) : undefined
  const status = (next: State['status']) => void change(current => ({ ...current, status: next }))
  return <>
    <section className="panel form">
      <div className="section-head bare"><div><h2>Simulador de tendências</h2><p>Abre uma posição virtual na alta, dentro dos limites da carteira. Vende quando o lucro líquido recua 30% em relação ao maior lucro registrado nessa posição.</p></div><span className="badge">{state.status}</span></div>
      <div className="actions">
        <button className="primary" disabled={state.status === 'Em execução'} onClick={() => status('Em execução')}><Play size={16} /> Iniciar</button>
        <button disabled={state.status !== 'Em execução'} onClick={() => status('Pausado')}><Pause size={16} /> Pausar</button>
        <button disabled={state.status === 'Parado'} onClick={() => status('Parado')}><Square size={16} /> Interromper</button>
      </div>
      {state.status === 'Em execução' && ready && !state.btc && <p>Compra automática ativa. Aguardando uma cotação acima da anterior, com saldo e margem de exposição disponíveis.</p>}
      {(state.status === 'Parado' || state.status === 'Pausado') && <p>Use Iniciar para ativar compras e vendas automáticas com saldo virtual.</p>}
      {!ready && <p role="status" className="notice">Aguardando dados de mercado recentes para simular operações.</p>}
      <p>A primeira cotação serve de referência. O simulador consulta o mercado a cada 90 segundos enquanto a aplicação estiver aberta.</p>
      {notificationPermission === 'default' && <button onClick={enableNotifications}>Ativar notificações do navegador</button>}
      {notificationPermission === 'granted' && <p>Notificações do navegador ativadas.</p>}
      {notificationPermission === 'denied' && <p>Notificações bloqueadas. Para permitir, altere a permissão do site no navegador.</p>}
      {state.btc > 0 && price && <p>Pico de lucro registrado {money(state.profitPeak ?? 0)}{Boolean(state.profitPeak && state.profitPeak > 0) && <> · Gatilho de venda {money(state.profitPeak! * 0.70)} de lucro líquido</>}</p>}
      {last && <p>Última decisão · {last.side} · {timestamp(last.time)}<br />{last.reason}</p>}
    </section>
    <section className="panel form">
      <h2>Compras e resultados simulados</h2>
      <div className="grid metrics four">
        <Metric label="Última compra virtual" value={purchase ? money(purchase.value + purchase.fee) : '—'} detail={purchase ? timestamp(purchase.time) + ' · Inclui taxa de ' + money(purchase.fee) : 'Nenhuma compra registrada'} />
        <Metric label="Resultado da posição aberta" value={estimated === undefined ? '—' : money(estimated)} detail={state.btc > 0 ? 'Estimativa após taxas pela última cotação disponível' : 'Nenhuma posição em aberto'} />
        <Metric label="Resultado da última venda" value={sale?.result == null ? '—' : money(sale.result)} detail={sale ? timestamp(sale.time) + ' · Após taxas' : 'Nenhuma venda registrada'} />
        <Metric label="Resultado líquido realizado" value={sale ? money(realized) : '—'} detail="Total das vendas registradas, após taxas" />
      </div>
      <a href="#operacoes">Ver histórico de operações</a>
    </section>
    <div className="grid metrics three">
      <Metric label="Volatilidade da série" value={deviation === null ? '—' : percent(deviation)} detail="Desvio padrão dos retornos por intervalo na série de 7 dias" />
      <Metric label="Limite de exposição" value={percent(state.risk.exposure)} detail="Posição em BTC sobre o patrimônio" />
      <Metric label="Maior queda desde o pico" value={percent(state.drawdown)} detail={'Limite de interrupção: ' + percent(state.risk.loss)} />
    </div>
    <Backtest risk={state.risk} />
  </>
}

function Backtest({ risk }: { risk: State['risk'] }) {
  const [days, setDays] = useState(30)
  const [capital, setCapital] = useState('10000')
  const [result, setResult] = useState<ReturnType<typeof backtest>>()
  const [range, setRange] = useState('')
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)
  async function run(event: FormEvent) {
    event.preventDefault()
    setRunning(true)
    setMessage('')
    setResult(undefined)
    try {
      const cached = await storage.read<{ data: Point[]; time: number }>('history:' + days)
      let points = cached?.data
      let fromCache = true
      if (navigator.onLine && (!cached || Date.now() - cached.time > 360000)) {
        try {
          points = await fetchHistory(days)
          fromCache = false
          await storage.write('history:' + days, { data: points, time: Date.now() }).catch(() => {})
        } catch (error) { if (!points) throw error }
      }
      if (!points) throw new Error('Não há histórico armazenado para esse período.')
      setResult(backtest(points, Number(capital), risk))
      setRange(timestamp(points[2].time) + ' a ' + timestamp(points.at(-1)!.time) + (fromCache ? ' · Histórico armazenado' : ' · CoinGecko'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao executar o teste.')
    } finally { setRunning(false) }
  }
  return <section className="panel form">
    <div><h2>Backtesting</h2><p>Teste a mesma estratégia em dados históricos com as taxas e os limites das configurações atuais.</p></div>
    <form className="actions align-end" onSubmit={run}>
      <label>Período<select value={days} onChange={event => setDays(Number(event.target.value))}>{[7, 30, 90].map(day => <option key={day} value={day}>{day} dias</option>)}</select></label>
      <label>Capital virtual (R$)<input required type="number" min="0.01" max="1000000000" step="0.01" value={capital} onChange={event => setCapital(event.target.value)} /></label>
      <button className="primary" disabled={running}>{running ? 'Testando…' : 'Executar teste'}</button>
    </form>
    {message && <p className="notice" role="alert">{message}</p>}
    {result && <><p>{range} · {result.state.operations.filter(op => op.side !== 'Manutenção').length} operações · {result.state.status === 'Limite atingido' ? 'Limite de perda atingido' : 'Série concluída'}</p>
      <div className="grid metrics four">
        <Metric label="Patrimônio final" value={money(result.total)} detail={'Resultado: ' + money(result.total - result.state.contributed)} />
        <Metric label="Manter BTC" value={money(result.hold)} detail="Referência sem taxas" />
        <Metric label="Taxas simuladas" value={money(result.state.fees)} />
        <Metric label="Maior queda" value={percent(result.state.drawdown)} />
      </div>
      {result.state.operations.at(-1) && <p>Última decisão registrada · {result.state.operations.at(-1)?.reason}</p>}
    </>}
    <p>As duas primeiras amostras formam o sinal inicial. O teste compara os dois preços anteriores e executa na amostra seguinte. O teste desconsidera derrapagem e liquidez. Resultados históricos podem variar em simulações futuras.</p>
  </section>
}

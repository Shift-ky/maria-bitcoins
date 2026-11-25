import { Bitcoin, ChartNoAxesCombined, CircleDollarSign, RefreshCw, TrendingUp } from 'lucide-react'
import { Chart } from '../components/Chart'
import { Metric } from '../components/Metric'
import { periods, type useMarket } from '../hooks/useMarket'
import { dollars, money, percent, timestamp } from '../utils/format'

export type MarketData = ReturnType<typeof useMarket>

export function MarketMetrics({ market, full = false }: { market: MarketData; full?: boolean }) {
  const { quote } = market
  return <div className={'grid metrics ' + (full ? 'four' : 'three')}>
    <Metric label="Bitcoin em reais" value={quote ? money(quote.brl) : '—'} detail="BTC / BRL" icon={<Bitcoin size={20} />} />
    <Metric label="Bitcoin em dólares" value={quote ? dollars(quote.usd) : '—'} detail="BTC / USD" icon={<CircleDollarSign size={20} />} />
    <Metric label="Variação em 24 h" value={quote ? percent(quote.change) : '—'} tone={quote && quote.change < 0 ? 'negative' : quote ? 'positive' : ''} detail="BTC / BRL" icon={<TrendingUp size={20} />} />
    {full && <Metric label="Volume em 24 h" value={quote ? money(quote.volume) : '—'} detail="Volume negociado em BRL" icon={<ChartNoAxesCombined size={20} />} />}
  </div>
}

export function MarketChart({ market, days, setDays, theme }: { market: MarketData; days: number; setDays: (value: number) => void; theme: 'light' | 'dark' }) {
  return <section className="panel chart-panel">
    <div className="section-head">
      <div><h2>Preço do Bitcoin</h2><p>BTC / BRL · Histórico de mercado</p></div>
      <div className="periods" aria-label="Período do gráfico">
        {periods.map(period => <button key={period} aria-pressed={days === period} onClick={() => setDays(period)}>{period}D</button>)}
      </div>
    </div>
    <Chart points={market.points} theme={theme} />
    <div className="chart-footer">
      <span>CoinGecko · {market.quote ? (market.online && market.verifiedAt ? 'Cotação de ' : 'Cotação armazenada de ') + timestamp(market.quote.time) : 'Aguardando cotação'}</span>
      <button onClick={market.refresh} disabled={!market.online}><RefreshCw size={15} /> Atualizar</button>
    </div>
    {market.historyError && <p className="notice" role="status">{market.historyError} O histórico em cache, quando disponível, permanece visível.</p>}
  </section>
}

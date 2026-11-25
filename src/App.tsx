import { useEffect, useState } from 'react'
import { Activity, Bitcoin, Bot, ChartNoAxesCombined, ClipboardList, LayoutDashboard, Moon, Settings as SettingsIcon, Sun, Wallet, Waves } from 'lucide-react'
import { useMarket } from './hooks/useMarket'
import { useWallet } from './hooks/useWallet'
import { useTradeNotifications } from './hooks/useTradeNotifications'
import type { Operation } from './types'
import { equity, evaluatePrice } from './engine/simulation'
import { Metric } from './components/Metric'
import { Operations } from './components/Operations'
import { MarketChart, MarketMetrics } from './pages/Market'
import { WalletMetrics, WalletPage } from './pages/Wallet'
import { Robot } from './pages/Robot'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { money } from './utils/format'

const pages = [
  { id: 'dashboard', label: 'Dashboard', caption: 'Acompanhe o mercado e o desempenho da sua carteira virtual.', icon: LayoutDashboard },
  { id: 'carteira', label: 'Minha carteira', caption: 'Gerencie seu saldo fictício e consulte suas movimentações.', icon: Wallet },
  { id: 'robo', label: 'Robô IA', caption: 'Experimente decisões automáticas em um ambiente de simulação.', icon: Bot },
  { id: 'mercado', label: 'Mercado', caption: 'Consulte as cotações e o histórico de preços do Bitcoin.', icon: ChartNoAxesCombined },
  { id: 'operacoes', label: 'Operações', caption: 'Consulte as decisões e negociações da sua carteira virtual.', icon: ClipboardList },
  { id: 'relatorios', label: 'Relatórios', caption: 'Acompanhe resultados, custos e variações do patrimônio virtual.', icon: Activity },
  { id: 'configuracoes', label: 'Configurações', caption: 'Ajuste o risco, a aparência e a instalação do aplicativo.', icon: SettingsIcon },
]
const getPage = () => pages.find(page => '#' + page.id === location.hash) ?? pages[0]
type InstallPrompt = Event & { prompt: () => Promise<unknown>; userChoice: Promise<{ outcome: string }> }

export default function App() {
  const { wallet, change, error } = useWallet()
  const notifications = useTradeNotifications()
  const [page, setPage] = useState(getPage)
  const [days, setDays] = useState(7)
  const [clock, setClock] = useState(Date.now)
  const [prompt, setPrompt] = useState<InstallPrompt>()
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const market = useMarket(days)
  const { online, quote, signals, verifiedAt } = market
  const theme = wallet?.theme ?? 'dark'
  const price = quote?.brl
  const ready = Boolean(online && quote && verifiedAt && clock - verifiedAt < 150000 && Math.abs(clock - quote.time) < 900000)
  const last = wallet?.operations.at(-1)?.time
  useEffect(() => {
    const onRoute = () => { setPage(getPage()); window.scrollTo(0, 0) }
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const onInstall = () => { setInstalled(true); setPrompt(undefined) }
    const timer = setInterval(() => setClock(Date.now()), 15000)
    window.addEventListener('hashchange', onRoute)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstall)
    return () => {
      clearInterval(timer)
      window.removeEventListener('hashchange', onRoute)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstall)
    }
  }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => {
    if (!ready || !navigator.onLine || wallet?.status !== 'Em execução' || !quote || (last !== undefined && quote.time <= last)) return
    let operation: Operation | undefined
    void change(current => {
      if (current.status !== 'Em execução' || !navigator.onLine || Date.now() - verifiedAt >= 150000 || Math.abs(Date.now() - quote.time) >= 900000) return current
      const next = evaluatePrice(current, { time: quote.time, price: quote.brl })
      if (next !== current) operation = next.operations.at(-1)
      return next
    }).then(saved => {
      if (saved && operation) void notifications.notify(operation)
    })
  // Quote and persisted robot state determine when to evaluate a fresh price.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, quote, wallet?.status, last, verifiedAt])
  const profit = wallet && (price || !wallet.btc) ? equity(wallet, price ?? 0) - wallet.contributed : undefined
  const status = wallet?.status === 'Em execução' && !ready ? 'Aguardando dados' : wallet?.status

  return <div className="shell">
    <aside className="sidebar">
      <a href="#dashboard" className="brand"><span className="brand-mark"><Waves size={25} /></span><span>Mar Bitcoin <em>IA</em><small>SIMULADOR DE MERCADO</small></span></a>
      <nav aria-label="Menu principal">{pages.map(({ id, label, icon: Icon }) =>
        <a href={'#' + id} key={id} aria-current={page.id === id ? 'page' : undefined}><Icon size={19} /><span>{label}</span></a>)}</nav>
      <div className="sidebar-note"><Bitcoin size={18} /><div><strong>Paper trading</strong><small>Carteira com dinheiro virtual</small></div></div>
    </aside>
    <div className="content">
      <header className="topbar">
        <span className="workspace-label">Área de simulação</span>
        <div className="actions">
          <span className={'connection ' + (online ? 'connected' : '')}><span />{online ? 'Online' : 'Offline'}</span>
          <button className="icon-button" disabled={!wallet} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={() => void change(current => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </header>
      <main>
        <div className="page-heading"><div><h1>{page.label}</h1><p>{page.caption}</p></div><span className="badge virtual">Dinheiro virtual</span></div>
        {notifications.notice && <p className="notice" role="status">{notifications.notice}</p>}
        {error && <p className="notice" role="alert">{error}</p>}
        {(!online || market.quoteError || (quote && !ready && wallet?.status === 'Em execução')) && <p className="notice" role="status">
          {!online ? 'Modo offline. O simulador aguarda conexão. A última cotação salva é exibida quando disponível.' : market.quoteError || 'Simulador aguardando confirmação de dados recentes.'}
        </p>}
        {!wallet && !error && <p role="status">Carregando carteira…</p>}
        {page.id === 'dashboard' && <>
          <div className="group-title"><h2>Mercado Bitcoin</h2><span className="tag">Dados de mercado</span></div>
          <MarketMetrics market={market} />
          <MarketChart market={market} days={days} setDays={setDays} theme={theme} />
          {wallet && <>
            <div className="group-title"><h2>Minha carteira</h2><span className="tag">Valores fictícios</span></div>
            <WalletMetrics state={wallet} price={price} />
            <div className="grid metrics three">
              <Metric label="Lucro ou prejuízo acumulado" value={profit === undefined ? '—' : money(profit)} tone={profit === undefined || profit === 0 ? '' : profit > 0 ? 'positive' : 'negative'} />
              <Metric label="Taxas simuladas" value={money(wallet.fees)} />
              <Metric label="Status do simulador" value={status} detail={<a href="#robo" className="text-link">Abrir Robô IA</a>} />
            </div>
            <Operations operations={wallet.operations} compact />
          </>}
        </>}
        {page.id === 'mercado' && <><MarketMetrics market={market} full /><MarketChart market={market} days={days} setDays={setDays} theme={theme} /></>}
        {wallet && <>
          {page.id === 'carteira' && <WalletPage state={wallet} price={price} change={change} />}
          {page.id === 'robo' && <Robot state={wallet} ready={ready} signals={signals} price={price} change={change} notificationPermission={notifications.permission} enableNotifications={notifications.enable} />}
          {page.id === 'operacoes' && <Operations operations={wallet.operations} />}
          {page.id === 'relatorios' && <Reports state={wallet} price={price} />}
          {page.id === 'configuracoes' && <Settings state={wallet} change={change} installed={installed} install={prompt ? () => {
            void prompt.prompt().then(() => prompt.userChoice).then(choice => {
              if (choice.outcome === 'accepted') setInstalled(true)
            }).catch(() => {}).finally(() => setPrompt(undefined))
          } : undefined} />}
        </>}
        <footer>
          <span>Mar Bitcoin IA · Simulação educacional · Horários de Fortaleza (UTC−3)</span>
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™ · Copyright © 2025 TradingView, Inc.</a>
        </footer>
      </main>
    </div>
  </div>
}

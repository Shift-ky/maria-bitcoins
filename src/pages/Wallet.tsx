import { useState, type FormEvent } from 'react'
import { Wallet, Coins, Layers3 } from 'lucide-react'
import { Metric } from '../components/Metric'
import { addFunds, createWallet, equity } from '../engine/simulation'
import type { State } from '../types'
import { btc, money, timestamp } from '../utils/format'

export type Change = (update: (state: State) => State) => Promise<boolean>

export function WalletMetrics({ state, price }: { state: State; price?: number }) {
  const total = price || !state.btc ? equity(state, price ?? 0) : undefined
  return <div className="grid metrics three">
    <Metric label="Patrimônio virtual" value={total === undefined ? '—' : money(total)} icon={<Layers3 size={19} />} detail="Saldo + posição em Bitcoin" />
    <Metric label="Saldo disponível" value={money(state.cash)} icon={<Wallet size={19} />} detail="Reais virtuais" />
    <Metric label="Posição em Bitcoin" value={btc(state.btc)} icon={<Coins size={19} />} detail="Bitcoin virtual" />
  </div>
}

export function WalletPage({ state, price, change }: { state: State; price?: number; change: Change }) {
  const [amount, setAmount] = useState('')
  const [capital, setCapital] = useState('10000')
  const [confirm, setConfirm] = useState(false)
  async function credit(event: FormEvent) {
    event.preventDefault()
    if (await change(current => {
      if (!price && (current.btc || current.benchmark)) throw new Error('Aguarde uma cotação para registrar o aporte.')
      return addFunds(current, Number(amount), price ?? 0)
    })) setAmount('')
  }
  async function reset(event: FormEvent) {
    event.preventDefault()
    if (!confirm) { setConfirm(true); return }
    if (await change(current => ({ ...createWallet(Number(capital)), theme: current.theme, risk: current.risk }))) setConfirm(false)
  }
  return <>
    <WalletMetrics state={state} price={price} />
    <div className="grid two">
      <form className="panel form" onSubmit={credit}>
        <h2>Adicionar saldo virtual</h2>
        <label>Valor em reais virtuais<input required type="number" min="0.01" max="1000000000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <button className="primary">Adicionar saldo</button>
      </form>
      <form className="panel form" onSubmit={reset}>
        <h2>Reiniciar carteira</h2>
        <label>Novo saldo inicial (R$)<input required type="number" min="0.01" max="1000000000" step="0.01" value={capital} onChange={event => setCapital(event.target.value)} /></label>
        {confirm && <p role="alert">O saldo, a posição e o histórico desta carteira serão apagados.</p>}
        <div className="actions"><button className={confirm ? 'danger' : ''}>{confirm ? 'Confirmar reinício' : 'Reiniciar carteira'}</button>
          {confirm && <button type="button" onClick={() => setConfirm(false)}>Cancelar</button>}</div>
      </form>
    </div>
    <section className="panel"><div className="section-head"><h2>Movimentações de saldo</h2></div><div className="table-wrap"><table>
      <thead><tr><th>Data e hora</th><th>Movimentação</th><th>Valor virtual</th></tr></thead>
      <tbody>{[...state.movements].reverse().map((entry, index) => <tr key={index}><td>{timestamp(entry.time)}</td><td>{entry.kind}</td><td>{money(entry.amount)}</td></tr>)}</tbody>
    </table></div></section>
  </>
}

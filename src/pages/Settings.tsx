import { useState } from 'react'
import type { State } from '../types'
import type { Change } from './Wallet'

export function Settings({ state, change, install, installed }: { state: State; change: Change; install?: () => void; installed: boolean }) {
  const [risk, setRisk] = useState(state.risk)
  const [saved, setSaved] = useState(false)
  return <>
    <form className="panel form" onSubmit={async event => {
      event.preventDefault()
      setSaved(await change(current => {
        if (!Number.isFinite(risk.fee) || risk.fee < 0 || risk.fee > 5 || !Number.isFinite(risk.exposure) || risk.exposure < 1 || risk.exposure > 100 || !Number.isFinite(risk.loss) || risk.loss < 0.1 || risk.loss > 100) throw new Error('Verifique os limites informados.')
        return { ...current, risk }
      }))
    }}>
      <h2>Regras da simulação</h2>
      <div className="grid three">
        <label>Taxa por operação (%)<input required type="number" min="0" max="5" step="0.01" value={risk.fee} onChange={event => { setSaved(false); setRisk({ ...risk, fee: event.target.valueAsNumber }) }} /></label>
        <label>Exposição máxima (%)<input required type="number" min="1" max="100" step="0.1" value={risk.exposure} onChange={event => { setSaved(false); setRisk({ ...risk, exposure: event.target.valueAsNumber }) }} /></label>
        <label>Limite de queda desde o pico (%)<input required type="number" min="0.1" max="100" step="0.1" value={risk.loss} onChange={event => { setSaved(false); setRisk({ ...risk, loss: event.target.valueAsNumber }) }} /></label>
      </div>
      <div className="actions"><button className="primary">Salvar configurações</button>{saved && <span role="status">Configurações salvas.</span>}</div>
    </form>
    <section className="panel form"><h2>Aparência</h2><div className="actions">
      <button aria-pressed={state.theme === 'dark'} onClick={() => void change(current => ({ ...current, theme: 'dark' }))}>Tema escuro</button>
      <button aria-pressed={state.theme === 'light'} onClick={() => void change(current => ({ ...current, theme: 'light' }))}>Tema claro</button>
    </div></section>
    <section className="panel form"><h2>Instalação e dados locais</h2>
      <p>A carteira e o histórico são salvos neste navegador. Sem conexão, o aplicativo mostra os dados de mercado armazenados e aguarda a reconexão para simular novas operações.</p>
      {installed ? <p>Aplicativo em modo instalado.</p> : install ? <button onClick={install}>Instalar aplicativo</button> : <p>Use a opção de instalação do navegador. No Safari móvel, escolha Compartilhar e depois Adicionar à Tela de Início.</p>}
    </section>
  </>
}

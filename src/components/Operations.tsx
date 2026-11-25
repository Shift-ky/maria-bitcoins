import { Download } from 'lucide-react'
import { useState } from 'react'
import type { Operation } from '../types'
import { btc, money, timestamp } from '../utils/format'

function exportCsv(operations: Operation[]) {
  const columns = ['ID', 'Data', 'Tipo', 'Cotação BRL', 'BTC', 'Valor BRL', 'Taxa BRL', 'Resultado BRL', 'Justificativa', 'Saldo anterior BRL', 'Saldo posterior BRL']
  const rows = operations.map(op => [op.id, timestamp(op.time), op.side, op.price, op.btc, op.value, op.fee, op.result ?? '', op.reason, op.before, op.after])
  const csv = [columns, ...rows].map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'operacoes-mar-bitcoin-ia.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Operations({ operations, compact = false }: { operations: Operation[]; compact?: boolean }) {
  const [side, setSide] = useState('Todas')
  const [period, setPeriod] = useState('0')
  const rows = [...operations].reverse().filter(op => (side === 'Todas' || op.side === side) &&
    (!Number(period) || op.time >= Date.now() - Number(period) * 86400000))
  const visible = compact ? rows.slice(0, 5) : rows
  return <section className="panel">
    <div className="section-head"><h2>{compact ? 'Últimas operações' : 'Histórico de operações'}</h2>
      {!compact && <div className="actions">
        <select aria-label="Tipo de operação" value={side} onChange={event => setSide(event.target.value)}>
          {['Todas', 'Compra', 'Venda', 'Manutenção'].map(value => <option key={value}>{value}</option>)}
        </select>
        <select aria-label="Período das operações" value={period} onChange={event => setPeriod(event.target.value)}>
          <option value="0">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>
        </select>
        <button disabled={!rows.length} onClick={() => exportCsv(rows)}><Download size={16} /> Exportar CSV</button>
      </div>}
    </div>
    {visible.length ? <div className="table-wrap"><table>
      <thead><tr><th>Data e hora</th><th>Tipo</th><th>Cotação</th><th>Quantidade</th><th>Valor</th><th>Taxa</th><th>Resultado</th>
        {!compact && <><th>Saldo anterior</th><th>Saldo posterior</th><th>ID e justificativa</th></>}</tr></thead>
      <tbody>{visible.map(op => <tr key={op.id}><td>{timestamp(op.time)}</td><td>{op.side}</td><td>{money(op.price)}</td><td>{btc(op.btc)}</td>
        <td>{money(op.value)}</td><td>{money(op.fee)}</td><td>{op.result === null ? '—' : money(op.result)}</td>
        {!compact && <><td>{money(op.before)}</td><td>{money(op.after)}</td><td className="reason">{op.reason}<small>{op.id}</small></td></>}</tr>)}</tbody>
    </table></div> : <div className="empty">Nenhuma operação neste período.</div>}
  </section>
}

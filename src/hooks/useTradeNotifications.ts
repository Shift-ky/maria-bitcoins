import { useState } from 'react'
import type { Operation } from '../types'
import { money } from '../utils/format'

export function useTradeNotifications() {
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'indisponível' : Notification.permission)
  const [notice, setNotice] = useState('')

  async function enable() {
    if (typeof Notification === 'undefined') return
    try {
      setPermission(await Notification.requestPermission())
    } catch {
      setPermission('indisponível')
    }
  }

  async function notify(op: Operation) {
    if (op.side === 'Manutenção') return
    const title = op.side === 'Compra' ? 'Compra simulada' : 'Venda simulada'
    const result = op.result === null ? '' : op.result > 0 ? ' · Lucro líquido ' + money(op.result)
      : op.result < 0 ? ' · Prejuízo líquido ' + money(-op.result) : ' · Resultado líquido ' + money(0)
    const body = money(op.value) + ' em BTC · Taxa ' + money(op.fee) + result
    setNotice(title + ' · ' + body)
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      const options = { body, tag: 'mar-bitcoin-trade-' + op.id }
      if (registration?.active) await registration.showNotification(title, options)
      else new Notification(title, options)
    } catch {
      // The in-app notice remains available when the browser cannot deliver a system notification.
    }
  }
  return { permission, notice, notify, enable }
}

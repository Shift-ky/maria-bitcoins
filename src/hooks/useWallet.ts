import { useEffect, useState } from 'react'
import type { State } from '../types'
import { storage } from '../storage/database'

export function useWallet() {
  const [wallet, setWallet] = useState<State>()
  const [error, setError] = useState('')
  useEffect(() => {
    const channel = new BroadcastChannel('mar-wallet')
    const load = () => storage.update(current => current).then(setWallet).catch(() => setError('Não foi possível abrir a carteira local.'))
    void load()
    channel.onmessage = load
    return () => channel.close()
  }, [])
  async function change(update: (state: State) => State) {
    try {
      const next = await storage.update(update)
      setWallet(next)
      setError('')
      const channel = new BroadcastChannel('mar-wallet')
      channel.postMessage('updated')
      channel.close()
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao salvar a carteira.')
      return false
    }
  }
  return { wallet, error, change }
}

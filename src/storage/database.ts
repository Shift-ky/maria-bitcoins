import { openDB } from 'idb'
import type { State } from '../types'
import { createWallet } from '../engine/simulation'

export function openStorage(name = 'mar-bitcoin-ia') {
  const database = openDB(name, 1, { upgrade(db) { db.createObjectStore('data') } })
  return {
    async read<T>(key: string): Promise<T | undefined> {
      return (await database).get('data', key)
    },
    async write<T>(key: string, value: T) {
      await (await database).put('data', value, key)
    },
    async update(change: (state: State) => State) {
      const transaction = (await database).transaction('data', 'readwrite')
      const state = change(await transaction.store.get('wallet') ?? createWallet())
      await transaction.store.put(state, 'wallet')
      await transaction.done
      return state
    },
    async close() { (await database).close() },
  }
}
export const storage = openStorage()

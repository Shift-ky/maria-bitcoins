import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { openStorage } from '../src/storage/database'
import { addFunds, execute } from '../src/engine/simulation'

it('reabre carteira, cotações e histórico e serializa atualizações concorrentes', async () => {
  const first = openStorage('persistence-test')
  const otherTab = openStorage('persistence-test')
  await Promise.all([
    first.update(state => addFunds(state, 100, 500000)),
    otherTab.update(state => addFunds(state, 200, 500000)),
  ])
  const point = { time: 12345, price: 500000 }
  await Promise.all([
    first.update(state => execute(state, point, { side: 'Compra', reason: 'Teste' })),
    otherTab.update(state => execute(state, point, { side: 'Compra', reason: 'Teste' })),
  ])
  await first.write('quote', { brl: point.price })
  await otherTab.write('history:7', { data: [point] })
  await first.close()
  await otherTab.close()
  const reopened = openStorage('persistence-test')
  const state = await reopened.update(current => current)
  expect(state.contributed).toBe(10300)
  expect(state.operations).toHaveLength(1)
  expect(state.movements).toHaveLength(3)
  expect(await reopened.read('quote')).toEqual({ brl: 500000 })
  expect(await reopened.read('history:7')).toEqual({ data: [point] })
  await reopened.close()
})

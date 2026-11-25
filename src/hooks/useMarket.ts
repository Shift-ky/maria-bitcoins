import { useEffect, useState } from 'react'
import { fetchHistory, fetchQuote } from '../services/market'
import { storage } from '../storage/database'
import type { Point, Quote } from '../types'

export const periods = [1, 7, 30, 90]

export function useMarket(days: number) {
  const [online, setOnline] = useState(navigator.onLine)
  const [quote, setQuote] = useState<Quote>()
  const [history, setHistory] = useState<Record<number, Point[]>>({})
  const [quoteError, setQuoteError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [verifiedAt, setVerifiedAt] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const change = () => setOnline(navigator.onLine)
    window.addEventListener('online', change)
    window.addEventListener('offline', change)
    storage.read<Quote>('quote').then(cached => { if (cached) setQuote(current => current ?? cached) }).catch(() => {})
    return () => {
      window.removeEventListener('online', change)
      window.removeEventListener('offline', change)
    }
  }, [])

  useEffect(() => {
    setVerifiedAt(0)
    if (!online) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      let delay = 90000
      try {
        const latest = await fetchQuote()
        if (!active) return
        setQuote(latest)
        setVerifiedAt(Date.now())
        setQuoteError('')
        void storage.write('quote', latest).catch(() => {})
      } catch (error) {
        if (!active) return
        setVerifiedAt(0)
        setQuoteError(error instanceof Error ? error.message : 'Falha na consulta de cotação.')
        delay = 180000
      }
      timer = setTimeout(poll, delay)
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [online, refreshKey])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    setHistoryError('')
    async function load(period: number) {
      const key = 'history:' + period
      const cached = await storage.read<{ data: Point[]; time: number }>(key).catch(() => undefined)
      if (!active) return
      if (cached) setHistory(current => ({ ...current, [period]: cached.data }))
      if (!online || (cached && Date.now() - cached.time < 300000)) return
      const data = await fetchHistory(period)
      if (!active) return
      setHistory(current => ({ ...current, [period]: data }))
      void storage.write(key, { data, time: Date.now() }).catch(() => {})
    }
    async function poll() {
      // The simulator always uses the seven-day series, regardless of the chart filter.
      const results = await Promise.allSettled([...new Set([7, days])].map(load))
      if (!active) return
      const failure = results.find(result => result.status === 'rejected')
      setHistoryError(failure?.status === 'rejected' ? String(failure.reason.message ?? failure.reason) : '')
      if (online) timer = setTimeout(poll, 360000)
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [online, days, refreshKey])

  return {
    online, quote, points: history[days] ?? [], signals: history[7],
    quoteError, historyError, verifiedAt, refresh: () => setRefreshKey(key => key + 1),
  }
}

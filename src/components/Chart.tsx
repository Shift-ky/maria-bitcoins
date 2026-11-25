import { useEffect, useRef } from 'react'
import { createChart, AreaSeries, ColorType, type Time, type UTCTimestamp } from 'lightweight-charts'
import type { Point } from '../types'
import { money } from '../utils/format'

export function Chart({ points, theme }: { points: Point[]; theme: 'light' | 'dark' }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!element.current || !points.length) return
    const dark = theme === 'dark'
    const line = dark ? '#252e3d' : '#e4e8ef'
    const chart = createChart(element.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: dark ? '#9aa9bc' : '#506079', attributionLogo: true },
      grid: { vertLines: { color: 'transparent' }, horzLines: { color: line } },
      timeScale: { borderColor: line, timeVisible: true, secondsVisible: false, minBarSpacing: 0.1 },
      rightPriceScale: { borderColor: line },
      localization: { locale: 'pt-BR', priceFormatter: money, timeFormatter: (time: Time) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(Number(time) * 1000) },
    })
    const series = chart.addSeries(AreaSeries, { lineColor: '#f7931a', topColor: '#f7931a44', bottomColor: '#f7931a02', lineWidth: 2 })
    const unique = new Map(points.map(point => [Math.floor(point.time / 1000), point.price]))
    series.setData([...unique].sort(([a], [b]) => a - b).map(([time, value]) => ({ time: time as UTCTimestamp, value })))
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [points, theme])
  return points.length ? <div className="chart" ref={element} aria-label="Gráfico interativo em reais" /> : <div className="chart empty-chart">Histórico ainda indisponível</div>
}

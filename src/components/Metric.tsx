import type { ReactNode } from 'react'

export function Metric({ label, value, detail, icon, tone = '' }: { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode; tone?: string }) {
  return <div className="panel metric">
    <div className="metric-label">{label}{icon && <span className="metric-icon">{icon}</span>}</div>
    <strong className={tone}>{value}</strong>
    {detail && <small>{detail}</small>}
  </div>
}

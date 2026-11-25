const currency = (code: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code })
const brl = currency('BRL')
const usd = currency('USD')
export const money = (value: number) => brl.format(value)
export const dollars = (value: number) => usd.format(value)
export const btc = (value: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 }).format(value) + ' BTC'
export const percent = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value) + '%'
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' })
export const timestamp = (value: number) => date.format(value)

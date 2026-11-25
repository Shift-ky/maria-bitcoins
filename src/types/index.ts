export type Point = { time: number; price: number }
export type Quote = { brl: number; usd: number; change: number; volume: number; time: number }
export type Side = 'Compra' | 'Venda' | 'Manutenção'
export type Operation = {
  id: string; time: number; side: Side; price: number; btc: number; value: number;
  fee: number; result: number | null; reason: string; before: number; after: number; equity: number;
}
export type Movement = { time: number; amount: number; equity: number; kind: string }
export type State = {
  cash: number; btc: number; cost: number; contributed: number; peak: number; drawdown: number;
  fees: number; benchmark: number; operations: Operation[]; movements: Movement[];
  status: 'Parado' | 'Em execução' | 'Pausado' | 'Limite atingido';
  risk: { fee: number; exposure: number; loss: number }; theme: 'dark' | 'light';
}

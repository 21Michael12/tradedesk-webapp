export type TradeDirection = 'long' | 'short'
export type TradeType      = 'daytrade' | 'swing'
export type AccountType    = 'EVAL' | 'FUNDED' | 'LIVE_EXPRESS'
export type DrawdownType   = 'trailing' | 'end_of_day'

export type FuturesSymbol = 'NQ' | 'MNQ' | 'ES' | 'MES'

export const SUPPORTED_SYMBOLS: readonly FuturesSymbol[] = ['NQ', 'MNQ', 'ES', 'MES'] as const

export interface Trade {
  id: string
  user_id: string
  account_id: string
  symbol: FuturesSymbol
  direction: TradeDirection
  trade_type: TradeType
  entry_price: number      // entry points (futures price = points)
  exit_price: number
  quantity: number
  entry_time: string       // ISO timestamp
  exit_time: string | null
  gross_pnl: number | null
  fees: number
  net_pnl: number | null
  stop_loss: number | null
  take_profit: number | null
  risk_reward: number | null
  notes: string | null
  tags: string[]
  screenshot_urls: string[]
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  portfolio_size: number
  current_balance: number | null
  starting_mll: number
  prop_firm_name: string | null
  drawdown_type: DrawdownType | null
  daily_loss_limit: number | null
  max_drawdown_limit: number | null
  profit_target: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DashboardMetrics {
  totalNetPnl: number
  totalGrossPnl: number
  winRate: number       // 0–100
  profitFactor: number  // Infinity when no losses
  avgWin: number
  avgLoss: number       // absolute value
  totalTrades: number
  winCount: number
  lossCount: number
}

export interface CalendarDay {
  date: string       // YYYY-MM-DD
  dayOfMonth: number
  pnl: number | null // null = no trades
  isToday: boolean
  isWeekend: boolean // true = skip render
}

export interface EquityPoint {
  date: string  // YYYY-MM-DD
  equity: number
}

import type { Trade, Withdrawal, DashboardMetrics, CalendarDay, EquityPoint } from '@/types'

// ─── Core Analytics ──────────────────────────────────────────────────────────

/**
 * Computes all dashboard KPIs from an array of trades.
 * Only closed trades (net_pnl !== null) contribute to metrics.
 */
export function calculateMetrics(trades: Trade[]): DashboardMetrics {
  const closed = trades.filter((t) => t.net_pnl !== null)

  if (closed.length === 0) {
    return {
      totalNetPnl: 0, totalGrossPnl: 0,
      winRate: 0, profitFactor: 0,
      avgWin: 0, avgLoss: 0,
      totalTrades: 0, winCount: 0, lossCount: 0,
    }
  }

  const wins   = closed.filter((t) => (t.net_pnl ?? 0) > 0)
  const losses = closed.filter((t) => (t.net_pnl ?? 0) <= 0)

  const totalNetPnl   = closed.reduce((s, t) => s + (t.net_pnl   ?? 0), 0)
  const totalGrossPnl = closed.reduce((s, t) => s + (t.gross_pnl ?? 0), 0)

  const sumGrossWins   = wins.reduce((s, t) => s + (t.gross_pnl ?? 0), 0)
  const sumGrossLosses = Math.abs(losses.reduce((s, t) => s + (t.gross_pnl ?? 0), 0))

  const profitFactor = sumGrossLosses === 0 ? Infinity : sumGrossWins / sumGrossLosses
  const winRate      = (wins.length / closed.length) * 100

  const avgWin  = wins.length > 0
    ? wins.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / wins.length
    : 0

  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / losses.length)
    : 0

  return {
    totalNetPnl, totalGrossPnl,
    winRate, profitFactor,
    avgWin, avgLoss,
    totalTrades: closed.length,
    winCount:  wins.length,
    lossCount: losses.length,
  }
}

// ─── Equity Curve ────────────────────────────────────────────────────────────

/**
 * Builds a cumulative equity curve from a list of trades, sorted by entry
 * time (oldest first). Each point represents the running net P&L after
 * each individual trade closes.
 */
export function buildEquityCurve(trades: Trade[]): EquityPoint[] {
  const closed = trades
    .filter((t) => t.net_pnl !== null)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  let cumulative = 0
  return closed.map((t) => {
    cumulative += t.net_pnl ?? 0
    return {
      date:   t.entry_time.slice(0, 10),
      equity: Math.round(cumulative * 100) / 100,
    }
  })
}

// ─── Calendar Helpers ────────────────────────────────────────────────────────

/**
 * Groups closed trades by calendar date (YYYY-MM-DD) and returns the total
 * net P&L for each day.
 */
export function groupTradesByDate(trades: Trade[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of trades) {
    if (t.net_pnl === null) continue
    const date = t.entry_time.slice(0, 10)
    map.set(date, (map.get(date) ?? 0) + (t.net_pnl ?? 0))
  }
  return map
}

/**
 * Returns all Sun–Thu trading days for a given month as CalendarDay objects.
 * Saturday (6) and Sunday (0) mapping note: Israeli market week is Sun–Thu,
 * so we keep 0 (Sun) through 4 (Thu) and skip Fri (5) and Sat (6).
 */
export function buildMonthCalendar(
  year: number,
  month: number,            // 0-indexed (JS Date style)
  pnlByDate: Map<string, number>,
): CalendarDay[] {
  const today   = new Date()
  const todayStr = toDateString(today)
  const days: CalendarDay[] = []

  const totalDays = new Date(year, month + 1, 0).getDate()

  for (let d = 1; d <= totalDays; d++) {
    const dt  = new Date(year, month, d)
    const dow = dt.getDay() // 0 = Sun, 5 = Fri, 6 = Sat

    // Skip Friday and Saturday (Israeli market closed)
    if (dow === 5 || dow === 6) continue

    const dateStr = toDateString(dt)
    const pnl     = pnlByDate.get(dateStr) ?? null

    days.push({
      date:       dateStr,
      dayOfMonth: d,
      pnl,
      isToday:    dateStr === todayStr,
      isWeekend:  false,
    })
  }

  return days
}

/** Counts distinct trading dates (days with at least 1 closed trade). */
export function countTradingDays(trades: Trade[]): number {
  const dates = new Set(
    trades
      .filter((t) => t.net_pnl !== null)
      .map((t) => t.entry_time.slice(0, 10))
  )
  return dates.size
}

/**
 * Returns the current win streak (consecutive profitable trading days
 * counted backwards from today's most recent activity).
 */
export function getCurrentStreak(pnlByDate: Map<string, number>): number {
  const sortedDates = [...pnlByDate.keys()].sort().reverse()
  let streak = 0
  for (const date of sortedDates) {
    if ((pnlByDate.get(date) ?? 0) > 0) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ─── Date Utilities ──────────────────────────────────────────────────────────

function toDateString(dt: Date): string {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Filters trades to those whose entry_time falls within [start, end). */
export function filterByDateRange(
  trades: Trade[],
  start: Date,
  end: Date,
): Trade[] {
  return trades.filter((t) => {
    const ts = new Date(t.entry_time).getTime()
    return ts >= start.getTime() && ts < end.getTime()
  })
}

// ─── Daily Equity / MLL Series ───────────────────────────────────────────────

export interface EquityMllPoint {
  date:    string  // YYYY-MM-DD
  balance: number  // portfolio_size + Σ net_pnl up to and including this day
  mll:     number  // trailing MLL at end of day
}

/**
 * Builds a per-day series of (balance, current MLL) from closed trades and
 * withdrawals.
 *
 * - tradingEquity = portfolioSize + Σ net_pnl through day  (drives HWM)
 * - balance       = tradingEquity − Σ withdrawals through day
 * - HWM           is the running max of tradingEquity ONLY
 *                 (withdrawals do NOT push it down — they only shrink the buffer)
 * - currentMll    = startingMll + max(0, HWM − portfolioSize)
 */
export function buildEquityMllSeries(
  trades: Trade[],
  withdrawals: Withdrawal[],
  portfolioSize: number,
  startingMll: number,
): EquityMllPoint[] {
  const closed = trades.filter((t) => t.net_pnl !== null)

  // Aggregate by date
  const pnlByDate        = new Map<string, number>()
  const withdrawalByDate = new Map<string, number>()
  for (const t of closed) {
    const d = t.entry_time.slice(0, 10)
    pnlByDate.set(d, (pnlByDate.get(d) ?? 0) + (t.net_pnl ?? 0))
  }
  for (const w of withdrawals) {
    const d = w.created_at.slice(0, 10)
    withdrawalByDate.set(d, (withdrawalByDate.get(d) ?? 0) + w.amount)
  }

  const dates = Array.from(
    new Set([...pnlByDate.keys(), ...withdrawalByDate.keys()])
  ).sort()
  if (dates.length === 0) return []

  let cumPnl         = 0
  let cumWithdrawals = 0
  let hwm            = portfolioSize
  const points: EquityMllPoint[] = []

  for (const date of dates) {
    cumPnl         += pnlByDate.get(date)        ?? 0
    cumWithdrawals += withdrawalByDate.get(date) ?? 0
    const tradingEquity = portfolioSize + cumPnl
    if (tradingEquity > hwm) hwm = tradingEquity
    const balance = tradingEquity - cumWithdrawals
    const mll     = startingMll + Math.max(0, hwm - portfolioSize)
    points.push({ date, balance, mll })
  }

  return points
}

export type AggregationPeriod = 'daily' | 'weekly' | 'monthly'

/**
 * Down-samples a daily series to weekly or monthly by keeping only the
 * last point of each bucket (end-of-period balance / MLL).
 */
export function aggregateEquityMllSeries(
  points: EquityMllPoint[],
  period: AggregationPeriod,
): EquityMllPoint[] {
  if (period === 'daily' || points.length === 0) return points

  const bucketKey = (date: string): string => {
    const d = new Date(date)
    if (period === 'monthly') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    // weekly — ISO-ish week starting Sunday
    const sunday = new Date(d)
    sunday.setDate(d.getDate() - d.getDay())
    return sunday.toISOString().slice(0, 10)
  }

  const last = new Map<string, EquityMllPoint>()
  for (const p of points) last.set(bucketKey(p.date), p)
  return [...last.values()]
}

// ─── Trailing Maximum Loss Limit (MLL) ───────────────────────────────────────

export interface MllStatus {
  startingMll:      number  // initial floor at account creation
  currentMll:       number  // floor after trailing
  currentBalance:   number  // portfolio_size + Σ net_pnl − Σ withdrawals
  totalWithdrawals: number
  hwm:              number  // highest TRADING equity ever reached (ignores withdrawals)
  trailDistance:    number  // portfolio_size − startingMll (constant)
  buffer:           number  // currentBalance − currentMll  (≥ 0 = alive)
  usedPct:          number  // 0 = at HWM (clean), 100 = blown
  isBlown:          boolean
}

/**
 * Computes the Trailing Maximum Loss Limit status for a Topstep-style
 * funded account.
 *
 * Rules:
 *   - Trail distance = portfolio_size − starting_mll  (constant for life of account)
 *   - HWM            = max(portfolio_size, max running equity over closed trades)
 *   - current_mll    = starting_mll + max(0, HWM − portfolio_size)
 *                      i.e. the MLL trails up with the high-water mark, never down.
 *   - buffer         = current_balance − current_mll
 */
export function calculateMllStatus(
  trades: Trade[],
  withdrawals: Withdrawal[],
  portfolioSize: number,
  startingMll: number,
): MllStatus {
  const closed = trades
    .filter((t) => t.net_pnl !== null)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  let cumulative = 0
  let hwm        = portfolioSize
  for (const t of closed) {
    cumulative += t.net_pnl ?? 0
    const equity = portfolioSize + cumulative   // trading equity, excludes withdrawals
    if (equity > hwm) hwm = equity
  }

  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)
  const currentBalance   = portfolioSize + cumulative - totalWithdrawals
  const trailDistance    = portfolioSize - startingMll
  const currentMll       = startingMll + Math.max(0, hwm - portfolioSize)
  const buffer           = currentBalance - currentMll
  const usedPct          = trailDistance > 0
    ? Math.max(0, Math.min(100, ((trailDistance - buffer) / trailDistance) * 100))
    : 0

  return {
    startingMll,
    currentMll,
    currentBalance,
    totalWithdrawals,
    hwm,
    trailDistance,
    buffer,
    usedPct,
    isBlown: buffer <= 0,
  }
}

/** Returns the Hebrew month name for a 0-indexed month number. */
export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
] as const

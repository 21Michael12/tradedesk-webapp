import { createClient } from '@/lib/supabase/server'
import {
  calculateMetrics,
  buildEquityCurve,
  buildMonthCalendar,
  groupTradesByDate,
  countTradingDays,
  getCurrentStreak,
  filterByDateRange,
  HEBREW_MONTHS,
} from '@/lib/metrics'
import type { Trade, Account } from '@/types'
import StatsGrid        from '@/components/dashboard/StatsGrid'
import PerformanceChart from '@/components/dashboard/PerformanceChart'
import CalendarGrid     from '@/components/dashboard/CalendarGrid'
import TradeTable       from '@/components/dashboard/TradeTable'

export const metadata = { title: 'TradeDesk | לוח בקרה' }

/** Total Sun–Thu (trading) days in a given month */
function countWeekdaysInMonth(year: number, month: number): number {
  const totalDays = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= totalDays; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow !== 5 && dow !== 6) count++
  }
  return count
}

interface DashboardPageProps {
  searchParams: Promise<{ accountId?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { accountId } = await searchParams
  const supabase = await createClient()

  // ── Fetch accounts + trades in parallel ────────────────────────────────
  const [{ data: rawAccounts }, { data: rawTrades }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('trades')
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(500),
  ])

  const allAccounts: Account[] = (rawAccounts as Account[] | null) ?? []
  const allTrades: Trade[]     = (rawTrades   as Trade[]   | null) ?? []

  // ── Resolve active account ──────────────────────────────────────────────
  const account: Account | null =
    (accountId ? allAccounts.find((a) => a.id === accountId) : null) ??
    allAccounts.find((a) => a.is_active) ??
    allAccounts[0] ??
    null

  // ── Filter trades to the active account ────────────────────────────────
  const trades: Trade[] = account
    ? allTrades.filter((t) => t.account_id === account.id)
    : allTrades

  // ── Date ranges ─────────────────────────────────────────────────────────
  const now            = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const thisMonthTrades = filterByDateRange(trades, thisMonthStart, nextMonthStart)
  const lastMonthTrades = filterByDateRange(trades, lastMonthStart, thisMonthStart)

  // ── Metrics ─────────────────────────────────────────────────────────────
  const allMetrics       = calculateMetrics(trades)
  const lastMonthMetrics = calculateMetrics(lastMonthTrades)

  // ── Balance ──────────────────────────────────────────────────────────────
  const portfolioSize = account?.portfolio_size ?? 0
  const balance       = account?.current_balance
    ?? (portfolioSize > 0 ? portfolioSize + allMetrics.totalNetPnl : 0)

  const balanceTrendPct: number | null =
    lastMonthMetrics.totalNetPnl !== 0 && portfolioSize > 0
      ? ((allMetrics.totalNetPnl - lastMonthMetrics.totalNetPnl) / portfolioSize) * 100
      : null

  // ── Trading-days counters ────────────────────────────────────────────────
  const tradingDaysThisMonth   = countTradingDays(thisMonthTrades)
  const totalWeekdaysThisMonth = countWeekdaysInMonth(now.getFullYear(), now.getMonth())

  // ── Equity curve ─────────────────────────────────────────────────────────
  const equityCurve = buildEquityCurve(trades)

  // ── Calendar ─────────────────────────────────────────────────────────────
  const pnlByDate    = groupTradesByDate(thisMonthTrades)
  const calendarDays = buildMonthCalendar(now.getFullYear(), now.getMonth(), pnlByDate)
  const streakDays   = getCurrentStreak(pnlByDate)

  // ── Recent trades ─────────────────────────────────────────────────────────
  const recentTrades = trades.slice(0, 5)

  // ── Active filter label ───────────────────────────────────────────────────
  const currentMonthLabel = `${HEBREW_MONTHS[now.getMonth()]} ${now.getFullYear()}`

  return (
    <>
      {/* Top action bar */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container p-4 rounded-lg border border-outline-variant">
        <div className="flex items-center gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface">סקירה כללית</h2>
          <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps border border-outline-variant">
            {currentMonthLabel}
          </span>
          {account && (
            <span className="bg-primary-container/10 text-primary-container px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps border border-primary-container/20">
              {account.name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-background border border-outline-variant rounded-DEFAULT p-1 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                search
              </span>
              <input
                className="w-full bg-transparent border-none text-on-surface font-body-sm text-sm focus:ring-0 pl-2 pr-8 py-1.5 placeholder:text-on-surface-variant/50"
                placeholder="חיפוש בתיאור..."
                type="text"
                readOnly
              />
            </div>
            <div className="w-px h-5 bg-outline-variant mx-2" />
            <button className="flex items-center gap-1 text-on-surface-variant hover:text-primary-container px-2 py-1.5 transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              <span className="font-body-sm text-sm">תגיות</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats cards */}
      <StatsGrid
        balance={balance}
        balanceTrendPct={balanceTrendPct}
        metrics={allMetrics}
        tradingDaysThisMonth={tradingDaysThisMonth}
        totalWeekdaysThisMonth={totalWeekdaysThisMonth}
        streakDays={streakDays}
        account={account}
      />

      {/* Chart + Calendar row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerformanceChart allPoints={equityCurve} />
        <CalendarGrid
          days={calendarDays}
          year={now.getFullYear()}
          month={now.getMonth()}
        />
      </section>

      {/* Trade journal table */}
      <TradeTable trades={recentTrades} />
    </>
  )
}

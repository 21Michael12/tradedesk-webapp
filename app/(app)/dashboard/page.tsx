import { createClient } from '@/lib/supabase/server'
import {
  calculateMetrics,
  calculateMllStatus,
  buildMonthCalendar,
  groupTradesByDate,
  countTradingDays,
  getCurrentStreak,
  filterByDateRange,
  HEBREW_MONTHS,
} from '@/lib/metrics'
import type { Trade, Account, Withdrawal } from '@/types'
import { formatDollar } from '@/lib/futures'
import StatsGrid    from '@/components/dashboard/StatsGrid'
import EquityCurve  from '@/components/charts/EquityCurve'
import CalendarGrid from '@/components/dashboard/CalendarGrid'
import TradeTable   from '@/components/dashboard/TradeTable'

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

  // ── Fetch accounts + trades + withdrawals + settings in parallel ───────
  const [
    { data: rawAccounts },
    { data: rawTrades },
    { data: rawWithdrawals },
    { data: rawSettings },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('trades')
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(500),
    supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_settings')
      .select('daily_loss_warning')
      .maybeSingle(),
  ])

  const allAccounts:    Account[]    = (rawAccounts    as Account[]    | null) ?? []
  const allTrades:      Trade[]      = (rawTrades      as Trade[]      | null) ?? []
  const allWithdrawals: Withdrawal[] = (rawWithdrawals as Withdrawal[] | null) ?? []

  // ── Resolve active account ──────────────────────────────────────────────
  const account: Account | null =
    (accountId ? allAccounts.find((a) => a.id === accountId) : null) ??
    allAccounts.find((a) => a.is_active) ??
    allAccounts[0] ??
    null

  // ── Filter trades & withdrawals to the active account ──────────────────
  const trades: Trade[] = account
    ? allTrades.filter((t) => t.account_id === account.id)
    : allTrades
  const withdrawals: Withdrawal[] = account
    ? allWithdrawals.filter((w) => w.account_id === account.id)
    : []

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

  // ── Balance & MLL (withdrawals-aware) ───────────────────────────────────
  const portfolioSize    = account?.portfolio_size ?? 0
  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)

  const mllStatus =
    account && portfolioSize > 0 && account.starting_mll > 0
      ? calculateMllStatus(trades, withdrawals, portfolioSize, account.starting_mll)
      : null

  const balance = mllStatus?.currentBalance
    ?? (portfolioSize > 0 ? portfolioSize + allMetrics.totalNetPnl - totalWithdrawals : 0)

  const balanceTrendPct: number | null =
    lastMonthMetrics.totalNetPnl !== 0 && portfolioSize > 0
      ? ((allMetrics.totalNetPnl - lastMonthMetrics.totalNetPnl) / portfolioSize) * 100
      : null

  // ── Trading-days counters ────────────────────────────────────────────────
  const tradingDaysThisMonth   = countTradingDays(thisMonthTrades)
  const totalWeekdaysThisMonth = countWeekdaysInMonth(now.getFullYear(), now.getMonth())

  // ── Calendar ─────────────────────────────────────────────────────────────
  const pnlByDate    = groupTradesByDate(thisMonthTrades)
  const calendarDays = buildMonthCalendar(now.getFullYear(), now.getMonth(), pnlByDate)
  const streakDays   = getCurrentStreak(pnlByDate)

  // ── Today's P&L vs daily-loss warning threshold ───────────────────────────
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayPnl = pnlByDate.get(todayKey) ?? 0
  const dailyLossWarning = Number(rawSettings?.daily_loss_warning ?? 0)
  const dailyLossBreached = dailyLossWarning > 0 && todayPnl <= -dailyLossWarning

  // ── Recent trades ─────────────────────────────────────────────────────────
  const recentTrades = trades.slice(0, 5)

  // ── Active filter label ───────────────────────────────────────────────────
  const currentMonthLabel = `${HEBREW_MONTHS[now.getMonth()]} ${now.getFullYear()}`

  return (
    <>
      {/* Daily loss warning banner */}
      {dailyLossBreached && (
        <section className="bg-error/10 border border-error/40 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="material-symbols-outlined text-error text-2xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          <div className="flex-1">
            <h3 className="font-title-sm text-title-sm text-error">חצית את סף ההפסד היומי</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              הפסד היום: {formatDollar(Math.abs(todayPnl))} • הסף שהגדרת: {formatDollar(dailyLossWarning)}.
              שקול לעצור למסחר היום.
            </p>
          </div>
        </section>
      )}

      {/* Blown account banner */}
      {mllStatus?.isBlown && account && (
        <section className="bg-error/10 border border-error/40 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="material-symbols-outlined text-error text-2xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          <div className="flex-1">
            <h3 className="font-title-sm text-title-sm text-error">החשבון "{account.name}" נשרף</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              היתרה הנוכחית ({formatDollar(mllStatus.currentBalance)}) ירדה מתחת ל־MLL ({formatDollar(mllStatus.currentMll)}).
              ניתן לשחזר את החשבון על ידי עריכה או מחיקה של טריידים מפסידים.
            </p>
          </div>
          <a
            href="/journal"
            className="bg-error/20 text-error border border-error/40 font-label-caps text-label-caps px-3 py-2 rounded transition-colors hover:bg-error/30 whitespace-nowrap"
          >
            עבור ליומן
          </a>
        </section>
      )}

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
        mllStatus={mllStatus}
        totalWithdrawals={totalWithdrawals}
      />

      {/* Chart + Calendar row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EquityCurve trades={trades} withdrawals={withdrawals} account={account} title="עקומת הון יומית" />
        </div>
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

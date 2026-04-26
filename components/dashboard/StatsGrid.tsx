import type { DashboardMetrics, Account } from '@/types'
import { formatDollar, formatPnl } from '@/lib/futures'

interface StatsGridProps {
  balance: number
  balanceTrendPct: number | null
  metrics: DashboardMetrics
  tradingDaysThisMonth: number
  totalWeekdaysThisMonth: number
  streakDays: number
  account: Account | null
}

/** Returns bar color + text color based on what % of the max-loss limit is consumed. */
function drawdownColors(usedPct: number): { bar: string; text: string; label: string } {
  if (usedPct >= 80) return { bar: 'bg-danger',            text: 'text-danger',   label: 'סכנה' }
  if (usedPct >= 50) return { bar: 'bg-tertiary-container', text: 'text-tertiary', label: 'אזהרה' }
  return                     { bar: 'bg-success',           text: 'text-success',  label: 'בטוח' }
}

export default function StatsGrid({
  balance,
  balanceTrendPct,
  metrics,
  tradingDaysThisMonth,
  totalWeekdaysThisMonth,
  streakDays,
  account,
}: StatsGridProps) {
  const pnlPositive     = metrics.totalNetPnl >= 0
  const profitFactorFmt =
    metrics.profitFactor === Infinity ? '∞' :
    metrics.profitFactor === 0        ? '0.00' :
    metrics.profitFactor.toFixed(2)

  // ── Drawdown calculations ──────────────────────────────────────────────
  const portfolioSize  = account?.portfolio_size  ?? 0
  const maxLossPct     = account?.max_loss_pct    ?? 0
  const maxLossAmount  = portfolioSize > 0 && maxLossPct > 0
    ? portfolioSize * (maxLossPct / 100)
    : null
  const currentLoss    = Math.max(0, -metrics.totalNetPnl)   // positive = how much we're down
  const drawdownUsedPct =
    maxLossAmount && maxLossAmount > 0
      ? Math.min(100, (currentLoss / maxLossAmount) * 100)
      : 0
  const showDrawdown = maxLossAmount !== null && portfolioSize > 0
  const ddColors     = drawdownColors(drawdownUsedPct)

  return (
    <div className="flex flex-col gap-4">
      {/* ── 4-card standard grid ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Balance */}
        <div className="bg-surface-container p-5 rounded-lg border border-outline-variant flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full blur-2xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100" />
          <div className="flex justify-between items-start z-10">
            <span className="font-body-sm text-body-sm text-on-surface-variant">יתרת חשבון</span>
            <span className="material-symbols-outlined text-primary-container text-lg opacity-80">
              account_balance_wallet
            </span>
          </div>
          <div className="font-data-mono text-3xl font-semibold text-on-surface tracking-tight mt-1 z-10">
            {formatDollar(balance)}
          </div>
          <div className="flex items-center gap-1 mt-auto z-10">
            {balanceTrendPct !== null ? (
              <>
                <span
                  className={`material-symbols-outlined text-sm ${balanceTrendPct >= 0 ? 'text-success' : 'text-danger'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {balanceTrendPct >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span className={`font-data-mono text-sm ${balanceTrendPct >= 0 ? 'text-success' : 'text-danger'}`}>
                  {balanceTrendPct >= 0 ? '+' : ''}{balanceTrendPct.toFixed(1)}%
                </span>
                <span className="font-body-sm text-on-surface-variant text-xs opacity-70">מחודש קודם</span>
              </>
            ) : (
              <span className="font-body-sm text-on-surface-variant text-xs opacity-70">אין נתוני השוואה</span>
            )}
          </div>
        </div>

        {/* Card 2: P&L + Win Rate */}
        <div className="bg-surface-container p-5 rounded-lg border border-outline-variant flex flex-col gap-2 relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <span className="font-body-sm text-body-sm text-on-surface-variant">רווח/הפסד כולל</span>
            <span className={`material-symbols-outlined text-lg opacity-80 ${pnlPositive ? 'text-success' : 'text-danger'}`}>
              payments
            </span>
          </div>
          <div className={`font-data-mono text-3xl font-semibold tracking-tight mt-1 z-10 ${pnlPositive ? 'text-success' : 'text-danger'}`}>
            {formatPnl(metrics.totalNetPnl)}
          </div>
          <div className="flex items-center gap-2 mt-auto z-10">
            <div className="flex-1 h-1 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full"
                style={{ width: `${Math.min(100, metrics.winRate)}%` }}
              />
            </div>
            <span className="font-data-mono text-xs text-on-surface-variant">
              {metrics.winRate.toFixed(0)}% Win
            </span>
          </div>
        </div>

        {/* Card 3: Trading Days */}
        <div className="bg-surface-container p-5 rounded-lg border border-outline-variant flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="font-body-sm text-body-sm text-on-surface-variant">ימי מסחר בחודש</span>
            <span className="material-symbols-outlined text-tertiary-container text-lg opacity-80">
              calendar_today
            </span>
          </div>
          <div className="font-data-mono text-3xl font-semibold text-on-surface tracking-tight mt-1">
            {tradingDaysThisMonth} / {totalWeekdaysThisMonth}
          </div>
          <div className="flex items-center gap-1 mt-auto">
            {streakDays > 0 ? (
              <span className="font-body-sm text-on-surface-variant text-xs">
                {streakDays} ימים ירוקים ברצף
              </span>
            ) : (
              <span className="font-body-sm text-on-surface-variant text-xs opacity-70">אין רצף פעיל</span>
            )}
          </div>
        </div>

        {/* Card 4: Profit Factor */}
        <div className="bg-surface-container p-5 rounded-lg border border-outline-variant flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Profit Factor</span>
            <span className="material-symbols-outlined text-primary-container text-lg opacity-80">
              analytics
            </span>
          </div>
          <div className="font-data-mono text-3xl font-semibold text-on-surface tracking-tight mt-1">
            {profitFactorFmt}
          </div>
          <div className="flex items-center gap-1 mt-auto">
            {metrics.totalTrades > 0 ? (
              <>
                <span className="font-body-sm text-on-surface-variant text-xs opacity-70">avg win:</span>
                <span className="font-data-mono text-success text-xs">{formatPnl(metrics.avgWin)}</span>
                <span className="font-body-sm text-on-surface-variant text-xs opacity-50 mx-1">|</span>
                <span className="font-body-sm text-on-surface-variant text-xs opacity-70">avg loss:</span>
                <span className="font-data-mono text-danger text-xs">-{formatDollar(metrics.avgLoss)}</span>
              </>
            ) : (
              <span className="font-body-sm text-on-surface-variant text-xs opacity-70">אין עסקאות עדיין</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Drawdown Tracker (Prop Firm / any account with max loss set) ── */}
      {showDrawdown && (
        <section className="bg-surface-container rounded-lg border border-outline-variant p-5 relative overflow-hidden">
          {/* Danger glow when critical */}
          {drawdownUsedPct >= 80 && (
            <div className="absolute inset-0 bg-danger/5 pointer-events-none rounded-lg" />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            {/* Left: title + status badge */}
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined text-xl ${ddColors.text}`}
                style={drawdownUsedPct >= 80 ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {drawdownUsedPct >= 80 ? 'warning' : 'shield'}
              </span>
              <div>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  {account?.account_type === 'funded' ? 'Drawdown Tracker — פרופ פירם' : 'מעקב הפסד מקסימלי'}
                </h3>
                {account?.prop_firm_name && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70">
                    {account.prop_firm_name}
                    {account.drawdown_type === 'trailing' ? ' • Trailing Drawdown' : account.drawdown_type === 'end_of_day' ? ' • EOD Drawdown' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Right: numbers */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant">הפסד נוכחי</p>
                <p className={`font-data-mono text-lg font-semibold ${ddColors.text}`}>
                  {currentLoss > 0 ? `-${formatDollar(currentLoss)}` : formatDollar(0)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant">מגבלה מקסימלית</p>
                <p className="font-data-mono text-lg font-semibold text-on-surface">
                  -{formatDollar(maxLossAmount!)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant">נוצל</p>
                <p className={`font-data-mono text-lg font-semibold ${ddColors.text}`}>
                  {drawdownUsedPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-3 bg-surface-variant rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${ddColors.bar}`}
                style={{ width: `${drawdownUsedPct}%` }}
              />
            </div>
            {/* Threshold markers */}
            <div className="absolute top-0 h-3 pointer-events-none" style={{ left: '50%' }}>
              <div className="w-px h-full bg-on-surface-variant/30" />
            </div>
            <div className="absolute top-0 h-3 pointer-events-none" style={{ left: '80%' }}>
              <div className="w-px h-full bg-on-surface-variant/30" />
            </div>
          </div>

          {/* Threshold labels */}
          <div className="flex justify-between mt-1.5">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-50">0%</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-50" style={{ marginRight: 'calc(50% - 1rem)' }}>50%</span>
            <span className="font-label-caps text-[10px] text-danger opacity-70">80% — הגבלה</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-50">100%</span>
          </div>

          {/* Warning message */}
          {drawdownUsedPct >= 80 && (
            <div className="mt-4 flex items-center gap-2 bg-danger/10 border border-danger/20 rounded px-3 py-2">
              <span className="material-symbols-outlined text-danger text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
              <span className="font-body-sm text-body-sm text-danger">
                {drawdownUsedPct >= 100
                  ? 'חרגת ממגבלת ההפסד המקסימלית!'
                  : `נותרו ${formatDollar(maxLossAmount! - currentLoss)} עד לחריגה ממגבלת ההפסד.`}
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

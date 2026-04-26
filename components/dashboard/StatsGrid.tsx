import type { DashboardMetrics, Account } from '@/types'
import type { MllStatus } from '@/lib/metrics'
import { formatDollar, formatPnl } from '@/lib/futures'

interface StatsGridProps {
  balance: number
  balanceTrendPct: number | null
  metrics: DashboardMetrics
  tradingDaysThisMonth: number
  totalWeekdaysThisMonth: number
  streakDays: number
  account: Account | null
  mllStatus: MllStatus | null
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
  mllStatus,
}: StatsGridProps) {
  const pnlPositive     = metrics.totalNetPnl >= 0
  const profitFactorFmt =
    metrics.profitFactor === Infinity ? '∞' :
    metrics.profitFactor === 0        ? '0.00' :
    metrics.profitFactor.toFixed(2)

  const showMll  = mllStatus !== null
  const ddColors = drawdownColors(mllStatus?.usedPct ?? 0)
  const hasTrailed = mllStatus !== null && mllStatus.currentMll > mllStatus.startingMll

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

      {/* ── Trailing MLL Tracker ─────────────────────────────────────────── */}
      {showMll && mllStatus && (
        <section className="bg-surface-container rounded-lg border border-outline-variant p-5 relative overflow-hidden">
          {mllStatus.usedPct >= 80 && (
            <div className="absolute inset-0 bg-danger/5 pointer-events-none rounded-lg" />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined text-xl ${ddColors.text}`}
                style={mllStatus.usedPct >= 80 ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {mllStatus.usedPct >= 80 ? 'warning' : 'shield'}
              </span>
              <div>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  {account?.account_type === 'funded' ? 'Trailing MLL — Prop Firm' : 'מעקב Trailing MLL'}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70">
                  {account?.prop_firm_name ? `${account.prop_firm_name} • ` : ''}
                  {hasTrailed ? 'ה־MLL טריילינג מעלה' : 'ה־MLL עוד לא טריילד'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant">יתרה נוכחית</p>
                <p className="font-data-mono text-lg font-semibold text-on-surface">
                  {formatDollar(mllStatus.currentBalance)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant">Current MLL</p>
                <p className={`font-data-mono text-lg font-semibold ${hasTrailed ? 'text-success' : 'text-on-surface'}`}>
                  {formatDollar(mllStatus.currentMll)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant">Buffer</p>
                <p className={`font-data-mono text-lg font-semibold ${ddColors.text}`}>
                  {mllStatus.isBlown ? '-' : ''}{formatDollar(Math.abs(mllStatus.buffer))}
                </p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant">נוצל</p>
                <p className={`font-data-mono text-lg font-semibold ${ddColors.text}`}>
                  {mllStatus.usedPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="h-3 bg-surface-variant rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${ddColors.bar}`}
                style={{ width: `${mllStatus.usedPct}%` }}
              />
            </div>
            <div className="absolute top-0 h-3 pointer-events-none" style={{ left: '50%' }}>
              <div className="w-px h-full bg-on-surface-variant/30" />
            </div>
            <div className="absolute top-0 h-3 pointer-events-none" style={{ left: '80%' }}>
              <div className="w-px h-full bg-on-surface-variant/30" />
            </div>
          </div>

          <div className="flex justify-between mt-1.5">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-50">HWM</span>
            <span className="font-label-caps text-[10px] text-danger opacity-70">80% — אזור סכנה</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-50">MLL</span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 pt-3 border-t border-outline-variant/50">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">
              Starting MLL: <span className="font-data-mono text-on-surface-variant opacity-90">{formatDollar(mllStatus.startingMll)}</span>
            </span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">
              HWM: <span className="font-data-mono text-on-surface-variant opacity-90">{formatDollar(mllStatus.hwm)}</span>
            </span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">
              Trail Distance: <span className="font-data-mono text-on-surface-variant opacity-90">{formatDollar(mllStatus.trailDistance)}</span>
            </span>
          </div>

          {mllStatus.usedPct >= 80 && (
            <div className="mt-4 flex items-center gap-2 bg-danger/10 border border-danger/20 rounded px-3 py-2">
              <span className="material-symbols-outlined text-danger text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
              <span className="font-body-sm text-body-sm text-danger">
                {mllStatus.isBlown
                  ? 'החשבון חצה את ה־MLL — חשבון פרופ פירם נשרף!'
                  : `נותרו ${formatDollar(mllStatus.buffer)} בלבד עד שהחשבון נשרף.`}
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

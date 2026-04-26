'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  buildEquityMllSeries,
  aggregateEquityMllSeries,
  type AggregationPeriod,
  type EquityMllPoint,
} from '@/lib/metrics'
import type { Trade, Account } from '@/types'
import { formatDollar } from '@/lib/futures'

interface EquityCurveProps {
  trades: Trade[]
  account: Account | null
  showAggregationToggle?: boolean
  defaultPeriod?: AggregationPeriod
  title?: string
}

const PERIODS: { value: AggregationPeriod; label: string }[] = [
  { value: 'daily',   label: 'יומי'   },
  { value: 'weekly',  label: 'שבועי' },
  { value: 'monthly', label: 'חודשי' },
]

function formatXTick(date: string, period: AggregationPeriod): string {
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  if (period === 'monthly') return `${mm}/${String(d.getFullYear()).slice(2)}`
  return `${dd}/${mm}`
}

interface TooltipPayloadItem {
  name?:   string
  color?:  string
  value?:  number
}

interface ChartTooltipProps {
  active?:  boolean
  payload?: TooltipPayloadItem[]
  label?:   string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-surface-container-high border border-outline-variant rounded-lg p-3 shadow-xl text-right">
      <p className="font-label-caps text-[10px] text-on-surface-variant opacity-70 mb-2">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="font-data-mono text-sm" style={{ color: entry.color }}>
              {typeof entry.value === 'number' ? formatDollar(entry.value) : '—'}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EquityCurve({
  trades,
  account,
  showAggregationToggle = false,
  defaultPeriod = 'daily',
  title = 'עקומת הון',
}: EquityCurveProps) {
  const [period, setPeriod] = useState<AggregationPeriod>(defaultPeriod)

  const allPoints: EquityMllPoint[] = useMemo(() => {
    if (!account) return []
    return buildEquityMllSeries(trades, account.portfolio_size, account.starting_mll)
  }, [trades, account])

  const points = useMemo(
    () => aggregateEquityMllSeries(allPoints, period),
    [allPoints, period]
  )

  const isEmpty = !account || points.length === 0

  // Build seed point at portfolio_size so the curve starts visually
  const data = useMemo(() => {
    if (isEmpty || !account) return [] as EquityMllPoint[]
    const firstDate = points[0].date
    const seedDate  = new Date(firstDate)
    seedDate.setDate(seedDate.getDate() - 1)
    const seed: EquityMllPoint = {
      date:    seedDate.toISOString().slice(0, 10),
      balance: account.portfolio_size,
      mll:     account.starting_mll,
    }
    return [seed, ...points]
  }, [points, isEmpty, account])

  const profitTarget = account?.profit_target ?? null

  return (
    <section className="bg-surface-container rounded-lg border border-outline-variant flex flex-col">
      <div className="p-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg opacity-80">show_chart</span>
          {title}
        </h3>
        {showAggregationToggle && (
          <div className="flex bg-background rounded-DEFAULT border border-outline-variant p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={
                  p.value === period
                    ? 'px-3 py-1 font-label-caps text-xs bg-surface-variant text-on-surface rounded-sm shadow-sm'
                    : 'px-3 py-1 font-label-caps text-xs text-on-surface-variant hover:text-on-surface transition-colors'
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 h-[360px]">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-30">
              show_chart
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant opacity-50">
              {!account ? 'לא נבחר חשבון' : 'אין עסקאות סגורות עדיין'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatXTick(d as string, period)}
                stroke="rgba(148, 163, 184, 0.6)"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="rgba(148, 163, 184, 0.6)"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`}
                width={64}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(v) => <span className="text-on-surface-variant">{v}</span>}
              />
              {profitTarget != null && (
                <ReferenceLine
                  y={profitTarget}
                  stroke="#34d399"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Profit Target ${formatDollar(profitTarget)}`,
                    position: 'insideTopRight',
                    fill: '#34d399',
                    fontSize: 10,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="balance"
                name="Account Balance"
                stroke="#00a3ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="stepAfter"
                dataKey="mll"
                name="Trailing MLL"
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1.75}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

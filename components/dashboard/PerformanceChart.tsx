'use client'

import { useState, useMemo } from 'react'
import type { EquityPoint } from '@/types'
import { formatPnl } from '@/lib/futures'

type Period = '1W' | '1M' | '3M' | 'YTD'

interface PerformanceChartProps {
  allPoints: EquityPoint[]
}

const PERIODS: Period[] = ['1W', '1M', '3M', 'YTD']

function filterPoints(points: EquityPoint[], period: Period): EquityPoint[] {
  if (points.length === 0) return []
  const now   = new Date()
  let cutoff: Date

  if (period === '1W') {
    cutoff = new Date(now); cutoff.setDate(now.getDate() - 7)
  } else if (period === '1M') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === '3M') {
    cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 3)
  } else {
    cutoff = new Date(now.getFullYear(), 0, 1)
  }

  const filtered = points.filter((p) => new Date(p.date) >= cutoff)
  // Always include one point before the cutoff so the line starts from 0
  if (filtered.length === 0) return points.slice(-1)
  return filtered
}

/** Converts equity curve points to an SVG polygon string inside viewBox 0 0 100 40 */
function buildSvgPath(points: EquityPoint[]): { area: string; line: string; minEq: number; maxEq: number } {
  if (points.length === 0) {
    return { area: '0,40 100,40', line: '0,40 100,40', minEq: 0, maxEq: 0 }
  }

  const equities = points.map((p) => p.equity)
  const minEq = Math.min(0, ...equities)
  const maxEq = Math.max(0, ...equities)
  const range  = maxEq - minEq || 1

  // Normalize equity to 0–36 SVG units (leave 4 units padding at top)
  const toY = (eq: number) => 36 - ((eq - minEq) / range) * 36

  const svgPoints = points.map((p, i) => {
    const x = points.length === 1 ? 50 : (i / (points.length - 1)) * 100
    const y = toY(p.equity)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  const line = svgPoints.join(' ')
  // Close into polygon for the area fill: add bottom-right then bottom-left
  const lastX = points.length === 1 ? 50 : 100
  const area  = `${svgPoints[0].split(',')[0]},40 ${line} ${lastX},40`

  return { area, line, minEq, maxEq }
}

export default function PerformanceChart({ allPoints }: PerformanceChartProps) {
  const [period, setPeriod] = useState<Period>('1M')

  const points = useMemo(() => filterPoints(allPoints, period), [allPoints, period])
  const { area, line, minEq, maxEq } = useMemo(() => buildSvgPath(points), [points])

  const latestEquity = points.at(-1)?.equity ?? 0
  const isPositive   = latestEquity >= 0
  const isEmpty      = allPoints.length === 0

  return (
    <div className="lg:col-span-2 bg-surface-container rounded-lg border border-outline-variant flex flex-col min-h-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-title-sm text-title-sm text-on-surface">
          ביצועי תיק - חודש נוכחי
        </h3>
        <div className="flex bg-background rounded-DEFAULT border border-outline-variant p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                p === period
                  ? 'px-3 py-1 font-label-caps text-xs bg-surface-variant text-on-surface rounded-sm shadow-sm'
                  : 'px-3 py-1 font-label-caps text-xs text-on-surface-variant hover:text-on-surface transition-colors'
              }
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 p-4 relative">
        {isEmpty ? (
          /* Empty state */
          <div className="absolute inset-4 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-30">
              show_chart
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant opacity-50">
              אין עסקאות עדיין — הנתונים יופיעו לאחר הזנת טריידים
            </p>
          </div>
        ) : (
          <div className="absolute inset-4 overflow-hidden">
            {/* Horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full border-t border-outline-variant opacity-10" />
              ))}
            </div>

            {/* Zero line (only if chart goes negative) */}
            {minEq < 0 && (
              <div
                className="absolute w-full border-t border-outline-variant opacity-30"
                style={{
                  bottom: `${((0 - minEq) / (maxEq - minEq || 1)) * 100}%`,
                }}
              />
            )}

            {/* SVG equity curve */}
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="w-full h-full"
              aria-label="עקומת הון"
            >
              <defs>
                <linearGradient id="eq-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? '#00a3ff' : '#ef4444'}
                    stopOpacity="0.25"
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? '#00a3ff' : '#ef4444'}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <polygon
                points={area}
                fill="url(#eq-gradient)"
              />

              {/* Line */}
              <polyline
                points={line}
                fill="none"
                stroke={isPositive ? '#00a3ff' : '#ef4444'}
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Last data point dot */}
              {points.length > 0 && (() => {
                const last = points[points.length - 1]
                const x = points.length === 1 ? 50 : 100
                const equities = points.map((p) => p.equity)
                const mn = Math.min(0, ...equities)
                const mx = Math.max(0, ...equities)
                const rng = mx - mn || 1
                const y = 36 - ((last.equity - mn) / rng) * 36
                return (
                  <circle
                    cx={x}
                    cy={y.toFixed(2)}
                    r="1.5"
                    fill="#0b1326"
                    stroke={isPositive ? '#00a3ff' : '#ef4444'}
                    strokeWidth="0.8"
                  />
                )
              })()}
            </svg>

            {/* Current equity label */}
            <div className="absolute top-0 left-0 flex items-baseline gap-1">
              <span className={`font-data-mono text-lg font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
                {formatPnl(latestEquity)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

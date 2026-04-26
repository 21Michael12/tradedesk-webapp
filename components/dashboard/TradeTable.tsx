import Link from 'next/link'
import type { Trade } from '@/types'
import { formatPnl } from '@/lib/futures'

interface TradeTableProps {
  trades: Trade[]
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hh    = String(d.getHours()).padStart(2, '0')
  const mm    = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hh}:${mm}`
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n)
}

function DirectionBadge({ direction }: { direction: Trade['direction'] }) {
  if (direction === 'long') {
    return (
      <span className="inline-flex items-center gap-1 bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded font-label-caps text-[10px]">
        <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
        LONG
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded font-label-caps text-[10px]">
      <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
      SHORT
    </span>
  )
}

function PnlCell({ pnl }: { pnl: number | null }) {
  if (pnl === null) {
    return (
      <span className="font-data-mono text-sm text-on-surface-variant opacity-50">—</span>
    )
  }
  return (
    <span className={`font-data-mono text-sm font-medium ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
      {formatPnl(pnl)}
    </span>
  )
}

export default function TradeTable({ trades }: TradeTableProps) {
  return (
    <section className="bg-surface-container rounded-lg border border-outline-variant flex flex-col overflow-hidden">
      {/* Table header bar */}
      <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
        <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg opacity-80">list_alt</span>
          טריידים אחרונים
        </h3>
        <Link
          href="/journal"
          className="text-primary-container font-label-caps text-label-caps hover:text-primary transition-colors text-xs"
        >
          הצג הכל
        </Link>
      </div>

      {trades.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-30">
            receipt_long
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant opacity-60">
            אין עסקאות עדיין
          </p>
          <Link
            href="/trades/new"
            className="mt-2 bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT hover:bg-primary-fixed transition-colors"
          >
            הוסף עסקה ראשונה
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-outline-variant bg-background/50">
                <th className="p-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                  תאריך ושעה
                </th>
                <th className="p-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                  נכס
                </th>
                <th className="p-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                  כיוון
                </th>
                <th className="p-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                  כניסה / יציאה
                </th>
                <th className="p-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                  רווח/הפסד
                </th>
                <th className="p-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                  תגיות
                </th>
                <th className="p-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap text-left">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-surface-variant/30 transition-colors group">
                  {/* Date/Time — links to detail */}
                  <td className="p-3 font-data-mono text-sm text-on-surface">
                    <Link href={`/trades/${trade.id}`} className="hover:text-primary-container transition-colors block">
                      {formatDateTime(trade.entry_time)}
                    </Link>
                  </td>

                  {/* Symbol — links to detail */}
                  <td className="p-3 font-data-mono text-sm font-semibold text-on-surface">
                    <Link href={`/trades/${trade.id}`} className="hover:text-primary-container transition-colors block">
                      {trade.symbol}
                    </Link>
                  </td>

                  {/* Direction */}
                  <td className="p-3">
                    <Link href={`/trades/${trade.id}`} className="block">
                      <DirectionBadge direction={trade.direction} />
                    </Link>
                  </td>

                  {/* Entry → Exit */}
                  <td className="p-3 font-data-mono text-sm text-on-surface-variant">
                    <Link href={`/trades/${trade.id}`} className="hover:text-on-surface transition-colors block">
                      {formatPrice(trade.entry_price)}
                      {' → '}
                      {trade.exit_price ? formatPrice(trade.exit_price) : '—'}
                    </Link>
                  </td>

                  {/* P&L */}
                  <td className="p-3">
                    <Link href={`/trades/${trade.id}`} className="block">
                      <PnlCell pnl={trade.net_pnl} />
                    </Link>
                  </td>

                  {/* Tags */}
                  <td className="p-3">
                    <Link href={`/trades/${trade.id}`} className="block">
                      <div className="flex gap-1 flex-wrap">
                        {trade.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded text-[10px] border border-outline-variant/50"
                          >
                            {tag}
                          </span>
                        ))}
                        {trade.tags.length > 3 && (
                          <span className="text-on-surface-variant text-[10px] opacity-60">
                            +{trade.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Actions (hover-reveal) */}
                  <td className="p-3 text-left opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/trades/${trade.id}/edit`}
                      aria-label="ערוך עסקה"
                      className="text-on-surface-variant hover:text-primary-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

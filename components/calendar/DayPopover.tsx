'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Trade } from '@/types'
import { formatPnl } from '@/lib/futures'

interface DayPopoverProps {
  date:    string  // YYYY-MM-DD
  dayOfMonth: number
  pnl:     number | null
  isToday: boolean
  trades:  Trade[]
}

function formatHebrewDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function pnlBg(pnl: number | null): string {
  if (pnl === null || pnl === 0) return 'bg-background border-outline-variant/30'
  return pnl > 0
    ? 'bg-success/10 border-success/40 hover:bg-success/15'
    : 'bg-danger/10 border-danger/40 hover:bg-danger/15'
}

function pnlText(pnl: number): string {
  return pnl >= 0 ? 'text-success' : 'text-danger'
}

function formatDayPnl(pnl: number): string {
  const abs = Math.abs(pnl)
  const fmt = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`
  return pnl >= 0 ? `+${fmt}` : `-${fmt}`
}

export default function DayCell({ date, dayOfMonth, pnl, isToday, trades }: DayPopoverProps) {
  const [open, setOpen] = useState(false)
  const hasTrades = trades.length > 0

  const screenshots = trades.flatMap((t) => t.screenshot_urls ?? []).slice(0, 6)

  return (
    <>
      <button
        type="button"
        disabled={!hasTrades}
        onClick={() => hasTrades && setOpen(true)}
        className={`relative rounded flex flex-col items-center justify-center p-1 border aspect-square transition-colors ${pnlBg(pnl)} ${isToday ? 'ring-1 ring-primary-container' : ''} ${hasTrades ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`font-data-mono text-xs ${isToday ? 'font-bold text-primary-container' : 'text-on-surface'}`}>
          {dayOfMonth}
        </span>
        {pnl !== null && (
          <span className={`font-data-mono text-[10px] leading-tight ${pnlText(pnl)}`}>
            {formatDayPnl(pnl)}
          </span>
        )}
        {hasTrades && (
          <span className="absolute top-0.5 left-0.5 font-label-caps text-[9px] text-on-surface-variant opacity-60">
            {trades.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-surface-container border border-outline-variant rounded-xl w-full max-w-[40rem] max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b border-outline-variant">
              <div>
                <h3 className="font-title-md text-title-md text-on-surface">{formatHebrewDate(date)}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70">
                  {trades.length} {trades.length === 1 ? 'טרייד' : 'טריידים'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="סגור"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-lg border border-outline-variant/50 p-3 flex flex-col gap-1">
                  <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">Net P&L</span>
                  <span className={`font-data-mono text-lg font-semibold ${pnl !== null ? pnlText(pnl) : 'text-on-surface'}`}>
                    {pnl !== null ? formatPnl(pnl) : '—'}
                  </span>
                </div>
                <div className="bg-surface rounded-lg border border-outline-variant/50 p-3 flex flex-col gap-1">
                  <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">סה״כ עסקאות</span>
                  <span className="font-data-mono text-lg font-semibold text-on-surface">{trades.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant">פירוט עסקאות</h4>
                <ul className="flex flex-col gap-1">
                  {trades.map((t) => (
                    <li key={t.id} className="flex items-center justify-between bg-surface rounded border border-outline-variant/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-label-caps text-[10px] px-1.5 py-0.5 rounded border ${
                          t.direction === 'long'
                            ? 'bg-success/10 text-success border-success/30'
                            : 'bg-danger/10 text-danger border-danger/30'
                        }`}>
                          {t.direction === 'long' ? 'LONG' : 'SHORT'}
                        </span>
                        <span className="font-data-mono text-sm text-on-surface">{t.symbol}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant opacity-70">×{t.quantity}</span>
                      </div>
                      <span className={`font-data-mono text-sm font-medium ${t.net_pnl !== null && t.net_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {t.net_pnl !== null ? formatPnl(t.net_pnl) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {screenshots.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-label-caps text-label-caps text-on-surface-variant">צילומי מסך</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {screenshots.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-video rounded overflow-hidden border border-outline-variant/50 hover:border-primary-container transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`צילום מסך ${i + 1}`}
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

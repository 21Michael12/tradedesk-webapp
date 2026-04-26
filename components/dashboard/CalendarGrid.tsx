import type { CalendarDay } from '@/types'
import { HEBREW_MONTHS } from '@/lib/metrics'

interface CalendarGridProps {
  days: CalendarDay[]    // from buildMonthCalendar()
  year: number
  month: number          // 0-indexed
}

/** Sun–Thu column headers in Hebrew (Israeli trading week) */
const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳']

/** Groups flat day array into rows of 5 (one trading week per row). */
function groupIntoWeeks(days: CalendarDay[]): CalendarDay[][] {
  // Find the Sun–Thu column index of the first day
  const firstDow = new Date(days[0]?.date ?? Date.now()).getDay() // 0=Sun … 4=Thu
  const padded: (CalendarDay | null)[] = [
    ...Array(firstDow).fill(null),
    ...days,
  ]

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < padded.length; i += 5) {
    weeks.push(padded.slice(i, i + 5).filter(Boolean) as CalendarDay[])
  }
  return weeks
}

function pnlClass(pnl: number | null): string {
  if (pnl === null) return 'bg-background border-outline-variant/30'
  return pnl >= 0
    ? 'bg-surface-variant/30 border-success/30'
    : 'bg-surface-variant/30 border-danger/30'
}

function pnlTextClass(pnl: number): string {
  return pnl >= 0 ? 'text-success' : 'text-danger'
}

function formatDayPnl(pnl: number): string {
  const abs = Math.abs(pnl)
  const fmt = abs >= 1000
    ? `$${(abs / 1000).toFixed(1)}k`
    : `$${abs.toFixed(0)}`
  return pnl >= 0 ? `+${fmt}` : `-${fmt}`
}

export default function CalendarGrid({ days, year, month }: CalendarGridProps) {
  const weeks = groupIntoWeeks(days)
  const monthLabel = `${HEBREW_MONTHS[month]} ${year}`

  return (
    <div className="bg-surface-container rounded-lg border border-outline-variant flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-title-sm text-title-sm text-on-surface">יומן חודשי</h3>
        <div className="flex items-center gap-2">
          <button
            aria-label="חודש הבא"
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
          <span className="font-body-sm text-body-sm text-on-surface">{monthLabel}</span>
          <button
            aria-label="חודש קודם"
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="p-4 flex-1">
        {/* Day-of-week header */}
        <div className="grid grid-cols-5 gap-2 text-center mb-2">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="font-label-caps text-on-surface-variant text-[10px]">
              {label}
            </span>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex flex-col gap-2">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-5 gap-2">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`rounded flex flex-col items-center justify-center p-1 border aspect-square ${pnlClass(day.pnl)} ${day.isToday ? 'ring-1 ring-primary-container' : ''}`}
                >
                  <span
                    className={`font-data-mono text-xs ${day.isToday ? 'font-bold text-primary-container' : 'text-on-surface'}`}
                  >
                    {day.dayOfMonth}
                  </span>
                  {day.pnl !== null && (
                    <span className={`font-data-mono text-[9px] leading-tight ${pnlTextClass(day.pnl)}`}>
                      {formatDayPnl(day.pnl)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {days.length === 0 && (
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant opacity-50 mt-8">
            אין נתונים לחודש זה
          </p>
        )}
      </div>
    </div>
  )
}

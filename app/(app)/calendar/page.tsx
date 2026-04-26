import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  buildMonthCalendar,
  groupTradesByDate,
  filterByDateRange,
  HEBREW_MONTHS,
} from '@/lib/metrics'
import type { Account, Trade } from '@/types'
import EquityCurve from '@/components/charts/EquityCurve'
import DayCell from '@/components/calendar/DayPopover'

export const metadata = { title: 'TradeDesk | לוח שנה' }

const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳']

interface CalendarPageProps {
  searchParams: Promise<{ accountId?: string; year?: string; month?: string }>
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { accountId, year: yearParam, month: monthParam } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawAccounts }, { data: rawTrades }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_time', { ascending: false }),
  ])

  const allAccounts: Account[] = (rawAccounts as Account[] | null) ?? []
  const allTrades:   Trade[]   = (rawTrades   as Trade[]   | null) ?? []

  const account: Account | null =
    (accountId ? allAccounts.find((a) => a.id === accountId) : null) ??
    allAccounts.find((a) => a.is_active) ??
    allAccounts[0] ??
    null

  const trades = account
    ? allTrades.filter((t) => t.account_id === account.id)
    : []

  const now = new Date()
  const year  = yearParam  ? Number(yearParam)  : now.getFullYear()
  const month = monthParam ? Number(monthParam) : now.getMonth()

  const monthStart = new Date(year, month,     1)
  const nextStart  = new Date(year, month + 1, 1)
  const monthTrades = filterByDateRange(trades, monthStart, nextStart)

  const pnlByDate = groupTradesByDate(monthTrades)
  const calendarDays = buildMonthCalendar(year, month, pnlByDate)

  // Group trades by ISO date for the popovers
  const tradesByDate = new Map<string, Trade[]>()
  for (const t of monthTrades) {
    const d = t.entry_time.slice(0, 10)
    const arr = tradesByDate.get(d) ?? []
    arr.push(t)
    tradesByDate.set(d, arr)
  }

  // Pad the first row so weekdays align (Sun=0 ... Thu=4)
  const firstDow = calendarDays[0] ? new Date(calendarDays[0].date).getDay() : 0

  const prevHref = `/calendar?${new URLSearchParams({
    ...(accountId ? { accountId } : {}),
    year:  String(month === 0 ? year - 1 : year),
    month: String(month === 0 ? 11 : month - 1),
  }).toString()}`

  const nextHref = `/calendar?${new URLSearchParams({
    ...(accountId ? { accountId } : {}),
    year:  String(month === 11 ? year + 1 : year),
    month: String(month === 11 ? 0 : month + 1),
  }).toString()}`

  const monthLabel = `${HEBREW_MONTHS[month]} ${year}`

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container p-4 rounded-lg border border-outline-variant">
        <div className="flex items-center gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface">לוח שנה</h2>
          <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps border border-outline-variant">
            {monthLabel}
          </span>
          {account && (
            <span className="bg-primary-container/10 text-primary-container px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps border border-primary-container/20">
              {account.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={prevHref}
            className="text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1 border border-outline-variant rounded"
            aria-label="חודש קודם"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </a>
          <a
            href={nextHref}
            className="text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1 border border-outline-variant rounded"
            aria-label="חודש הבא"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </a>
        </div>
      </header>

      <EquityCurve
        trades={trades}
        account={account}
        showAggregationToggle
        defaultPeriod="daily"
        title="עקומת הון — חשבון פעיל"
      />

      <section className="bg-surface-container rounded-lg border border-outline-variant flex flex-col w-full max-w-3xl mx-auto">
        <div className="p-4 border-b border-outline-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-lg opacity-80">calendar_month</span>
          <h3 className="font-title-sm text-title-sm text-on-surface">{monthLabel}</h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-5 gap-1.5 text-center mb-2">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="font-label-caps text-on-surface-variant text-[10px]">
                {label}
              </span>
            ))}
          </div>

          {calendarDays.length === 0 ? (
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant opacity-50 py-8">
              אין נתונים לחודש זה
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-[5/4]" />
              ))}
              {calendarDays.map((day) => (
                <DayCell
                  key={day.date}
                  date={day.date}
                  dayOfMonth={day.dayOfMonth}
                  pnl={day.pnl}
                  isToday={day.isToday}
                  trades={tradesByDate.get(day.date) ?? []}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

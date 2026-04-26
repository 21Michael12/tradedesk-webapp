'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import type { Account } from '@/types'

interface JournalFiltersProps {
  accounts: Account[]
  symbols: string[]
}

export default function JournalFilters({ accounts, symbols }: JournalFiltersProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const accountId = searchParams.get('accountId') ?? ''
  const symbol    = searchParams.get('symbol')    ?? ''
  const from      = searchParams.get('from')      ?? ''
  const to        = searchParams.get('to')        ?? ''

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else       params.delete(key)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters = !!(accountId || symbol || from || to)

  const inputCls =
    'bg-surface border border-outline-variant rounded-DEFAULT px-3 py-2 text-on-surface font-body-sm text-body-sm h-10 focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors'

  return (
    <section className="bg-surface-container rounded-lg border border-outline-variant p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg opacity-80">filter_list</span>
          סינון
        </h3>
        {hasFilters && (
          <button
            onClick={clearAll}
            disabled={isPending}
            className="text-on-surface-variant hover:text-primary-container font-label-caps text-label-caps transition-colors"
          >
            נקה הכל
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-label-caps text-[10px] text-on-surface-variant opacity-70">חשבון</label>
          <select
            className={inputCls}
            value={accountId}
            onChange={(e) => update('accountId', e.target.value)}
          >
            <option value="">כל החשבונות</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-caps text-[10px] text-on-surface-variant opacity-70">נכס</label>
          <select
            className={inputCls}
            value={symbol}
            onChange={(e) => update('symbol', e.target.value)}
          >
            <option value="">כל הנכסים</option>
            {symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-caps text-[10px] text-on-surface-variant opacity-70">מתאריך</label>
          <input
            className={inputCls}
            type="date"
            value={from}
            onChange={(e) => update('from', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-caps text-[10px] text-on-surface-variant opacity-70">עד תאריך</label>
          <input
            className={inputCls}
            type="date"
            value={to}
            onChange={(e) => update('to', e.target.value)}
          />
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { SUPPORTED_SYMBOLS } from '@/types'
import type { FuturesSymbol } from '@/types'
import { saveUserSettings, type UserSettings } from '@/lib/actions/settings'
import { getMultiplier } from '@/lib/futures'

interface SettingsFormProps {
  initial: UserSettings
}

function inputCls(hasError = false) {
  return [
    'bg-surface border rounded-lg px-3 py-2 text-on-surface font-data-mono text-data-mono',
    'focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors w-full h-11',
    hasError ? 'border-error' : 'border-outline-variant',
  ].join(' ')
}

export default function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [symbol, setSymbol]     = useState<FuturesSymbol>(initial.default_symbol)
  const [commission, setCommission] = useState(String(initial.default_commission))
  const [dailyLossWarning, setDailyLossWarning] = useState(String(initial.daily_loss_warning ?? 0))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const c = Number(commission)
    const w = Number(dailyLossWarning)
    if (!Number.isFinite(c) || c < 0) return setError('עמלה ברירת-מחדל חייבת להיות מספר חיובי')
    if (!Number.isFinite(w) || w < 0) return setError('סף אזהרת הפסד יומי חייב להיות מספר חיובי')

    startTransition(async () => {
      const result = await saveUserSettings({
        default_symbol:     symbol,
        default_commission: c,
        daily_loss_warning: w,
      })
      if (result && 'error' in result && result.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 2500)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* Trading Defaults */}
      <section className="bg-surface-container rounded-lg border border-outline-variant p-5 flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-on-surface">ברירות מחדל למסחר</h3>
          {success && <span className="text-success font-label-caps text-label-caps">נשמר ✓</span>}
        </header>

        <div className="flex flex-col gap-2">
          <label className="font-label-caps text-label-caps text-on-surface-variant">נכס ברירת-מחדל</label>
          <div className="grid grid-cols-4 gap-2">
            {SUPPORTED_SYMBOLS.map((sym) => {
              const mult   = getMultiplier(sym)
              const active = symbol === sym
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setSymbol(sym)}
                  className={[
                    'h-16 rounded-lg border flex flex-col items-center justify-center transition-all',
                    active
                      ? 'bg-primary-container/15 border-primary-container text-primary-container'
                      : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary-container/40',
                  ].join(' ')}
                >
                  <span className="font-data-mono font-semibold text-base">{sym}</span>
                  <span className="font-label-caps text-[10px] opacity-70">×${mult}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-label-caps text-label-caps text-on-surface-variant">
            עמלה ברירת-מחדל לחוזה ($)
          </label>
          <div className="relative max-w-[16rem]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className={`${inputCls()} pl-8`}
              placeholder="2.05"
              dir="ltr"
            />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70">
            טופס הוספת טרייד ימלא אוטומטית את שדה העמלות לפי <code className="font-data-mono">חוזים × עמלה</code>.
          </p>
        </div>
      </section>

      {/* Risk Management */}
      <section className="bg-surface-container rounded-lg border border-outline-variant p-5 flex flex-col gap-5">
        <header>
          <h3 className="font-title-md text-title-md text-on-surface">ניהול סיכונים</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70 mt-1">
            ספים אישיים שיופיעו כאזהרות בלוח הבקרה.
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <label className="font-label-caps text-label-caps text-on-surface-variant">
            סף אזהרת הפסד יומי ($)
          </label>
          <div className="relative max-w-[16rem]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={dailyLossWarning}
              onChange={(e) => setDailyLossWarning(e.target.value)}
              className={`${inputCls()} pl-8`}
              placeholder="500"
              dir="ltr"
            />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70">
            אם ההפסד היומי המצטבר עובר את הסף, יוצג באנר אדום בולט בלוח הבקרה.
            הזן 0 כדי להשבית.
          </p>
        </div>
      </section>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-lg p-3 font-body-sm text-body-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT flex items-center gap-2 hover:bg-primary-fixed transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </div>
    </form>
  )
}

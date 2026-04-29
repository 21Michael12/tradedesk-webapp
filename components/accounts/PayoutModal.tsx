'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote } from 'lucide-react'
import { recordWithdrawal } from '@/lib/actions/withdrawals'
import { DateField } from '@/components/forms/MaskedInputs'

interface PayoutModalProps {
  accountId:   string
  accountName: string
}

function inputCls(hasError = false) {
  return [
    'bg-surface border rounded-lg px-3 py-2 text-on-surface font-data-mono text-data-mono',
    'focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors w-full h-11',
    hasError ? 'border-error' : 'border-outline-variant',
  ].join(' ')
}

function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function PayoutModal({ accountId, accountName }: PayoutModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount]           = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate]               = useState(todayIso())

  function close() {
    setOpen(false)
    setAmount('')
    setDescription('')
    setDate(todayIso())
    setError(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return setError('סכום המשיכה חייב להיות חיובי')
    if (!date) return setError('נדרש תאריך משיכה')

    // Compose a timestamp at noon UTC on the chosen date to avoid TZ drift
    const isoCreatedAt = `${date}T12:00:00.000Z`

    startTransition(async () => {
      const result = await recordWithdrawal({
        account_id:  accountId,
        amount:      amt,
        description: description.trim() || null,
        created_at:  isoCreatedAt,
      })
      if (result && 'error' in result && result.error) {
        setError(result.error)
        return
      }
      close()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50 rounded-DEFAULT py-2 font-label-caps text-label-caps transition-colors flex items-center justify-center gap-1"
      >
        <Banknote className="w-4 h-4" />
        תיעוד משיכה
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={close}>
          <div
            className="bg-surface-container border border-outline-variant rounded-xl w-full max-w-[28rem] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <h3 className="font-title-md text-title-md text-on-surface">תיעוד משיכה</h3>
              </div>
              <button
                onClick={close}
                aria-label="סגור"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <form onSubmit={submit} className="p-4 flex flex-col gap-4">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                חשבון: <span className="font-data-mono text-on-surface">{accountName}</span>
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-label-caps text-on-surface-variant">סכום ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls()} pl-8`}
                    placeholder="2500.00"
                    dir="ltr"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-label-caps text-on-surface-variant">תאריך (DD/MM/YYYY)</label>
                <DateField value={date} onChange={setDate} className={inputCls()} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-label-caps text-on-surface-variant">
                  הערה (אופציונלי)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md w-full h-11 outline-none focus:border-primary-container"
                  placeholder="First Payout!"
                />
              </div>

              {error && (
                <div className="bg-error/10 border border-error/30 text-error rounded-lg p-3 font-body-sm text-body-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={close}
                  disabled={isPending}
                  className="text-on-surface-variant hover:text-on-surface px-4 py-2 font-title-sm text-title-sm transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT transition-colors disabled:opacity-50"
                >
                  {isPending ? 'שומר...' : 'תעד משיכה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

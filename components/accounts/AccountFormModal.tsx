'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Account, AccountType } from '@/types'

export interface AccountFormValues {
  name: string
  account_type: AccountType
  portfolio_size: number
  starting_mll: number
  prop_firm_name: string | null
}

interface AccountFormModalProps {
  mode: 'create' | 'edit'
  initialAccount?: Account
  action: (values: AccountFormValues) => Promise<{ error?: string } | void>
}

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'demo',   label: 'דמו' },
  { value: 'live',   label: 'לייב' },
  { value: 'funded', label: 'מממן (Prop Firm)' },
]

function inputCls(hasError = false) {
  return [
    'bg-surface border rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md',
    'focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors w-full h-11',
    hasError ? 'border-error' : 'border-outline-variant',
  ].join(' ')
}

export default function AccountFormModal({ mode, initialAccount, action }: AccountFormModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName]                   = useState(initialAccount?.name ?? '')
  const [accountType, setAccountType]     = useState<AccountType>(initialAccount?.account_type ?? 'demo')
  const [portfolioSize, setPortfolioSize] = useState(initialAccount ? String(initialAccount.portfolio_size) : '')
  const [startingMll, setStartingMll]     = useState(initialAccount ? String(initialAccount.starting_mll) : '')
  const [propFirmName, setPropFirmName]   = useState(initialAccount?.prop_firm_name ?? '')

  function reset() {
    setName(initialAccount?.name ?? '')
    setAccountType(initialAccount?.account_type ?? 'demo')
    setPortfolioSize(initialAccount ? String(initialAccount.portfolio_size) : '')
    setStartingMll(initialAccount ? String(initialAccount.starting_mll) : '')
    setPropFirmName(initialAccount?.prop_firm_name ?? '')
    setError(null)
  }

  function close() {
    setOpen(false)
    reset()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const size = Number(portfolioSize)
    const mll  = Number(startingMll)

    if (!name.trim())                                     return setError('שם החשבון חובה')
    if (!Number.isFinite(size) || size <= 0)              return setError('גודל תיק חייב להיות מספר חיובי')
    if (!Number.isFinite(mll) || mll <= 0)                return setError('Starting MLL חייב להיות מספר חיובי')
    if (mll >= size)                                       return setError('Starting MLL חייב להיות נמוך מגודל התיק')
    if (accountType === 'funded' && !propFirmName.trim()) return setError('חשבון מממן דורש שם חברה')

    startTransition(async () => {
      const result = await action({
        name: name.trim(),
        account_type: accountType,
        portfolio_size: size,
        starting_mll: mll,
        prop_firm_name: accountType === 'funded' ? propFirmName.trim() : null,
      })
      if (result && 'error' in result && result.error) {
        setError(result.error)
        return
      }
      close()
      router.refresh()
    })
  }

  const triggerCls =
    mode === 'create'
      ? 'bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT flex items-center gap-2 hover:bg-primary-fixed transition-colors'
      : 'flex-1 text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high border border-outline-variant rounded-DEFAULT py-2 font-label-caps text-label-caps transition-colors flex items-center justify-center gap-1'

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerCls}>
        <span
          className="material-symbols-outlined text-base"
          style={mode === 'create' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {mode === 'create' ? 'add' : 'edit'}
        </span>
        {mode === 'create' ? 'הוסף חשבון' : 'ערוך'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="relative bg-surface-container border border-outline-variant rounded-lg w-full max-w-[32rem] max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h3 className="font-title-md text-title-md text-on-surface">
                {mode === 'create' ? 'חשבון חדש' : 'עריכת חשבון'}
              </h3>
              <button
                onClick={close}
                aria-label="סגור"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={submit} className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-label-caps text-on-surface-variant">שם החשבון</label>
                <input
                  className={inputCls()}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Topstep 50K, דמו, וכו׳"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-label-caps text-on-surface-variant">סוג חשבון</label>
                <select
                  className={inputCls()}
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {accountType === 'funded' && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">שם חברת המימון</label>
                  <input
                    className={inputCls()}
                    type="text"
                    value={propFirmName}
                    onChange={(e) => setPropFirmName(e.target.value)}
                    placeholder="Topstep, Apex, FTMO..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">גודל תיק ($)</label>
                  <input
                    className={inputCls()}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={portfolioSize}
                    onChange={(e) => setPortfolioSize(e.target.value)}
                    placeholder="50000"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">Starting MLL ($)</label>
                  <input
                    className={inputCls()}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={startingMll}
                    onChange={(e) => setStartingMll(e.target.value)}
                    placeholder="48000"
                  />
                </div>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70 -mt-2">
                ה־MLL הוא רצפת ההפסד שממנה החשבון נשרף. בחשבון Topstep 50K טיפוסי ה־MLL ההתחלתי הוא $48,000 (מרחק טריילינג של $2,000).
              </p>

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
                  className="bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT hover:bg-primary-fixed transition-colors disabled:opacity-50"
                >
                  {isPending ? 'שומר...' : mode === 'create' ? 'שמור חשבון' : 'עדכן חשבון'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

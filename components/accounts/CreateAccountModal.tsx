'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountType } from '@/types'

export interface CreateAccountValues {
  name: string
  account_type: AccountType
  portfolio_size: number
  max_loss_pct: number
  prop_firm_name: string | null
}

interface CreateAccountModalProps {
  action: (values: CreateAccountValues) => Promise<{ error?: string } | void>
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

export default function CreateAccountModal({ action }: CreateAccountModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName]                   = useState('')
  const [accountType, setAccountType]     = useState<AccountType>('demo')
  const [portfolioSize, setPortfolioSize] = useState('')
  const [maxLossPct, setMaxLossPct]       = useState('5')
  const [propFirmName, setPropFirmName]   = useState('')

  function reset() {
    setName('')
    setAccountType('demo')
    setPortfolioSize('')
    setMaxLossPct('5')
    setPropFirmName('')
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
    const loss = Number(maxLossPct)

    if (!name.trim())               return setError('שם החשבון חובה')
    if (!Number.isFinite(size) || size <= 0) return setError('גודל תיק חייב להיות מספר חיובי')
    if (!Number.isFinite(loss) || loss <= 0 || loss > 100) return setError('אחוז הפסד מקסימלי חייב להיות בין 0 ל-100')
    if (accountType === 'funded' && !propFirmName.trim()) return setError('חשבון מממן דורש שם חברה')

    startTransition(async () => {
      const result = await action({
        name: name.trim(),
        account_type: accountType,
        portfolio_size: size,
        max_loss_pct: loss,
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT flex items-center gap-2 hover:bg-primary-fixed transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        הוסף חשבון
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="relative bg-surface-container border border-outline-variant rounded-lg w-full max-w-[32rem] max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h3 className="font-title-md text-title-md text-on-surface">חשבון חדש</h3>
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
                  <label className="font-label-caps text-label-caps text-on-surface-variant">הפסד מקסימלי (%)</label>
                  <input
                    className={inputCls()}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={maxLossPct}
                    onChange={(e) => setMaxLossPct(e.target.value)}
                    placeholder="5"
                  />
                </div>
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
                  className="bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT hover:bg-primary-fixed transition-colors disabled:opacity-50"
                >
                  {isPending ? 'שומר...' : 'שמור חשבון'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

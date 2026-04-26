'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { wipeAllTradeData, deleteMyAccount } from '@/lib/actions/danger'

type Action = 'wipe' | 'delete'

const COPY: Record<Action, {
  title: string
  body: string
  confirmText: string
  buttonLabel: string
  triggerLabel: string
  triggerDescription: string
}> = {
  wipe: {
    title: 'למחוק את כל נתוני המסחר?',
    body: 'כל הטריידים, החשבונות וצילומי המסך יימחקו. הפרופיל וההגדרות יישארו. פעולה זו אינה ניתנת לביטול.',
    confirmText: 'WIPE',
    buttonLabel: 'מחק את כל הנתונים',
    triggerLabel: 'מחק את כל נתוני המסחר',
    triggerDescription: 'מוחק את כל הטריידים והחשבונות. שומר על הפרופיל וההגדרות.',
  },
  delete: {
    title: 'למחוק את החשבון לצמיתות?',
    body: 'כל הטריידים, החשבונות, ההגדרות והפרופיל יימחקו לצמיתות. תועבר למסך ההתחברות. פעולה זו אינה ניתנת לביטול.',
    confirmText: 'DELETE',
    buttonLabel: 'מחק את החשבון שלי',
    triggerLabel: 'מחק את החשבון שלי',
    triggerDescription: 'מסיר אותך לחלוטין מ־TradeDesk, יחד עם כל הנתונים שלך.',
  },
}

export default function DangerZone() {
  const router = useRouter()
  const [open, setOpen] = useState<Action | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function close() {
    setOpen(null)
    setConfirmInput('')
    setError(null)
  }

  function confirm() {
    if (!open) return
    const expected = COPY[open].confirmText
    if (confirmInput.trim() !== expected) {
      setError(`הקלד "${expected}" כדי לאשר`)
      return
    }
    startTransition(async () => {
      const action = open === 'wipe' ? wipeAllTradeData : deleteMyAccount
      const result = await action()
      if (result && 'error' in result && result.error) {
        setError(result.error)
        return
      }
      close()
      if (open === 'delete') {
        router.push('/login')
      } else {
        router.refresh()
      }
    })
  }

  return (
    <section className="bg-error/[0.04] rounded-lg border-2 border-error/40 p-5 flex flex-col gap-4">
      <header className="flex items-center gap-2 text-error">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-title-md text-title-md">אזור סכנה</h3>
      </header>

      <ul className="flex flex-col divide-y divide-error/20">
        {(['wipe', 'delete'] as const).map((action) => (
          <li key={action} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
            <div>
              <p className="font-title-sm text-title-sm text-on-surface">{COPY[action].triggerLabel}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant opacity-80 mt-0.5">
                {COPY[action].triggerDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(action)}
              className="bg-error/10 text-error border border-error/40 hover:bg-error/20 transition-colors font-label-caps text-label-caps px-3 py-2 rounded-DEFAULT flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              {COPY[action].buttonLabel}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={close}>
          <div
            className="bg-surface-container border-2 border-error/40 rounded-xl w-full max-w-[28rem] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-title-md text-title-md">{COPY[open].title}</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface">{COPY[open].body}</p>
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant">
                  הקלד <span className="font-data-mono text-error">{COPY[open].confirmText}</span> כדי לאשר
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-data-mono w-full h-11 outline-none focus:border-error"
                  dir="ltr"
                  autoFocus
                />
              </div>
              {error && (
                <div className="bg-error/10 border border-error/30 text-error rounded-lg p-3 font-body-sm text-body-sm">
                  {error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 bg-surface-container-low border-t border-outline-variant">
              <button
                onClick={close}
                disabled={isPending}
                className="px-4 py-2 font-label-caps text-label-caps text-on-surface hover:bg-surface-variant rounded transition-colors disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={confirm}
                disabled={isPending || confirmInput.trim() !== COPY[open].confirmText}
                className="px-4 py-2 font-label-caps text-label-caps bg-error text-on-error rounded transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
              >
                {isPending && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {COPY[open].buttonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

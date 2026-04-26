'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteAccountButtonProps {
  accountId: string
  accountName: string
  action: (id: string) => Promise<{ error?: string } | void>
}

export default function DeleteAccountButton({ accountId, accountName, action }: DeleteAccountButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await action(accountId)
      if (result && 'error' in result && result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="מחק חשבון"
        className="flex-1 text-on-surface-variant hover:text-error hover:bg-error/10 border border-outline-variant hover:border-error/40 rounded-DEFAULT py-2 font-label-caps text-label-caps transition-colors flex items-center justify-center gap-1"
      >
        <span className="material-symbols-outlined text-base">delete</span>
        מחק
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl w-full max-w-[28rem] overflow-hidden shadow-2xl">
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-error">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <h2 className="font-title-md text-title-md">למחוק את החשבון?</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface">
                החשבון <span className="font-semibold">{accountName}</span> יימחק לצמיתות.
              </p>
              <p className="font-body-sm text-body-sm text-danger">
                כל הטריידים המקושרים לחשבון זה יימחקו גם הם. פעולה זו אינה ניתנת לביטול.
              </p>
              {error && (
                <div className="bg-error/10 border border-error/30 text-error rounded-lg p-3 font-body-sm text-body-sm">
                  {error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 bg-surface-container-low border-t border-outline-variant">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-4 py-2 font-label-caps text-label-caps text-on-surface hover:bg-surface-variant rounded transition-colors disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={confirm}
                disabled={isPending}
                className="px-4 py-2 font-label-caps text-label-caps bg-error text-on-error rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
              >
                {isPending && (
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                )}
                מחק חשבון
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useTransition } from 'react'

interface DeleteModalProps {
  action: () => Promise<void>
}

export default function DeleteModal({ action }: DeleteModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      await action()
      // action redirects server-side; no client cleanup needed
    })
  }

  return (
    <>
      {/* Trigger button — placed inline in the header */}
      <button
        onClick={() => setOpen(true)}
        className="p-sm rounded border border-surface-variant text-error hover:bg-error/10 transition-colors flex items-center justify-center"
        aria-label="מחק עסקה"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>

      {/* Modal backdrop + dialog */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-margin">
          <div className="bg-surface-container border border-surface-variant rounded-xl w-full max-w-[28rem] overflow-hidden shadow-2xl">
            <div className="p-lg flex flex-col gap-md">
              <div className="flex items-center gap-sm text-error">
                <span className="material-symbols-outlined">warning</span>
                <h2 className="font-headline-md text-headline-md">מחיקת עסקה?</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                האם אתה בטוח שברצונך למחוק עסקה זו? פעולה זו אינה ניתנת לביטול.
              </p>
            </div>
            <div className="flex items-center justify-end gap-md p-lg bg-surface-container-low border-t border-surface-variant">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-lg py-sm font-label-caps text-label-caps uppercase text-on-surface hover:bg-surface-variant transition-colors rounded disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={confirm}
                disabled={isPending}
                className="px-lg py-sm font-label-caps text-label-caps uppercase bg-error text-on-error hover:opacity-90 transition-opacity rounded disabled:opacity-60 flex items-center gap-2"
              >
                {isPending && (
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                )}
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

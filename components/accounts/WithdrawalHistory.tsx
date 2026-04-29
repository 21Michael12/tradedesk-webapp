'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import type { Withdrawal } from '@/types'
import { formatDollar } from '@/lib/futures'
import { deleteWithdrawal } from '@/lib/actions/withdrawals'

interface WithdrawalHistoryProps {
  withdrawals: Withdrawal[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  return `${dd}/${mm}/${yy}`
}

export default function WithdrawalHistory({ withdrawals }: WithdrawalHistoryProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (withdrawals.length === 0) return null

  const total = withdrawals.reduce((s, w) => s + w.amount, 0)

  function remove(id: string) {
    setPendingId(id)
    startTransition(async () => {
      await deleteWithdrawal(id)
      setPendingId(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant/50">
      <div className="flex items-center justify-between">
        <h4 className="font-label-caps text-label-caps text-on-surface-variant">היסטוריית משיכות</h4>
        <span className="font-data-mono text-xs text-emerald-400">סה״כ {formatDollar(total)}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {withdrawals.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between gap-2 text-xs bg-surface rounded border border-outline-variant/50 px-2 py-1.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-data-mono text-on-surface-variant">{formatDate(w.created_at)}</span>
              {w.description && (
                <span className="font-body-sm text-on-surface-variant opacity-70 truncate">
                  {w.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-data-mono text-emerald-300">{formatDollar(w.amount)}</span>
              <button
                onClick={() => remove(w.id)}
                disabled={pendingId === w.id}
                aria-label="מחק משיכה"
                className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

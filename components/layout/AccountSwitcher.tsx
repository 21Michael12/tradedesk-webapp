'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import type { Account, AccountType } from '@/types'

interface AccountSwitcherProps {
  accounts: Account[]
}

const TYPE_LABELS: Record<AccountType, string> = {
  EVAL:         'מבחן',
  FUNDED:       'ממומן',
  LIVE_EXPRESS: 'לייב',
}

const TYPE_COLORS: Record<AccountType, string> = {
  EVAL:         'text-on-surface-variant border-outline-variant/60 bg-surface-variant/40',
  FUNDED:       'text-tertiary border-tertiary/40 bg-tertiary/10',
  LIVE_EXPRESS: 'text-success border-success/40 bg-success/10',
}

export default function AccountSwitcher({ accounts }: AccountSwitcherProps) {
  const searchParams = useSearchParams()
  const pathname     = usePathname()
  const router       = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeId = searchParams.get('accountId') ?? accounts[0]?.id ?? null
  const active   = accounts.find((a) => a.id === activeId) ?? accounts[0] ?? null

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('accountId', id)
    const isAccountAware =
      pathname.startsWith('/dashboard') || pathname.startsWith('/journal')
    const dest = isAccountAware ? `${pathname}?${params}` : `/dashboard?accountId=${id}`
    router.push(dest)
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!active) return null

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors text-right"
      >
        <span className="material-symbols-outlined text-base text-primary-container flex-shrink-0">
          account_balance_wallet
        </span>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-body-sm text-body-sm text-on-surface truncate leading-tight">
            {active.name}
          </p>
          <p className={`font-label-caps text-[10px] leading-tight ${TYPE_COLORS[active.account_type]}`}>
            {TYPE_LABELS[active.account_type]}
          </p>
        </div>
        <span
          className={`material-symbols-outlined text-sm text-on-surface-variant flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown */}
      {open && accounts.length > 0 && (
        <div className="absolute top-full mt-1 right-0 w-full bg-surface-container border border-outline-variant rounded-lg shadow-xl z-50 overflow-hidden">
          {accounts.map((account) => {
            const isCurrent = account.id === active.id
            return (
              <button
                key={account.id}
                onClick={() => select(account.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-right transition-colors ${
                  isCurrent
                    ? 'bg-primary-container/10 text-primary-container'
                    : 'hover:bg-surface-container-high text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base flex-shrink-0 ${
                    isCurrent ? 'text-primary-container' : 'text-on-surface-variant'
                  }`}
                  style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  account_balance_wallet
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body-sm text-body-sm truncate">{account.name}</p>
                  <p className={`font-label-caps text-[10px] ${TYPE_COLORS[account.account_type]}`}>
                    {TYPE_LABELS[account.account_type]}
                    {account.prop_firm_name ? ` — ${account.prop_firm_name}` : ''}
                  </p>
                </div>
                {isCurrent && (
                  <span className="material-symbols-outlined text-sm text-primary-container flex-shrink-0">
                    check
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

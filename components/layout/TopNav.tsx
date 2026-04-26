'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AccountSwitcher from '@/components/layout/AccountSwitcher'
import type { Account } from '@/types'

interface TopNavProps {
  accounts: Account[]
}

const navItems = [
  { href: '/dashboard',  icon: 'dashboard',              label: 'לוח בקרה'  },
  { href: '/dashboard',  icon: 'auto_stories',           label: 'יומן מסחר' },
  { href: '/accounts',   icon: 'account_balance_wallet', label: 'חשבונות'   },
  { href: '/calendar',   icon: 'calendar_month',         label: 'לוח שנה'   },
  { href: '/settings',   icon: 'settings',               label: 'הגדרות'    },
  { href: '/help',       icon: 'help',                   label: 'עזרה'      },
]

export default function TopNav({ accounts }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top bar */}
      <nav className="md:hidden flex justify-between items-center px-6 h-16 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 fixed top-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl">
            monitoring
          </span>
          <span className="text-xl font-bold tracking-tight text-white font-headline-md">
            TradeDesk
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            aria-label="התראות"
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button
            aria-label="תפריט"
            onClick={() => setMenuOpen((o) => !o)}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="relative mr-auto w-72 bg-slate-900 border-l border-slate-800 h-full flex flex-col pt-16 z-50">
            <div className="flex-1 py-4 overflow-y-auto">
              {/* Account Switcher */}
              {accounts.length > 0 && (
                <div className="px-4 mb-4">
                  <p className="font-label-caps text-[10px] text-on-surface-variant opacity-60 mb-2">
                    חשבון פעיל
                  </p>
                  <Suspense fallback={<div className="h-10 rounded-lg bg-surface-container animate-pulse" />}>
                    <AccountSwitcher accounts={accounts} />
                  </Suspense>
                </div>
              )}

              <Link
                href="/trades/new"
                onClick={() => setMenuOpen(false)}
                className="mx-4 mb-4 bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  add
                </span>
                הוסף טרייד
              </Link>

              <ul className="flex flex-col gap-1">
                {navItems.map(({ href, icon, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3 px-4 py-3 font-title-sm text-title-sm"
                    >
                      <span className="material-symbols-outlined text-xl">{icon}</span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={handleSignOut}
                className="w-full text-start text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3 px-4 py-3 font-title-sm text-title-sm"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
                ניתוק
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

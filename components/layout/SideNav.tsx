'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AccountSwitcher from '@/components/layout/AccountSwitcher'
import type { Account } from '@/types'

interface SideNavProps {
  accounts: Account[]
  addTradeDisabled?: boolean
}

const navItems = [
  { href: '/dashboard',  icon: 'dashboard',              label: 'לוח בקרה',  fill: true  },
  { href: '/journal',    icon: 'auto_stories',           label: 'יומן מסחר', fill: false },
  { href: '/accounts',   icon: 'account_balance_wallet', label: 'חשבונות',   fill: false },
  { href: '/calendar',   icon: 'calendar_month',         label: 'לוח שנה',   fill: false },
  { href: '/settings',   icon: 'settings',               label: 'הגדרות',    fill: false },
]

const footerItems = [
  { href: '/help', icon: 'help', label: 'עזרה' },
]

export default function SideNav({ accounts, addTradeDisabled = false }: SideNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="hidden md:flex flex-col fixed right-0 top-0 h-screen z-40 bg-slate-900 border-l border-slate-800 w-64">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800 flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant">
          <span className="material-symbols-outlined text-primary-container text-2xl">
            monitoring
          </span>
        </div>
        <div className="text-center">
          <h1 className="text-lg font-black text-[#00A3FF] font-headline-md tracking-tight">
            TradeDesk
          </h1>
          <p className="text-on-surface-variant font-label-caps text-label-caps opacity-70">
            AbraTech IL
          </p>
        </div>
        {addTradeDisabled ? (
          <div
            className="mt-4 w-full bg-error/10 text-error border border-error/30 font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT flex items-center justify-center gap-2 cursor-not-allowed"
            title="החשבון נשרף. שחזר אותו לפני הוספת טרייד."
            aria-disabled="true"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              block
            </span>
            חשבון נשרף
          </div>
        ) : (
          <Link
            href="/trades/new"
            className="mt-4 w-full bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add
            </span>
            הוסף טרייד
          </Link>
        )}
      </div>

      {/* Account Switcher */}
      {accounts.length > 0 && (
        <div className="px-3 py-3 border-b border-slate-800">
          <p className="font-label-caps text-[10px] text-on-surface-variant opacity-60 mb-2 px-1">
            חשבון פעיל
          </p>
          <Suspense fallback={<div className="h-10 rounded-lg bg-surface-container animate-pulse" />}>
            <AccountSwitcher accounts={accounts} />
          </Suspense>
        </div>
      )}

      {/* Main nav */}
      <div className="flex-1 py-4 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, icon, label, fill }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    isActive
                      ? 'bg-slate-800 text-[#00A3FF] border-r-4 border-[#00A3FF] flex items-center gap-3 px-4 py-3 font-title-sm text-title-sm'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200 ease-in-out flex items-center gap-3 px-4 py-3 font-title-sm text-title-sm border-r-4 border-transparent'
                  }
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={isActive && fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {icon}
                  </span>
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Footer nav */}
      <div className="p-4 border-t border-slate-800">
        <ul className="flex flex-col gap-1">
          {footerItems.map(({ href, icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200 ease-in-out flex items-center gap-3 px-4 py-3 font-title-sm text-title-sm border-r-4 border-transparent"
              >
                <span className="material-symbols-outlined text-xl">{icon}</span>
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={handleSignOut}
              className="w-full text-start text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200 ease-in-out flex items-center gap-3 px-4 py-3 font-title-sm text-title-sm border-r-4 border-transparent"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              ניתוק
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

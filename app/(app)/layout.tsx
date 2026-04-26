import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SideNav from '@/components/layout/SideNav'
import TopNav from '@/components/layout/TopNav'
import { calculateMllStatus } from '@/lib/metrics'
import type { Account, Trade } from '@/types'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: rawAccounts }, { data: rawTrades }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trades')
      .select('account_id, net_pnl, entry_time')
      .eq('user_id', user.id),
  ])

  const accounts: Account[] = (rawAccounts as Account[] | null) ?? []
  const trades:   Trade[]   = (rawTrades   as Trade[]   | null) ?? []

  // The trades/new page falls back to active → first account. Mirror that here
  // so the global "Add Trade" button reflects the correct blown state.
  const targetAccount = accounts.find((a) => a.is_active) ?? accounts[0] ?? null
  const targetTrades  = targetAccount
    ? trades.filter((t) => t.account_id === targetAccount.id)
    : []
  const targetMll = targetAccount
    ? calculateMllStatus(targetTrades, targetAccount.portfolio_size, targetAccount.starting_mll)
    : null

  const addTradeDisabled = targetMll?.isBlown ?? false

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-on-surface">
      <SideNav accounts={accounts} addTradeDisabled={addTradeDisabled} />
      <TopNav  accounts={accounts} addTradeDisabled={addTradeDisabled} />
      <main className="flex-1 md:mr-64 pt-16 md:pt-0 p-4 md:p-6 lg:p-8 flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SideNav from '@/components/layout/SideNav'
import TopNav from '@/components/layout/TopNav'
import type { Account } from '@/types'

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

  const { data: rawAccounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const accounts: Account[] = (rawAccounts as Account[] | null) ?? []

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-on-surface">
      <SideNav accounts={accounts} />
      <TopNav accounts={accounts} />
      <main className="flex-1 md:mr-64 pt-16 md:pt-0 p-4 md:p-6 lg:p-8 flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  )
}

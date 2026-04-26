import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JournalFilters from '@/components/journal/JournalFilters'
import TradeTable from '@/components/dashboard/TradeTable'
import { calculateMetrics } from '@/lib/metrics'
import { formatPnl } from '@/lib/futures'
import type { Account, Trade } from '@/types'

export const metadata = { title: 'TradeDesk | יומן מסחר' }

interface JournalPageProps {
  searchParams: Promise<{
    accountId?: string
    symbol?: string
    from?: string
    to?: string
  }>
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const { accountId, symbol, from, to } = await searchParams
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

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('entry_time', { ascending: false })

  if (accountId) query = query.eq('account_id', accountId)
  if (symbol)    query = query.eq('symbol', symbol)
  if (from)      query = query.gte('entry_time', new Date(from).toISOString())
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    query = query.lte('entry_time', toDate.toISOString())
  }

  const { data: rawTrades } = await query.limit(1000)
  const trades: Trade[] = (rawTrades as Trade[] | null) ?? []

  const { data: symbolRows } = await supabase
    .from('trades')
    .select('symbol')
    .eq('user_id', user.id)

  const symbols = Array.from(
    new Set(((symbolRows as { symbol: string }[] | null) ?? []).map((r) => r.symbol))
  ).sort()

  const metrics = calculateMetrics(trades)

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container p-4 rounded-lg border border-outline-variant">
        <div className="flex items-center gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface">יומן מסחר</h2>
          <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps border border-outline-variant">
            {trades.length} עסקאות
          </span>
        </div>
      </header>

      <JournalFilters accounts={accounts} symbols={symbols} />

      {trades.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container border border-outline-variant rounded-lg p-3 flex flex-col gap-1">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">סה״כ נטו</span>
            <span className={`font-data-mono text-base font-medium ${metrics.totalNetPnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatPnl(metrics.totalNetPnl)}
            </span>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded-lg p-3 flex flex-col gap-1">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">אחוז זכייה</span>
            <span className="font-data-mono text-base text-on-surface">{metrics.winRate.toFixed(1)}%</span>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded-lg p-3 flex flex-col gap-1">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">Profit Factor</span>
            <span className="font-data-mono text-base text-on-surface">
              {Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}
            </span>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded-lg p-3 flex flex-col gap-1">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-70">סה״כ עסקאות</span>
            <span className="font-data-mono text-base text-on-surface">{metrics.totalTrades}</span>
          </div>
        </section>
      )}

      <TradeTable trades={trades} />
    </>
  )
}

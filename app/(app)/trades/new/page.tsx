import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import TradeForm from '@/components/trades/TradeForm'
import type { TradeFormProps } from '@/components/trades/TradeForm'
import { calculateTradePnl } from '@/lib/futures'
import { calculateMllStatus } from '@/lib/metrics'
import type { Trade, FuturesSymbol } from '@/types'

export const metadata = { title: 'TradeDesk | עסקה חדשה' }

export default async function NewTradePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, is_active, portfolio_size, starting_mll, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const account =
    (accounts ?? []).find((a) => a.is_active) ?? (accounts ?? [])[0] ?? null

  if (!account) redirect('/accounts')

  // Block trade creation when the active account is blown
  const { data: rawTrades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', account.id)

  const accountTrades = (rawTrades as Trade[] | null) ?? []
  const mllStatus = calculateMllStatus(accountTrades, account.portfolio_size, account.starting_mll)

  if (mllStatus.isBlown) redirect('/dashboard')

  // Pull user defaults so the form can pre-fill symbol & fees
  const { data: settings } = await supabase
    .from('user_settings')
    .select('default_symbol, default_commission')
    .eq('user_id', user.id)
    .maybeSingle()

  const defaults = {
    symbol:     (settings?.default_symbol as FuturesSymbol | undefined) ?? undefined,
    commission: settings?.default_commission != null ? Number(settings.default_commission) : undefined,
  }

  const action: TradeFormProps['action'] = async (values) => {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const grossPnl =
      values.exit_points != null
        ? calculateTradePnl(
            values.entry_points,
            values.exit_points,
            values.quantity,
            values.direction,
            values.symbol,
            0
          ).grossPnl
        : null
    const netPnl = grossPnl != null ? grossPnl - values.fees : null
    const riskReward =
      values.stop_loss != null && values.exit_points != null
        ? Math.abs(values.exit_points - values.entry_points) /
          Math.abs(values.entry_points - values.stop_loss)
        : null

    const { error } = await supabase.from('trades').insert({
      user_id:         user.id,
      account_id:      values.account_id,
      symbol:          values.symbol,
      direction:       values.direction,
      trade_type:      values.trade_type,
      entry_price:     values.entry_points,
      exit_price:      values.exit_points,
      quantity:        values.quantity,
      entry_time:      new Date(values.entry_time).toISOString(),
      exit_time:       values.exit_time ? new Date(values.exit_time).toISOString() : null,
      gross_pnl:       grossPnl,
      fees:            values.fees,
      net_pnl:         netPnl,
      stop_loss:       values.stop_loss,
      take_profit:     values.take_profit,
      risk_reward:     riskReward,
      notes:           values.notes ?? null,
      tags:            values.tags,
      screenshot_urls: values.screenshot_urls,
    })

    if (error) return { error: `שגיאה בשמירת העסקה: ${error.message}` }

    revalidatePath('/dashboard')
    revalidatePath('/journal')
  }

  return (
    <TradeForm
      userId={user.id}
      accountId={account.id}
      defaults={defaults}
      action={action}
    />
  )
}

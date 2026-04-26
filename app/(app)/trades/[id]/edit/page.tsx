import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TradeForm from '@/components/trades/TradeForm'
import type { TradeFormProps } from '@/components/trades/TradeForm'
import { calculateTradePnl } from '@/lib/futures'
import type { Trade } from '@/types'

export const metadata = { title: 'TradeDesk | עריכת עסקה' }

interface EditTradePageProps {
  params: Promise<{ id: string }>
}

export default async function EditTradePage({ params }: EditTradePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trade } = await supabase
    .from('trades')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!trade) notFound()

  const action: TradeFormProps['action'] = async (values) => {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const grossPnl =
      values.exit_price != null
        ? calculateTradePnl(
            values.entry_price,
            values.exit_price,
            values.quantity,
            values.direction,
            values.symbol,
            0
          ).grossPnl
        : null
    const netPnl = grossPnl != null ? grossPnl - values.fees : null
    const riskReward =
      values.stop_loss != null && values.exit_price != null
        ? Math.abs(values.exit_price - values.entry_price) /
          Math.abs(values.entry_price - values.stop_loss)
        : null

    const { error } = await supabase
      .from('trades')
      .update({
        symbol: values.symbol,
        direction: values.direction,
        entry_price: values.entry_price,
        exit_price: values.exit_price,
        quantity: values.quantity,
        entry_time: new Date(values.entry_time).toISOString(),
        exit_time: values.exit_time ? new Date(values.exit_time).toISOString() : null,
        gross_pnl: grossPnl,
        fees: values.fees,
        net_pnl: netPnl,
        stop_loss: values.stop_loss,
        take_profit: values.take_profit,
        risk_reward: riskReward,
        notes: values.notes ?? null,
        tags: values.tags,
        screenshot_urls: values.screenshot_urls,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return { error: `שגיאה בעדכון העסקה: ${error.message}` }
  }

  return (
    <TradeForm
      userId={user.id}
      accountId={trade.account_id}
      initialData={trade as Trade}
      action={action}
    />
  )
}

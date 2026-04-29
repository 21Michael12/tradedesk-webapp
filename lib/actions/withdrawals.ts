'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface RecordWithdrawalValues {
  account_id:  string
  amount:      number
  description: string | null
  created_at?: string  // ISO; defaults to now() server-side if omitted
}

export async function recordWithdrawal(values: RecordWithdrawalValues) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    return { error: 'סכום המשיכה חייב להיות חיובי' }
  }

  const { error } = await supabase.from('withdrawals').insert({
    user_id:     user.id,
    account_id:  values.account_id,
    amount:      values.amount,
    description: values.description?.trim() || null,
    ...(values.created_at ? { created_at: values.created_at } : {}),
  })

  if (error) return { error: `שגיאה ברישום המשיכה: ${error.message}` }

  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  revalidatePath('/calendar')
  revalidatePath('/journal')
}

export async function deleteWithdrawal(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { error } = await supabase
    .from('withdrawals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: `שגיאה במחיקת המשיכה: ${error.message}` }

  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  revalidatePath('/calendar')
  revalidatePath('/journal')
}

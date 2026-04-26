'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AccountType } from '@/types'

export interface AccountFormValues {
  name: string
  account_type: AccountType
  portfolio_size: number
  starting_mll: number
  prop_firm_name: string | null
}

export async function updateAccount(id: string, values: AccountFormValues) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { error } = await supabase
    .from('accounts')
    .update({
      name:           values.name,
      account_type:   values.account_type,
      portfolio_size: values.portfolio_size,
      starting_mll:   values.starting_mll,
      prop_firm_name: values.prop_firm_name,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: `שגיאה בעדכון החשבון: ${error.message}` }

  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  revalidatePath('/journal')
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: `שגיאה במחיקת החשבון: ${error.message}` }

  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  revalidatePath('/journal')
}

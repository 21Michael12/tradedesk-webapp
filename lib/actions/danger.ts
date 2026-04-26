'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'trade-screenshots'

/**
 * Wipes all trade & account data for the current user but keeps the auth row
 * and user_settings. The trades FK to accounts cascades, so deleting accounts
 * deletes trades too.
 */
export async function wipeAllTradeData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  // Best-effort cleanup of screenshot files for this user
  const { data: files } = await supabase.storage.from(BUCKET).list(user.id, { limit: 1000 })
  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`)
    await supabase.storage.from(BUCKET).remove(paths)
  }

  const { error: tradesError } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', user.id)
  if (tradesError) return { error: `שגיאה במחיקת טריידים: ${tradesError.message}` }

  const { error: accountsError } = await supabase
    .from('accounts')
    .delete()
    .eq('user_id', user.id)
  if (accountsError) return { error: `שגיאה במחיקת חשבונות: ${accountsError.message}` }

  revalidatePath('/dashboard')
  revalidatePath('/journal')
  revalidatePath('/accounts')
  revalidatePath('/calendar')
  revalidatePath('/settings')
}

/**
 * Permanently deletes the user. Trades, accounts, and user_settings cascade
 * via their `references auth.users(id) on delete cascade` FKs.
 *
 * Requires the SQL function public.delete_self() (SECURITY DEFINER) to be
 * installed; see the migration in this PR.
 */
export async function deleteMyAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { error: rpcError } = await supabase.rpc('delete_self')
  if (rpcError) return { error: `שגיאה במחיקת המשתמש: ${rpcError.message}` }

  await supabase.auth.signOut()
}

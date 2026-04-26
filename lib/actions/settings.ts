'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FuturesSymbol } from '@/types'

export interface UserSettings {
  default_symbol:     FuturesSymbol
  default_commission: number
}

export async function saveUserSettings(values: UserSettings) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id:            user.id,
        default_symbol:     values.default_symbol,
        default_commission: values.default_commission,
      },
      { onConflict: 'user_id' }
    )

  if (error) return { error: `שגיאה בשמירת ההגדרות: ${error.message}` }
  revalidatePath('/settings')
  revalidatePath('/trades/new')
}

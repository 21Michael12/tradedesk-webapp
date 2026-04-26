'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'trade-screenshots'

function pathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

export async function deleteTrade(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { data: trade } = await supabase
    .from('trades')
    .select('screenshot_urls')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const paths = ((trade?.screenshot_urls as string[] | null) ?? [])
    .map(pathFromPublicUrl)
    .filter((p): p is string => p !== null)

  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths)
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: `שגיאה במחיקת העסקה: ${error.message}` }

  revalidatePath('/dashboard')
  revalidatePath('/journal')
  revalidatePath(`/trades/${id}`)
}

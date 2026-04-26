import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings/SettingsForm'
import type { UserSettings } from '@/lib/actions/settings'
import type { FuturesSymbol } from '@/types'

export const metadata = { title: 'TradeDesk | הגדרות' }

const DEFAULT_SETTINGS: UserSettings = {
  default_symbol:     'NQ',
  default_commission: 0,
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: row } = await supabase
    .from('user_settings')
    .select('default_symbol, default_commission')
    .eq('user_id', user.id)
    .maybeSingle()

  const settings: UserSettings = row
    ? {
        default_symbol:     (row.default_symbol as FuturesSymbol) ?? 'NQ',
        default_commission: Number(row.default_commission ?? 0),
      }
    : DEFAULT_SETTINGS

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container p-4 rounded-lg border border-outline-variant">
        <div className="flex items-center gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface">הגדרות</h2>
        </div>
      </header>

      <SettingsForm initial={settings} />

      <section className="bg-surface-container rounded-lg border border-outline-variant p-5 flex flex-col gap-4">
        <header>
          <h3 className="font-title-md text-title-md text-on-surface">ייצוא נתונים</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70 mt-1">
            הורד את כל הטריידים שלך כקובץ CSV. תומך ב־Excel וב־Google Sheets.
          </p>
        </header>
        <div>
          <a
            href="/api/trades/export"
            download
            className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded-DEFAULT hover:bg-primary-fixed transition-colors"
          >
            <Download className="w-4 h-4" />
            הורד CSV
          </a>
        </div>
      </section>
    </>
  )
}

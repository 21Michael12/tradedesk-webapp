import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import AccountFormModal from '@/components/accounts/AccountFormModal'
import DeleteAccountButton from '@/components/accounts/DeleteAccountButton'
import type { AccountFormValues } from '@/components/accounts/AccountFormModal'
import { updateAccount, deleteAccount } from '@/lib/actions/accounts'
import { calculateMllStatus } from '@/lib/metrics'
import type { Account, AccountType, Trade } from '@/types'
import { formatDollar } from '@/lib/futures'

export const metadata = { title: 'TradeDesk | חשבונות' }

const TYPE_LABELS: Record<AccountType, string> = {
  EVAL:         'תיק מבחן',
  FUNDED:       'ממומן',
  LIVE_EXPRESS: 'לייב / אקספרס',
}

const TYPE_BADGE: Record<AccountType, string> = {
  EVAL:         'text-on-surface-variant border-outline-variant/60 bg-surface-variant/40',
  FUNDED:       'text-tertiary border-tertiary/40 bg-tertiary/10',
  LIVE_EXPRESS: 'text-success border-success/40 bg-success/10',
}

export default async function AccountsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawAccounts }, { data: rawTrades }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id),
  ])

  const accounts: Account[] = (rawAccounts as Account[] | null) ?? []
  const trades:   Trade[]   = (rawTrades   as Trade[]   | null) ?? []

  const createAccount = async (values: AccountFormValues) => {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: values.name,
      account_type: values.account_type,
      portfolio_size: values.portfolio_size,
      current_balance: values.portfolio_size,
      starting_mll: values.starting_mll,
      prop_firm_name: values.prop_firm_name,
      is_active: !existing,
    })

    if (error) return { error: `שגיאה ביצירת חשבון: ${error.message}` }
    revalidatePath('/accounts')
    revalidatePath('/dashboard')
  }

  const setActive = async (formData: FormData) => {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const id = String(formData.get('id') ?? '')
    if (!id) return

    await supabase.from('accounts').update({ is_active: false }).eq('user_id', user.id)
    await supabase.from('accounts').update({ is_active: true }).eq('user_id', user.id).eq('id', id)
    revalidatePath('/accounts')
    revalidatePath('/dashboard')
  }

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container p-4 rounded-lg border border-outline-variant">
        <div className="flex items-center gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface">חשבונות</h2>
          <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps border border-outline-variant">
            {accounts.length} סה״כ
          </span>
        </div>
        <AccountFormModal mode="create" action={createAccount} />
      </header>

      {accounts.length === 0 ? (
        <section className="bg-surface-container rounded-lg border border-outline-variant p-12 flex flex-col items-center justify-center gap-3 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-30">
            account_balance_wallet
          </span>
          <h3 className="font-title-md text-title-md text-on-surface">אין חשבונות עדיין</h3>
          <p className="font-body-md text-body-md text-on-surface-variant opacity-70 max-w-[28rem]">
            צור חשבון ראשון כדי להתחיל לתעד טריידים. תוכל להוסיף חשבון דמו, לייב, או חשבון מממן (Prop Firm).
          </p>
          <div className="mt-2">
            <AccountFormModal mode="create" action={createAccount} />
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const accountTrades = trades.filter((t) => t.account_id === account.id)
            const mllStatus     = calculateMllStatus(accountTrades, account.portfolio_size, account.starting_mll)
            const balance       = mllStatus.currentBalance
            const trailDistance = mllStatus.trailDistance

            const updateThis = async (values: AccountFormValues) => {
              'use server'
              return updateAccount(account.id, values)
            }

            return (
              <article
                key={account.id}
                className={`bg-surface-container rounded-lg border p-5 flex flex-col gap-4 transition-colors ${
                  mllStatus.isBlown
                    ? 'border-error/50 ring-1 ring-error/30'
                    : account.is_active
                      ? 'border-primary-container/40 ring-1 ring-primary-container/20'
                      : 'border-outline-variant'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-primary-container flex-shrink-0">
                      account_balance_wallet
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface truncate">
                      {account.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {mllStatus.isBlown ? (
                      <span className="bg-error/10 text-error border border-error/40 px-2 py-0.5 rounded font-label-caps text-[10px]">
                        נשרף
                      </span>
                    ) : account.is_active ? (
                      <span className="bg-primary-container/10 text-primary-container border border-primary-container/30 px-2 py-0.5 rounded font-label-caps text-[10px]">
                        פעיל
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] border ${TYPE_BADGE[account.account_type]}`}>
                    {TYPE_LABELS[account.account_type]}
                  </span>
                  {account.prop_firm_name && (
                    <span className="bg-surface-variant text-on-surface-variant border border-outline-variant/50 px-2 py-0.5 rounded font-label-caps text-[10px]">
                      {account.prop_firm_name}
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/50">
                  <div className="flex flex-col gap-0.5">
                    <dt className="font-label-caps text-[10px] text-on-surface-variant opacity-70">יתרה נוכחית</dt>
                    <dd className={`font-data-mono text-base ${mllStatus.isBlown ? 'text-error' : 'text-on-surface'}`}>
                      {formatDollar(balance)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="font-label-caps text-[10px] text-on-surface-variant opacity-70">Current MLL</dt>
                    <dd className="font-data-mono text-base text-on-surface-variant">
                      {formatDollar(mllStatus.currentMll)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="font-label-caps text-[10px] text-on-surface-variant opacity-70">Starting MLL</dt>
                    <dd className="font-data-mono text-base text-danger">{formatDollar(account.starting_mll)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="font-label-caps text-[10px] text-on-surface-variant opacity-70">Trail Distance</dt>
                    <dd className="font-data-mono text-base text-on-surface-variant">{formatDollar(trailDistance)}</dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant/50">
                  {!account.is_active && !mllStatus.isBlown && (
                    <form action={setActive}>
                      <input type="hidden" name="id" value={account.id} />
                      <button
                        type="submit"
                        className="w-full text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high border border-outline-variant rounded-DEFAULT py-2 font-label-caps text-label-caps transition-colors"
                      >
                        הגדר כפעיל
                      </button>
                    </form>
                  )}
                  <div className="flex gap-2">
                    <AccountFormModal mode="edit" initialAccount={account} action={updateThis} />
                    <DeleteAccountButton
                      accountId={account.id}
                      accountName={account.name}
                      action={deleteAccount}
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </>
  )
}

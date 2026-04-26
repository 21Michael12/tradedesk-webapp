export const metadata = { title: 'TradeDesk | חשבונות' }

export default function AccountsPage() {
  return (
    <section className="bg-surface-container rounded-lg border border-outline-variant p-8 flex flex-col items-center justify-center gap-3 text-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40">
        account_balance_wallet
      </span>
      <h2 className="font-headline-md text-headline-md text-on-surface">חשבונות</h2>
      <p className="font-body-md text-body-md text-on-surface-variant opacity-70">
        ניהול חשבונות יתווסף בקרוב
      </p>
    </section>
  )
}

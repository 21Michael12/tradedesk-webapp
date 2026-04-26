export const metadata = { title: 'TradeDesk | הגדרות' }

export default function SettingsPage() {
  return (
    <section className="bg-surface-container rounded-lg border border-outline-variant p-8 flex flex-col items-center justify-center gap-3 text-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40">
        settings
      </span>
      <h2 className="font-headline-md text-headline-md text-on-surface">הגדרות</h2>
      <p className="font-body-md text-body-md text-on-surface-variant opacity-70">
        מסך ההגדרות יתווסף בקרוב
      </p>
    </section>
  )
}

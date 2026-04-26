export const metadata = { title: 'TradeDesk | לוח שנה' }

export default function CalendarPage() {
  return (
    <section className="bg-surface-container rounded-lg border border-outline-variant p-8 flex flex-col items-center justify-center gap-3 text-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40">
        calendar_month
      </span>
      <h2 className="font-headline-md text-headline-md text-on-surface">לוח שנה</h2>
      <p className="font-body-md text-body-md text-on-surface-variant opacity-70">
        תצוגת לוח שנה מלאה תתווסף בקרוב
      </p>
    </section>
  )
}

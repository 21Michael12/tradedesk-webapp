export const metadata = { title: 'TradeDesk | עזרה' }

export default function HelpPage() {
  return (
    <section className="bg-surface-container rounded-lg border border-outline-variant p-8 flex flex-col items-center justify-center gap-3 text-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40">
        help
      </span>
      <h2 className="font-headline-md text-headline-md text-on-surface">עזרה</h2>
      <p className="font-body-md text-body-md text-on-surface-variant opacity-70">
        מרכז העזרה והתיעוד יתווסף בקרוב
      </p>
    </section>
  )
}

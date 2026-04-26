import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

export const metadata = {
  title: 'TradeDesk | התחברות',
}

export default function LoginPage() {
  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex items-center justify-center relative overflow-hidden geometric-bg">
      {/* Background grid overlay */}
      <div className="absolute inset-0 grid-overlay z-0 pointer-events-none" />

      <main className="relative z-10 w-full max-w-[28rem] px-lg">
        {/* Branding */}
        <div className="text-center mb-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-surface-container-high border border-outline-variant mb-md shadow-lg shadow-black/20">
            <span
              className="material-symbols-outlined text-primary-container text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              show_chart
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-primary-container tracking-tight mb-xs">
            TradeDesk
          </h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
            AbraTech IL
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container border border-surface-variant rounded-xl p-xl shadow-2xl relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />

          <div className="text-center mb-xl">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
              ברוכים הבאים ליומן המסחר המקצועי שלך
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              דיוק במסחר, צמיחה בהון
            </p>
          </div>

          <GoogleSignInButton />

          <div className="mt-lg text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant/70">
              על ידי התחברות, אתה מסכים ל
              <a
                href="#"
                className="text-primary hover:text-primary-container underline underline-offset-2"
              >
                תנאי השימוש
              </a>{' '}
              שלנו.
            </p>
          </div>
        </div>
      </main>

    </div>
  )
}

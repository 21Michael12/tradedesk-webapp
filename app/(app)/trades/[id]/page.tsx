import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DeleteModal from '@/components/trades/DeleteModal'
import { deleteUploadedImage } from '@/lib/imageCompression'
import { formatPnl, formatDollar, getInstrumentInfo } from '@/lib/futures'
import type { Trade } from '@/types'

export const metadata = { title: 'TradeDesk | פרטי עסקה' }

interface TradeDetailPageProps {
  params: Promise<{ id: string }>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTradeDate(iso: string): string {
  const d = new Date(iso)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatTradeTime(iso: string): string {
  const d   = new Date(iso)
  const hh  = String(d.getHours()).padStart(2, '0')
  const mm  = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function tradeDuration(entryIso: string, exitIso: string | null): string {
  if (!exitIso) return '—'
  const ms = new Date(exitIso).getTime() - new Date(entryIso).getTime()
  if (ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h        = Math.floor(totalSec / 3600)
  const m        = Math.floor((totalSec % 3600) / 60)
  const s        = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatRR(rr: number | null): string {
  if (rr === null) return '—'
  return `1:${rr.toFixed(1)}`
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n)
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function TradeDetailPage({ params }: TradeDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('trades')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!data) notFound()

  const trade = data as Trade
  const instrument = getInstrumentInfo(trade.symbol)
  const netPnl     = trade.net_pnl ?? 0
  const isWin      = netPnl >= 0

  // ── Delete server action ─────────────────────────────────────────────────
  const deleteAction = async () => {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Remove screenshots from Storage
    const urls: string[] = (trade.screenshot_urls ?? [])
    await Promise.allSettled(urls.map((url) => deleteUploadedImage(url)))

    await supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    redirect('/dashboard')
  }

  return (
    <>
      {/* ── Sticky sub-header ── */}
      <header className="flex items-center justify-between px-margin py-md border-b border-surface-variant bg-surface-container-lowest sticky top-0 z-50">
        <div className="flex items-center gap-md">
          <Link
            href="/dashboard"
            className="p-sm hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center text-on-surface-variant hover:text-primary"
            aria-label="חזרה ללוח הבקרה"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
          </Link>
          <h1 className="font-title-sm text-title-sm text-on-surface">חזרה ליומן</h1>
        </div>
        <div className="flex items-center gap-sm">
          <Link
            href={`/trades/${trade.id}/edit`}
            className="px-md py-sm rounded border border-surface-variant text-on-surface-variant hover:bg-surface-variant transition-colors flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span className="font-label-caps text-label-caps uppercase">ערוך</span>
          </Link>
          <DeleteModal action={deleteAction} />
        </div>
      </header>

      {/* ── Main canvas ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-margin py-xl flex flex-col gap-xl">

        {/* Hero / Summary */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-lg border-b border-surface-variant pb-xl">
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-md flex-wrap">
              <h2 className="font-display-lg text-display-lg text-on-surface tracking-tighter">
                {trade.symbol}
              </h2>
              <span
                className={`px-sm py-xs rounded font-label-caps text-label-caps tracking-wider border ${
                  trade.direction === 'long'
                    ? 'bg-success/20 text-success border-success/30'
                    : 'bg-danger/20 text-danger border-danger/30'
                }`}
              >
                {trade.direction === 'long' ? 'LONG' : 'SHORT'}
              </span>
              <span className="px-sm py-xs rounded bg-surface-variant text-on-surface-variant font-label-caps text-label-caps tracking-wider">
                {formatTradeDate(trade.entry_time)}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {instrument.name} • {instrument.exchange}
            </p>
            <div className="flex flex-wrap gap-2 mt-xs">
              {trade.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-caps text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-xs">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              רווח נקי
            </span>
            <div
              className="font-display-lg text-display-lg font-data-mono tracking-tighter"
              style={{ color: isWin ? '#34d399' : '#ef4444' }}
            >
              {formatPnl(netPnl)}
            </div>
            {trade.gross_pnl !== null && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                גולמי: {formatPnl(trade.gross_pnl)} • עמלות: {formatDollar(trade.fees)}
              </span>
            )}
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-md">
          {[
            { label: 'מחיר כניסה',       value: formatPrice(trade.entry_price) },
            { label: 'מחיר יציאה',        value: trade.exit_price ? formatPrice(trade.exit_price) : '—' },
            { label: 'כמות (חוזים)',      value: String(trade.quantity) },
            { label: 'יחס סיכוי/סיכון',  value: formatRR(trade.risk_reward) },
            { label: 'משך זמן',           value: tradeDuration(trade.entry_time, trade.exit_time) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-surface-container rounded-lg p-md border border-surface-variant flex flex-col gap-sm"
            >
              <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
              <span className="font-data-mono text-data-mono text-title-sm text-on-surface">{value}</span>
            </div>
          ))}
        </section>

        {/* Entry / Exit times row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-md -mt-md">
          <div className="bg-surface-container rounded-lg p-md border border-surface-variant flex flex-col gap-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant">שעת כניסה</span>
            <span className="font-data-mono text-data-mono text-on-surface">
              {formatTradeTime(trade.entry_time)}
            </span>
          </div>
          <div className="bg-surface-container rounded-lg p-md border border-surface-variant flex flex-col gap-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant">שעת יציאה</span>
            <span className="font-data-mono text-data-mono text-on-surface">
              {trade.exit_time ? formatTradeTime(trade.exit_time) : '—'}
            </span>
          </div>
          {trade.stop_loss !== null && (
            <div className="bg-surface-container rounded-lg p-md border border-surface-variant flex flex-col gap-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant">סטופ לוס</span>
              <span className="font-data-mono text-data-mono text-on-surface">
                {formatPrice(trade.stop_loss)}
              </span>
            </div>
          )}
          {trade.take_profit !== null && (
            <div className="bg-surface-container rounded-lg p-md border border-surface-variant flex flex-col gap-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant">טייק פרופיט</span>
              <span className="font-data-mono text-data-mono text-on-surface">
                {formatPrice(trade.take_profit)}
              </span>
            </div>
          )}
        </section>

        {/* Notes */}
        {trade.notes && (
          <section className="bg-surface-container rounded-xl p-lg border border-surface-variant flex flex-col gap-md">
            <div className="flex items-center gap-sm border-b border-surface-variant/50 pb-sm">
              <span className="material-symbols-outlined text-primary">notes</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">ניתוח עסקה</h3>
            </div>
            <div className="font-body-md text-body-md text-on-surface-variant leading-relaxed max-w-4xl whitespace-pre-wrap">
              {trade.notes}
            </div>
          </section>
        )}

        {/* Screenshot Gallery */}
        {trade.screenshot_urls.length > 0 && (
          <section className="flex flex-col gap-md">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-on-surface-variant">image</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">צילומי מסך</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {trade.screenshot_urls.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-lg overflow-hidden border border-surface-variant bg-surface-container-highest aspect-[16/9] block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`צילום מסך ${i + 1}`}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-md">
                    <span className="font-label-caps text-label-caps text-on-surface">
                      תמונה {i + 1}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}

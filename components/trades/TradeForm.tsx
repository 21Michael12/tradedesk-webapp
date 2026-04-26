'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { z } from 'zod'
import { tradeSchema } from '@/lib/validations/trade'
import { calculateTradePnl, getMultiplier, formatPnl } from '@/lib/futures'
import { compressAndUploadImage, deleteUploadedImage } from '@/lib/imageCompression'
import type { Trade } from '@/types'

type FormValues = z.input<typeof tradeSchema>
type FormOutput = z.output<typeof tradeSchema>

export interface TradeFormProps {
  userId: string
  accountId: string
  initialData?: Trade
  action: (values: FormOutput) => Promise<{ error?: string } | void>
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function inputCls(hasError = false) {
  return [
    'bg-surface border rounded-lg px-md py-sm text-on-surface font-data-mono text-data-mono',
    'focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors w-full h-11',
    hasError ? 'border-error' : 'border-outline-variant',
  ].join(' ')
}

function nullableNumber(v: unknown) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export default function TradeForm({ userId, accountId, initialData, action }: TradeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const tradeIdRef = useRef(initialData?.id ?? crypto.randomUUID())
  const isEdit = Boolean(initialData)

  const defaultValues: FormValues = initialData
    ? {
        symbol: initialData.symbol,
        direction: initialData.direction,
        entry_price: initialData.entry_price,
        exit_price: initialData.exit_price ?? null,
        quantity: initialData.quantity,
        entry_time: toDatetimeLocal(initialData.entry_time),
        exit_time: toDatetimeLocal(initialData.exit_time),
        stop_loss: initialData.stop_loss ?? null,
        take_profit: initialData.take_profit ?? null,
        fees: initialData.fees,
        notes: initialData.notes ?? '',
        tags: initialData.tags ?? [],
        screenshot_urls: initialData.screenshot_urls ?? [],
        account_id: initialData.account_id,
      }
    : {
        symbol: '',
        direction: 'long' as const,
        entry_price: '' as unknown as number,
        exit_price: null,
        quantity: 1,
        entry_time: '',
        exit_time: null,
        stop_loss: null,
        take_profit: null,
        fees: 0,
        notes: '',
        tags: [],
        screenshot_urls: [],
        account_id: accountId,
      }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(tradeSchema), defaultValues })

  // Live P&L
  const watchedSymbol = useWatch({ control, name: 'symbol' }) ?? ''
  const watchedEntry  = useWatch({ control, name: 'entry_price' })
  const watchedExit   = useWatch({ control, name: 'exit_price' })
  const watchedQty    = useWatch({ control, name: 'quantity' })
  const watchedDir    = useWatch({ control, name: 'direction' }) ?? 'long'
  const watchedFees   = useWatch({ control, name: 'fees' }) ?? 0
  const watchedTags   = useWatch({ control, name: 'tags' }) ?? []
  const watchedUrls   = useWatch({ control, name: 'screenshot_urls' }) ?? []

  const multiplier = getMultiplier(watchedSymbol)
  const pnlResult =
    watchedSymbol && watchedEntry && watchedExit && watchedQty
      ? calculateTradePnl(
          Number(watchedEntry),
          Number(watchedExit),
          Number(watchedQty),
          watchedDir,
          watchedSymbol,
          Number(watchedFees)
        )
      : null

  // Tags
  const addTag = useCallback(() => {
    const tag = tagInput.trim()
    if (!tag) return
    const current = getValues('tags') ?? []
    if (!current.includes(tag)) setValue('tags', [...current, tag])
    setTagInput('')
  }, [tagInput, getValues, setValue])

  const removeTag = useCallback(
    (tag: string) => setValue('tags', (getValues('tags') ?? []).filter((t) => t !== tag)),
    [getValues, setValue]
  )

  // Screenshots
  const uploadFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith('image/'))
      if (!imgs.length) return
      setUploadingCount((c) => c + imgs.length)
      const settled = await Promise.allSettled(
        imgs.map((f) => compressAndUploadImage(f, userId, tradeIdRef.current))
      )
      setUploadingCount((c) => c - imgs.length)
      const newUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
      setValue('screenshot_urls', [...(getValues('screenshot_urls') ?? []), ...newUrls])
    },
    [userId, getValues, setValue]
  )

  const removeScreenshot = useCallback(
    async (url: string) => {
      setValue('screenshot_urls', (getValues('screenshot_urls') ?? []).filter((u) => u !== url))
      await deleteUploadedImage(url)
    },
    [getValues, setValue]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      uploadFiles(Array.from(e.dataTransfer.files))
    },
    [uploadFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) uploadFiles(Array.from(e.target.files))
      e.target.value = ''
    },
    [uploadFiles]
  )

  const onSubmit = (data: FormValues) => {
    setSubmitError(null)
    startTransition(async () => {
      const result = await action(data as FormOutput)
      if (result?.error) {
        setSubmitError(result.error)
      } else {
        setSubmitSuccess(true)
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    })
  }

  return (
    <>
      {/* Success Toast */}
      {submitSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900 border border-emerald-500/30 text-slate-100 px-6 py-3 rounded-full shadow-2xl animate-bounce-short">
          <span
            className="material-symbols-outlined text-emerald-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <span className="font-body-md">
            {isEdit ? 'השינויים נשמרו בהצלחה' : 'העסקה נשמרה בהצלחה'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Page Header ── */}
        <div className="px-margin py-lg border-b border-surface-container-highest bg-surface-dim">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {isEdit ? 'עריכת עסקה' : 'רישום עסקה חדשה'}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                {isEdit
                  ? 'ערוך ועדכן את פרטי העסקה שבוצעה.'
                  : 'הזן פרטים מדויקים לתיעוד איכותי של המסחר.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-outline text-on-surface rounded font-body-sm text-body-sm hover:bg-surface-container transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isPending || uploadingCount > 0}
                className="px-4 py-2 bg-primary-container text-on-primary-container rounded font-body-sm text-body-sm font-medium hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {isPending && (
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                )}
                {isEdit ? 'שמור שינויים' : 'שמור עסקה'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {submitError && (
          <div className="max-w-5xl mx-auto px-margin pt-md">
            <div className="flex items-center gap-3 bg-error-container text-on-error-container px-6 py-4 rounded-xl border border-error/20">
              <span className="material-symbols-outlined text-error">error</span>
              <span className="font-body-md">{submitError}</span>
            </div>
          </div>
        )}

        {/* ── Form Body ── */}
        <div className="max-w-5xl mx-auto px-margin py-xl">
          <input type="hidden" {...register('account_id')} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* ── Main column (8 cols) ── */}
            <div className="lg:col-span-8 space-y-gutter">

              {/* Basic Details */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-primary-container" />
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md">פרטי עסקה בסיסיים</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">

                  {/* Symbol */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      נכס (סימול)
                    </label>
                    <div className="relative">
                      <input
                        {...register('symbol')}
                        className={`${inputCls(!!errors.symbol)} uppercase`}
                        placeholder="NQ, ES, YM, GC..."
                        autoComplete="off"
                      />
                      {watchedSymbol && multiplier > 1 && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 bg-surface-variant text-primary-container font-label-caps text-[10px] px-1.5 py-0.5 rounded border border-primary-container/30 pointer-events-none">
                          x{multiplier}
                        </span>
                      )}
                    </div>
                    {errors.symbol && (
                      <p className="text-error text-xs mt-1">{errors.symbol.message}</p>
                    )}
                  </div>

                  {/* Entry time */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      תאריך ושעת כניסה
                    </label>
                    <input
                      {...register('entry_time')}
                      type="datetime-local"
                      className={`${inputCls(!!errors.entry_time)} [color-scheme:dark]`}
                    />
                    {errors.entry_time && (
                      <p className="text-error text-xs mt-1">{errors.entry_time.message}</p>
                    )}
                  </div>

                  {/* Exit time */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      תאריך ושעת יציאה
                    </label>
                    <input
                      {...register('exit_time')}
                      type="datetime-local"
                      className={`${inputCls(!!errors.exit_time)} [color-scheme:dark]`}
                    />
                    {errors.exit_time && (
                      <p className="text-error text-xs mt-1">{errors.exit_time.message}</p>
                    )}
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      כיוון עסקה
                    </label>
                    <Controller
                      control={control}
                      name="direction"
                      render={({ field }) => (
                        <div className="flex w-full bg-surface border border-outline-variant rounded-lg p-1 h-11">
                          {(['long', 'short'] as const).map((dir) => (
                            <label key={dir} className="flex-1 cursor-pointer">
                              <input
                                type="radio"
                                className="peer sr-only"
                                value={dir}
                                checked={field.value === dir}
                                onChange={() => field.onChange(dir)}
                              />
                              <div
                                className={[
                                  'h-full flex items-center justify-center gap-1 rounded-md transition-all font-label-caps text-label-caps',
                                  dir === 'long'
                                    ? 'text-on-surface-variant peer-checked:bg-[rgba(16,185,129,0.1)] peer-checked:text-success'
                                    : 'text-on-surface-variant peer-checked:bg-[rgba(239,68,68,0.1)] peer-checked:text-danger',
                                ].join(' ')}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {dir === 'long' ? 'trending_up' : 'trending_down'}
                                </span>
                                {dir === 'long' ? 'לונג (Long)' : 'שורט (Short)'}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Prices & Quantities */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-tertiary-container" />
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md">מחירים וכמויות</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">

                  {/* Entry price */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      מחיר כניסה
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
                      <input
                        {...register('entry_price', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        dir="ltr"
                        placeholder="0.00"
                        className={`${inputCls(!!errors.entry_price)} pl-8`}
                      />
                    </div>
                    {errors.entry_price && (
                      <p className="text-error text-xs mt-1">{errors.entry_price.message}</p>
                    )}
                  </div>

                  {/* Exit price */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      מחיר יציאה
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
                      <input
                        {...register('exit_price', { setValueAs: nullableNumber })}
                        type="number"
                        step="0.01"
                        dir="ltr"
                        placeholder="0.00"
                        className={`${inputCls(!!errors.exit_price)} pl-8`}
                      />
                    </div>
                    {errors.exit_price && (
                      <p className="text-error text-xs mt-1">{errors.exit_price.message}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      כמות (חוזים)
                    </label>
                    <input
                      {...register('quantity', { valueAsNumber: true })}
                      type="number"
                      step="1"
                      min="1"
                      dir="ltr"
                      placeholder="1"
                      className={inputCls(!!errors.quantity)}
                    />
                    {errors.quantity && (
                      <p className="text-error text-xs mt-1">{errors.quantity.message}</p>
                    )}
                  </div>

                  {/* Stop loss */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      סטופ לוס (אופציונלי)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
                      <input
                        {...register('stop_loss', { setValueAs: nullableNumber })}
                        type="number"
                        step="0.01"
                        dir="ltr"
                        placeholder="0.00"
                        className={`${inputCls()} pl-8`}
                      />
                    </div>
                  </div>

                  {/* Take profit */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      טייק פרופיט (אופציונלי)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
                      <input
                        {...register('take_profit', { setValueAs: nullableNumber })}
                        type="number"
                        step="0.01"
                        dir="ltr"
                        placeholder="0.00"
                        className={`${inputCls()} pl-8`}
                      />
                    </div>
                  </div>

                  {/* Fees */}
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      עמלות ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
                      <input
                        {...register('fees', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        dir="ltr"
                        placeholder="0.00"
                        className={`${inputCls(!!errors.fees)} pl-8`}
                      />
                    </div>
                    {errors.fees && (
                      <p className="text-error text-xs mt-1">{errors.fees.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md">
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">edit_note</span>
                  הערות מפורטות
                </h3>
                <textarea
                  {...register('notes')}
                  rows={6}
                  placeholder="תעד את המחשבות שלך: למה נכנסת? מה היה מצב השוק? האם עמדת בתוכנית?"
                  className="w-full bg-surface border border-outline-variant rounded-lg px-md py-md text-on-surface font-body-sm text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors resize-y"
                />
              </div>
            </div>

            {/* ── Sidebar (4 cols) ── */}
            <div className="lg:col-span-4 space-y-gutter">

              {/* Live P&L Preview */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md">
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">calculate</span>
                  תצוגה מקדימה
                </h3>
                {pnlResult ? (
                  <div className="space-y-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">רווח גולמי</span>
                      <span
                        className={`font-data-mono text-sm font-semibold ${pnlResult.grossPnl >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {formatPnl(pnlResult.grossPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">רווח נקי</span>
                      <span
                        className={`font-data-mono text-sm font-bold ${pnlResult.netPnl >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {formatPnl(pnlResult.netPnl)}
                      </span>
                    </div>
                    <div className="border-t border-outline-variant/30 pt-sm flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">נקודות</span>
                      <span className="font-data-mono text-on-surface">
                        {pnlResult.points > 0 ? '+' : ''}
                        {pnlResult.points.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">מכפיל</span>
                      <span className="font-data-mono text-primary-container">×{pnlResult.multiplier}</span>
                    </div>
                  </div>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant opacity-50 text-center py-4">
                    הזן סימול ומחירים לחישוב
                  </p>
                )}
              </div>

              {/* Tags */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md">
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">label</span>
                  תגיות וסיווג
                </h3>
                <div className="flex flex-wrap gap-2 mb-md min-h-8">
                  {watchedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary-container text-on-secondary-container font-label-caps text-[10px]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="הוסף תגית..."
                    className="w-full bg-surface border border-outline-variant rounded-lg px-md py-sm text-on-surface font-body-sm text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors pl-8"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>

              {/* Screenshots */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md">
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">image</span>
                  צילומי מסך
                </h3>

                {/* Drop zone */}
                <label
                  className={[
                    'flex flex-col items-center gap-2 border-2 border-dashed rounded-lg p-6 text-center bg-surface-dim cursor-pointer mb-md transition-colors',
                    isDragging
                      ? 'border-primary-container bg-primary-container/5'
                      : 'border-outline-variant hover:border-primary-container/60',
                  ].join(' ')}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <span className="material-symbols-outlined text-4xl text-outline">cloud_upload</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    גרור תמונות לכאן או{' '}
                    <span className="text-primary-container hover:underline">לחץ להעלאה</span>
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleFileInput}
                  />
                </label>

                {uploadingCount > 0 && (
                  <p className="text-on-surface-variant font-body-sm text-body-sm text-center mb-md flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    מעלה {uploadingCount} תמונות...
                  </p>
                )}

                <div className="space-y-3">
                  {watchedUrls.map((url) => (
                    <div
                      key={url}
                      className="relative group rounded overflow-hidden border border-surface-container-highest"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="צילום מסך של עסקה"
                        className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 bg-surface-container rounded hover:bg-surface-bright text-on-surface"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => removeScreenshot(url)}
                          className="p-1 bg-error-container rounded hover:bg-error/80 text-on-error-container"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}

'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { tradeSchema, type TradeFormValues } from '@/lib/validations/trade'
import { calculateTradePnl, getMultiplier, formatPnl } from '@/lib/futures'
import { compressAndUploadImage, deleteUploadedImage } from '@/lib/imageCompression'
import { DateField, TimeField } from '@/components/forms/MaskedInputs'
import { SUPPORTED_SYMBOLS } from '@/types'
import type { Trade, FuturesSymbol, TradeType } from '@/types'

export interface TradeActionPayload {
  trade_type:      TradeType
  symbol:          FuturesSymbol
  direction:       'long' | 'short'
  entry_points:    number
  exit_points:     number | null
  quantity:        number
  entry_time:      string  // YYYY-MM-DDTHH:mm
  exit_time:       string | null
  stop_loss:       number | null
  take_profit:     number | null
  fees:            number
  notes:           string | null
  tags:            string[]
  screenshot_urls: string[]
  account_id:      string
}

export interface TradeFormProps {
  userId: string
  accountId: string
  initialData?: Trade
  action: (values: TradeActionPayload) => Promise<{ error?: string } | void>
}

function splitIso(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
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

  const entrySplit = splitIso(initialData?.entry_time)
  const exitSplit  = splitIso(initialData?.exit_time)

  const defaultValues: TradeFormValues = initialData
    ? {
        trade_type:        initialData.trade_type ?? 'daytrade',
        symbol:            initialData.symbol,
        direction:         initialData.direction,
        entry_points:      initialData.entry_price,
        exit_points:       initialData.exit_price ?? null,
        quantity:          initialData.quantity,
        entry_date:        entrySplit.date,
        entry_time_of_day: entrySplit.time,
        exit_date:         exitSplit.date || null,
        exit_time_of_day:  exitSplit.time || null,
        stop_loss:         initialData.stop_loss ?? null,
        take_profit:       initialData.take_profit ?? null,
        fees:              initialData.fees,
        notes:             initialData.notes ?? '',
        tags:              initialData.tags ?? [],
        screenshot_urls:   initialData.screenshot_urls ?? [],
        account_id:        initialData.account_id,
      }
    : {
        trade_type:        'daytrade',
        symbol:            'NQ',
        direction:         'long',
        entry_points:      '' as unknown as number,
        exit_points:       null,
        quantity:          1,
        entry_date:        '',
        entry_time_of_day: '',
        exit_date:         null,
        exit_time_of_day:  null,
        stop_loss:         null,
        take_profit:       null,
        fees:              0,
        notes:             '',
        tags:              [],
        screenshot_urls:   [],
        account_id:        accountId,
      }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TradeFormValues>({ resolver: zodResolver(tradeSchema), defaultValues })

  const tradeType   = useWatch({ control, name: 'trade_type' })   ?? 'daytrade'
  const watchedSymbol = useWatch({ control, name: 'symbol' })     ?? 'NQ'
  const watchedEntry  = useWatch({ control, name: 'entry_points' })
  const watchedExit   = useWatch({ control, name: 'exit_points' })
  const watchedQty    = useWatch({ control, name: 'quantity' })
  const watchedDir    = useWatch({ control, name: 'direction' })  ?? 'long'
  const watchedFees   = useWatch({ control, name: 'fees' })       ?? 0
  const watchedTags   = useWatch({ control, name: 'tags' })       ?? []
  const watchedUrls   = useWatch({ control, name: 'screenshot_urls' }) ?? []

  const multiplier = getMultiplier(watchedSymbol as string)

  const pnlResult =
    watchedSymbol && watchedEntry && watchedExit && watchedQty
      ? calculateTradePnl(
          Number(watchedEntry),
          Number(watchedExit),
          Number(watchedQty),
          watchedDir,
          watchedSymbol as string,
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

  const onSubmit = (data: TradeFormValues) => {
    setSubmitError(null)

    const exitDate = data.trade_type === 'swing' ? data.exit_date : data.entry_date
    const entryTime = `${data.entry_date}T${data.entry_time_of_day}`
    const exitTime  = data.exit_time_of_day && exitDate
      ? `${exitDate}T${data.exit_time_of_day}`
      : null

    const payload: TradeActionPayload = {
      trade_type:      data.trade_type,
      symbol:          data.symbol as FuturesSymbol,
      direction:       data.direction,
      entry_points:    data.entry_points,
      exit_points:     data.exit_points ?? null,
      quantity:        data.quantity,
      entry_time:      entryTime,
      exit_time:       exitTime,
      stop_loss:       data.stop_loss ?? null,
      take_profit:     data.take_profit ?? null,
      fees:            data.fees,
      notes:           data.notes ?? null,
      tags:            data.tags ?? [],
      screenshot_urls: data.screenshot_urls ?? [],
      account_id:      data.account_id,
    }

    startTransition(async () => {
      const result = await action(payload)
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
      {submitSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900 border border-emerald-500/30 text-slate-100 px-6 py-3 rounded-full shadow-2xl animate-bounce-short">
          <span className="material-symbols-outlined text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <span className="font-body-md">
            {isEdit ? 'השינויים נשמרו בהצלחה' : 'העסקה נשמרה בהצלחה'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-margin py-lg border-b border-surface-container-highest bg-surface-dim">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {isEdit ? 'עריכת עסקה' : 'רישום עסקה חדשה'}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                {isEdit ? 'ערוך ועדכן את פרטי העסקה שבוצעה.' : 'הזן פרטים מדויקים לתיעוד איכותי של המסחר.'}
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
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                )}
                {isEdit ? 'שמור שינויים' : 'שמור עסקה'}
              </button>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="max-w-5xl mx-auto px-margin pt-md">
            <div className="flex items-center gap-3 bg-error-container text-on-error-container px-6 py-4 rounded-xl border border-error/20">
              <span className="material-symbols-outlined text-error">error</span>
              <span className="font-body-md">{submitError}</span>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-margin py-xl">
          <input type="hidden" {...register('account_id')} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-8 space-y-gutter">

              {/* Trade type toggle */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-secondary-container" />
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md">סוג עסקה</h3>
                <Controller
                  control={control}
                  name="trade_type"
                  render={({ field }) => (
                    <div className="flex w-full bg-surface border border-outline-variant rounded-lg p-1 h-11">
                      {([
                        { value: 'daytrade', label: 'Daytrade — עסקת יום',  icon: 'today' },
                        { value: 'swing',    label: 'Swing — עסקת סווינג', icon: 'date_range' },
                      ] as const).map((opt) => (
                        <label key={opt.value} className="flex-1 cursor-pointer">
                          <input
                            type="radio"
                            className="peer sr-only"
                            value={opt.value}
                            checked={field.value === opt.value}
                            onChange={() => field.onChange(opt.value)}
                          />
                          <div className="h-full flex items-center justify-center gap-1 rounded-md transition-all font-label-caps text-label-caps text-on-surface-variant peer-checked:bg-primary-container/15 peer-checked:text-primary-container">
                            <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                            {opt.label}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Basic Details */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-primary-container" />
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md">פרטי עסקה בסיסיים</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">

                  {/* Symbol — segmented buttons */}
                  <div className="sm:col-span-2">
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      נכס (Asset)
                    </label>
                    <Controller
                      control={control}
                      name="symbol"
                      render={({ field }) => (
                        <div className="grid grid-cols-4 gap-2">
                          {SUPPORTED_SYMBOLS.map((sym) => {
                            const mult = getMultiplier(sym)
                            const active = field.value === sym
                            return (
                              <label key={sym} className="cursor-pointer">
                                <input
                                  type="radio"
                                  className="peer sr-only"
                                  value={sym}
                                  checked={active}
                                  onChange={() => field.onChange(sym)}
                                />
                                <div
                                  className={[
                                    'h-16 rounded-lg border flex flex-col items-center justify-center transition-all',
                                    active
                                      ? 'bg-primary-container/15 border-primary-container text-primary-container'
                                      : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary-container/40',
                                  ].join(' ')}
                                >
                                  <span className="font-data-mono font-semibold text-base">{sym}</span>
                                  <span className="font-label-caps text-[10px] opacity-70">×${mult}</span>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    />
                    {errors.symbol && (
                      <p className="text-error text-xs mt-1">{errors.symbol.message}</p>
                    )}
                  </div>

                  {/* Direction */}
                  <div className="sm:col-span-2">
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

              {/* Date & Time block — adapts to trade_type */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-tertiary-container" />
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">schedule</span>
                  תאריך ושעה
                </h3>

                {tradeType === 'daytrade' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                    <div>
                      <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                        תאריך (DD/MM/YYYY)
                      </label>
                      <Controller
                        control={control}
                        name="entry_date"
                        render={({ field }) => (
                          <DateField
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            className={inputCls(!!errors.entry_date)}
                          />
                        )}
                      />
                      {errors.entry_date && (
                        <p className="text-error text-xs mt-1">{errors.entry_date.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                        שעת כניסה (24h)
                      </label>
                      <Controller
                        control={control}
                        name="entry_time_of_day"
                        render={({ field }) => (
                          <TimeField
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            className={inputCls(!!errors.entry_time_of_day)}
                          />
                        )}
                      />
                      {errors.entry_time_of_day && (
                        <p className="text-error text-xs mt-1">{errors.entry_time_of_day.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                        שעת יציאה (24h)
                      </label>
                      <Controller
                        control={control}
                        name="exit_time_of_day"
                        render={({ field }) => (
                          <TimeField
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            className={inputCls(!!errors.exit_time_of_day)}
                          />
                        )}
                      />
                      {errors.exit_time_of_day && (
                        <p className="text-error text-xs mt-1">{errors.exit_time_of_day.message}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    <div className="flex flex-col gap-md p-md bg-surface rounded-lg border border-outline-variant/40">
                      <p className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">login</span>
                        כניסה
                      </p>
                      <div>
                        <label className="block font-label-caps text-[10px] text-on-surface-variant opacity-70 mb-1">
                          תאריך (DD/MM/YYYY)
                        </label>
                        <Controller
                          control={control}
                          name="entry_date"
                          render={({ field }) => (
                            <DateField
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              className={inputCls(!!errors.entry_date)}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="block font-label-caps text-[10px] text-on-surface-variant opacity-70 mb-1">
                          שעה (24h)
                        </label>
                        <Controller
                          control={control}
                          name="entry_time_of_day"
                          render={({ field }) => (
                            <TimeField
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              className={inputCls(!!errors.entry_time_of_day)}
                            />
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-md p-md bg-surface rounded-lg border border-outline-variant/40">
                      <p className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">logout</span>
                        יציאה
                      </p>
                      <div>
                        <label className="block font-label-caps text-[10px] text-on-surface-variant opacity-70 mb-1">
                          תאריך (DD/MM/YYYY)
                        </label>
                        <Controller
                          control={control}
                          name="exit_date"
                          render={({ field }) => (
                            <DateField
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              className={inputCls(!!errors.exit_date)}
                            />
                          )}
                        />
                        {errors.exit_date && (
                          <p className="text-error text-xs mt-1">{errors.exit_date.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block font-label-caps text-[10px] text-on-surface-variant opacity-70 mb-1">
                          שעה (24h)
                        </label>
                        <Controller
                          control={control}
                          name="exit_time_of_day"
                          render={({ field }) => (
                            <TimeField
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              className={inputCls(!!errors.exit_time_of_day)}
                            />
                          )}
                        />
                        {errors.exit_time_of_day && (
                          <p className="text-error text-xs mt-1">{errors.exit_time_of_day.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Points & Quantities */}
              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-tertiary-container" />
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md">נקודות וחוזים</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">

                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      Entry Points
                    </label>
                    <input
                      {...register('entry_points', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      dir="ltr"
                      placeholder="27000.00"
                      className={inputCls(!!errors.entry_points)}
                    />
                    {errors.entry_points && (
                      <p className="text-error text-xs mt-1">{errors.entry_points.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      Exit Points
                    </label>
                    <input
                      {...register('exit_points', { setValueAs: nullableNumber })}
                      type="number"
                      step="0.01"
                      dir="ltr"
                      placeholder="27050.00"
                      className={inputCls(!!errors.exit_points)}
                    />
                    {errors.exit_points && (
                      <p className="text-error text-xs mt-1">{errors.exit_points.message}</p>
                    )}
                  </div>

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

                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      סטופ לוס (Points, אופציונלי)
                    </label>
                    <input
                      {...register('stop_loss', { setValueAs: nullableNumber })}
                      type="number"
                      step="0.01"
                      dir="ltr"
                      placeholder="26980.00"
                      className={inputCls()}
                    />
                  </div>

                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-sm">
                      טייק פרופיט (Points, אופציונלי)
                    </label>
                    <input
                      {...register('take_profit', { setValueAs: nullableNumber })}
                      type="number"
                      step="0.01"
                      dir="ltr"
                      placeholder="27100.00"
                      className={inputCls()}
                    />
                  </div>

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

            {/* ── Sidebar ── */}
            <div className="lg:col-span-4 space-y-gutter">

              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md">
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">calculate</span>
                  תצוגה מקדימה
                </h3>
                {pnlResult ? (
                  <div className="space-y-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">רווח גולמי</span>
                      <span className={`font-data-mono text-sm font-semibold ${pnlResult.grossPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatPnl(pnlResult.grossPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">רווח נקי</span>
                      <span className={`font-data-mono text-sm font-bold ${pnlResult.netPnl >= 0 ? 'text-success' : 'text-danger'}`}>
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
                      <span className="font-data-mono text-primary-container">×${multiplier}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">חוזים</span>
                      <span className="font-data-mono text-on-surface">{Number(watchedQty)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant opacity-50 text-center py-4">
                    הזן Entry/Exit Points לחישוב
                  </p>
                )}
              </div>

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
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-on-surface">
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

              <div className="bg-surface-container-low rounded-lg border border-surface-container-highest p-md">
                <h3 className="font-title-sm text-title-sm text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">image</span>
                  צילומי מסך
                </h3>

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
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFileInput} />
                </label>

                {uploadingCount > 0 && (
                  <p className="text-on-surface-variant font-body-sm text-body-sm text-center mb-md flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    מעלה {uploadingCount} תמונות...
                  </p>
                )}

                <div className="space-y-3">
                  {watchedUrls.map((url) => (
                    <div key={url} className="relative group rounded overflow-hidden border border-surface-container-highest">
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

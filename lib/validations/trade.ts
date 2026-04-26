import { z } from 'zod'
import { SUPPORTED_SYMBOLS } from '@/types'

const symbolEnum = z.enum(SUPPORTED_SYMBOLS as unknown as [string, ...string[]])

export const tradeSchema = z
  .object({
    trade_type: z.enum(['daytrade', 'swing']),
    symbol:     symbolEnum,
    direction:  z.enum(['long', 'short']),

    entry_points: z.number().positive('Entry points חייב להיות חיובי'),
    exit_points:  z.number().positive('Exit points חייב להיות חיובי').optional().nullable(),

    quantity: z
      .number()
      .int('כמות חייבת להיות מספר שלם')
      .positive('כמות חייבת להיות לפחות 1'),

    entry_date:        z.string().min(1, 'נדרש תאריך כניסה'),
    entry_time_of_day: z.string().min(1, 'נדרשת שעת כניסה'),
    exit_date:         z.string().optional().nullable(),
    exit_time_of_day:  z.string().optional().nullable(),

    stop_loss:   z.number().positive('סטופ לוס חייב להיות חיובי').optional().nullable(),
    take_profit: z.number().positive('טייק פרופיט חייב להיות חיובי').optional().nullable(),
    fees:        z.number().min(0, 'עמלות לא יכולות להיות שליליות'),

    notes: z.string().optional().nullable(),
    tags:  z.array(z.string()).default([]),
    screenshot_urls: z.array(z.string()).default([]),
    account_id: z.string().min(1, 'חשבון נדרש'),
  })
  .superRefine((data, ctx) => {
    // Swing trades require a separate exit date
    if (data.trade_type === 'swing' && data.exit_time_of_day && !data.exit_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['exit_date'],
        message: 'נדרש תאריך יציאה לעסקת סווינג',
      })
    }
    // Exit time without exit points is allowed (still open trade), but exit
    // points without an exit time is inconsistent.
    if (data.exit_points != null && !data.exit_time_of_day) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['exit_time_of_day'],
        message: 'נדרשת שעת יציאה כאשר הוזנו Exit points',
      })
    }
    // Validate exit > entry
    if (data.exit_time_of_day) {
      const exitDateStr = data.trade_type === 'swing' ? data.exit_date : data.entry_date
      if (exitDateStr) {
        const entryAt = new Date(`${data.entry_date}T${data.entry_time_of_day}`)
        const exitAt  = new Date(`${exitDateStr}T${data.exit_time_of_day}`)
        if (!(exitAt.getTime() > entryAt.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['exit_time_of_day'],
            message: 'זמן יציאה חייב להיות אחרי זמן כניסה',
          })
        }
      }
    }
  })

export type TradeFormValues = z.input<typeof tradeSchema>
export type TradeFormOutput = z.output<typeof tradeSchema>

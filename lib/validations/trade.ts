import { z } from 'zod'

export const tradeSchema = z
  .object({
    symbol: z
      .string()
      .min(1, 'נדרש סימול נכס')
      .max(10, 'סימול ארוך מדי')
      .transform((v) => v.toUpperCase()),
    direction: z.enum(['long', 'short']),
    entry_price: z.number().positive('מחיר כניסה חייב להיות חיובי'),
    exit_price: z.number().positive('מחיר יציאה חייב להיות חיובי').optional().nullable(),
    quantity: z
      .number()
      .int('כמות חייבת להיות מספר שלם')
      .positive('כמות חייבת להיות לפחות 1'),
    entry_time: z.string().min(1, 'נדרש זמן כניסה'),
    exit_time: z.string().optional().nullable(),
    stop_loss: z.number().positive('סטופ לוס חייב להיות חיובי').optional().nullable(),
    take_profit: z.number().positive('טייק פרופיט חייב להיות חיובי').optional().nullable(),
    fees: z.number().min(0, 'עמלות לא יכולות להיות שליליות'),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).default([]),
    screenshot_urls: z.array(z.string()).default([]),
    account_id: z.string().min(1, 'חשבון נדרש'),
  })
  .refine(
    (data) => {
      if (!data.exit_time || !data.entry_time) return true
      return new Date(data.exit_time) > new Date(data.entry_time)
    },
    { message: 'זמן יציאה חייב להיות אחרי זמן כניסה', path: ['exit_time'] }
  )

export type TradeFormValues = z.input<typeof tradeSchema>
export type TradeFormOutput = z.output<typeof tradeSchema>
